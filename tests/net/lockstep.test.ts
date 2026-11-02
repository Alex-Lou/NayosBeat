import { describe, expect, it } from 'vitest';
import type { InputBits } from '../../src/core/input';
import { createInitialState, type GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { DesyncCheck, HASH_EVERY } from '../../src/net/desync';
import { Lockstep, MAX_AHEAD } from '../../src/net/lockstep';
import { encodeMessage, MAX_BATCH, parseMessage } from '../../src/net/protocol';
import { stateHash } from '../../src/net/state-hash';
import { parseInput, replayConfig, type Replay } from '../../tools/replays/replay';

const REPLAYS = import.meta.glob<Replay>('../core/replays/*.json', {
  eager: true,
  import: 'default',
});

/** A replay's inputs, tick by tick. */
function ticksOf(replay: Replay): (readonly [InputBits, InputBits])[] {
  const ticks: (readonly [InputBits, InputBits])[] = [];
  for (const [count, player1, player2] of replay.inputs) {
    const inputs = [parseInput(player1), parseInput(player2)] as const;
    for (let i = 0; i < count; i++) ticks.push(inputs);
  }
  return ticks;
}

/** Mulberry32: the network's draws, the same on every run. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Network {
  /** Frames a message takes, at most (at least 1); a message may overtake an older one. */
  readonly latency: number;
  /** The share of messages lost. */
  readonly loss: number;
  readonly seed: number;
}

/**
 * Plays `replay` between two devices over `network`: each one reads its own player's inputs from
 * the replay, plays the ticks the lockstep allows (two at most a frame, as a slow frame catches
 * up), and sends its messages through the wire format. Returns what each device played.
 */
function playOnline(replay: Replay, delay: number, network: Network) {
  const config = replayConfig(replay);
  const script = ticksOf(replay);
  const random = seeded(network.seed);
  const devices = ([0, 1] as const).map((player) => ({
    player,
    lockstep: new Lockstep(player, delay),
    check: new DesyncCheck(),
    state: createInitialState(config),
    hashes: [] as string[],
    lastAck: -1,
  }));
  const wire: { at: number; to: 0 | 1; text: string }[] = [];
  const send = (to: 0 | 1, at: number, text: string) => {
    if (random() < network.loss) return;
    wire.push({ at: at + 1 + Math.floor(random() * network.latency), to, text });
  };
  const total = script.length + delay;
  let frame = 0;
  while (devices.some((device) => device.lockstep.tick < total)) {
    if (frame++ > total * 20) throw new Error('The lockstep never finished: a deadlock');
    for (const device of devices) {
      const other = device.player === 0 ? 1 : 0;
      for (
        let played = 0;
        played < 2 && device.lockstep.tick < total && device.lockstep.ready();
        played++
      ) {
        const read = script[device.lockstep.tick]?.[device.player] ?? 0;
        const inputs = device.lockstep.advance(read);
        device.state = step(device.state, inputs, config);
        const hash = stateHash(device.state);
        device.hashes.push(hash);
        const message = device.check.played(device.lockstep.tick, () => hash);
        if (message) send(other, frame, encodeMessage(message));
      }
      const outgoing = device.lockstep.outgoing(device.lastAck);
      if (outgoing) {
        device.lastAck = outgoing.ack;
        send(other, frame, encodeMessage(outgoing));
      }
    }
    // Delivered in an order of their own: what is due, shuffled.
    const due = wire.filter((message) => message.at <= frame).sort(() => random() - 0.5);
    for (const message of due) {
      wire.splice(wire.indexOf(message), 1);
      const device = devices[message.to];
      const parsed = parseMessage(message.text);
      if (!device || !parsed) throw new Error(`Refused on the wire: ${message.text}`);
      const accepted =
        parsed.type === 'inputs'
          ? device.lockstep.receive(parsed)
          : parsed.type === 'hash'
            ? device.check.receive(parsed, device.lockstep.tick)
            : false;
      if (!accepted) throw new Error(`Refused by the lockstep: ${message.text}`);
    }
  }
  return devices;
}

/** The same match on one device: each input played `delay` ticks late, as online. */
function playDelayed(replay: Replay, delay: number): string[] {
  const config = replayConfig(replay);
  const script = ticksOf(replay);
  let state: GameState = createInitialState(config);
  const hashes: string[] = [];
  for (let tick = 0; tick < script.length + delay; tick++) {
    state = step(state, tick < delay ? [0, 0] : (script[tick - delay] ?? [0, 0]), config);
    hashes.push(stateHash(state));
  }
  return hashes;
}

const NETWORKS: readonly Network[] = [
  { latency: 1, loss: 0, seed: 1 },
  { latency: 4, loss: 0.1, seed: 2 },
  { latency: 9, loss: 0.3, seed: 3 },
];

describe('the lockstep (docs/multijoueur.md §9.1)', () => {
  const replays = Object.entries(REPLAYS);

  it('plays every golden replay the same on both devices, tick after tick, whatever the network', () => {
    expect(replays.length).toBeGreaterThanOrEqual(10);
    for (const [path, replay] of replays) {
      for (const [index, network] of NETWORKS.entries()) {
        const delay = 1 + index * 2;
        const [host, guest] = playOnline(replay, delay, network);
        const expected = playDelayed(replay, delay);
        const name = `${path}, delay ${delay}, latency ${network.latency}, loss ${network.loss}`;
        expect(host?.hashes, name).toEqual(expected);
        expect(guest?.hashes, name).toEqual(expected);
        expect(host?.check.desyncAt, name).toBeNull();
        expect(guest?.lockstep.played(), name).toEqual(host?.lockstep.played());
      }
    }
  }, 120_000);

  it('waits for the other input, and plays nothing ahead of it', () => {
    const host = new Lockstep(0, 2);
    // The first two ticks are neutral on both sides: playable at once.
    expect(host.advance(5)).toEqual([0, 0]);
    expect(host.advance(6)).toEqual([0, 0]);
    expect(host.ready()).toBe(false);
    expect(() => host.advance(7)).toThrow(/has not arrived/);
    expect(host.receive({ type: 'inputs', first: 2, bits: [9], ack: 1 })).toBe(true);
    expect(host.advance(7)).toEqual([5, 9]);
    expect(host.tick).toBe(3);
  });

  it('sends what the other has not confirmed, oldest first, at most a batch, and confirms', () => {
    const host = new Lockstep(0, 3);
    for (let tick = 0; tick < 3; tick++) host.advance(tick + 1);
    expect(host.outgoing(-1)).toEqual({ type: 'inputs', first: 3, bits: [1, 2, 3], ack: 2 });
    host.receive({ type: 'inputs', first: 3, bits: [7], ack: 4 });
    expect(host.outgoing(2)).toEqual({ type: 'inputs', first: 5, bits: [3], ack: 3 });
    host.receive({ type: 'inputs', first: 4, bits: [8], ack: 5 });
    // A late message, overtaken: its older confirmation takes nothing back.
    host.receive({ type: 'inputs', first: 3, bits: [7], ack: 3 });
    // Nothing unconfirmed: the confirmation alone, then nothing.
    expect(host.outgoing(3)).toEqual({ type: 'inputs', first: 5, bits: [3], ack: 4 });
    expect(host.outgoing(4)).toBeNull();

    const far = new Lockstep(1, 1);
    for (let tick = 0; tick < 1; tick++) far.advance(0);
    for (let tick = 1; tick < MAX_BATCH + 5; tick++) {
      far.receive({ type: 'inputs', first: tick, bits: [0], ack: 0 });
      far.advance(tick);
    }
    expect(far.outgoing(-1)?.bits).toHaveLength(MAX_BATCH);
  });

  it('cuts the link on inputs that cannot be true', () => {
    const lying = (message: { first: number; bits: number[]; ack: number }) => {
      const host = new Lockstep(0, 2);
      host.receive({ type: 'inputs', first: 2, bits: [4], ack: 1 });
      return host.receive({ type: 'inputs', ...message });
    };
    // An input changed, a neutral tick sent, a tick out of reach, a confirmation of nothing sent.
    expect(lying({ first: 2, bits: [5], ack: 1 })).toBe(false);
    expect(lying({ first: 1, bits: [0, 4], ack: 1 })).toBe(false);
    expect(lying({ first: MAX_AHEAD + 2, bits: [0], ack: 1 })).toBe(false);
    expect(lying({ first: 3, bits: [0], ack: 2 })).toBe(false);
    expect(lying({ first: 2, bits: [4, 6], ack: 1 })).toBe(true);
    expect(() => new Lockstep(0, 0)).toThrow(/≥ 1/);
  });
});

describe('the desync check (docs/multijoueur.md §9.3)', () => {
  it('tells the first tick both devices hashed differently, in either order', () => {
    const check = new DesyncCheck();
    expect(check.played(HASH_EVERY - 1, () => 'never')).toBeNull();
    expect(check.played(HASH_EVERY, () => 'aaaaaaaa')).toEqual({
      type: 'hash',
      tick: HASH_EVERY,
      hash: 'aaaaaaaa',
    });
    expect(check.receive({ type: 'hash', tick: HASH_EVERY, hash: 'aaaaaaaa' }, HASH_EVERY)).toBe(
      true,
    );
    expect(check.desyncAt).toBeNull();
    expect(
      check.receive({ type: 'hash', tick: 2 * HASH_EVERY, hash: 'bbbbbbbb' }, HASH_EVERY),
    ).toBe(true);
    check.played(2 * HASH_EVERY, () => 'cccccccc');
    expect(check.desyncAt).toBe(2 * HASH_EVERY);
    check.played(3 * HASH_EVERY, () => 'dddddddd');
    check.receive({ type: 'hash', tick: 3 * HASH_EVERY, hash: 'eeeeeeee' }, 3 * HASH_EVERY);
    expect(check.desyncAt).toBe(2 * HASH_EVERY);
  });

  it('cuts the link on a hash that cannot be true', () => {
    const check = new DesyncCheck();
    expect(check.receive({ type: 'hash', tick: 7, hash: 'aaaaaaaa' }, 0)).toBe(false);
    expect(check.receive({ type: 'hash', tick: 60 * 100, hash: 'aaaaaaaa' }, 0)).toBe(false);
    expect(check.receive({ type: 'hash', tick: HASH_EVERY, hash: 'aaaaaaaa' }, 0)).toBe(true);
    expect(check.receive({ type: 'hash', tick: HASH_EVERY, hash: 'aaaaaaaa' }, 0)).toBe(false);
  });
});
