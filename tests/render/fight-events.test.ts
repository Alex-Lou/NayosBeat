import { describe, expect, it } from 'vitest';
import { Input } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { POLYVALENT as P } from '../../src/data/fighters';
import { detectEvents, type FightEvent } from '../../src/render/fight-events';
import { facingOff, MIRROR_MATCH } from '../core/helpers';

/** Plays scripted ticks and collects every event detected along the way. */
function eventsOf(start: GameState, ticks: [number, number][]): FightEvent[] {
  const events: FightEvent[] = [];
  let state = start;
  for (const inputs of ticks) {
    const next = step(state, inputs, MIRROR_MATCH);
    events.push(...detectEvents(state, next, MIRROR_MATCH));
    state = next;
  }
  return events;
}

const idle = (ticks: number): [number, number][] => Array(ticks).fill([0, 0]);
const types = (events: FightEvent[]) => events.map((e) => e.type);

describe('detectEvents', () => {
  it('reports an attack start, then a single hit with its damage', () => {
    const events = eventsOf(facingOff(30, MIRROR_MATCH), [[Input.Light, 0], ...idle(30)]);
    expect(types(events)).toEqual(['attack', 'hit']);
    expect(events[1]).toMatchObject({ type: 'hit', damage: P.moves.standLight.damage });
  });

  it('reports a single block even though the game freezes on impact', () => {
    const events = eventsOf(facingOff(30, MIRROR_MATCH), [
      [Input.Heavy, Input.Right],
      ...Array(30).fill([0, Input.Right]),
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
      ...Array(6).fill([Input.Up, 0]),
      ...idle(50),
    ]);
    expect(types(jump)).toEqual(['jump', 'land']);
  });

  it('reports round phase changes', () => {
    const start = facingOff(30, MIRROR_MATCH, [{}, { health: 5 }]);
    const events = eventsOf(start, [[Input.Light, 0], ...idle(10)]);
    expect(events).toContainEqual({ type: 'phase', phase: 'roundEnd' });
  });

  it('places the contact point between the fighters', () => {
    const start = facingOff(30, MIRROR_MATCH);
    const hit = eventsOf(start, [[Input.Light, 0], ...idle(10)]).find((e) => e.type === 'hit');
    const [a, b] = start.fighters;
    expect(hit && 'x' in hit && hit.x > a.x && hit.x < b.x).toBe(true);
  });
});
