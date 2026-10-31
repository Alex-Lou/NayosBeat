import { DIRECTIONS, type InputBits } from '../core/input';
import { GamepadReader } from './gamepad';
import { KeyboardInput, PLAYER1_KEYS, PLAYER2_KEYS } from './keyboard';
import type { TouchControls } from './touch-controls';

/** Buttons that act on a press: held across a menu, they must be released before counting. */
const PRESS_BUTTONS = ~DIRECTIONS;

/**
 * Merges every device into one input per player: keyboard and gamepad for both players,
 * touch controls for player 1.
 *
 * Gamepads are bound to a player by their index (the first ones connected go to player 1,
 * then player 2), so a pad that disconnects never hands its player's controls to another.
 */
export class PlayerInputs {
  private readonly keyboard: KeyboardInput;
  private readonly gamepads = new GamepadReader();
  private readonly padIndices: [number | null, number | null] = [null, null];
  /** Buttons held when the last menu closed: ignored until released. */
  private readonly suppressed: [InputBits, InputBits] = [0, 0];
  /** Gamepad buttons `poll` saw since the last read: pressed and released in between, they count. */
  private readonly polled: [InputBits, InputBits] = [0, 0];
  /** Reused every frame to avoid allocating. */
  private readonly current: [InputBits, InputBits] = [0, 0];

  constructor(
    target: Window,
    private readonly touch: TouchControls | undefined,
    pads: readonly Gamepad[],
  ) {
    this.keyboard = new KeyboardInput(target, [PLAYER1_KEYS, PLAYER2_KEYS]);
    this.reset(pads);
  }

  /**
   * Call on every display frame, read or not, with the gamepads connected right now. A gamepad
   * keeps no press of its own, unlike the keyboard and the touch controls: one pressed and
   * released between two reads (a slowed fight reads every 2 or 4 frames) still counts at the next.
   */
  poll(pads: readonly Gamepad[]): void {
    for (const player of [0, 1] as const) this.polled[player] |= this.padBits(player, pads);
  }

  /** Call on the frames that play a tick, with the gamepads connected right now. */
  read(pads: readonly Gamepad[]): readonly [InputBits, InputBits] {
    for (const player of [0, 1] as const) {
      const raw = this.raw(player, pads) | this.polled[player];
      this.polled[player] = 0;
      // A suppressed button counts again once it has been released.
      this.suppressed[player] &= raw;
      this.current[player] = raw & ~this.suppressed[player];
    }
    this.keyboard.endFrame();
    return this.current;
  }

  /**
   * Forgets what happened while the game was not reading (a menu was open): pending taps are
   * dropped and buttons still held are ignored until released, so the key or button that
   * confirmed a menu does not also attack or jump. Directions stay live: a held guard holds.
   */
  reset(pads: readonly Gamepad[]): void {
    this.keyboard.endFrame();
    for (const player of [0, 1] as const) {
      this.polled[player] = 0;
      this.suppressed[player] = this.raw(player, pads) & PRESS_BUTTONS;
    }
  }

  dispose(): void {
    this.keyboard.dispose();
    this.touch?.dispose();
  }

  private raw(player: 0 | 1, pads: readonly Gamepad[]): InputBits {
    const touch = player === 0 ? (this.touch?.read() ?? 0) : 0;
    return this.keyboard.read(player) | this.padBits(player, pads) | touch;
  }

  /** What `player`'s gamepad holds right now, if it has one. */
  private padBits(player: 0 | 1, pads: readonly Gamepad[]): InputBits {
    this.assignPads(pads);
    const index = this.padIndices[player];
    const pad = index === null ? undefined : pads.find((p) => p.index === index);
    return pad ? this.gamepads.read(pad) : 0;
  }

  /** Newly connected pads take the next free player slot. */
  private assignPads(pads: readonly Gamepad[]): void {
    for (const pad of pads) {
      if (this.padIndices.includes(pad.index)) continue;
      const free = this.padIndices.indexOf(null);
      if (free === -1) return;
      this.padIndices[free] = pad.index;
    }
  }
}
