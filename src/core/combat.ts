import { overlapMiddleX, overlapMiddleY, overlaps } from './boxes';
import type { Box, FighterTemplate } from './config';
import { has, Input } from './input';
import type { Guard, MoveData, MoveId } from './move-data';
import { isActiveFrame, isInvincible, isThrowInvincible } from './moves';
import { signed } from './numbers';
import {
  AIR_HIT_LIFT,
  COMBO_SCALING_FLOOR,
  COMBO_SCALING_STEP,
  THROW_TECH_PUSHBACK,
  THROW_TECH_STUN,
} from './rules';
import { sideOf } from './side';
import type { Contact, Facing, FighterAction, FighterState } from './state';

/** States in which holding back blocks. Attacking, jumping or walking forward does not. */
const BLOCKING_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'idle',
  'walkBack',
  'crouch',
  'guard',
  'blockstun',
]);

/** No juggles and no hitting a fighter that is down. */
const INVULNERABLE_ACTIONS: ReadonlySet<FighterAction> = new Set(['airHit', 'knockdown', 'ko']);

/** A fighter reeling from a hit or a block cannot be grabbed (no unescapable grab loops). */
const GRAB_IMMUNE_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'hitstun',
  'blockstun',
  'airHit',
  'knockdown',
  'ko',
]);

/** A box placed in the stage: an attacker's hitbox, or its projectile's. */
export interface PlacedBox {
  readonly box: Box;
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
}

/** Where the fighter can be hit on this tick, for its posture. */
export function hurtboxesOf(fighter: FighterState, template: FighterTemplate): readonly Box[] {
  if (fighter.y > 0) return template.airHurtboxes;
  return fighter.crouching ? template.crouchingHurtboxes : template.standingHurtboxes;
}

/** The first of the defender's hurtboxes that `box`, placed at x, y, facing, overlaps. */
export function touchedHurtbox(
  box: Box,
  x: number,
  y: number,
  facing: Facing,
  defender: FighterState,
  template: FighterTemplate,
): Box | null {
  for (const hurtbox of hurtboxesOf(defender, template)) {
    if (overlaps(box, x, y, facing, hurtbox, defender.x, defender.y, defender.facing)) {
      return hurtbox;
    }
  }
  return null;
}

/** The move whose strike hitbox is out on this tick, if any. */
export function activeMove(fighter: FighterState, template: FighterTemplate): MoveData | null {
  if (!fighter.move) return null;
  const move = template.moves[fighter.move];
  return move.hitbox && isActiveFrame(move, fighter.actionFrame) ? move : null;
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
  if (move.kind === 'grab' && !canBeGrabbed(defender, defenderTemplate)) return null;

  const { x, y, facing } = attacker;
  return touchedHurtbox(move.hitbox, x, y, facing, defender, defenderTemplate) ? move : null;
}

/**
 * Describes a blow that touched `defender` (as it was when the blow was found), now resolved
 * into `after`: hit or blocked, and where. Only called on the ticks where something touched.
 */
export function contactOf(
  by: 0 | 1,
  move: MoveId,
  striker: PlacedBox,
  defender: FighterState,
  template: FighterTemplate,
  after: FighterState,
): Contact {
  const { box, x, y, facing } = striker;
  const body = touchedHurtbox(box, x, y, facing, defender, template);
  if (!body) throw new Error(`Move ${move} touched no hurtbox`);
  return {
    by,
    kind: after.action === 'blockstun' ? 'block' : 'hit',
    move,
    x: overlapMiddleX(box, x, facing, body, defender.x, defender.facing),
    y: overlapMiddleY(box, y, body, defender.y),
    damage: defender.health - after.health,
  };
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

  if (move.kind !== 'grab' && isBlocking(defender, attackerOnRight, move.guard)) {
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

/** Both players grabbed each other on the same tick: nobody is thrown, both are pushed apart. */
export function techGrab(fighter: FighterState, opponentX: number): FighterState {
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

/**
 * Grabs only take a grounded fighter that is not reeling, nor just out of a stun (the throw
 * protection), nor in the grab-proof frames of a backdash.
 */
export function canBeGrabbed(fighter: FighterState, template: FighterTemplate): boolean {
  if (fighter.y !== 0 || fighter.throwImmuneFrames > 0) return false;
  if (GRAB_IMMUNE_ACTIONS.has(fighter.action)) return false;
  return !(fighter.move && isThrowInvincible(template.moves[fighter.move], fighter.actionFrame));
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
  return sideOf(defender, attackerX) === 1;
}
