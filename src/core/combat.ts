import { intersects, toWorld, type WorldBox } from './boxes';
import type { Box, FighterTemplate, Guard, MoveData } from './config';
import { has, Input } from './input';
import { isActiveFrame, isInvincible } from './moves';
import { signed } from './numbers';
import {
  AIR_HIT_LIFT,
  COMBO_SCALING_FLOOR,
  COMBO_SCALING_STEP,
  THROW_TECH_PUSHBACK,
  THROW_TECH_STUN,
} from './rules';
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

/** A fighter reeling from a hit or a block cannot be thrown (no unescapable throw loops). */
const THROW_IMMUNE_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'hitstun',
  'blockstun',
  'airHit',
  'knockdown',
  'ko',
]);

export function hurtboxOf(fighter: FighterState, template: FighterTemplate): Box {
  if (fighter.y > 0) return template.airHurtbox;
  return fighter.crouching ? template.crouchingHurtbox : template.standingHurtbox;
}

export function hurtboxInWorld(fighter: FighterState, template: FighterTemplate): WorldBox {
  return toWorld(hurtboxOf(fighter, template), fighter.x, fighter.y, fighter.facing);
}

/** The move whose strike hitbox is out on this tick, if any. */
export function activeMove(fighter: FighterState, template: FighterTemplate): MoveData | null {
  if (!fighter.move) return null;
  const move = template.moves[fighter.move];
  return move.hitbox && isActiveFrame(move, fighter.actionFrame) ? move : null;
}

export function hitboxInWorld(fighter: FighterState, hitbox: Box): WorldBox {
  return toWorld(hitbox, fighter.x, fighter.y, fighter.facing);
}

/** Whether strikes and projectiles can hit this fighter on this tick. */
export function canBeHit(fighter: FighterState, template: FighterTemplate): boolean {
  if (INVULNERABLE_ACTIONS.has(fighter.action)) return false;
  return !(fighter.move && isInvincible(template.moves[fighter.move], fighter.actionFrame));
}

/** Returns the move that hits the defender on this tick, if any. */
export function findHit(
  attacker: FighterState,
  attackerTemplate: FighterTemplate,
  defender: FighterState,
  defenderTemplate: FighterTemplate,
): MoveData | null {
  if (attacker.moveConnected || !canBeHit(defender, defenderTemplate)) return null;
  const move = activeMove(attacker, attackerTemplate);
  if (!move?.hitbox) return null;
  if (move.kind === 'throw' && !canBeThrown(defender)) return null;

  const hitbox = hitboxInWorld(attacker, move.hitbox);
  return intersects(hitbox, hurtboxInWorld(defender, defenderTemplate)) ? move : null;
}

/**
 * Resolves a connected move on the defender: block, hit, knockdown, or KO.
 * `attackerX` is where the hit comes from (the attacker, or a projectile's back).
 * Health never drops below `minHealth`: 1 in training, where nobody can be KO'd.
 */
export function applyHit(
  defender: FighterState,
  attackerX: number,
  move: MoveData,
  minHealth = 0,
): FighterState {
  const attackerOnRight = isOnRight(attackerX, defender);
  const vx = signed(attackerOnRight ? -1 : 1, move.pushback);
  const interrupted = {
    ...defender,
    actionFrame: 0,
    move: null,
    moveConnected: false,
    vx,
  } as const;

  if (move.kind !== 'throw' && isBlocking(defender, attackerOnRight, move.guard)) {
    return {
      ...interrupted,
      action: 'blockstun',
      stunFrames: move.blockstun,
      crouching: has(defender.input, Input.Down),
      comboCount: 0,
    };
  }

  const comboCount = defender.action === 'hitstun' ? defender.comboCount + 1 : 1;
  const health = Math.max(minHealth, defender.health - scaledDamage(move.damage, comboCount));
  const airborne = defender.y > 0;
  if (health === 0) {
    const vy = airborne || move.knockdown ? AIR_HIT_LIFT : 0;
    return { ...interrupted, action: 'ko', health, comboCount, stunFrames: 0, vy };
  }
  if (airborne || move.knockdown) {
    return {
      ...interrupted,
      action: 'airHit',
      health,
      comboCount,
      stunFrames: 0,
      vy: AIR_HIT_LIFT,
    };
  }
  return { ...interrupted, action: 'hitstun', health, comboCount, stunFrames: move.hitstun };
}

/** Both players threw each other on the same tick: nobody is thrown, both are pushed apart. */
export function techThrow(fighter: FighterState, opponentX: number): FighterState {
  const away = isOnRight(opponentX, fighter) ? -1 : 1;
  return {
    ...fighter,
    action: 'blockstun',
    actionFrame: 0,
    move: null,
    moveConnected: false,
    stunFrames: THROW_TECH_STUN,
    vx: signed(away, THROW_TECH_PUSHBACK),
  };
}

/** Each extra hit in a combo deals less damage, down to a floor. */
export function scaledDamage(damage: number, comboCount: number): number {
  const percent = Math.max(COMBO_SCALING_FLOOR, 100 - COMBO_SCALING_STEP * (comboCount - 1));
  return Math.trunc((damage * percent) / 100);
}

function canBeThrown(fighter: FighterState): boolean {
  return fighter.y === 0 && !THROW_IMMUNE_ACTIONS.has(fighter.action);
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
