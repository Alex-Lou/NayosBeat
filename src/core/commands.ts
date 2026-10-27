import { cleanSocd, DIRECTIONS, has, Input, type InputBits } from './input';
import { detectMotion } from './motion';
import { DIRECTION_HISTORY_FRAMES, INPUT_BUFFER_FRAMES } from './rules';
import type { FighterState } from './state';

/**
 * What a player asks for, read from the buttons they press. Moves are chosen from commands, so
 * every device and the CPU are read the same way. Dash, backdash and jump are not produced yet:
 * jumping still reads the direction held, and the dashes come with their moves.
 */
export type Command = 'light' | 'heavy' | 'special' | 'grab' | 'dash' | 'backdash' | 'jump';

/**
 * Records this tick's input and buffers the command pressed, if any. During hitstop it runs
 * alone, without aging the buffer, so presses made during the freeze are not lost.
 */
export function readInput(
  fighter: FighterState,
  rawInput: InputBits,
  ageBuffer: boolean,
): FighterState {
  const input = cleanSocd(rawInput);
  const directionHistory = withDirections(fighter.directionHistory, input & DIRECTIONS);
  const withInput = { ...fighter, input, directionHistory };

  const command = pressedButton(input & ~fighter.input, input);
  if (command) {
    return {
      ...withInput,
      bufferedCommand: command,
      bufferFrames: INPUT_BUFFER_FRAMES,
      bufferedInput: input,
      bufferedMotion: detectMotion(directionHistory, fighter.facing),
      bufferedFacing: fighter.facing,
    };
  }
  if (!ageBuffer || fighter.bufferFrames === 0) return withInput;

  const bufferFrames = fighter.bufferFrames - 1;
  return {
    ...withInput,
    bufferFrames,
    bufferedCommand: bufferFrames > 0 ? fighter.bufferedCommand : null,
  };
}

/**
 * The command of the buttons just pressed (`pressed`), given everything held (`held`): only a
 * new press counts. Light + heavy held together, one of them just pressed, is a grab.
 */
export function pressedButton(pressed: InputBits, held: InputBits): Command | null {
  const attackPressed = has(pressed, Input.Light) || has(pressed, Input.Heavy);
  if (attackPressed && has(held, Input.Light) && has(held, Input.Heavy)) return 'grab';
  if (has(pressed, Input.Special)) return 'special';
  if (has(pressed, Input.Heavy)) return 'heavy';
  if (has(pressed, Input.Light)) return 'light';
  return null;
}

/** The history with this tick's directions added, the oldest dropped once full: one array. */
function withDirections(history: readonly InputBits[], directions: InputBits): InputBits[] {
  const dropped = history.length >= DIRECTION_HISTORY_FRAMES ? 1 : 0;
  const next = new Array<InputBits>(history.length - dropped + 1);
  for (let i = dropped; i < history.length; i++) next[i - dropped] = history[i] ?? 0;
  next[next.length - 1] = directions;
  return next;
}
