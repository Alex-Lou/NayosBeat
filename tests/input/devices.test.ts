import { describe, expect, it } from 'vitest';
import { Input } from '../../src/core/input';
import { bitsFromGamepad, type GamepadSnapshot } from '../../src/input/gamepad';
import { bitsFromKeys, KeyboardInput, PLAYER1_KEYS, PLAYER2_KEYS } from '../../src/input/keyboard';
import { bitsFromStick } from '../../src/input/touch-controls';

describe('bitsFromKeys', () => {
  it('maps held keys to input flags', () => {
    expect(bitsFromKeys(new Set(['KeyD', 'Space']), PLAYER1_KEYS)).toBe(Input.Right | Input.Jump);
  });

  it('maps attack buttons for both players, with a laptop fallback for player 2', () => {
    expect(bitsFromKeys(new Set(['KeyJ', 'KeyK']), PLAYER1_KEYS)).toBe(Input.Light | Input.Heavy);
    expect(bitsFromKeys(new Set(['Numpad1']), PLAYER2_KEYS)).toBe(Input.Light);
    expect(bitsFromKeys(new Set(['Slash']), PLAYER2_KEYS)).toBe(Input.Heavy);
  });

  it('maps the special button for both players', () => {
    expect(bitsFromKeys(new Set(['KeyL']), PLAYER1_KEYS)).toBe(Input.Special);
    expect(bitsFromKeys(new Set(['Numpad3']), PLAYER2_KEYS)).toBe(Input.Special);
    expect(bitsFromKeys(new Set(['Quote']), PLAYER2_KEYS)).toBe(Input.Special);
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

describe('KeyboardInput', () => {
  function key(type: 'keydown' | 'keyup', code: string): Event {
    return Object.assign(new Event(type, { cancelable: true }), { code });
  }

  function setup() {
    const target = new EventTarget();
    const keyboard = new KeyboardInput(target as unknown as Window, [PLAYER1_KEYS, PLAYER2_KEYS]);
    return { target, keyboard };
  }

  it('reports held keys until released', () => {
    const { target, keyboard } = setup();
    target.dispatchEvent(key('keydown', 'KeyD'));
    keyboard.endFrame();
    expect(keyboard.read(0)).toBe(Input.Right);
    target.dispatchEvent(key('keyup', 'KeyD'));
    expect(keyboard.read(0)).toBe(0);
  });

  it('keeps a tap shorter than a frame for one read', () => {
    const { target, keyboard } = setup();
    target.dispatchEvent(key('keydown', 'KeyJ'));
    target.dispatchEvent(key('keyup', 'KeyJ'));
    expect(keyboard.read(0)).toBe(Input.Light);
    keyboard.endFrame();
    expect(keyboard.read(0)).toBe(0);
  });

  it('captures only bound keys and stops listening once disposed', () => {
    const { target, keyboard } = setup();
    const unbound = key('keydown', 'F5');
    target.dispatchEvent(unbound);
    expect(unbound.defaultPrevented).toBe(false);

    keyboard.dispose();
    target.dispatchEvent(key('keydown', 'KeyD'));
    expect(keyboard.read(0)).toBe(0);
  });
});

describe('bitsFromGamepad', () => {
  it('reads the d-pad and the south button', () => {
    expect(bitsFromGamepad(pad([12, 15, 0]))).toBe(Input.Up | Input.Right | Input.Jump);
  });

  it('reads the attack buttons', () => {
    expect(bitsFromGamepad(pad([2, 3]))).toBe(Input.Light | Input.Heavy);
  });

  it('reads special on east and a throw shortcut on the right bumper', () => {
    expect(bitsFromGamepad(pad([1]))).toBe(Input.Special);
    expect(bitsFromGamepad(pad([5]))).toBe(Input.Light | Input.Heavy);
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
