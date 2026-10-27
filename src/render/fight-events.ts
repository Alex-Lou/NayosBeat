import type { MatchConfig } from '../core/config';
import type { MoveId } from '../core/move-data';
import type { Contact, FighterState, GameState, RoundPhase } from '../core/state';

/**
 * Things worth a sound or a visual effect, found by comparing two consecutive states.
 * The simulation stays unaware of presentation: nothing here feeds back into the game.
 */
/** Where a blow landed, who landed it, and which way it pushes the defender. */
interface Impact {
  readonly x: number;
  readonly y: number;
  /** Away from the attacker. */
  readonly away: 1 | -1;
  /** The attacker: its effects take its colors. */
  readonly by: 0 | 1;
  /** A low blow (blocked crouching): it lands at the feet, skimming the floor. */
  readonly low: boolean;
}

/** A blow that went through the guard: `grab` when it was one (the victim's pad shakes). */
interface Blow extends Impact {
  readonly grab: boolean;
}

export type FightEvent =
  | ({ readonly type: 'hit'; readonly damage: number; readonly heavy: boolean } & Blow)
  | ({ readonly type: 'block' } & Impact)
  | ({ readonly type: 'ko' } & Blow)
  /** `by` starts `move` (not a dash: see below). */
  | {
      readonly type: 'attack';
      readonly heavy: boolean;
      readonly by: 0 | 1;
      readonly move: MoveId;
    }
  /** A dash sets off from `x` (stage sub-pixels), toward `toward` (1: right). */
  | { readonly type: 'dash'; readonly x: number; readonly toward: 1 | -1 }
  | { readonly type: 'projectile' }
  | { readonly type: 'jump' }
  | { readonly type: 'land' }
  | { readonly type: 'phase'; readonly phase: RoundPhase };

/**
 * A move this strong counts as heavy (bigger sparks, shake, heavy sounds), by its own damage:
 * the swing and the hit agree, and a heavy blow stays heavy late in a scaled combo.
 */
export const HEAVY_HIT_DAMAGE = 60;

/**
 * Vibration, in ms, of a player's phone: being grabbed (the cue to break free is felt in the
 * hand) and a heavy blow taken. Short: the thumbs play on that screen.
 */
export const HAPTICS = { grabbed: 30, heavyHit: 15 } as const;

const PLAYERS = [0, 1] as const;

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

  for (const player of PLAYERS) {
    const before = prev.fighters[player];
    const after = next.fighters[player];

    // Hits, blocks and KOs come from the simulation's contacts: it knows where boxes met.
    const contact = contactOn(next.contacts, player);
    if (contact) events.push(contactEvent(contact, next, config));

    if (after.move && after.actionFrame === 0 && startedNewMove(before, after)) {
      const move = config.fighters[player].moves[after.move];
      if (move.kind === 'movement') {
        // A backdash moves away from the side it faces.
        const back = move.motion?.dx.some((dx) => dx < 0) ?? false;
        const toward = back === (after.facing === 1) ? -1 : 1;
        events.push({ type: 'dash', x: after.x, toward });
      } else {
        const heavy = move.damage >= HEAVY_HIT_DAMAGE;
        events.push({ type: 'attack', heavy, by: player, move: after.move });
      }
    }
    if (after.action === 'air' && before.action === 'preJump') events.push({ type: 'jump' });
    if (after.action === 'landing' && before.action !== 'landing') events.push({ type: 'land' });
  }

  if (next.projectiles.length > prev.projectiles.length) events.push({ type: 'projectile' });
  if (next.round.phase !== prev.round.phase || next.round.number !== prev.round.number) {
    events.push({ type: 'phase', phase: next.round.phase });
  }
}

/** The contact of the tick that touched `defender`, if any. */
function contactOn(contacts: readonly Contact[], defender: 0 | 1): Contact | undefined {
  for (const contact of contacts) if (contact.by !== defender) return contact;
  return undefined;
}

/**
 * A blocked blow, a hit, or the final blow. A hit is reported even when health does not move
 * (a training dummy at its 1 HP floor), with the damage it really took.
 */
function contactEvent(contact: Contact, next: GameState, config: MatchConfig): FightEvent {
  const attacker = next.fighters[contact.by];
  const defender = next.fighters[contact.by === 0 ? 1 : 0];
  const move = config.fighters[contact.by].moves[contact.move];
  const impact: Impact = {
    x: contact.x,
    y: contact.y,
    away: attacker.x >= defender.x ? -1 : 1,
    by: contact.by,
    low: move.guard === 'low',
  };
  if (contact.kind === 'block') return { type: 'block', ...impact };
  const grab = move.kind === 'grab';
  if (defender.health === 0) return { type: 'ko', ...impact, grab };
  const heavy = move.damage >= HEAVY_HIT_DAMAGE;
  return { type: 'hit', ...impact, damage: contact.damage, heavy, grab };
}

function startedNewMove(before: FighterState, after: FighterState): boolean {
  return before.move !== after.move || before.actionFrame > 0;
}

/** How long `player`'s phone vibrates for an event: blows it takes only, 0 for none. */
export function vibrationFor(event: FightEvent, player: 0 | 1): number {
  if ((event.type !== 'hit' && event.type !== 'ko') || event.by === player) return 0;
  if (event.grab) return HAPTICS.grabbed;
  return event.type === 'ko' || event.heavy ? HAPTICS.heavyHit : 0;
}
