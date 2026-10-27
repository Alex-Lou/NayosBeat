import { describe, expect, it } from 'vitest';
import { pressedButton, readInput } from '../../src/core/commands';
import { Input } from '../../src/core/input';
import { DIRECTION_HISTORY_FRAMES, INPUT_BUFFER_FRAMES } from '../../src/core/rules';
import { makeFighter } from './helpers';

const { Down, Right, Light, Heavy, Special, Jump } = Input;

describe('pressedButton', () => {
  it('reads each attack button', () => {
    expect(pressedButton(Light, Light)).toBe('light');
    expect(pressedButton(Heavy, Heavy)).toBe('heavy');
    expect(pressedButton(Special, Special)).toBe('special');
  });

  it('reads light + heavy as a grab, even when one of them was already held', () => {
    expect(pressedButton(Light | Heavy, Light | Heavy)).toBe('grab');
    expect(pressedButton(Heavy, Light | Heavy)).toBe('grab');
  });

  it('prefers the special, then the heavy, on the same tick', () => {
    expect(pressedButton(Light | Special, Light | Special)).toBe('special');
    expect(pressedButton(Heavy | Special, Heavy | Special)).toBe('special');
  });

  it('only counts new presses', () => {
    expect(pressedButton(0, Light)).toBeNull();
    expect(pressedButton(Jump | Right, Jump | Right)).toBeNull();
  });
});

describe('readInput', () => {
  it('buffers a press with the direction, motion and side it was made with', () => {
    const fighter = makeFighter({ directionHistory: [Down, Down | Right] });
    const read = readInput(fighter, Right | Light, true);
    expect(read).toMatchObject({
      input: Right | Light,
      bufferedCommand: 'light',
      bufferFrames: INPUT_BUFFER_FRAMES,
      bufferedInput: Right | Light,
      bufferedMotion: 'quarterCircleForward',
      bufferedFacing: 1,
    });
  });

  it('forgets the press once the buffer runs out, but not during hitstop', () => {
    let fighter = readInput(makeFighter(), Light, true);
    for (let i = 0; i < 20; i++) fighter = readInput(fighter, Light, false);
    expect(fighter.bufferedCommand).toBe('light');
    for (let i = 0; i < INPUT_BUFFER_FRAMES; i++) fighter = readInput(fighter, Light, true);
    expect(fighter.bufferedCommand).toBeNull();
  });

  it('keeps the last ticks of directions only, without the buttons', () => {
    let fighter = makeFighter();
    for (let i = 0; i < DIRECTION_HISTORY_FRAMES; i++) fighter = readInput(fighter, Down, true);
    fighter = readInput(fighter, Right | Light, true);
    expect(fighter.directionHistory).toHaveLength(DIRECTION_HISTORY_FRAMES);
    expect(fighter.directionHistory.at(-1)).toBe(Right);
    expect(fighter.directionHistory.at(-2)).toBe(Down);
  });
});
