import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input } from '../../src/core/input';
import { createInitialState, type GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO as P } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { BOOST_MAX, COUNTER_HITSTOP } from '../../src/core/rules';
import type { MoveId } from '../../src/core/move-data';
import { moveOf, tierOf } from '../../src/core/moves';
import {
  COMBO_KO_HITS,
  detectEvents,
  HAPTICS,
  isHeavy,
  koFinishOf,
  pinpoints,
  shatters,
  vibrationFor,
  type FightEvent,
  type KoFinish,
} from '../../src/render/fight-events';
import { playReplay, replayConfig, type Replay } from '../../tools/replays/replay';
import { armedStart, matchOf } from '../core/finisher-helpers';
import { facingOff, MIRROR_MATCH, repeat } from '../core/helpers';

const FINISHER_REPLAY = import.meta.glob<Replay>('../core/replays/finisher.json', {
  eager: true,
  import: 'default',
});

/** Plays scripted ticks and collects every event detected along the way. */
function eventsOf(
  start: GameState,
  ticks: [number, number][],
  config: MatchConfig = MIRROR_MATCH,
): FightEvent[] {
  const events: FightEvent[] = [];
  let state = start;
  for (const inputs of ticks) {
    const next = step(state, inputs, config);
    const tickEvents: FightEvent[] = [];
    detectEvents(state, next, config, tickEvents);
    events.push(...tickEvents);
    state = next;
  }
  return events;
}

const idle = (ticks: number): [number, number][] => repeat<[number, number]>([0, 0], ticks);
const types = (events: FightEvent[]) => events.map((e) => e.type);

describe('detectEvents', () => {
  it('reports an attack start, then a single hit with its damage', () => {
    const events = eventsOf(facingOff(30, MIRROR_MATCH), [[Input.Light, 0], ...idle(30)]);
    expect(types(events)).toEqual(['attack', 'hit']);
    expect(events[1]).toMatchObject({ type: 'hit', damage: P.moves.standLight.damage });
  });

  it('tells a counter-hit, read from the contact (§7.4)', () => {
    const start = facingOff(40, MIRROR_MATCH);
    const events = eventsOf(start, [[Input.Light, 0], [0, Input.Heavy], ...idle(30)]);
    expect(events.find((e) => e.type === 'hit')).toMatchObject({ by: 0, counter: 'counter' });
    const plain = eventsOf(start, [[Input.Light, 0], ...idle(30)]);
    expect(plain.find((e) => e.type === 'hit')).toMatchObject({ counter: null });
  });

  it('tells which way a blow pushes the defender: away from the attacker', () => {
    // Player 1 stands on the left: its jab pushes player 2 to the right, and back.
    const right = eventsOf(facingOff(30, MIRROR_MATCH), [[Input.Light, 0], ...idle(30)]);
    expect(right.find((e) => e.type === 'hit')).toMatchObject({ away: 1 });
    const left = eventsOf(facingOff(30, MIRROR_MATCH), [[0, Input.Light], ...idle(30)]);
    expect(left.find((e) => e.type === 'hit')).toMatchObject({ away: -1 });
  });

  it('tells who landed the blow, so its effects take that fighter colors', () => {
    const first = eventsOf(facingOff(30, MIRROR_MATCH), [[Input.Light, 0], ...idle(30)]);
    expect(first.find((e) => e.type === 'hit')).toMatchObject({ by: 0 });
    const second = eventsOf(facingOff(30, MIRROR_MATCH), [[0, Input.Light], ...idle(30)]);
    expect(second.find((e) => e.type === 'hit')).toMatchObject({ by: 1 });
  });

  it('reports a single block even though the game freezes on impact', () => {
    const events = eventsOf(facingOff(30, MIRROR_MATCH), [
      [Input.Heavy, Input.Right],
      ...repeat<[number, number]>([0, Input.Right], 30),
    ]);
    expect(types(events).filter((t) => t === 'block')).toHaveLength(1);
  });

  it('reports a KO instead of a hit on the final blow', () => {
    const start = facingOff(30, MIRROR_MATCH, [{}, { health: 5 }]);
    const events = eventsOf(start, [[Input.Light, 0], ...idle(10)]);
    expect(types(events)).toContain('ko');
    expect(types(events)).not.toContain('hit');
  });

  it('tells how the KO landed, for the Boost gauge: a blow alone, a combo, a super', () => {
    expect(koFinishOf(0, 1, false)).toBe('plain');
    expect(koFinishOf(1, COMBO_KO_HITS - 1, false)).toBe('plain');
    expect(koFinishOf(0, COMBO_KO_HITS, false)).toBe('combo');
    expect(koFinishOf(3, 1, false)).toBe('ultimate');
    // A jab alone.
    const jab = facingOff(30, MIRROR_MATCH, [{}, { health: 5 }]);
    const plain = eventsOf(jab, [[Input.Light, 0], ...idle(10)]).find((e) => e.type === 'ko');
    expect(plain).toMatchObject({ type: 'ko', finish: 'plain' });
    // The super: BOOST and back, the gauge full.
    const full = facingOff(30, MIRROR_MATCH, [{ boost: BOOST_MAX }, { health: 5 }]);
    const events = eventsOf(full, [[Input.Boost | Input.Left, 0], ...idle(120)]);
    expect(events.find((e) => e.type === 'ko')).toMatchObject({ type: 'ko', finish: 'ultimate' });
  });

  it("tells the Finisher's KO from an Ultime's: the last blow of its lock (finisher.md §1.13, test 11)", () => {
    expect(koFinishOf(3, 1, true)).toBe('finale');
    expect(koFinishOf(3, COMBO_KO_HITS, true)).toBe('finale');
    // Both supers' KOs blow the gauge up (the Finisher's on its landing, once its scene plays).
    const finishes: readonly KoFinish[] = ['plain', 'combo', 'ultimate', 'finale'];
    expect(finishes.map(shatters)).toEqual([false, false, true, true]);
    // Armed at match point on a victim at 30 %: the Mégabasse locks, its KO is the Finisher's.
    const config = matchOf(P, RIFF, 0);
    const armed = armedStart(config, 0, { distance: 40 });
    const finisher = eventsOf(armed, [[Input.Boost | Input.Left, 0], ...idle(150)], config);
    expect(finisher.find((e) => e.type === 'ko')).toMatchObject({ finish: 'finale', by: 0 });
    // The same super in round 1 deals 80 + 72 + 112 and leaves her 6 HP (§1.6); lower, an Ultime.
    const round1 = (health: number): GameState => {
      const [nayo, riff] = armed.fighters;
      return {
        ...armed,
        round: { ...armed.round, wins: [0, 0] },
        fighters: [nayo, { ...riff, health }],
      };
    };
    const plain = (health: number) =>
      eventsOf(round1(health), [[Input.Boost | Input.Left, 0], ...idle(150)], config);
    expect(types(plain(270))).not.toContain('ko');
    expect(plain(260).find((e) => e.type === 'ko')).toMatchObject({ finish: 'ultimate' });
  });

  it('never calls a double KO the Finisher: two Mégabasses armed on the same tick', () => {
    const start = armedStart(MIRROR_MATCH, 0, {
      distance: 40,
      wins: [1, 1],
      health: 50,
      attacker: { health: 50 },
      victim: { boost: BOOST_MAX },
    });
    const events = eventsOf(start, [
      [Input.Boost | Input.Left, Input.Boost | Input.Right],
      ...idle(60),
    ]);
    const kos = events.flatMap((e) => (e.type === 'ko' ? [e.finish] : []));
    expect(kos).toEqual(['ultimate', 'ultimate']);
    expect(types(events)).not.toContain('finisherLock');
    expect(types(events)).not.toContain('finisherBlow');
  });

  it("reports the Finisher's lock with its name, then its last blow, in a match (finisher.md §5.2)", () => {
    for (const [attacker, victim, name] of [
      [P, RIFF, 'Le Quatre'],
      [RIFF, P, 'Larsen'],
    ] as const) {
      const config = matchOf(attacker, victim, 0);
      const start = armedStart(config, 0, { distance: 40 });
      const events = eventsOf(start, [[Input.Boost | Input.Left, 0], ...idle(150)], config);
      const finisher = events.filter((e) => e.type === 'finisherLock' || e.type === 'finisherBlow');
      expect(finisher).toMatchObject([
        { type: 'finisherLock', by: 0, name },
        { type: 'finisherBlow', by: 0, away: 1 },
      ]);
      // The blow and its KO on the same tick, the lock on the first blow's.
      const order = types(events).filter((t) => t === 'ko' || t.startsWith('finisher'));
      expect(order).toEqual(['finisherLock', 'ko', 'finisherBlow']);
    }
  });

  it('reports the last blow on the training dummy too, kept at 1 HP: finisher.json', () => {
    const [replay] = Object.values(FINISHER_REPLAY);
    if (!replay) throw new Error('finisher.json is missing');
    const config = replayConfig(replay);
    const events: FightEvent[] = [];
    let before = createInitialState(config);
    playReplay(replay, (state) => {
      const tick: FightEvent[] = [];
      detectEvents(before, state, config, tick);
      events.push(...tick);
      before = state;
    });
    const finisher = events.filter((e) => e.type === 'finisherLock' || e.type === 'finisherBlow');
    expect(finisher).toMatchObject([
      { type: 'finisherLock', by: 0, name: 'Le Quatre' },
      { type: 'finisherBlow', by: 0 },
    ]);
    expect(types(events)).not.toContain('ko');
  });

  it('reports projectiles, jumps and landings', () => {
    const fireball = eventsOf(facingOff(300, MIRROR_MATCH), [[Input.Special, 0], ...idle(20)]);
    expect(types(fireball)).toContain('projectile');

    const jump = eventsOf(facingOff(200, MIRROR_MATCH), [
      ...repeat<[number, number]>([Input.Up, 0], 6),
      ...idle(50),
    ]);
    expect(types(jump)).toEqual(['jump', 'land']);
  });

  it('reports round phase changes', () => {
    const start = facingOff(30, MIRROR_MATCH, [{}, { health: 5 }]);
    const events = eventsOf(start, [[Input.Light, 0], ...idle(10)]);
    expect(events).toContainEqual({ type: 'phase', phase: 'roundEnd' });
  });

  it('sparks where the blow lands: a low kick at the shins, a jab at the body', () => {
    const contact = (input: number) =>
      eventsOf(facingOff(30, MIRROR_MATCH), [[input, 0], ...idle(10)]).find(
        (e) => e.type === 'hit',
      );
    const low = contact(Input.Down | Input.Light);
    const jab = contact(Input.Light);
    const lowBox = P.moves.crouchLight.hitbox;
    const jabBox = P.moves.standLight.hitbox;
    if (!low || !('y' in low) || !jab || !('y' in jab) || !lowBox || !jabBox) {
      throw new Error('Both blows must hit');
    }
    expect(low.y).toBeGreaterThanOrEqual(lowBox.y);
    expect(low.y).toBeLessThanOrEqual(lowBox.y + lowBox.height);
    expect(jab.y).toBeGreaterThanOrEqual(jabBox.y);
    expect(jab.y).toBeLessThanOrEqual(jabBox.y + jabBox.height);
  });

  it('reports a hit on a training dummy at its 1 HP floor, though its health does not move', () => {
    const training: MatchConfig = { ...MIRROR_MATCH, training: true };
    const start = facingOff(30, training, [{}, { health: 1 }]);
    const hit = eventsOf(start, [[Input.Light, 0], ...idle(10)], training).find(
      (e) => e.type === 'hit',
    );
    expect(hit).toMatchObject({ type: 'hit', damage: 0, heavy: false });
  });

  it('calls a blow heavy by its move, even once combo scaling has cut its damage', () => {
    // Late in a combo, the heavy hook deals less than the heavy threshold: it stays heavy.
    const start = facingOff(30, MIRROR_MATCH, [
      {},
      { action: 'hitstun', stunFrames: 30, comboCount: 6 },
    ]);
    const hit = eventsOf(start, [[Input.Heavy, 0], ...idle(20)]).find((e) => e.type === 'hit');
    if (!hit) throw new Error('The hook must hit');
    expect(hit.damage).toBeLessThan(P.moves.standHeavy.damage);
    expect(hit.heavy).toBe(true);
  });

  it('places the contact point between the fighters', () => {
    const start = facingOff(30, MIRROR_MATCH);
    const hit = eventsOf(start, [[Input.Light, 0], ...idle(10)]).find((e) => e.type === 'hit');
    const [a, b] = start.fighters;
    expect(hit && 'x' in hit && hit.x > a.x && hit.x < b.x).toBe(true);
  });

  it('reports a dash, not an attack, with where it sets off and which way it goes', () => {
    const start = facingOff(200, MIRROR_MATCH);
    const dash = eventsOf(start, [[Input.Dash, 0], ...idle(20)]);
    expect(dash).toEqual([{ type: 'dash', x: start.fighters[0].x, toward: 1 }]);
    const back = eventsOf(start, [[Input.Left | Input.Dash, 0], ...idle(24)]);
    expect(back).toEqual([{ type: 'dash', x: start.fighters[0].x, toward: -1 }]);
    const second = eventsOf(start, [[0, Input.Dash], ...idle(20)]);
    expect(second).toEqual([{ type: 'dash', x: start.fighters[1].x, toward: -1 }]);
  });

  it('tells a low blow, hit or blocked, from the others: it lands at the feet', () => {
    const hit = (input: number, guard = 0) =>
      eventsOf(facingOff(30, MIRROR_MATCH), [
        [input, guard],
        ...repeat<[number, number]>([0, guard], 20),
      ]).find((e) => e.type === 'hit' || e.type === 'block');
    expect(hit(Input.Down | Input.Light)).toMatchObject({ type: 'hit', low: true });
    expect(hit(Input.Down | Input.Heavy)).toMatchObject({ type: 'hit', low: true });
    expect(hit(Input.Down | Input.Light, Input.Down | Input.Right)).toMatchObject({
      type: 'block',
      low: true,
    });
    expect(hit(Input.Light)).toMatchObject({ type: 'hit', low: false });
  });

  it('tells who starts which move', () => {
    const attacks = eventsOf(facingOff(200, MIRROR_MATCH), [[0, Input.Heavy], ...idle(5)]);
    expect(attacks).toEqual([{ type: 'attack', heavy: true, by: 1, move: 'standHeavy' }]);
  });

  // Combat v2 (§4): the grab holds, the blows land in the hold, then the throw and the fall.
  it('tells a grab, the pummels and the throw of a hold from a strike', () => {
    const hold = eventsOf(facingOff(30, MIRROR_MATCH), [
      [Input.Grab, 0],
      ...idle(17),
      [Input.Light, 0],
      ...idle(120),
    ]);
    const types = hold.filter((e) => e.type !== 'attack').map((e) => e.type);
    expect(types).toEqual(['grab', 'hit', 'throw', 'fall']);
    expect(hold.find((e) => e.type === 'grab')).toMatchObject({ by: 0, punish: false });
    expect(hold.find((e) => e.type === 'hit')).toMatchObject({ held: true, damage: 15 });
    const jab = eventsOf(facingOff(30, MIRROR_MATCH), [[Input.Light, 0], ...idle(20)]);
    expect(jab.find((e) => e.type === 'hit')).toMatchObject({ held: false });
  });

  it('reports the fall of a body knocked out in the air once, as it meets the floor (V1)', () => {
    // Riff's Retourné launches Nayo: on his last point, then at full health.
    const config: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, P] };
    const retourne: [number, number][] = [[Input.Left | Input.Heavy, 0], ...idle(80)];
    const out = eventsOf(facingOff(30, config, [{}, { health: 1 }]), retourne, config);
    expect(types(out)).toContain('ko');
    expect(out.filter((e) => e.type === 'fall')).toEqual([
      { type: 'fall', x: expect.any(Number) as number, away: 1, ko: true },
    ]);
    const alive = eventsOf(facingOff(30, config), retourne, config);
    expect(alive.filter((e) => e.type === 'fall')).toMatchObject([{ ko: false }]);
    // Knocked out on its feet, the body never flies: no fall.
    const jab = facingOff(30, MIRROR_MATCH, [{}, { health: 5 }]);
    expect(types(eventsOf(jab, [[Input.Light, 0], ...idle(80)]))).not.toContain('fall');
  });

  it('reports two grabs on the same tick as one tech', () => {
    const tech = eventsOf(facingOff(30, MIRROR_MATCH), [[Input.Grab, Input.Grab], ...idle(10)]);
    expect(tech.filter((e) => e.type === 'tech')).toHaveLength(1);
  });

  it('reports the Boost: a Remix, the Rewind and the super by their names (combos-v3 §1.8.7)', () => {
    const boosted = (config: MatchConfig, boost: number, ticks: [number, number][]) => {
      const start = facingOff(40, config, [{ boost }, {}]);
      const { x, y } = start.fighters[0];
      const spent = eventsOf(start, ticks, config).filter(
        (e) => e.type === 'boost' || e.type === 'rewind' || e.type === 'super',
      );
      return { spent, x, y };
    };
    const remix = boosted(MIRROR_MATCH, 1000, [[Input.Boost, 0], ...idle(30)]);
    expect(remix.spent).toEqual([{ type: 'boost', by: 0, x: remix.x, y: remix.y }]);
    // The Rewind, pressed in the Direct's freeze: a step toward the opponent.
    const jab: [number, number][] = [[Input.Light, 0], ...idle(6), [Input.Dash, 0], ...idle(30)];
    expect(boosted(MIRROR_MATCH, 1000, jab).spent).toMatchObject([
      { type: 'rewind', by: 0, name: 'Rewind', toward: 1 },
    ]);
    const megabasse = boosted(MIRROR_MATCH, 3000, [[Input.Left | Input.Boost, 0], ...idle(60)]);
    expect(megabasse.spent).toEqual([
      { type: 'super', by: 0, name: 'Mégabasse', x: megabasse.x, y: megabasse.y },
    ]);
    const riff: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, P] };
    expect(boosted(riff, 1000, jab).spent).toMatchObject([{ type: 'rewind', name: 'Pogo' }]);
    const slam = boosted(riff, 3000, [[Input.Left | Input.Boost, 0], ...idle(60)]);
    expect(slam.spent).toMatchObject([{ type: 'super', name: 'Slam' }]);
  });

  it("reports a super's freeze on the tick its flash freezes the game, once (docs/flashs.md §2)", () => {
    /** The tick of each event of player 1's super, its gauge full, `defense` played by player 2. */
    const ticksOf = (config: MatchConfig, defense = 0) => {
      let state = facingOff(40, config, [{ boost: BOOST_MAX }, {}]);
      const at: { type: string; tick: number }[] = [];
      const ticks: [number, number][] = [[Input.Left | Input.Boost, defense], ...idle(120)];
      ticks.forEach((inputs, tick) => {
        const next = step(state, inputs, config);
        const events: FightEvent[] = [];
        detectEvents(state, next, config, events);
        for (const event of events) at.push({ type: event.type, tick });
        state = next;
      });
      return (type: string) => at.filter((event) => event.type === type).map(({ tick }) => tick);
    };
    // Nayo's Mégabasse freezes on its first frame, Riff's Slam at the top of her dive.
    const nayo = ticksOf(MIRROR_MATCH);
    expect(nayo('freeze')).toEqual(nayo('super'));
    const riff = ticksOf({ stage: TRAINING_STAGE, fighters: [RIFF, P] });
    expect(riff('freeze')).toEqual(riff('super').map((tick) => tick + 10));
    // Cut short before its flash: spent, never frozen.
    const cut = ticksOf({ stage: TRAINING_STAGE, fighters: [RIFF, P] }, Input.Light);
    expect(cut('super')).toHaveLength(1);
    expect(cut('hit').length).toBeGreaterThan(0);
    expect(cut('freeze')).toEqual([]);
  });

  it("tells a super's blows before its last from its last, and from any other blow", () => {
    const pulses = (config: MatchConfig) =>
      eventsOf(
        facingOff(40, config, [{ boost: BOOST_MAX }, {}]),
        [[Input.Left | Input.Boost, 0], ...idle(120)],
        config,
      ).flatMap((event) => (event.type === 'hit' || event.type === 'ko' ? [event.pulse] : []));
    // BOOM, BOOM, BOOOOM; Riff's Slam lands twice.
    expect(pulses(MIRROR_MATCH)).toEqual([true, true, false]);
    expect(pulses({ stage: TRAINING_STAGE, fighters: [RIFF, P] })).toEqual([true, false]);
    const jab = eventsOf(facingOff(30, MIRROR_MATCH), [[Input.Light, 0], ...idle(30)]);
    expect(jab.find((event) => event.type === 'hit')).toMatchObject({ pulse: false });
  });

  it('carries the tier of the move that landed, and the damage it took (docs/flashs.md §4)', () => {
    const tiers = (config: MatchConfig) =>
      eventsOf(
        facingOff(40, config, [{ boost: BOOST_MAX }, {}]),
        [[Input.Left | Input.Boost, 0], ...idle(120)],
        config,
      ).flatMap((event) =>
        event.type === 'hit' || event.type === 'ko' ? [[event.tier, event.damage > 0]] : [],
      );
    expect(tiers(MIRROR_MATCH)).toEqual([
      [3, true],
      [3, true],
      [3, true],
    ]);
    const jab = eventsOf(facingOff(30, MIRROR_MATCH), [[Input.Light, 0], ...idle(30)]);
    expect(jab.find((event) => event.type === 'hit')).toMatchObject({
      tier: 0,
      damage: P.moves.standLight.damage,
    });
  });

  it('reports no Boost for a plain special nor a dash', () => {
    const plain = eventsOf(facingOff(200, MIRROR_MATCH), [[Input.Special, 0], ...idle(30)]);
    expect(types(plain)).not.toContain('boost');
    const dash = eventsOf(facingOff(200, MIRROR_MATCH), [[Input.Dash, 0], ...idle(30)]);
    expect(types(dash)).toEqual(['dash']);
  });
});

describe('the weight of a blow (docs/polish/AUDIT-ET-PLAN.md, P1)', () => {
  it('only adds weight: every blow heavy by its damage stays heavy, but the Vinyle', () => {
    for (const template of [P, RIFF]) {
      for (const [id, move] of Object.entries(template.moves)) {
        if (move.kind === 'movement' || move.damage < 60 || move.projectile) continue;
        expect(isHeavy(move), `${template.name} ${id}`).toBe(true);
      }
    }
  });

  it('makes heavy the six blows that hit as such, and the Vinyle light, a projectile', () => {
    // Light while their damage stayed under 60: Nayo's Mise au tapis; Riff's Hache, Retourné
    // sauté, Swipe (her strings' end), Coup de boule and Retourné.
    const heavy = (template: typeof P, id: MoveId) => isHeavy(moveOf(template, id));
    expect(heavy(P, 'lightFinisher')).toBe(true);
    for (const id of [
      'chainHigh',
      'chainLaunch',
      'lightFinisher',
      'chainHeavy',
      'backHeavy',
    ] as const) {
      expect(heavy(RIFF, id), id).toBe(true);
    }
    // Frozen 8 ticks: a projectile's freeze, light (Sakurai's rule).
    expect(isHeavy(P.moves.special)).toBe(false);
    // The jab stays light, the Crochet heavy.
    expect(isHeavy(P.moves.standLight)).toBe(false);
    expect(isHeavy(P.moves.standHeavy)).toBe(true);
  });
});

describe('the spark that shows the contact (docs/polish/AUDIT-ET-PLAN.md, P5)', () => {
  type Blow = Extract<FightEvent, { type: 'hit' | 'ko' }>;
  const blow = (tier: number, type: 'hit' | 'ko' = 'hit'): Blow => {
    const impact = { x: 0, y: 0, away: 1, by: 0, low: false, damage: 60, held: false } as const;
    const rest = { counter: null, tier, pulse: false, freeze: 8 } as const;
    return type === 'hit'
      ? { type, heavy: false, ...impact, ...rest }
      : { type, finish: 'plain', ...impact, ...rest };
  };

  it("pinpoints a special's blow and a Remix's, not a normal's, a super's nor the final blow", () => {
    expect([0, 1, 2, 3].map((tier) => pinpoints(blow(tier)))).toEqual([false, true, true, false]);
    expect(pinpoints(blow(1, 'ko'))).toBe(false);
  });

  it('pinpoints every projectile: each is a special or a Remix, the Vinyle as it lands', () => {
    const thrown = [P, RIFF].flatMap((template) =>
      Object.values(template.moves).filter((move) => move.projectile !== undefined),
    );
    expect(thrown.map((move) => move.name)).toEqual(['Vinyle', 'Vinyle platine']);
    for (const move of thrown) expect([1, 2], move.name).toContain(tierOf(move));
    const vinyle = eventsOf(facingOff(120, MIRROR_MATCH), [[Input.Special, 0], ...idle(60)]);
    const hit = vinyle.find((event) => event.type === 'hit');
    expect(hit?.type === 'hit' && pinpoints(hit)).toBe(true);
  });

  it("carries the blow's freeze, read in the state: its move's, a CONTRE's 3 ticks more", () => {
    const start = facingOff(40, MIRROR_MATCH);
    const contre = eventsOf(start, [[Input.Light, 0], [0, Input.Heavy], ...idle(30)]);
    expect(contre.find((e) => e.type === 'hit')).toMatchObject({
      counter: 'counter',
      freeze: P.moves.standLight.hitstop + COUNTER_HITSTOP,
    });
    const plain = eventsOf(start, [[Input.Light, 0], ...idle(30)]);
    expect(plain.find((e) => e.type === 'hit')).toMatchObject({
      freeze: P.moves.standLight.hitstop,
    });
  });
});

describe('vibrationFor', () => {
  const blow = { x: 0, y: 0, away: 1, by: 1, low: false } as const;

  it("shakes the phone of a player grabbed, pummeled, thrown or hit hard, and only that player's", () => {
    const grabbed: FightEvent = { type: 'grab', ...blow, punish: false, freeze: 30 };
    const pummel: FightEvent = {
      type: 'hit',
      ...blow,
      damage: 15,
      heavy: false,
      held: true,
      counter: null,
      tier: 0,
      pulse: false,
      freeze: 10,
    };
    const thrown: FightEvent = { type: 'throw', ...blow, damage: 100 };
    const heavy: FightEvent = {
      type: 'hit',
      ...blow,
      damage: 80,
      heavy: true,
      held: false,
      counter: null,
      tier: 0,
      pulse: false,
      freeze: 10,
    };
    expect(vibrationFor(grabbed, 0)).toBe(HAPTICS.grabbed);
    expect(vibrationFor(pummel, 0)).toBe(HAPTICS.pummel);
    expect(vibrationFor(thrown, 0)).toBe(HAPTICS.heavyHit);
    expect(vibrationFor(heavy, 0)).toBe(HAPTICS.heavyHit);
    for (const event of [grabbed, pummel, thrown]) expect(vibrationFor(event, 1)).toBe(0);
    // Its attacker feels a heavy blow given, a tick of the hand (P23).
    expect(vibrationFor(heavy, 1)).toBe(HAPTICS.heavyGiven);
  });

  it('buzzes both phones, hard, when a KO blows a Boost gauge up (an Ultime)', () => {
    const ko = {
      type: 'ko',
      x: 0,
      y: 0,
      away: 1,
      by: 0,
      low: false,
      damage: 90,
      held: false,
      counter: null,
      tier: 1,
      pulse: false,
      freeze: 10,
    } as const;
    expect(vibrationFor({ ...ko, finish: 'ultimate' }, 0)).toBe(HAPTICS.shatter);
    expect(vibrationFor({ ...ko, finish: 'ultimate' }, 1)).toBe(HAPTICS.shatter);
    expect(HAPTICS.shatter).toBeGreaterThan(HAPTICS.heavyHit * 5);
    expect(vibrationFor({ ...ko, finish: 'combo' }, 0)).toBe(0);
    expect(vibrationFor({ ...ko, finish: 'combo' }, 1)).toBe(HAPTICS.heavyHit);
  });

  it('leaves light hits, blocks and everything else alone', () => {
    const light: FightEvent = {
      type: 'hit',
      ...blow,
      damage: 30,
      heavy: false,
      held: false,
      counter: null,
      tier: 0,
      pulse: false,
      freeze: 10,
    };
    expect(vibrationFor(light, 0)).toBe(0);
    expect(vibrationFor({ type: 'block', ...blow }, 0)).toBe(0);
    expect(vibrationFor({ type: 'tech', ...blow }, 0)).toBe(0);
    expect(vibrationFor({ type: 'dash', x: 0, toward: 1 }, 0)).toBe(0);
  });
});
