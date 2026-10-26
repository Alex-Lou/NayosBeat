import { describe, expect, it } from 'vitest';
import { Input } from '../../src/core/input';
import { bitsFromGamepad, type GamepadSnapshot } from '../../src/input/gamepad';
import { bitsFromKeys, PLAYER1_KEYS, PLAYER2_KEYS } from '../../src/input/keyboard';
import { bitsFromStick } from '../../src/input/touch-controls';

describe('bitsFromKeys', () => {
  it('maps held keys to input flags', () => {
    expect(bitsFromKeys(new Set(['KeyD', 'Space']), PLAYER1_KEYS)).toBe(Input.Right | Input.Jump);
  });

  it("ignores the other player's keys", () => {
    expect(bitsFromKeys(new Set(['ArrowLeft']), PLAYER1_KEYS)).toBe(0);
    expect(bitsFromKeys(new Set(['ArrowLeft']), PLAYER2_KEYS)).toBe(Input.Left);
  });
});

function pad(pressedButtons: number[] = [], axes: number[] = [0, 0]): GamepadSnapshot {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: pressedButtons.includes(i) }));
  return { buttons, axes };
}

describe('bitsFromGamepad', () => {
  it('reads the d-pad and the south button', () => {
    expect(bitsFromGamepad(pad([12, 15, 0]))).toBe(Input.Up | Input.Right | Input.Jump);
  });

  it('reads the left stick beyond the deadzone only', () => {
    expect(bitsFromGamepad(pad([], [0.3, -0.3]))).toBe(0);
    expect(bitsFromGamepad(pad([], [-0.9, 0.9]))).toBe(Input.Left | Input.Down);
  });

  it('tolerates pads with missing buttons or axes', () => {
    expect(bitsFromGamepad({ buttons: [], axes: [] })).toBe(0);
  });
});

describe('bitsFromStick', () => {
  const DEADZONE = 12;

  it('is neutral inside the deadzone', () => {
    expect(bitsFromStick(5, -5, DEADZONE)).toBe(0);
  });

  it('maps cardinal directions (screen y points down)', () => {
    expect(bitsFromStick(40, 0, DEADZONE)).toBe(Input.Right);
    expect(bitsFromStick(0, -40, DEADZONE)).toBe(Input.Up);
    expect(bitsFromStick(0, 40, DEADZONE)).toBe(Input.Down);
  });

  it('maps diagonals', () => {
    expect(bitsFromStick(30, 30, DEADZONE)).toBe(Input.Right | Input.Down);
    expect(bitsFromStick(-30, -30, DEADZONE)).toBe(Input.Left | Input.Up);
  });

  it('splits the circle into 8 equal sectors', () => {
    const angle = (degrees: number) => [
      Math.cos((degrees * Math.PI) / 180) * 40,
      Math.sin((degrees * Math.PI) / 180) * 40,
    ];
    const [x20, y20] = angle(20);
    const [x25, y25] = angle(25);
    expect(bitsFromStick(x20 ?? 0, y20 ?? 0, DEADZONE)).toBe(Input.Right);
    expect(bitsFromStick(x25 ?? 0, y25 ?? 0, DEADZONE)).toBe(Input.Right | Input.Down);
  });
});
