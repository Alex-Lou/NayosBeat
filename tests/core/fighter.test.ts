import { describe, expect, it } from 'vitest';
import { px } from '../../src/core/constants';
import { updateFighter } from '../../src/core/fighter';
import { Input } from '../../src/core/input';
import type { FighterState } from '../../src/core/state';
import { GREYBOX_FIGHTER as STATS } from '../../src/data/fighters';

const OPPONENT_X = px(500);

function fighter(overrides: Partial<FighterState> = {}): FighterState {
  return {
    x: px(400),
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    action: 'idle',
    actionFrame: 0,
    ...overrides,
  };
}

function hold(state: FighterState, input: number, ticks: number): FighterState {
  let current = state;
  for (let i = 0; i < ticks; i++) current = updateFighter(current, input, STATS, OPPONENT_X);
  return current;
}

describe('updateFighter', () => {
  it('walks forward toward the opponent', () => {
    const result = hold(fighter(), Input.Right, 10);
    expect(result.action).toBe('walkForward');
    expect(result.x).toBe(px(400) + 10 * STATS.walkForwardSpeed);
  });

  it('walks back more slowly than forward', () => {
    const result = hold(fighter(), Input.Left, 10);
    expect(result.action).toBe('walkBack');
    expect(result.x).toBe(px(400) - 10 * STATS.walkBackSpeed);
  });

  it('counts frames spent in the same action', () => {
    expect(hold(fighter(), Input.Right, 5).actionFrame).toBe(4);
  });

  it('does not move while crouching', () => {
    const result = hold(fighter(), Input.Down | Input.Right, 10);
    expect(result.action).toBe('crouch');
    expect(result.x).toBe(px(400));
  });

  it('turns to face the opponent when grounded', () => {
    const result = updateFighter(fighter({ facing: -1 }), 0, STATS, OPPONENT_X);
    expect(result.facing).toBe(1);
  });

  it('keeps facing while airborne (cross-ups)', () => {
    const airborne = fighter({ action: 'air', y: px(50), vy: 0, facing: -1 });
    expect(updateFighter(airborne, 0, STATS, OPPONENT_X).facing).toBe(-1);
  });

  it('ignores left + right together (SOCD neutral)', () => {
    expect(hold(fighter(), Input.Left | Input.Right, 3).action).toBe('idle');
  });

  describe('jump', () => {
    it('stays grounded during pre-jump frames', () => {
      const result = hold(fighter(), Input.Up, STATS.preJumpFrames);
      expect(result.action).toBe('preJump');
      expect(result.y).toBe(0);
    });

    it('takes off after pre-jump with the direction held at take-off', () => {
      let state = hold(fighter(), Input.Up, STATS.preJumpFrames);
      state = updateFighter(state, Input.Up | Input.Right, STATS, OPPONENT_X);
      expect(state.action).toBe('air');
      expect(state.vx).toBe(STATS.jumpForwardSpeed);
      expect(state.y).toBeGreaterThan(0);
    });

    it('cannot be steered in the air', () => {
      let state = hold(fighter(), Input.Up, STATS.preJumpFrames + 1);
      state = hold(state, Input.Left, 5);
      expect(state.vx).toBe(0);
    });

    it('lands, recovers, then becomes idle', () => {
      let state = hold(fighter(), Input.Jump, STATS.preJumpFrames + 1);
      let airTicks = 1;
      while (state.action === 'air') {
        state = updateFighter(state, 0, STATS, OPPONENT_X);
        airTicks++;
      }
      expect(state.action).toBe('landing');
      expect(state.y).toBe(0);
      expect(airTicks).toBeGreaterThan(30);
      expect(airTicks).toBeLessThan(45);

      state = hold(state, Input.Up, STATS.landingFrames);
      expect(state.action).toBe('idle');
    });

    it('reaches a jump height that clears a standing opponent', () => {
      let state = hold(fighter(), Input.Up, STATS.preJumpFrames + 1);
      let apex = 0;
      while (state.action === 'air') {
        apex = Math.max(apex, state.y);
        state = updateFighter(state, 0, STATS, OPPONENT_X);
      }
      expect(apex).toBeGreaterThan(STATS.standingPushbox.height);
    });
  });
});
