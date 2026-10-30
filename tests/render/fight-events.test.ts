import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO as P } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { BOOST_MAX } from '../../src/core/rules';
import {
  COMBO_KO_HITS,
  detectEvents,
  HAPTICS,
  koFinishOf,
  vibrationFor,
  type FightEvent,
} from '../../src/render/fight-events';
import { facingOff, MIRROR_MATCH, repeat } from '../core/helpers';

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
    expect(koFinishOf(0, 1)).toBe('plain');
    expect(koFinishOf(1, COMBO_KO_HITS - 1)).toBe('plain');
    expect(koFinishOf(0, COMBO_KO_HITS)).toBe('combo');
    expect(koFinishOf(3, 1)).toBe('finisher');
    // A jab alone.
    const jab = facingOff(30, MIRROR_MATCH, [{}, { health: 5 }]);
    const plain = eventsOf(jab, [[Input.Light, 0], ...idle(10)]).find((e) => e.type === 'ko');
    expect(plain).toMatchObject({ type: 'ko', finish: 'plain' });
    // The super: BOOST and back, the gauge full.
    const full = facingOff(30, MIRROR_MATCH, [{ boost: BOOST_MAX }, { health: 5 }]);
    const events = eventsOf(full, [[Input.Boost | Input.Left, 0], ...idle(120)]);
    expect(events.find((e) => e.type === 'ko')).toMatchObject({ type: 'ko', finish: 'finisher' });
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

  it('reports no Boost for a plain special nor a dash', () => {
    const plain = eventsOf(facingOff(200, MIRROR_MATCH), [[Input.Special, 0], ...idle(30)]);
    expect(types(plain)).not.toContain('boost');
    const dash = eventsOf(facingOff(200, MIRROR_MATCH), [[Input.Dash, 0], ...idle(30)]);
    expect(types(dash)).toEqual(['dash']);
  });
});

describe('vibrationFor', () => {
  const blow = { x: 0, y: 0, away: 1, by: 1, low: false } as const;

  it("shakes the phone of a player grabbed, pummeled, thrown or hit hard, and only that player's", () => {
    const grabbed: FightEvent = { type: 'grab', ...blow, punish: false };
    const pummel: FightEvent = {
      type: 'hit',
      ...blow,
      damage: 15,
      heavy: false,
      held: true,
      counter: null,
    };
    const thrown: FightEvent = { type: 'throw', ...blow, damage: 100 };
    const heavy: FightEvent = {
      type: 'hit',
      ...blow,
      damage: 80,
      heavy: true,
      held: false,
      counter: null,
    };
    expect(vibrationFor(grabbed, 0)).toBe(HAPTICS.grabbed);
    expect(vibrationFor(pummel, 0)).toBe(HAPTICS.pummel);
    expect(vibrationFor(thrown, 0)).toBe(HAPTICS.heavyHit);
    expect(vibrationFor(heavy, 0)).toBe(HAPTICS.heavyHit);
    for (const event of [grabbed, pummel, thrown, heavy]) expect(vibrationFor(event, 1)).toBe(0);
  });

  it('buzzes both phones, hard, when a KO blows a Boost gauge up (an Ultime)', () => {
    const ko = {
      type: 'ko',
      x: 0,
      y: 0,
      away: 1,
      by: 0,
      low: false,
      held: false,
      counter: null,
    } as const;
    expect(vibrationFor({ ...ko, finish: 'finisher' }, 0)).toBe(HAPTICS.shatter);
    expect(vibrationFor({ ...ko, finish: 'finisher' }, 1)).toBe(HAPTICS.shatter);
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
    };
    expect(vibrationFor(light, 0)).toBe(0);
    expect(vibrationFor({ type: 'block', ...blow }, 0)).toBe(0);
    expect(vibrationFor({ type: 'tech', ...blow }, 0)).toBe(0);
    expect(vibrationFor({ type: 'dash', x: 0, toward: 1 }, 0)).toBe(0);
  });
});
