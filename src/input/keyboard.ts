import { Input, type InputBits } from '../core/input';

/** Maps `KeyboardEvent.code` (physical key position) to an input flag. */
export type KeyBindings = Readonly<Record<string, number>>;

/** Physical positions: WASD on QWERTY is ZQSD on AZERTY. */
export const PLAYER1_KEYS: KeyBindings = {
  KeyW: Input.Up,
  KeyS: Input.Down,
  KeyA: Input.Left,
  KeyD: Input.Right,
  Space: Input.Jump,
  KeyJ: Input.Light,
  KeyK: Input.Heavy,
  KeyL: Input.Special,
};

export const PLAYER2_KEYS: KeyBindings = {
  ArrowUp: Input.Up,
  ArrowDown: Input.Down,
  ArrowLeft: Input.Left,
  ArrowRight: Input.Right,
  Numpad1: Input.Light,
  Numpad2: Input.Heavy,
  Numpad3: Input.Special,
  // Laptops without a numeric keypad: the keys left of and above right Shift.
  Period: Input.Light,
  Slash: Input.Heavy,
  Quote: Input.Special,
};

export function bitsFromKeys(pressed: ReadonlySet<string>, bindings: KeyBindings): InputBits {
  let bits = 0;
  for (const code of pressed) bits |= bindings[code] ?? 0;
  return bits;
}

/**
 * Tracks held keys. Only bound keys are captured, so browser shortcuts keep working.
 * A key pressed and released between two reads still counts as held for one read,
 * so very quick taps are never lost.
 */
export class KeyboardInput {
  private readonly held = new Set<string>();
  /** Keys pressed since the last `endFrame`, even if already released. */
  private readonly tapped = new Set<string>();
  private readonly boundCodes: ReadonlySet<string>;

  constructor(
    private readonly target: Window,
    private readonly bindings: readonly KeyBindings[],
  ) {
    this.boundCodes = new Set(bindings.flatMap((b) => Object.keys(b)));
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  read(player: number): InputBits {
    const bindings = this.bindings[player];
    if (!bindings) return 0;
    return bitsFromKeys(this.held, bindings) | bitsFromKeys(this.tapped, bindings);
  }

  /** Call once all players have been read for the current frame. */
  endFrame(): void {
    this.tapped.clear();
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.held.clear();
    this.tapped.clear();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.boundCodes.has(event.code)) return;
    event.preventDefault();
    this.held.add(event.code);
    this.tapped.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (!this.boundCodes.has(event.code)) return;
    event.preventDefault();
    this.held.delete(event.code);
  };

  /** Key-up events are lost when the window loses focus: release everything. */
  private readonly onBlur = (): void => {
    this.held.clear();
    this.tapped.clear();
  };
}
