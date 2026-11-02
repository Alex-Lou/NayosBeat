import { afterEach, describe, expect, it, vi } from 'vitest';
import { delayFor, OnlineMatch, type OnlineEnd } from '../../src/app/online-match';
import { Input, type InputBits } from '../../src/core/input';
import { matchWinner } from '../../src/core/round';
import { resultsDue } from '../../src/render/finisher-scene';
import { createInitialState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { HeldStruggle } from '../../src/input/held-struggle';
import { HASH_EVERY } from '../../src/net/desync';
import { encodeMessage, FLAG_PAUSE, MAX_DELAY } from '../../src/net/protocol';
import { Session } from '../../src/net/session';
import { stateHash } from '../../src/net/state-hash';
import { parseInput, playReplay, replayConfig, type Replay } from '../../tools/replays/replay';
import { channelPair, FakeServer, type FakeChannel } from '../net/fake-net';

const REPLAY = Object.values(
  import.meta.glob<Replay>('../core/replays/combo.json', { eager: true, import: 'default' }),
)[0] as Replay;
const CONFIG = replayConfig(REPLAY);
const PLAN = {
  stage: { map: 'rue', atmosphere: 'midnight-clear' },
  fighters: ['nayo', 'riff'],
} as const;

/** Each player's input on every tick of the golden replay. */
const SCRIPT: (readonly [InputBits, InputBits])[] = REPLAY.inputs.flatMap(([ticks, one, two]) =>
  Array.from({ length: ticks }, () => [parseInput(one), parseInput(two)] as const),
);

/** One device: its match, its fight as the scene plays it (a tick a frame), what it was told. */
function device(channel: FakeChannel, role: 'host' | 'guest', delay = 2) {
  const told: string[] = [];
  const ends: OnlineEnd[] = [];
  const session = new Session(channel, () => Date.now(), {
    update: () => undefined,
    received: () => undefined,
    ended: () => undefined,
  });
  const match = new OnlineMatch(session, PLAN, ['Alex', 'Lou'], role, delay, () => Date.now());
  match.listen({
    ping: () => undefined,
    paused: (by) => told.push(`paused by ${by}`),
    resumed: () => told.push('resumed'),
    rematch: () => {
      told.push('rematch');
      fight.state = createInitialState(CONFIG);
      fight.hashes = [];
      fight.source = match.source(new HeldStruggle(false));
    },
    ended: (end) => ends.push(end),
  });
  const fight = {
    match,
    told,
    ends,
    state: createInitialState(CONFIG),
    hashes: [] as string[],
    ticks: 0,
    /** Any flag of the wire that reached the fight's inputs (none should). */
    flags: 0,
    source: match.source(new HeldStruggle(false)),
    /** What this device's player holds on each tick of its fight: the golden replay's, by default. */
    script: (tick: number, player: 0 | 1): InputBits => SCRIPT[tick]?.[player] ?? 0,
    /** A frame: up to `count` ticks, this device's player reading the script, then the flush. */
    frame(count = 1) {
      const playable = fight.source.playable(count);
      for (let i = 0; i < playable; i++) {
        const own = fight.script(fight.ticks, match.player);
        const inputs = fight.source.next([own, 0], fight.state);
        if (!inputs) break;
        fight.flags |= (inputs[0] | inputs[1]) & FLAG_PAUSE;
        fight.state = step(fight.state, inputs, CONFIG);
        fight.hashes.push(stateHash(fight.state));
        fight.ticks++;
      }
      fight.source.flush();
    },
  };
  return fight;
}

function setup(delay = 2) {
  vi.useFakeTimers();
  const [hostEnd, guestEnd] = channelPair(new FakeServer());
  return { host: device(hostEnd, 'host', delay), guest: device(guestEnd, 'guest', delay), hostEnd };
}

/** `frames` frames of both devices, the network a microtask behind, 16 ms each. */
async function play(devices: readonly ReturnType<typeof device>[], frames: number, count = 1) {
  for (let i = 0; i < frames; i++) {
    for (const one of devices) one.frame(count);
    await vi.advanceTimersByTimeAsync(16);
  }
}

describe('an online match (docs/multijoueur.md §9.6)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays the same fight on both devices, each one its own player', async () => {
    const { host, guest } = setup();
    expect([host.match.player, guest.match.player]).toEqual([0, 1]);
    await play([host, guest], 300);
    expect(host.ticks).toBeGreaterThan(250);
    const played = Math.min(host.ticks, guest.ticks);
    expect(guest.hashes.slice(0, played)).toEqual(host.hashes.slice(0, played));
    // Both players' inputs reach both fights, delayed: the combo lands.
    expect(host.state.fighters[1].health).toBeLessThan(CONFIG.fighters[1].maxHealth);
    expect([...host.ends, ...guest.ends]).toEqual([]);
  });

  it('pauses both devices after the same tick, and fights on when either one resumes', async () => {
    const { host, guest } = setup(3);
    await play([host, guest], 20);
    guest.match.requestPause();
    await play([host, guest], 20);
    expect(host.told).toEqual(['paused by 1']);
    expect(guest.told).toEqual(['paused by 1']);
    expect(host.ticks).toBe(guest.ticks);
    const paused = host.ticks;
    await play([host, guest], 30);
    expect(host.ticks).toBe(paused);
    host.match.resume();
    await play([host, guest], 20);
    expect(guest.told).toEqual(['paused by 1', 'resumed']);
    expect(host.ticks).toBeGreaterThan(paused);
    const played = Math.min(host.ticks, guest.ticks);
    expect(guest.hashes.slice(0, played)).toEqual(host.hashes.slice(0, played));
    // The host's turn: its pause too, on both devices.
    host.match.requestPause();
    await play([host, guest], 20);
    expect(guest.told).toEqual(['paused by 1', 'resumed', 'paused by 0']);
    // The pause's flag travels with the inputs, and never reaches the core.
    expect(host.flags | guest.flags).toBe(0);
  });

  it('applies the held struggle to the fighter this device plays', () => {
    const { guest } = setup();
    const struggle = new HeldStruggle(false);
    const apply = vi.spyOn(struggle, 'apply');
    guest.match.source(struggle).next([0, 0], guest.state);
    expect(apply).toHaveBeenCalledWith(1, 0, guest.state);
  });

  it('sends again what was lost, even while nothing more can be played', async () => {
    const { host, guest, hostEnd } = setup();
    await play([host, guest], 20);
    // The host's messages are lost for ten frames: both devices stop, each waiting for the other,
    // and nothing new is played that would send anything.
    const send = hostEnd.send.bind(hostEnd);
    let cut = true;
    hostEnd.send = (text) => {
      if (!cut) send(text);
    };
    await play([host, guest], 10);
    cut = false;
    const stalled = host.ticks;
    await play([host, guest], 60);
    expect(host.ticks).toBeGreaterThan(stalled + 30);
    const played = Math.min(host.ticks, guest.ticks);
    expect(guest.hashes.slice(0, played)).toEqual(host.hashes.slice(0, played));
  });

  it('stops on the tick the match is decided, the same on both devices', () => {
    const { host } = setup();
    const decided = {
      ...host.state,
      round: { ...host.state.round, phase: 'matchEnd' as const, phaseFrame: 10_000 },
    };
    expect(host.source.next([0, 0], decided)).toBeNull();
    expect(host.source.playable(5)).toBe(0);
  });

  it('starts over once both want the rematch, each fight from its first tick', async () => {
    const { host, guest } = setup();
    await play([host, guest], 60);
    host.match.wantRematch();
    await play([host, guest], 5);
    expect(host.told).toEqual([]);
    guest.match.wantRematch();
    await play([host, guest], 5);
    expect(host.told).toEqual(['rematch']);
    expect(guest.told).toEqual(['rematch']);
    host.ticks = 0;
    guest.ticks = 0;
    await play([host, guest], 120);
    const played = Math.min(host.ticks, guest.ticks);
    expect(played).toBeGreaterThan(100);
    expect(guest.hashes.slice(0, played)).toEqual(host.hashes.slice(0, played));
    expect([...host.ends, ...guest.ends]).toEqual([]);
  });

  it('ends on a desync, told with its tick, on both devices, the host fight as a replay', async () => {
    const { host, guest } = setup();
    // Well into the fight, where the inputs count (the round's intro ignores them).
    await play([host, guest], 200);
    const at = host.ticks;
    // The guest's fight goes its own way: its state is not the host's any more.
    const [a, b] = guest.state.fighters;
    guest.state = { ...guest.state, fighters: [{ ...a, health: a.health - 1 }, b] };
    await play([host, guest], HASH_EVERY + 20);
    const tick = Math.ceil(at / HASH_EVERY) * HASH_EVERY;
    expect(host.ends).toMatchObject([{ kind: 'desync', tick }]);
    expect(guest.ends).toMatchObject([{ kind: 'desync', tick }]);
    const end = host.ends[0];
    if (end?.kind !== 'desync') throw new Error('No desync');
    expect(end.replay.fighters).toEqual(PLAN.fighters);
    expect(end.replay.description).toBe(
      `Match en ligne désynchronisé au tic ${tick}, joué par l'hôte (délai 2)`,
    );
    // Played again, the replay is the fight the host saw, tick by tick.
    const replayed = replayHashes({ ...REPLAY, inputs: end.replay.inputs });
    expect(replayed.length).toBeGreaterThan(at);
    expect(replayed).toEqual(host.hashes.slice(0, replayed.length));
  });

  it('compares no hash once the match is decided, whoever won: its end plays itself', async () => {
    for (const wins of [
      [2, 0],
      [1, 2],
    ] as const) {
      const { host, guest } = setup();
      await play([host, guest], 10);
      for (const one of [host, guest]) {
        const { round } = one.state;
        one.state = { ...one.state, round: { ...round, wins, phase: 'roundEnd', phaseFrame: 0 } };
      }
      // A skip of the Finisher's scene on one device only: its state jumps ahead of the other's.
      const [a, b] = guest.state.fighters;
      guest.state = { ...guest.state, fighters: [{ ...a, health: a.health - 1 }, b] };
      await play([host, guest], HASH_EVERY + 20);
      expect([...host.ends, ...guest.ends], String(wins)).toEqual([]);
      vi.useRealTimers();
    }
  });

  it('tells what each player held on the last tick, as both devices know it', async () => {
    const { host, guest } = setup();
    host.script = () => Input.Light;
    guest.script = () => Input.Heavy;
    await play([host, guest], 10);
    expect(host.match.held()).toEqual([Input.Light, Input.Heavy]);
    expect(guest.match.held()).toEqual([Input.Light, Input.Heavy]);
  });

  it('plays a whole match to its end on the same tick, then the rematch from its first', async () => {
    const { host, guest } = setup(3);
    // The host walks in and hits hard, again and again; the guest does nothing.
    const pressing = (tick: number, player: 0 | 1): InputBits =>
      player === 0 ? Input.Right | (tick % 24 < 2 ? Input.Heavy : 0) : 0;
    host.script = pressing;
    guest.script = pressing;
    for (let frame = 0; frame < 20_000; frame++) {
      if (resultsDue(host.state) && resultsDue(guest.state)) break;
      for (const one of [host, guest]) one.frame(4);
      await vi.advanceTimersByTimeAsync(16);
    }
    expect(resultsDue(host.state) && resultsDue(guest.state)).toBe(true);
    expect(host.ticks).toBe(guest.ticks);
    expect(guest.hashes).toEqual(host.hashes);
    expect(matchWinner(host.state.round)).toBe(0);
    expect(host.source.playable(4)).toBe(0);
    host.match.wantRematch();
    guest.match.wantRematch();
    await play([host, guest], 3);
    expect(host.told).toEqual(['rematch']);
    expect(guest.told).toEqual(['rematch']);
    host.ticks = 0;
    guest.ticks = 0;
    await play([host, guest], 200);
    expect(host.state.round.number).toBe(1);
    expect(guest.hashes.slice(0, 150)).toEqual(host.hashes.slice(0, 150));
    expect([...host.ends, ...guest.ends]).toEqual([]);
  }, 60_000);

  it('ends when the other leaves, and cuts a link that speaks out of turn', async () => {
    const left = setup();
    await play([left.host, left.guest], 10);
    left.guest.match.close();
    await play([left.host], 2);
    expect(left.host.ends).toEqual([{ kind: 'left' }]);
    vi.useRealTimers();

    const rude = setup();
    rude.hostEnd.other.send(encodeMessage({ type: 'accept' }));
    await play([rude.host], 2);
    expect(rude.host.ends).toEqual([{ kind: 'protocol' }]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('chooses the delay from the measured round trip, 2 to the most', () => {
    expect(delayFor(null, MAX_DELAY)).toBe(3);
    expect(delayFor(4, MAX_DELAY)).toBe(2);
    expect(delayFor(40, MAX_DELAY)).toBe(3);
    expect(delayFor(100, MAX_DELAY)).toBe(4);
    expect(delayFor(2000, MAX_DELAY)).toBe(MAX_DELAY);
  });
});

/** The hash of the state after every tick of `replay`. */
function replayHashes(replay: Replay): string[] {
  const hashes: string[] = [];
  playReplay(replay, (state) => hashes.push(stateHash(state)));
  return hashes;
}
