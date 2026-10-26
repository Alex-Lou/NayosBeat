import type { BoxSize, FighterStats } from './config';
import { cleanSocd, has, Input, type InputBits } from './input';
import type { Facing, FighterAction, FighterState } from './state';

/**
 * Advances one fighter by one tick: state machine, velocity and position.
 * Input is only read in grounded neutral states; jumps and landings play out on their own.
 * Stage bounds and collisions with the opponent are resolved afterwards, in `step`.
 */
export function updateFighter(
  fighter: FighterState,
  rawInput: InputBits,
  stats: FighterStats,
  opponentX: number,
): FighterState {
  const input = cleanSocd(rawInput);

  switch (fighter.action) {
    case 'preJump':
      return fighter.actionFrame + 1 >= stats.preJumpFrames
        ? takeOff(fighter, input, stats)
        : advance(fighter);
    case 'air':
      return fall(fighter, stats);
    case 'landing':
      return fighter.actionFrame + 1 >= stats.landingFrames
        ? withAction(fighter, 'idle')
        : advance(fighter);
    default:
      return actOnGround(fighter, input, stats, opponentX);
  }
}

export function pushboxOf(fighter: FighterState, stats: FighterStats): BoxSize {
  return fighter.action === 'crouch' ? stats.crouchingPushbox : stats.standingPushbox;
}

function actOnGround(
  fighter: FighterState,
  input: InputBits,
  stats: FighterStats,
  opponentX: number,
): FighterState {
  const facing = faceOpponent(fighter, opponentX);

  if (has(input, Input.Up) || has(input, Input.Jump)) {
    return { ...withAction(fighter, 'preJump'), facing, vx: 0 };
  }
  if (has(input, Input.Down)) {
    return { ...withAction(fighter, 'crouch'), facing, vx: 0 };
  }

  const direction = horizontalDirection(input);
  if (direction === 0) {
    return { ...withAction(fighter, 'idle'), facing, vx: 0 };
  }

  const forward = direction === facing;
  const speed = forward ? stats.walkForwardSpeed : stats.walkBackSpeed;
  const vx = direction * speed;
  return {
    ...withAction(fighter, forward ? 'walkForward' : 'walkBack'),
    facing,
    vx,
    x: fighter.x + vx,
  };
}

/** The jump direction is locked at take-off and cannot be changed in the air. */
function takeOff(fighter: FighterState, input: InputBits, stats: FighterStats): FighterState {
  const direction = horizontalDirection(input);
  const forward = direction === fighter.facing;
  const speed = forward ? stats.jumpForwardSpeed : stats.jumpBackSpeed;
  const vx = direction * speed;
  return {
    ...withAction(fighter, 'air'),
    vx,
    vy: stats.jumpVelocity,
    x: fighter.x + vx,
    y: stats.jumpVelocity,
  };
}

function fall(fighter: FighterState, stats: FighterStats): FighterState {
  const vy = fighter.vy - stats.gravity;
  const y = fighter.y + vy;
  const x = fighter.x + fighter.vx;

  if (y <= 0) {
    return { ...withAction(fighter, 'landing'), x, y: 0, vx: 0, vy: 0 };
  }
  return { ...advance(fighter), x, y, vy };
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

function advance(fighter: FighterState): FighterState {
  return { ...fighter, actionFrame: fighter.actionFrame + 1 };
}

function withAction(fighter: FighterState, action: FighterAction): FighterState {
  if (fighter.action === action) return advance(fighter);
  return { ...fighter, action, actionFrame: 0 };
}
