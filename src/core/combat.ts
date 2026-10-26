import { intersects, toWorld, type WorldBox } from './boxes';
import type { Box, FighterTemplate, Guard, MoveData } from './config';
import { has, Input } from './input';
import { isActiveFrame } from './moves';
import { AIR_HIT_LIFT } from './rules';
import type { FighterAction, FighterState } from './state';

/** States in which holding back blocks. Attacking, jumping or walking forward does not. */
const BLOCKING_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'idle',
  'walkBack',
  'crouch',
  'blockstun',
]);

/** No juggles and no hitting a fighter that is down. */
const INVULNERABLE_ACTIONS: ReadonlySet<FighterAction> = new Set(['airHit', 'knockdown', 'ko']);

export function hurtboxOf(fighter: FighterState, template: FighterTemplate): Box {
  if (fighter.y > 0) return template.airHurtbox;
  return fighter.crouching ? template.crouchingHurtbox : template.standingHurtbox;
}

/** The move whose hitbox is out on this tick, if any. */
export function activeMove(fighter: FighterState, template: FighterTemplate): MoveData | null {
  if (!fighter.move) return null;
  const move = template.moves[fighter.move];
  return isActiveFrame(move, fighter.actionFrame) ? move : null;
}

export function hitboxInWorld(fighter: FighterState, move: MoveData): WorldBox {
  return toWorld(move.hitbox, fighter.x, fighter.y, fighter.facing);
}

export function hurtboxInWorld(fighter: FighterState, template: FighterTemplate): WorldBox {
  return toWorld(hurtboxOf(fighter, template), fighter.x, fighter.y, fighter.facing);
}

/** Returns the move that hits the defender on this tick, if any. */
export function findHit(
  attacker: FighterState,
  attackerTemplate: FighterTemplate,
  defender: FighterState,
  defenderTemplate: FighterTemplate,
): MoveData | null {
  if (attacker.moveConnected || INVULNERABLE_ACTIONS.has(defender.action)) return null;
  const move = activeMove(attacker, attackerTemplate);
  if (!move) return null;
  const hit = intersects(hitboxInWorld(attacker, move), hurtboxInWorld(defender, defenderTemplate));
  return hit ? move : null;
}

/** Resolves a connected move on the defender: block, hit, hit in the air, or KO. */
export function applyHit(defender: FighterState, attackerX: number, move: MoveData): FighterState {
  const attackerOnRight = isOnRight(attackerX, defender);
  const vx = (attackerOnRight ? -1 : 1) * move.pushback;
  const interrupted = {
    ...defender,
    actionFrame: 0,
    move: null,
    moveConnected: false,
    vx,
  } as const;

  if (isBlocking(defender, attackerOnRight, move.guard)) {
    return {
      ...interrupted,
      action: 'blockstun',
      stunFrames: move.blockstun,
      crouching: has(defender.input, Input.Down),
    };
  }

  const health = Math.max(0, defender.health - move.damage);
  const airborne = defender.y > 0;
  if (health === 0) {
    return { ...interrupted, action: 'ko', health, stunFrames: 0, vy: airborne ? AIR_HIT_LIFT : 0 };
  }
  if (airborne) {
    return { ...interrupted, action: 'airHit', health, stunFrames: 0, vy: AIR_HIT_LIFT };
  }
  return { ...interrupted, action: 'hitstun', health, stunFrames: move.hitstun };
}

function isBlocking(defender: FighterState, attackerOnRight: boolean, guard: Guard): boolean {
  if (!BLOCKING_ACTIONS.has(defender.action)) return false;
  const back = attackerOnRight ? Input.Left : Input.Right;
  if (!has(defender.input, back)) return false;

  const crouching = has(defender.input, Input.Down);
  if (guard === 'low') return crouching;
  if (guard === 'overhead') return !crouching;
  return true;
}

function isOnRight(attackerX: number, defender: FighterState): boolean {
  if (attackerX === defender.x) return defender.facing === 1;
  return attackerX > defender.x;
}
