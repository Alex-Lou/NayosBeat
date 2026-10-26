import type { BoxSize, FighterTemplate, MoveData, MoveId } from './config';
import { cleanSocd, DIRECTIONS, has, Input, type InputBits } from './input';
import { detectMotion } from './motion';
import { airMove, groundMove, isCrouchingMove, moveDuration } from './moves';
import {
  DIRECTION_HISTORY_FRAMES,
  INPUT_BUFFER_FRAMES,
  PUSHBACK_FRICTION,
  THROW_CONVERSION_FRAMES,
} from './rules';
import type { AttackButton, Facing, FighterAction, FighterState } from './state';

/**
 * Advances one fighter by one tick: input, state machine, velocity and position.
 * Input is only acted upon in grounded neutral states (and once per jump in the air);
 * every other action plays out on its own. An action lasting N ticks occupies exactly N ticks.
 * Stage bounds, collisions and hits are resolved afterwards, in `step`.
 */
export function updateFighter(
  fighter: FighterState,
  rawInput: InputBits,
  template: FighterTemplate,
  opponentX: number,
): FighterState {
  const f = readInput(fighter, rawInput, true);

  switch (f.action) {
    case 'preJump':
      return f.actionFrame + 1 >= template.preJumpFrames ? takeOff(f, template) : nextFrame(f);
    case 'air': {
      const move = f.bufferedAttack ? airMove(f.bufferedAttack) : null;
      return move
        ? airborne(startAttack(f, 'airAttack', move), template)
        : airborne(nextFrame(f), template);
    }
    case 'airAttack':
    case 'airHit':
      return airborne(nextFrame(f), template);
    case 'ko':
      return f.y > 0 ? airborne(nextFrame(f), template) : slide(nextFrame(f));
    case 'landing':
      return f.actionFrame + 1 >= template.landingFrames
        ? actOnGround(f, template, opponentX)
        : nextFrame(f);
    case 'attack': {
      const move = f.move ? template.moves[f.move] : null;
      if (!move) return actOnGround(f, template, opponentX);
      const cancel = cancelMove(f, move, template);
      if (cancel) return startGroundMove(f, cancel, template);
      return f.actionFrame + 1 < moveDuration(move)
        ? advance(nextFrame(f), move)
        : actOnGround(f, template, opponentX);
    }
    case 'hitstun':
    case 'blockstun':
    case 'knockdown':
      return f.stunFrames > 0
        ? { ...slide(nextFrame(f)), stunFrames: f.stunFrames - 1 }
        : actOnGround(f, template, opponentX);
    default:
      return actOnGround(f, template, opponentX);
  }
}

/**
 * Records this tick's input and buffers attack presses. During hitstop it runs alone,
 * without aging the buffer, so presses made during the freeze are not lost.
 */
export function readInput(
  fighter: FighterState,
  rawInput: InputBits,
  ageBuffer: boolean,
): FighterState {
  const input = cleanSocd(rawInput);
  const history = fighter.directionHistory;
  const directionHistory = [
    ...(history.length >= DIRECTION_HISTORY_FRAMES ? history.slice(1) : history),
    input & DIRECTIONS,
  ];
  const withInput = { ...fighter, input, directionHistory };

  const button = pressedButton(input & ~fighter.input, input);
  if (button) {
    return {
      ...withInput,
      bufferedAttack: button,
      bufferFrames: INPUT_BUFFER_FRAMES,
      bufferedInput: input,
      bufferedMotion: detectMotion(directionHistory, fighter.facing),
    };
  }
  if (!ageBuffer || fighter.bufferFrames === 0) return withInput;

  const bufferFrames = fighter.bufferFrames - 1;
  return {
    ...withInput,
    bufferFrames,
    bufferedAttack: bufferFrames > 0 ? fighter.bufferedAttack : null,
  };
}

export function pushboxOf(fighter: FighterState, template: FighterTemplate): BoxSize {
  return fighter.crouching ? template.crouchingPushbox : template.standingPushbox;
}

/** Light + heavy held together, one of them just pressed, is a throw. */
function pressedButton(pressed: InputBits, held: InputBits): AttackButton | null {
  const attackPressed = has(pressed, Input.Light) || has(pressed, Input.Heavy);
  if (attackPressed && has(held, Input.Light) && has(held, Input.Heavy)) return 'throw';
  if (has(pressed, Input.Special)) return 'special';
  if (has(pressed, Input.Heavy)) return 'heavy';
  if (has(pressed, Input.Light)) return 'light';
  return null;
}

/**
 * The move that interrupts the current one, if any: a normal turned into a throw when the
 * second button came a little late, or a cancel allowed once the move has connected.
 */
function cancelMove(
  fighter: FighterState,
  move: MoveData,
  template: FighterTemplate,
): MoveId | null {
  const button = fighter.bufferedAttack;
  if (!button) return null;

  if (button === 'throw') {
    const early = fighter.actionFrame < THROW_CONVERSION_FRAMES && !fighter.moveConnected;
    return early && move.kind === 'normal' ? 'throw' : null;
  }
  if (!fighter.moveConnected || !move.cancelInto) return null;

  const next = groundMove(button, fighter.bufferedInput, fighter.bufferedMotion, fighter.facing);
  return move.cancelInto.includes(template.moves[next].kind) ? next : null;
}

function startGroundMove(
  fighter: FighterState,
  moveId: MoveId,
  template: FighterTemplate,
): FighterState {
  const started = { ...startAttack(fighter, 'attack', moveId), crouching: isCrouchingMove(moveId) };
  return advance(started, template.moves[moveId]);
}

/** Moves a fighter forward during the frames where its move travels. */
function advance(fighter: FighterState, move: MoveData): FighterState {
  const range = move.advance;
  const moving =
    range !== undefined && fighter.actionFrame >= range.from && fighter.actionFrame < range.to;
  if (!moving) return fighter.vx === 0 ? fighter : { ...fighter, vx: 0 };
  const vx = fighter.facing * range.speed;
  return { ...fighter, vx, x: fighter.x + vx };
}

/** Neutral grounded state: the only place where the player chooses what to do next. */
function actOnGround(
  fighter: FighterState,
  template: FighterTemplate,
  opponentX: number,
): FighterState {
  const f: FighterState = {
    ...fighter,
    facing: faceOpponent(fighter, opponentX),
    move: null,
    comboCount: 0,
    vx: 0,
  };
  const input = f.input;
  const crouching = has(input, Input.Down) && !has(input, Input.Up);

  if (f.bufferedAttack) {
    const move = groundMove(f.bufferedAttack, f.bufferedInput, f.bufferedMotion, f.facing);
    return startGroundMove(f, move, template);
  }
  if (has(input, Input.Up) || has(input, Input.Jump)) {
    return { ...enter(f, 'preJump'), crouching: false, vx: 0 };
  }
  if (crouching) {
    return { ...continueOrEnter(f, 'crouch'), crouching: true, vx: 0 };
  }

  const direction = horizontalDirection(input);
  if (direction === 0) {
    return { ...continueOrEnter(f, 'idle'), crouching: false, vx: 0 };
  }

  const forward = direction === f.facing;
  const vx = direction * (forward ? template.walkForwardSpeed : template.walkBackSpeed);
  return {
    ...continueOrEnter(f, forward ? 'walkForward' : 'walkBack'),
    crouching: false,
    vx,
    x: f.x + vx,
  };
}

function startAttack(fighter: FighterState, action: FighterAction, move: MoveId): FighterState {
  return {
    ...enter(fighter, action),
    move,
    moveConnected: false,
    bufferedAttack: null,
    bufferFrames: 0,
  };
}

/** The jump direction is locked at take-off and cannot be changed in the air. */
function takeOff(fighter: FighterState, template: FighterTemplate): FighterState {
  const direction = horizontalDirection(fighter.input);
  const forward = direction === fighter.facing;
  const vx = direction * (forward ? template.jumpForwardSpeed : template.jumpBackSpeed);
  return airborne({ ...enter(fighter, 'air'), vx, vy: template.jumpVelocity }, template);
}

/** Applies gravity and handles the landing, which depends on how the fighter was airborne. */
function airborne(fighter: FighterState, template: FighterTemplate): FighterState {
  const vy = fighter.vy - template.gravity;
  const y = fighter.y + vy;
  const x = fighter.x + fighter.vx;
  if (y > 0) return { ...fighter, x, y, vy };

  const grounded: FighterState = { ...fighter, x, y: 0, vx: 0, vy: 0 };
  switch (fighter.action) {
    case 'airHit':
      return { ...enter(grounded, 'knockdown'), stunFrames: template.knockdownFrames };
    case 'ko':
      return grounded;
    default:
      return { ...enter(grounded, 'landing'), move: null };
  }
}

/** Ground slide after a hit or block, slowed down by friction. */
function slide(fighter: FighterState): FighterState {
  if (fighter.vx === 0) return fighter;
  const speed = Math.max(0, Math.abs(fighter.vx) - PUSHBACK_FRICTION);
  // Avoids -0, which would make otherwise identical states compare as different.
  const vx = speed === 0 ? 0 : Math.sign(fighter.vx) * speed;
  return { ...fighter, x: fighter.x + fighter.vx, vx };
}

/** Grounded fighters always turn to face their opponent; airborne ones keep their side. */
function faceOpponent(fighter: FighterState, opponentX: number): Facing {
  if (opponentX === fighter.x) return fighter.facing;
  return opponentX > fighter.x ? 1 : -1;
}

function horizontalDirection(input: InputBits): -1 | 0 | 1 {
  if (has(input, Input.Right)) return 1;
  if (has(input, Input.Left)) return -1;
  return 0;
}

function nextFrame(fighter: FighterState): FighterState {
  return { ...fighter, actionFrame: fighter.actionFrame + 1 };
}

function enter(fighter: FighterState, action: FighterAction): FighterState {
  return { ...fighter, action, actionFrame: 0 };
}

function continueOrEnter(fighter: FighterState, action: FighterAction): FighterState {
  return fighter.action === action ? nextFrame(fighter) : enter(fighter, action);
}
