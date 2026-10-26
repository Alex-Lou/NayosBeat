import type { MatchConfig } from '../core/config';
import { px } from '../core/constants';
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
  | ({ readonly type: 'hit'; readonly damage: number } & Contact)
  | ({ readonly type: 'block' } & Contact)
  | ({ readonly type: 'ko' } & Contact)
  | { readonly type: 'attack'; readonly heavy: boolean }
  | { readonly type: 'projectile' }
  | { readonly type: 'jump' }
  | { readonly type: 'land' }
  | { readonly type: 'phase'; readonly phase: RoundPhase };

/** Above this damage, a hit counts as heavy (bigger sparks, screen shake). */
export const HEAVY_HIT_DAMAGE = 60;

/** Contact point: in front of the defender, toward the attacker, at mid-body height. */
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
    const contact = contactPoint(after, next.fighters[attacker], attacker);

    if (after.action === 'ko' && before.action !== 'ko') {
      events.push({ type: 'ko', ...contact });
    } else if (after.health < before.health) {
      events.push({ type: 'hit', ...contact, damage: before.health - after.health });
    } else if (startedBlocking(before, after)) {
      events.push({ type: 'block', ...contact });
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

function startedNewMove(before: FighterState, after: FighterState): boolean {
  return before.move !== after.move || before.actionFrame > 0;
}

function contactPoint(defender: FighterState, attacker: FighterState, by: 0 | 1): Contact {
  const toward = attacker.x >= defender.x ? 1 : -1;
  const height = defender.crouching ? CONTACT_HEIGHT_CROUCHING : CONTACT_HEIGHT_STANDING;
  return {
    x: defender.x + toward * CONTACT_OFFSET_X,
    y: defender.y + height,
    away: toward === 1 ? -1 : 1,
    by,
  };
}
