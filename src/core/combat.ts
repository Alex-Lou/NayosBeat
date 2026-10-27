import { overlapMiddleX, overlapMiddleY, overlaps } from './boxes';
import type { Box, FighterTemplate } from './config';
import { chipDamage, scaledDamage } from './damage';
import { has, Input } from './input';
import type { Guard, MoveData, MoveId } from './move-data';
import { isActiveFrame, isInvincible, isThrowInvincible, moveOf } from './moves';
import { signed } from './numbers';
import { BODY_PERCENT, reactionOf } from './reaction';
import {
  AIR_HIT_LIFT,
  COUNTER_HITSTUN,
  HEAVY_REACTION_HITSTUN,
  THROW_TECH_PUSHBACK,
  THROW_TECH_STUN,
} from './rules';
import { sideOf } from './side';
import type { Contact, CounterHit, Facing, FighterAction, FighterState } from './state';

/**
 * States in which holding back blocks. Attacking, jumping or walking forward does not; pushed
 * apart by a tech, one still guards.
 */
const BLOCKING_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'idle',
  'walkBack',
  'crouch',
  'guard',
  'blockstun',
  'tech',
]);

/**
 * No juggles (but the one a launcher allows, see `canBeHit`) and no hitting a fighter that is
 * down. Nor the pair of a hold: blows and projectiles go through both until the holder lets go
 * (docs/combat-v2.md §4.2).
 */
const INVULNERABLE_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'airHit',
  'knockdown',
  'ko',
  'holding',
  'held',
]);

/**
 * A fighter reeling from a hit, a block or a tech cannot be grabbed (no unescapable grab loops),
 * nor one already in a hold.
 */
const GRAB_IMMUNE_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'hitstun',
  'blockstun',
  'tech',
  'airHit',
  'knockdown',
  'ko',
  'holding',
  'held',
]);

/** A box placed in the stage: an attacker's hitbox, or its projectile's. */
export interface PlacedBox {
  readonly box: Box;
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
}

/** Where a blow landed, in stage sub-pixels (y up from the ground). */
export interface Impact {
  readonly x: number;
  readonly y: number;
}

/** What a blow brings besides its move: a counter-hit, where it lands on the body. */
export interface HitDetail {
  readonly counter: CounterHit | null;
  /** Height of the impact, in percent of the defender's standing body (`impactPercent`). */
  readonly impactPercent: number;
}

/** A blow on the body, nothing more. */
export const PLAIN_HIT: HitDetail = { counter: null, impactPercent: BODY_PERCENT };

/**
 * Where the fighter can be hit on this tick: the move's own boxes on the frames it has some
 * (the Glissade along the floor), otherwise its posture's.
 */
export function hurtboxesOf(fighter: FighterState, template: FighterTemplate): readonly Box[] {
  if (fighter.move) {
    const own = moveOf(template, fighter.move).hurtboxes;
    if (own) {
      for (const { frames, boxes } of own) {
        if (fighter.actionFrame >= frames.from && fighter.actionFrame < frames.to) return boxes;
      }
    }
  }
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
  const move = moveOf(template, fighter.move);
  return move.hitbox && isActiveFrame(move, fighter.actionFrame) ? move : null;
}

/**
 * Whether strikes and projectiles can hit this fighter on this tick, by a blow from the air or
 * not (`fromAir`). Launched by a launcher, it can take one blow in the air (`juggle`).
 */
export function canBeHit(
  fighter: FighterState,
  template: FighterTemplate,
  fromAir = false,
): boolean {
  const juggled = fighter.action === 'airHit' && fighter.juggle > 0;
  if (INVULNERABLE_ACTIONS.has(fighter.action) && !juggled) return false;
  return !(
    fighter.move && isInvincible(moveOf(template, fighter.move), fighter.actionFrame, fromAir)
  );
}

/** Returns the move that hits the defender on this tick, if any. */
export function findHit(
  attacker: FighterState,
  attackerTemplate: FighterTemplate,
  defender: FighterState,
  defenderTemplate: FighterTemplate,
): MoveData | null {
  if (attacker.moveConnected || !canBeHit(defender, defenderTemplate, attacker.y > 0)) return null;
  const move = activeMove(attacker, attackerTemplate);
  if (!move?.hitbox) return null;
  if (move.kind === 'grab' && !canBeGrabbed(defender, defenderTemplate)) return null;

  const { x, y, facing } = attacker;
  return touchedHurtbox(move.hitbox, x, y, facing, defender, defenderTemplate) ? move : null;
}

/**
 * Where `striker` met `defender`'s body: the middle of the overlap with the hurtbox it touched.
 * Only called on the ticks where something touched.
 */
export function impactOf(
  striker: PlacedBox,
  defender: FighterState,
  template: FighterTemplate,
): Impact {
  const { box, x, y, facing } = striker;
  const body = touchedHurtbox(box, x, y, facing, defender, template);
  if (!body) throw new Error('A blow touched no hurtbox');
  return {
    x: overlapMiddleX(box, x, facing, body, defender.x, defender.facing),
    y: overlapMiddleY(box, y, body, defender.y),
  };
}

/** What touched on a tick, by whom, where, for how much. */
export function contactOf(
  by: 0 | 1,
  kind: Contact['kind'],
  move: MoveId,
  impact: Impact,
  damage: number,
  counter: CounterHit | null = null,
): Contact {
  return { by, kind, move, x: impact.x, y: impact.y, damage, counter };
}

/**
 * Resolves a connected move on the defender: block (a special chips, never the last point),
 * hit, knockdown, juggle or KO, with its reaction (§9.4) and, on a counter-hit (`detail`), more
 * damage and stun. `attackerX` is where the hit comes from (the attacker, or a projectile's
 * back). Health never drops below `minHealth`: 1 in training, where nobody can be KO'd.
 */
export function applyHit(
  defender: FighterState,
  attackerX: number,
  move: MoveData,
  minHealth = 0,
  detail: HitDetail = PLAIN_HIT,
): FighterState {
  const attackerOnRight = isOnRight(attackerX, defender);
  const away = attackerOnRight ? -1 : 1;
  const { knockdown } = move;
  const interrupted = {
    ...defender,
    actionFrame: 0,
    move: null,
    moveConnected: false,
    // A knockdown carries the defender at its own speed; any other blow slides it back.
    vx: signed(away, knockdown?.vx ?? move.pushback),
  } as const;

  if (move.kind !== 'grab' && isBlocking(defender, attackerOnRight, move.guard)) {
    const chip = chipDamage(move);
    return {
      ...interrupted,
      health: chip > 0 ? Math.max(1, defender.health - chip) : defender.health,
      vx: signed(away, move.pushback),
      action: 'blockstun',
      stunFrames: move.blockstun,
      crouching: has(defender.input, Input.Down),
      comboCount: 0,
      reaction: null,
      reactionHeavy: false,
      stunTotal: move.blockstun,
    };
  }

  // A juggled fighter is still in the combo, like one in hitstun.
  const juggled = defender.action === 'airHit' && defender.juggle > 0;
  const comboCount = defender.action === 'hitstun' || juggled ? defender.comboCount + 1 : 1;
  const counter = detail.counter !== null;
  const damage = scaledDamage(move.damage, comboCount, counter);
  const health = Math.max(minHealth, defender.health - damage);
  const airborne = defender.y > 0;
  const lift = knockdown?.vy ?? (airborne ? AIR_HIT_LIFT : 0);
  const launched = lift > 0;
  const stun = launched ? 0 : move.hitstun + (counter ? COUNTER_HITSTUN : 0);
  const shaken = {
    ...interrupted,
    health,
    comboCount,
    // A launcher allows one more blow in the air, never a second launch on a juggled fighter.
    juggle: knockdown?.juggle && defender.action !== 'airHit' ? 1 : 0,
    reaction: reactionOf(defender, move, launched, detail.impactPercent),
    reactionHeavy: stun >= HEAVY_REACTION_HITSTUN,
    stunTotal: stun,
  } as const;
  if (health === 0) return { ...shaken, action: 'ko', stunFrames: 0, vy: lift };
  if (launched) return { ...shaken, action: 'airHit', stunFrames: 0, vy: lift };
  return { ...shaken, action: 'hitstun', stunFrames: stun };
}

/**
 * A tech: both players grabbed each other on the same tick, or the held one broke free. Nobody
 * is thrown, both are pushed apart.
 */
export function techGrab(fighter: FighterState, opponentX: number): FighterState {
  const away = isOnRight(opponentX, fighter) ? -1 : 1;
  return {
    ...fighter,
    action: 'tech',
    crouching: false,
    actionFrame: 0,
    move: null,
    moveConnected: false,
    stunFrames: THROW_TECH_STUN,
    vx: signed(away, THROW_TECH_PUSHBACK),
  };
}

/**
 * Grabs only take a grounded fighter that is not reeling, nor just out of a stun (the throw
 * protection), nor in the grab-proof frames of a backdash.
 */
export function canBeGrabbed(fighter: FighterState, template: FighterTemplate): boolean {
  if (fighter.y !== 0 || fighter.throwImmuneFrames > 0) return false;
  if (GRAB_IMMUNE_ACTIONS.has(fighter.action)) return false;
  return !(fighter.move && isThrowInvincible(moveOf(template, fighter.move), fighter.actionFrame));
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
