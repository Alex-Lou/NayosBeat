import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { contactDistance } from '../../src/core/hold-pair';
import { Input, type InputBits } from '../../src/core/input';
import type { MoveId } from '../../src/core/move-data';
import {
  GRAB_HITSTOP,
  HOLD_LIMIT_FRAMES,
  STRUGGLE_FRAMES,
  THROW_TECH_STUN,
} from '../../src/core/rules';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { atHoldTick, catches, grabbed, last, NAYO_MIRROR, play, RIFF_MIRROR } from './hold-helpers';
import { facingOff, MATCH } from './helpers';

const { Up, Left, Right, Jump, Dash, Light, Heavy, Grab } = Input;

const RIFF_ON_NAYO: MatchConfig = { ...NAYO_MIRROR, fighters: [RIFF, NAYO] };

/** The holder's move on its first tick out of the clinch, after one input a tick from `from`. */
function choiceOf(from: GameState, ...inputs: readonly InputBits[]): MoveId | null {
  let state = from;
  for (const input of inputs) state = step(state, [input, 0], NAYO_MIRROR);
  return step(atHoldTick(state, 12), [0, 0], NAYO_MIRROR).fighters[0].move;
}

/** The rules of the hold (docs/combat-v2.md §4.2) that the cases of §4.6 rest on. */
describe('the grab catches (§4.2)', () => {
  it('catches and holds: the freeze, both still and standing, touching, the held one facing', () => {
    const state = grabbed();
    const [holder, held] = state.fighters;
    expect(state.hold).toEqual({
      holder: 0,
      frame: 0,
      limit: HOLD_LIMIT_FRAMES,
      techable: true,
      pummels: 0,
    });
    expect(state.hitstop).toBe(GRAB_HITSTOP);
    expect([holder.action, held.action]).toEqual(['holding', 'held']);
    expect(held.x - holder.x).toBe(contactDistance(NAYO, NAYO));
    expect(held.facing).toBe(-1);
    expect(state.contacts).toEqual([
      expect.objectContaining({ by: 0, kind: 'grab', move: 'grab', damage: 0, counter: null }),
    ]);
  });

  it('puts the centers at the sum of the half bodies: 27 px for Nayo holding Riff', () => {
    const [holder, held] = grabbed(MATCH).fighters;
    expect(held.x - holder.x).toBe(px(27));
  });

  it.each([
    { config: NAYO_MIRROR, reach: 43 },
    { config: RIFF_ON_NAYO, reach: 41 },
  ])('reaches $reach px, center to center, for $config.fighters.0.name', ({ config, reach }) => {
    expect(catches(facingOff(reach, config), 10, config)).toBe(true);
    expect(catches(facingOff(reach + 1, config), 10, config)).toBe(false);
  });

  it('takes a crouching guard and a pre-jump', () => {
    expect(catches(facingOff(30), 10, NAYO_MIRROR, () => Input.Down | Right)).toBe(true);
    expect(catches(facingOff(30), 10, NAYO_MIRROR, (tick) => (tick >= 3 ? Up : 0))).toBe(true);
  });

  it('Riff holds as Nayo does', () => {
    const state = grabbed(RIFF_MIRROR);
    expect(state.fighters[1].x - state.fighters[0].x).toBe(contactDistance(RIFF, RIFF));
  });
});

describe('the clinch (§4.2.6)', () => {
  it('PRISE in the clinch breaks free: pushed apart for 14 ticks, no damage', () => {
    const state = step(atHoldTick(grabbed(), 5), [0, Grab], NAYO_MIRROR);
    expect(state.hold).toBeNull();
    expect(state.contacts).toEqual([expect.objectContaining({ by: 1, kind: 'tech', damage: 0 })]);
    expect(state.fighters.map((f) => [f.action, f.stunFrames, Math.sign(f.vx)])).toEqual([
      ['tech', THROW_TECH_STUN, -1],
      ['tech', THROW_TECH_STUN, 1],
    ]);
    expect(state.fighters.map((f) => f.health)).toEqual([NAYO.maxHealth, NAYO.maxHealth]);
  });

  it('light + heavy breaks free too, and so does PRISE pressed during the freeze', () => {
    expect(step(atHoldTick(grabbed(), 2), [0, Light | Heavy], NAYO_MIRROR).hold).toBeNull();
    const frozen = step(grabbed(), [0, Grab], NAYO_MIRROR);
    expect(last(play(frozen, 6), frozen).hold).toBeNull();
  });

  it("keeps the holder's choice through the clinch, played on its first tick out of it", () => {
    let state = step(atHoldTick(grabbed(), 3), [Heavy, 0], NAYO_MIRROR);
    state = atHoldTick(state, 12);
    expect(state.fighters[0].move).toBeNull();
    state = step(state, [0, 0], NAYO_MIRROR);
    expect(state.fighters[0]).toMatchObject({ move: 'throwForward', actionFrame: 0 });
  });

  it.each([
    { stray: 'up', input: Up },
    { stray: 'jump', input: Jump },
    { stray: 'DASH', input: Dash },
  ])('keeps the choice when $stray is pressed after it: no move in a hold', ({ input }) => {
    const t3 = atHoldTick(grabbed(), 3);
    expect(choiceOf(t3, Light, 0, input)).toBe('pummel');
    expect(choiceOf(t3, Left | Heavy, Left, Left | input)).toBe('throwBack');
    expect(choiceOf(grabbed(), Light, 0, input)).toBe('pummel');
  });

  it('keeps a choice pressed early in a knee, played when the knee ends', () => {
    let knee = step(atHoldTick(grabbed(), 12), [Light, 0], NAYO_MIRROR);
    expect(knee.fighters[0].move).toBe('pummel');
    knee = step(step(knee, [0, 0], NAYO_MIRROR), [0, 0], NAYO_MIRROR);
    for (const [press, next] of [
      [Light, 'pummel'],
      [Left | Heavy, 'throwBack'],
    ] as const) {
      let state = step(knee, [press, 0], NAYO_MIRROR);
      for (let tick = 0; tick < 40 && state.fighters[0].move === 'pummel'; tick++) {
        state = step(state, [0, 0], NAYO_MIRROR);
      }
      for (let tick = 0; tick < 3 && state.fighters[0].move === null; tick++) {
        state = step(state, [0, 0], NAYO_MIRROR);
      }
      expect(state.fighters[0].move, `after ${next}`).toBe(next);
    }
  });

  it('plays the last real choice: L, then H, throws forward', () => {
    expect(choiceOf(atHoldTick(grabbed(), 3), Light, 0, Heavy)).toBe('throwForward');
  });
});

describe('the struggle (§4.2.8)', () => {
  it('takes 3 ticks off for each button pressed after the clinch, none for directions', () => {
    const at12 = atHoldTick(grabbed(), 12);
    expect(step(at12, [0, Light], NAYO_MIRROR).hold?.limit).toBe(HOLD_LIMIT_FRAMES - 3);
    expect(step(at12, [0, Left], NAYO_MIRROR).hold?.limit).toBe(HOLD_LIMIT_FRAMES);
    const clinch = step(atHoldTick(grabbed(), 4), [0, Light], NAYO_MIRROR);
    expect(clinch.hold?.limit).toBe(HOLD_LIMIT_FRAMES);
  });

  it('counts the presses made during a freeze', () => {
    let state = step(atHoldTick(grabbed(), 12), [Light, 0], NAYO_MIRROR);
    while (state.hitstop === 0) state = step(state, [0, 0], NAYO_MIRROR);
    state = step(state, [0, Heavy], NAYO_MIRROR);
    expect(state.hitstop).toBeGreaterThan(0);
    expect(state.hold?.limit).toBe(HOLD_LIMIT_FRAMES - STRUGGLE_FRAMES);
  });
});

describe('training (§4.2.12)', () => {
  it('heals nobody in training while the hold lasts', () => {
    const training: MatchConfig = { ...NAYO_MIRROR, training: true };
    const start = grabbed(training, [{}, { health: 500 }]);
    const states = play(start, 60, undefined, training);
    expect(states.every((state) => state.fighters[1].health === 500)).toBe(true);
  });
});
