import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO as P } from '../../src/data/fighters/nayo';
import {
  detectEvents,
  HAPTICS,
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

  it('tells a grab from a strike', () => {
    const grab = eventsOf(facingOff(30, MIRROR_MATCH), [[Input.Grab, 0], ...idle(20)]);
    expect(grab.find((e) => e.type === 'hit')).toMatchObject({ grab: true });
    const jab = eventsOf(facingOff(30, MIRROR_MATCH), [[Input.Light, 0], ...idle(20)]);
    expect(jab.find((e) => e.type === 'hit')).toMatchObject({ grab: false });
  });
});

describe('vibrationFor', () => {
  const blow = { x: 0, y: 0, away: 1, by: 1 } as const;

  it("shakes the phone of a player grabbed, or hit hard, and only that player's", () => {
    const grabbed: FightEvent = { type: 'hit', ...blow, damage: 110, heavy: true, grab: true };
    const heavy: FightEvent = { type: 'hit', ...blow, damage: 80, heavy: true, grab: false };
    expect(vibrationFor(grabbed, 0)).toBe(HAPTICS.grabbed);
    expect(vibrationFor(heavy, 0)).toBe(HAPTICS.heavyHit);
    expect(vibrationFor(heavy, 1)).toBe(0);
  });

  it('leaves light hits, blocks and everything else alone', () => {
    const light: FightEvent = { type: 'hit', ...blow, damage: 30, heavy: false, grab: false };
    expect(vibrationFor(light, 0)).toBe(0);
    expect(vibrationFor({ type: 'block', ...blow }, 0)).toBe(0);
    expect(vibrationFor({ type: 'dash', x: 0, toward: 1 }, 0)).toBe(0);
  });
});
