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
};

export const PLAYER2_KEYS: KeyBindings = {
  ArrowUp: Input.Up,
  ArrowDown: Input.Down,
  ArrowLeft: Input.Left,
  ArrowRight: Input.Right,
};

export function bitsFromKeys(pressed: ReadonlySet<string>, bindings: KeyBindings): InputBits {
  let bits = 0;
  for (const code of pressed) bits |= bindings[code] ?? 0;
  return bits;
}

/** Tracks held keys. Only bound keys are captured, so browser shortcuts keep working. */
export class KeyboardInput {
  private readonly pressed = new Set<string>();
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
    return bindings ? bitsFromKeys(this.pressed, bindings) : 0;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.pressed.clear();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.boundCodes.has(event.code)) return;
    event.preventDefault();
    this.pressed.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (!this.boundCodes.has(event.code)) return;
    event.preventDefault();
    this.pressed.delete(event.code);
  };

  /** Key-up events are lost when the window loses focus: release everything. */
  private readonly onBlur = (): void => {
    this.pressed.clear();
  };
}
