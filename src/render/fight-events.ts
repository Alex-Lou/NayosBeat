import { intersects, type WorldBox } from '../core/boxes';
import { activeMove, hitboxInWorld, hurtboxInWorld } from '../core/combat';
import type { MatchConfig, MoveData } from '../core/config';
import { px } from '../core/constants';
import { projectileBox, projectileData } from '../core/projectiles';
import type { FighterState, GameState, RoundPhase } from '../core/state';

/**
 * Things worth a sound or a visual effect, found by comparing two consecutive states.
 * The simulation stays unaware of presentation: nothing here feeds back into the game.
 */
/** Where a blow landed, who landed it, and which way it pushes the defender. */
interface Contact {
  readonly x: number;
  readonly y: number;
  /** Away from the attacker. */
  readonly away: 1 | -1;
  /** The attacker: its effects take its colors. */
  readonly by: 0 | 1;
}

export type FightEvent =
  | ({ readonly type: 'hit'; readonly damage: number; readonly heavy: boolean } & Contact)
  | ({ readonly type: 'block' } & Contact)
  | ({ readonly type: 'ko' } & Contact)
  | { readonly type: 'attack'; readonly heavy: boolean }
  | { readonly type: 'projectile' }
  | { readonly type: 'jump' }
  | { readonly type: 'land' }
  | { readonly type: 'phase'; readonly phase: RoundPhase };

/**
 * A move this strong counts as heavy (bigger sparks, shake, heavy sounds), by its own damage:
 * the swing and the hit agree, and a heavy blow stays heavy late in a scaled combo.
 */
export const HEAVY_HIT_DAMAGE = 60;

/** Without a striking box: in front of the defender, toward the attacker, at mid-body height. */
const CONTACT_OFFSET_X = px(12);
const CONTACT_HEIGHT_STANDING = px(50);
const CONTACT_HEIGHT_CROUCHING = px(28);

/**
 * Fills `events` (cleared first) with what happened between two states. The caller reuses the
 * same array every tick, so a quiet tick allocates nothing.
 */
export function detectEvents(
  prev: GameState,
  next: GameState,
  config: MatchConfig,
  events: FightEvent[],
): void {
  events.length = 0;

  for (const player of [0, 1] as const) {
    const before = prev.fighters[player];
    const after = next.fighters[player];
    const attacker = player === 0 ? 1 : 0;

    // The contact is only worked out for the ticks where something landed.
    if (after.action === 'ko' && before.action !== 'ko') {
      events.push({ type: 'ko', ...contactPoint(prev, next, config, player, attacker).contact });
    } else if (after.health < before.health || startedHitstun(before, after)) {
      // In training, health stops at 1: a hit is also told by the stun it starts.
      const { contact, move } = contactPoint(prev, next, config, player, attacker);
      const damage = before.health - after.health;
      const heavy = (move?.damage ?? damage) >= HEAVY_HIT_DAMAGE;
      events.push({ type: 'hit', ...contact, damage, heavy });
    } else if (startedBlocking(before, after)) {
      events.push({ type: 'block', ...contactPoint(prev, next, config, player, attacker).contact });
    }

    if (after.move && after.actionFrame === 0 && startedNewMove(before, after)) {
      const move = config.fighters[player].moves[after.move];
      events.push({ type: 'attack', heavy: move.damage >= HEAVY_HIT_DAMAGE });
    }
    if (after.action === 'air' && before.action === 'preJump') events.push({ type: 'jump' });
    if (after.action === 'landing' && before.action !== 'landing') events.push({ type: 'land' });
  }

  if (next.projectiles.length > prev.projectiles.length) events.push({ type: 'projectile' });
  if (next.round.phase !== prev.round.phase || next.round.number !== prev.round.number) {
    events.push({ type: 'phase', phase: next.round.phase });
  }
}

/** A new block, including a second block while still in blockstun (its frame counter restarts). */
function startedBlocking(before: FighterState, after: FighterState): boolean {
  if (after.action !== 'blockstun' || after.actionFrame !== 0) return false;
  return before.action !== 'blockstun' || before.actionFrame > 0;
}

/** A new hit stun: applyHit always restarts the frame counter, a second hit included. */
function startedHitstun(before: FighterState, after: FighterState): boolean {
  if ((after.action !== 'hitstun' && after.action !== 'airHit') || after.actionFrame !== 0) {
    return false;
  }
  return before.action !== after.action || before.actionFrame > 0;
}

function startedNewMove(before: FighterState, after: FighterState): boolean {
  return before.move !== after.move || before.actionFrame > 0;
}

/**
 * Where a blow lands: the middle of the overlap between what struck (the attacker's hitbox, or
 * its projectile) and the defender's body. A sweep sparks at the ankles, an uppercut at the
 * chin. On the tick of the hit, the attacker is still on the active frame that connected.
 */
function contactPoint(
  prev: GameState,
  next: GameState,
  config: MatchConfig,
  defenderIndex: 0 | 1,
  by: 0 | 1,
): { contact: Contact; move: MoveData | null } {
  const defender = next.fighters[defenderIndex];
  const attacker = next.fighters[by];
  const toward = attacker.x >= defender.x ? 1 : -1;
  const away = toward === 1 ? -1 : 1;
  const body = hurtboxInWorld(defender, config.fighters[defenderIndex]);
  const strike = strikeOf(prev, attacker, body, config, by);
  if (strike)
    return { contact: { ...middleOfOverlap(strike.box, body), away, by }, move: strike.move };

  const height = defender.crouching ? CONTACT_HEIGHT_CROUCHING : CONTACT_HEIGHT_STANDING;
  const contact: Contact = {
    x: defender.x + toward * CONTACT_OFFSET_X,
    y: defender.y + height,
    away,
    by,
  };
  return { contact, move: null };
}

/** What struck: the attacker's active hitbox, else its projectile that reached the body. */
function strikeOf(
  prev: GameState,
  attacker: FighterState,
  body: WorldBox,
  config: MatchConfig,
  by: 0 | 1,
): { box: WorldBox; move: MoveData } | null {
  const move = activeMove(attacker, config.fighters[by]);
  if (move?.hitbox) {
    const box = hitboxInWorld(attacker, move.hitbox);
    if (intersects(box, body)) return { box, move };
  }
  for (const projectile of prev.projectiles) {
    if (projectile.owner !== by) continue;
    const box = projectileBox(projectile, config);
    if (intersects(box, body)) return { box, move: projectileData(projectile, config) };
  }
  return null;
}

function middleOfOverlap(a: WorldBox, b: WorldBox): { x: number; y: number } {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.bottom, b.bottom);
  const top = Math.min(a.bottom + a.height, b.bottom + b.height);
  return { x: (left + right) / 2, y: (bottom + top) / 2 };
}
