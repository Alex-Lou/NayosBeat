import { doubleTap, nextTapDirection, nextTapFrames, nextTapReleased } from './double-tap';
import { cleanSocd, DIRECTIONS, has, Input, type InputBits } from './input';
import { detectMotion } from './motion';
import { DIRECTION_HISTORY_FRAMES, INPUT_BUFFER_FRAMES } from './rules';
import { sideOf } from './side';
import type { Facing, FighterState } from './state';

/**
 * What a player asks for, read from the buttons they press. Moves are chosen from commands, so
 * every device and the CPU are read the same way. `boostDash` is the DASH button pressed while
 * the fighter's move has already hit or been blocked (docs/combos-v3.md §1.1): the Rewind if the
 * gauge pays for it, else a plain dash once the move is over.
 */
export type Command =
  'light' | 'heavy' | 'special' | 'boost' | 'grab' | 'dash' | 'boostDash' | 'backdash' | 'jump';

/**
 * Records this tick's input and buffers the command pressed, if any: one buffer slot, the last
 * press wins. During hitstop it runs alone, without aging the buffer nor the double tap, so
 * presses made during the freeze are not lost. `opponentX` tells a dash from a backdash.
 */
export function readInput(
  fighter: FighterState,
  rawInput: InputBits,
  ageBuffer: boolean,
  opponentX: number,
): FighterState {
  const input = cleanSocd(rawInput);
  const directionHistory = withDirections(fighter.directionHistory, input & DIRECTIONS);
  const tapped = doubleTap(fighter, input);
  const pressed = input & ~fighter.input;
  // Same-tick priority: grab, boost, special, heavy, light (`pressedButton`), then dash, then
  // jump.
  const command =
    pressedButton(pressed, input) ??
    afterContact(
      dashCommand(pressed, input, sideOf(fighter, opponentX), tapped),
      pressed,
      fighter,
    ) ??
    jumpCommand(pressed);

  const bufferFrames = command ? INPUT_BUFFER_FRAMES : agedBuffer(fighter, ageBuffer);
  return {
    ...fighter,
    input,
    directionHistory,
    tapDirection: nextTapDirection(fighter, input, tapped),
    tapFrames: nextTapFrames(fighter, input, tapped, ageBuffer),
    tapReleased: nextTapReleased(fighter, input, tapped),
    bufferedCommand: command ?? (bufferFrames > 0 ? fighter.bufferedCommand : null),
    bufferFrames,
    // What the player held, the motion they completed and the side they faced when pressing.
    bufferedInput: command ? input : fighter.bufferedInput,
    bufferedMotion: command
      ? detectMotion(directionHistory, fighter.facing)
      : fighter.bufferedMotion,
    bufferedFacing: command ? fighter.facing : fighter.bufferedFacing,
  };
}

/** The ticks left to the buffered command after this tick, when nothing new is pressed. */
export function agedBuffer(fighter: FighterState, ageBuffer: boolean): number {
  return ageBuffer && fighter.bufferFrames > 0 ? fighter.bufferFrames - 1 : fighter.bufferFrames;
}

/**
 * The attack or grab of the buttons just pressed (`pressed`), given everything held (`held`):
 * only a new press counts. The grab button, or light + heavy held together with one of them
 * just pressed, is a grab.
 */
export function pressedButton(pressed: InputBits, held: InputBits): Command | null {
  const attackPressed = has(pressed, Input.Light) || has(pressed, Input.Heavy);
  if (has(pressed, Input.Grab)) return 'grab';
  if (attackPressed && has(held, Input.Light) && has(held, Input.Heavy)) return 'grab';
  if (has(pressed, Input.Boost)) return 'boost';
  if (has(pressed, Input.Special)) return 'special';
  if (has(pressed, Input.Heavy)) return 'heavy';
  if (has(pressed, Input.Light)) return 'light';
  return null;
}

/**
 * A dash, from the dash button (a backdash with back held) or a double tap completed on this
 * tick (`tapped`, its stage side): toward the opponent's side (`opponentSide`) it dashes, away
 * from it it backdashes. The opponent's real side, not the side faced: after a cross-up,
 * `facing` still points the old way until the fighter is free to turn, and the dash it buffers
 * meanwhile would go the wrong way (into the attacker on a wake-up backdash).
 */
export function dashCommand(
  pressed: InputBits,
  held: InputBits,
  opponentSide: Facing,
  tapped: -1 | 0 | 1,
): Command | null {
  if (has(pressed, Input.Dash)) {
    return has(held, opponentSide === 1 ? Input.Left : Input.Right) ? 'backdash' : 'dash';
  }
  if (tapped === 0) return null;
  return tapped === opponentSide ? 'dash' : 'backdash';
}

/**
 * The dash of the DASH button (never a double tap) pressed while the fighter's move has already
 * hit or been blocked (`fighter`, its state before this tick): the `boostDash`, decided at the
 * press, so a DASH pressed before the contact stays a dash (docs/combos-v3.md §1.1).
 */
function afterContact(
  command: Command | null,
  pressed: InputBits,
  fighter: FighterState,
): Command | null {
  if (command !== 'dash' || !has(pressed, Input.Dash)) return command;
  return fighter.action === 'attack' && fighter.moveConnected ? 'boostDash' : 'dash';
}

/** The jump button, or up just pressed. Holding up keeps jumping (see `actOnGround`). */
function jumpCommand(pressed: InputBits): Command | null {
  return has(pressed, Input.Jump) || has(pressed, Input.Up) ? 'jump' : null;
}

/** The history with this tick's directions added, the oldest dropped once full: one array. */
function withDirections(history: readonly InputBits[], directions: InputBits): InputBits[] {
  const dropped = history.length >= DIRECTION_HISTORY_FRAMES ? 1 : 0;
  const next = new Array<InputBits>(history.length - dropped + 1);
  for (let i = dropped; i < history.length; i++) next[i - dropped] = history[i] ?? 0;
  next[next.length - 1] = directions;
  return next;
}
