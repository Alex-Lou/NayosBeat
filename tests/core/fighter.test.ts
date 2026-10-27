import { describe, expect, it } from 'vitest';
import { px } from '../../src/core/constants';
import { updateFighter } from '../../src/core/fighter';
import { Input } from '../../src/core/input';
import { moveDuration } from '../../src/core/moves';
import { INPUT_BUFFER_FRAMES } from '../../src/core/rules';
import type { FighterState } from '../../src/core/state';
import { NAYO as T } from '../../src/data/fighters/nayo';
import { makeFighter } from './helpers';

const OPPONENT_X = px(500);

function hold(state: FighterState, input: number, ticks: number): FighterState {
  let current = state;
  for (let i = 0; i < ticks; i++) current = updateFighter(current, input, T, OPPONENT_X);
  return current;
}

/** Runs ticks with a different input on each tick. */
function play(state: FighterState, inputs: number[]): FighterState {
  return inputs.reduce((current, input) => updateFighter(current, input, T, OPPONENT_X), state);
}

describe('movement', () => {
  it('walks forward toward the opponent', () => {
    const result = hold(makeFighter(), Input.Right, 10);
    expect(result.action).toBe('walkForward');
    expect(result.x).toBe(px(400) + 10 * T.walkForwardSpeed);
  });

  it('walks back more slowly than forward', () => {
    const result = hold(makeFighter(), Input.Left, 10);
    expect(result.action).toBe('walkBack');
    expect(result.x).toBe(px(400) - 10 * T.walkBackSpeed);
  });

  it('counts frames spent in the same action', () => {
    expect(hold(makeFighter(), Input.Right, 5).actionFrame).toBe(4);
  });

  it('does not move while crouching', () => {
    const result = hold(makeFighter(), Input.Down | Input.Right, 10);
    expect(result.action).toBe('crouch');
    expect(result.crouching).toBe(true);
    expect(result.x).toBe(px(400));
  });

  it('turns to face the opponent when grounded', () => {
    expect(updateFighter(makeFighter({ facing: -1 }), 0, T, OPPONENT_X).facing).toBe(1);
  });

  it('keeps facing while airborne (cross-ups)', () => {
    const airborne = makeFighter({ action: 'air', y: px(50), facing: -1 });
    expect(updateFighter(airborne, 0, T, OPPONENT_X).facing).toBe(-1);
  });

  it('ignores left + right together (SOCD neutral)', () => {
    expect(hold(makeFighter(), Input.Left | Input.Right, 3).action).toBe('idle');
  });
});

describe('jump', () => {
  it('stays grounded during pre-jump frames', () => {
    const result = hold(makeFighter(), Input.Up, T.preJumpFrames);
    expect(result.action).toBe('preJump');
    expect(result.y).toBe(0);
  });

  it('takes off with the direction held at take-off', () => {
    let state = hold(makeFighter(), Input.Up, T.preJumpFrames);
    state = updateFighter(state, Input.Up | Input.Right, T, OPPONENT_X);
    expect(state.action).toBe('air');
    expect(state.vx).toBe(T.jumpForwardSpeed);
    expect(state.y).toBeGreaterThan(0);
  });

  it('cannot be steered in the air', () => {
    let state = hold(makeFighter(), Input.Up, T.preJumpFrames + 1);
    state = hold(state, Input.Left, 5);
    expect(state.vx).toBe(0);
  });

  it('lands, recovers, then acts again', () => {
    let state = hold(makeFighter(), Input.Jump, T.preJumpFrames + 1);
    let airTicks = 1;
    while (state.action === 'air') {
      state = updateFighter(state, 0, T, OPPONENT_X);
      airTicks++;
    }
    expect(state.action).toBe('landing');
    expect(airTicks).toBeGreaterThan(30);
    expect(airTicks).toBeLessThan(45);

    state = hold(state, Input.Right, T.landingFrames);
    expect(state.action).toBe('walkForward');
  });

  it('clears a standing opponent at its apex', () => {
    let state = hold(makeFighter(), Input.Up, T.preJumpFrames + 1);
    let apex = 0;
    while (state.action === 'air') {
      apex = Math.max(apex, state.y);
      state = updateFighter(state, 0, T, OPPONENT_X);
    }
    // The v2 jump peaks at 79.6 px, under a standing head: what clears it is the air pushbox,
    // raised off the feet (§3.5).
    expect(apex + T.airPushbox.lift).toBeGreaterThan(T.standingPushbox.height);
  });
});

describe('attacks', () => {
  it('starts on the press, not while the button is held', () => {
    const pressed = updateFighter(makeFighter(), Input.Light, T, OPPONENT_X);
    expect(pressed.action).toBe('attack');
    expect(pressed.move).toBe('standLight');

    const held = hold(pressed, Input.Light, moveDuration(T.moves.standLight) + 5);
    expect(held.action).toBe('idle');
  });

  it('uses the crouching version when down is held', () => {
    const result = updateFighter(makeFighter(), Input.Down | Input.Heavy, T, OPPONENT_X);
    expect(result.move).toBe('crouchHeavy');
    expect(result.crouching).toBe(true);
  });

  it('lasts exactly startup + active + recovery ticks', () => {
    const duration = moveDuration(T.moves.standHeavy);
    const started = updateFighter(makeFighter(), Input.Heavy, T, OPPONENT_X);
    expect(hold(started, 0, duration - 1).action).toBe('attack');
    expect(hold(started, 0, duration).action).toBe('idle');
  });

  it('roots the fighter in place', () => {
    const started = updateFighter(makeFighter(), Input.Heavy, T, OPPONENT_X);
    expect(hold(started, Input.Right, 5).x).toBe(px(400));
  });

  it('buffers a press made shortly before the fighter can act', () => {
    const duration = moveDuration(T.moves.standLight);
    const started = updateFighter(makeFighter(), Input.Light, T, OPPONENT_X);
    const busy = hold(started, 0, duration - 3);
    // Pressed 2 ticks before the end of the attack, released right after.
    const result = play(busy, [Input.Heavy, 0, 0]);
    expect(result.move).toBe('standHeavy');
    expect(result.actionFrame).toBe(0);
  });

  it('forgets a press older than the buffer window', () => {
    const duration = moveDuration(T.moves.standLight);
    const started = updateFighter(makeFighter(), Input.Light, T, OPPONENT_X);
    const busy = hold(started, 0, duration - INPUT_BUFFER_FRAMES - 3);
    const result = play(busy, [Input.Heavy, ...Array<number>(INPUT_BUFFER_FRAMES + 3).fill(0)]);
    expect(result.action).toBe('idle');
  });

  it('allows one attack per jump', () => {
    let state = hold(makeFighter(), Input.Up, T.preJumpFrames + 1);
    state = play(state, [Input.Heavy]);
    expect(state.action).toBe('airAttack');
    expect(state.move).toBe('jumpHeavy');
    state = hold(state, 0, moveDuration(T.moves.jumpHeavy));
    state = play(state, [Input.Light, 0]);
    expect(state.move).toBe('jumpHeavy');
  });

  it('cancels an air attack on landing', () => {
    let state = hold(makeFighter(), Input.Up, T.preJumpFrames + 1);
    state = play(state, [Input.Heavy]);
    while (state.y > 0) state = updateFighter(state, 0, T, OPPONENT_X);
    expect(state.action).toBe('landing');
    expect(state.move).toBeNull();
  });
});

describe('stun', () => {
  it('cannot act during hitstun, then acts on the next tick', () => {
    const stunned = makeFighter({ action: 'hitstun', stunFrames: 10 });
    expect(play(stunned, [Input.Light, 0, Input.Light]).action).toBe('hitstun');

    const during = hold(stunned, 0, 10);
    expect(during.action).toBe('hitstun');
    expect(updateFighter(during, Input.Light, T, OPPONENT_X).action).toBe('attack');
  });

  it('slides back with friction during stun', () => {
    const stunned = makeFighter({ action: 'blockstun', stunFrames: 30, vx: px(-3) });
    const result = hold(stunned, 0, 30);
    expect(result.x).toBeLessThan(px(400));
    expect(result.vx).toBe(0);
  });

  it('falls and lies down after an air hit, then gets up', () => {
    const hit = makeFighter({ action: 'airHit', y: px(40), vy: px(3) });
    let state = hit;
    while (state.y > 0) state = updateFighter(state, 0, T, OPPONENT_X);
    expect(state.action).toBe('knockdown');
    state = hold(state, 0, T.knockdownFrames);
    expect(state.action).toBe('knockdown');
    expect(updateFighter(state, 0, T, OPPONENT_X).action).toBe('idle');
  });

  it('stays down once KO', () => {
    expect(hold(makeFighter({ action: 'ko', health: 0 }), Input.Light, 100).action).toBe('ko');
  });
});
