import { overlapMiddleX, overlapMiddleY, overlaps } from './boxes';
import type { Box, FighterTemplate } from './config';
import { chipDamage, scaledDamage } from './damage';
import { dangerMarked, type FinisherBlow } from './finisher';
import { has, Input } from './input';
import type { Guard, MoveData, MoveId } from './move-data';
import { flightOf, isJuggled } from './juggle';
import { isActiveFrame, isInvincible, isThrowInvincible, moveOf } from './moves';
import { signed } from './numbers';
import { BODY_PERCENT, reactionOf } from './reaction';
import {
  COUNTER_HITSTUN,
  DECAY_FROM,
  DECAY_STEP,
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
 * No juggles (but those a launcher allows, see `canBeHit`) and no hitting a fighter that is
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

/**
 * What a blow brings besides its move: a counter-hit, where it lands on the body, whether the
 * defender was in danger before it (`inDanger`, for the combo it may open), and how it lands on
 * a pair the Finisher locks (docs/finisher.md §1.6).
 */
export interface HitDetail {
  readonly counter: CounterHit | null;
  /** Height of the impact, in percent of the defender's standing body (`impactPercent`). */
  readonly impactPercent: number;
  readonly danger?: boolean;
  readonly finisher?: FinisherBlow | null;
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
 * not (`fromAir`) that costs `juggleCost` points on a juggled body: launched by a launcher, it
 * takes blows in the air while it has their points (`isJuggled`).
 */
export function canBeHit(
  fighter: FighterState,
  template: FighterTemplate,
  fromAir = false,
  juggleCost = 1,
): boolean {
  if (INVULNERABLE_ACTIONS.has(fighter.action) && !isJuggled(fighter, juggleCost)) return false;
  return !(
    fighter.move && isInvincible(moveOf(template, fighter.move), fighter.actionFrame, fromAir)
  );
}

/**
 * Returns the move that hits the defender on this tick, if any: for a multi-hit move, the blow
 * of the pulse it has reached (`landingData`), with the move's hitbox.
 */
export function findHit(
  attacker: FighterState,
  attackerTemplate: FighterTemplate,
  defender: FighterState,
  defenderTemplate: FighterTemplate,
): MoveData | null {
  if (attacker.moveConnected) return null;
  const active = activeMove(attacker, attackerTemplate);
  if (!active?.hitbox) return null;
  const move = landingData(active, attacker.actionFrame);
  if (!canBeHit(defender, defenderTemplate, attacker.y > 0, move.juggleCost)) return null;
  if (move.kind === 'grab' && !canBeGrabbed(defender, defenderTemplate)) return null;

  const { x, y, facing } = attacker;
  return touchedHurtbox(active.hitbox, x, y, facing, defender, defenderTemplate) ? move : null;
}

/** The blow a move lands on `actionFrame`: its last pulse reached, or the move itself. */
export function landingData(move: MoveData, actionFrame: number): MoveData {
  if (!move.pulses) return move;
  let landing = move;
  for (const pulse of move.pulses) if (actionFrame >= pulse.frame) landing = pulse.hit;
  return landing;
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
 * hit, knockdown, juggle or KO (`flightOf`), with its reaction (§9.4) and, on a counter-hit
 * (`detail`), more damage and stun, or the move's own CONTRE. Late in a combo the hitstun decays
 * (docs/combos-v3.md §1.7). `attackerX` is where the hit comes from (the attacker, or a
 * projectile's back). Health never drops below `minHealth`: 1 in training, where nobody can be
 * KO'd. The combo's first blow marks a defender in danger (FLAG_DANGER), and a blow of the
 * Finisher's lock stops at 1 HP or takes all that is left (`detail.finisher`), whatever the
 * scaling.
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
  const interrupted = { ...defender, actionFrame: 0, move: null, moveConnected: false } as const;

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

  // A fighter hit in hitstun or in the air (only a juggled one can be) is still in the combo.
  const continuing = defender.action === 'hitstun' || defender.action === 'airHit';
  const comboCount = continuing ? defender.comboCount + 1 : 1;
  const counter = detail.counter !== null;
  const own = counter ? move.counter : undefined;
  const damage = scaledDamage(move.damage, comboCount, counter);
  const health = healthAfter(defender.health, damage, minHealth, detail.finisher ?? null);
  const launch = own?.knockdown ?? move.knockdown;
  const slide = own?.pushback ?? move.pushback;
  const flight = flightOf(defender, move, launch, slide, away, comboCount);
  const launched = flight.vy !== 0;
  const bonus = counter ? (own?.hitstun ?? COUNTER_HITSTUN) : 0;
  const decay = DECAY_STEP * Math.max(0, comboCount - DECAY_FROM);
  const stun = launched ? 0 : Math.max(0, move.hitstun + bonus - decay);
  const shaken = {
    ...interrupted,
    health,
    comboCount,
    vx: flight.vx,
    juggle: flight.juggle,
    flags: dangerMarked(flight.flags, comboCount, detail.danger === true),
    reaction: reactionOf(defender, move, launched, detail.impactPercent),
    reactionHeavy: stun >= HEAVY_REACTION_HITSTUN,
    stunTotal: stun,
  } as const;
  // Knocked out by a slam, the body just falls.
  if (health === 0) return { ...shaken, action: 'ko', stunFrames: 0, vy: Math.max(0, flight.vy) };
  if (launched) return { ...shaken, action: 'airHit', stunFrames: 0, vy: flight.vy };
  return { ...shaken, action: 'hitstun', stunFrames: stun };
}

/**
 * Health left after a blow of `damage`: never below `minHealth`; on a pair the Finisher locks,
 * never below 1 before the super's last blow, and none but `minHealth` after it.
 */
function healthAfter(
  health: number,
  damage: number,
  minHealth: number,
  finisher: FinisherBlow | null,
): number {
  if (finisher === 'lethal') return minHealth;
  const floor = finisher === 'floor' ? Math.max(1, minHealth) : minHealth;
  return Math.max(floor, health - damage);
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
