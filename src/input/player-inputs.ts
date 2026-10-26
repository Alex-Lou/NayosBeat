import type { InputBits } from '../core/input';
import { readGamepad } from './gamepad';
import { KeyboardInput, PLAYER1_KEYS, PLAYER2_KEYS } from './keyboard';
import type { TouchControls } from './touch-controls';

/**
 * Merges every device into one input per player: keyboard and gamepad for both players,
 * touch controls for player 1.
 */
export class PlayerInputs {
  private readonly keyboard: KeyboardInput;
  /** Reused every frame to avoid allocating. */
  private readonly current: [InputBits, InputBits] = [0, 0];

  constructor(
    target: Window,
    private readonly touch: TouchControls | undefined,
  ) {
    this.keyboard = new KeyboardInput(target, [PLAYER1_KEYS, PLAYER2_KEYS]);
  }

  read(): readonly [InputBits, InputBits] {
    this.current[0] = this.keyboard.read(0) | readGamepad(0) | (this.touch?.read() ?? 0);
    this.current[1] = this.keyboard.read(1) | readGamepad(1);
    return this.current;
  }

  dispose(): void {
    this.keyboard.dispose();
    this.touch?.dispose();
  }
}
