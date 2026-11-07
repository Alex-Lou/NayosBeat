import { describe, expect, it } from 'vitest';
import { Input } from '../../src/core/input';
import { repeat } from '../core/helpers';
import {
  bitsFromGamepad,
  GamepadReader,
  STICK_PRESS,
  STICK_RELEASE,
  type GamepadSnapshot,
} from '../../src/input/gamepad';
import { bitsFromKeys, KeyboardInput, PLAYER1_KEYS, PLAYER2_KEYS } from '../../src/input/keyboard';
import { bitsFromDpad, DPAD_PRESS, DPAD_RELEASE } from '../../src/input/touch-dpad';

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

  it('maps the grab and the dash for both players, with a laptop fallback for player 2', () => {
    expect(bitsFromKeys(new Set(['KeyI']), PLAYER1_KEYS)).toBe(Input.Grab);
    expect(bitsFromKeys(new Set(['ShiftLeft']), PLAYER1_KEYS)).toBe(Input.Dash);
    expect(bitsFromKeys(new Set(['Numpad4']), PLAYER2_KEYS)).toBe(Input.Grab);
    expect(bitsFromKeys(new Set(['Numpad0']), PLAYER2_KEYS)).toBe(Input.Dash);
    expect(bitsFromKeys(new Set(['Semicolon']), PLAYER2_KEYS)).toBe(Input.Grab);
    expect(bitsFromKeys(new Set(['ShiftRight']), PLAYER2_KEYS)).toBe(Input.Dash);
    // Light + heavy stays an alias of the grab, read by the commands.
    expect(bitsFromKeys(new Set(['KeyJ', 'KeyK']), PLAYER1_KEYS)).toBe(Input.Light | Input.Heavy);
  });

  it('gives every key to one player only', () => {
    const shared = Object.keys(PLAYER1_KEYS).filter((code) => code in PLAYER2_KEYS);
    expect(shared).toEqual([]);
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

  it('reads special on east, the grab on the right bumper and the dash on the left one', () => {
    expect(bitsFromGamepad(pad([1]))).toBe(Input.Special);
    // The right bumper was a light + heavy shortcut: it is the grab button now (§2.3).
    expect(bitsFromGamepad(pad([5]))).toBe(Input.Grab);
    expect(bitsFromGamepad(pad([4]))).toBe(Input.Dash);
  });

  it('reads the left stick beyond the deadzone only', () => {
    expect(bitsFromGamepad(pad([], [0.3, -0.3]))).toBe(0);
    expect(bitsFromGamepad(pad([], [-0.9, 0.9]))).toBe(Input.Left | Input.Down);
  });

  it('tolerates pads with missing buttons or axes', () => {
    expect(bitsFromGamepad({ buttons: [], axes: [] })).toBe(0);
  });

  it('takes a stick direction at 0.5 and lets it go under 0.35 (hysteresis)', () => {
    const at = (x: number, previous = 0) => bitsFromGamepad(pad([], [x, 0]), previous);
    expect(at(STICK_PRESS)).toBe(0);
    expect(at(STICK_PRESS + 0.01)).toBe(Input.Right);
    // Already pushed: kept down to the release threshold.
    expect(at(0.4, Input.Right)).toBe(Input.Right);
    expect(at(STICK_RELEASE, Input.Right)).toBe(0);
    // Each direction has its own memory.
    expect(at(-0.4, Input.Right)).toBe(0);
    expect(bitsFromGamepad(pad([], [0, -0.4]), Input.Up)).toBe(Input.Up);
  });
});

describe('GamepadReader', () => {
  const indexed = (index: number, x: number) => ({ ...pad([], [x, 0]), index });

  it('remembers the stick of each pad: a trembling stick makes no double tap', () => {
    const reader = new GamepadReader();
    const reads = [0.6, 0.45, 0.55, 0.4, 0.6].map((x) => reader.read(indexed(0, x)));
    expect(reads).toEqual(repeat(Input.Right, 5));
  });

  it('keeps one memory per pad', () => {
    const reader = new GamepadReader();
    expect(reader.read(indexed(0, 0.6))).toBe(Input.Right);
    // Another pad at 0.45 has not been pushed past 0.5 yet.
    expect(reader.read(indexed(1, 0.45))).toBe(0);
    expect(reader.read(indexed(0, 0.45))).toBe(Input.Right);
  });
});

describe('bitsFromDpad (the touch d-pad, docs/combat-v2.md §0.2, D40)', () => {
  const RADIUS = 78;
  const NEUTRAL = 0;
  /** A finger `degrees` around the center (0: right, 90: up), `distance` px out. */
  const at = (degrees: number, distance = 50, previous = NEUTRAL) => {
    const radians = (degrees * Math.PI) / 180;
    return bitsFromDpad(
      Math.cos(radians) * distance,
      -Math.sin(radians) * distance,
      RADIUS,
      previous,
    );
  };

  it('reads the four arrows (screen y points down)', () => {
    expect(at(0)).toBe(Input.Right);
    expect(at(90)).toBe(Input.Up);
    expect(at(180)).toBe(Input.Left);
    expect(at(270)).toBe(Input.Down);
  });

  it('reads two arrows at once between them: diagonals 50° wide, arrows 40°', () => {
    expect(at(19)).toBe(Input.Right);
    expect(at(21)).toBe(Input.Right | Input.Up);
    expect(at(45)).toBe(Input.Right | Input.Up);
    expect(at(69)).toBe(Input.Right | Input.Up);
    expect(at(71)).toBe(Input.Up);
    expect(at(-45)).toBe(Input.Right | Input.Down);
    expect(at(225)).toBe(Input.Left | Input.Down);
    expect(at(135)).toBe(Input.Left | Input.Up);
  });

  it('rolls a quarter circle through its diagonal, as on a gamepad cross', () => {
    const rolled = [-90, -67, -45, -22, 0].map((degrees) => at(degrees));
    expect(rolled).toEqual([
      Input.Down,
      Input.Down | Input.Right,
      Input.Down | Input.Right,
      Input.Down | Input.Right,
      Input.Right,
    ]);
  });

  it('presses nothing at the center, with hysteresis so it never flickers', () => {
    const press = RADIUS * DPAD_PRESS;
    const release = RADIUS * DPAD_RELEASE;
    expect(at(0, press - 1)).toBe(0);
    expect(at(0, press)).toBe(Input.Right);
    expect(at(0, release, Input.Right)).toBe(Input.Right);
    expect(at(0, release - 1, Input.Right)).toBe(0);
  });

  it('keeps reading a finger slid past the pad’s edge', () => {
    expect(at(0, RADIUS * 3)).toBe(Input.Right);
    expect(at(45, RADIUS * 3)).toBe(Input.Right | Input.Up);
  });
});
