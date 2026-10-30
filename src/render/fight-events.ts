import type { MatchConfig } from '../core/config';
import type { MoveId } from '../core/move-data';
import { moveOf, tierOf } from '../core/moves';
import type { Contact, CounterHit, FighterState, GameState, RoundPhase } from '../core/state';

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

/** Who spends its gauge, and where it stands (its feet, stage sub-pixels). */
interface Spender {
  readonly by: 0 | 1;
  readonly x: number;
  readonly y: number;
}

/**
 * A blow that went through the guard: `held` when it landed in a hold (a pummel, a throw);
 * `counter` when it caught the defender attacking or recovering (the core's `isCounterHit`).
 */
interface Blow extends Impact {
  readonly held: boolean;
  readonly counter: CounterHit | null;
}

/**
 * How the final blow knocked its fighter out, what the Boost gauge shows of it
 * (docs/combos-v3.md §1.8.6): `plain`, a blow on its own (the gauge stays whole); `combo`, the end
 * of a combo of COMBO_KO_HITS blows or more (it cracks); `finisher`, a super (it shatters).
 */
export type KoFinish = 'plain' | 'combo' | 'finisher';
/** Blows of a combo, the final one included, from which its KO cracks the gauge. */
export const COMBO_KO_HITS = 3;

/** How a KO lands: the final blow's tier (3: a super), the blows of the combo it ends. */
export function koFinishOf(tier: number, comboHits: number): KoFinish {
  if (tier >= 3) return 'finisher';
  return comboHits >= COMBO_KO_HITS ? 'combo' : 'plain';
}

export type FightEvent =
  | ({ readonly type: 'hit'; readonly damage: number; readonly heavy: boolean } & Blow)
  | ({ readonly type: 'block' } & Impact)
  | ({ readonly type: 'ko'; readonly finish: KoFinish } & Blow)
  /** A grab caught `by`'s opponent; `punish`: caught recovering, it cannot break free. */
  | ({ readonly type: 'grab'; readonly punish: boolean } & Impact)
  /** `by` broke free of a grab (one event for two grabs on the same tick). */
  | ({ readonly type: 'tech' } & Impact)
  /** `by` threw: the opponent flies, `damage` taken. */
  | ({ readonly type: 'throw'; readonly damage: number } & Impact)
  /** A fighter sent flying lands on its back at `x` (stage sub-pixels), pushed `away`. */
  | { readonly type: 'fall'; readonly x: number; readonly away: 1 | -1 }
  /** `by` starts `move` (not a dash: see below). */
  | {
      readonly type: 'attack';
      readonly heavy: boolean;
      readonly by: 0 | 1;
      readonly move: MoveId;
    }
  /** A dash sets off from `x` (stage sub-pixels), toward `toward` (1: right). */
  | { readonly type: 'dash'; readonly x: number; readonly toward: 1 | -1 }
  /**
   * `by` spends its Boost gauge (docs/combos-v3.md §1.8.7), standing at `x`, `y` (its feet,
   * stage sub-pixels): a Remix, its special in platine; the Rewind (its own name, Riff's Pogo),
   * a step toward `toward`; the super (its name), as its flash freezes the game.
   */
  | ({ readonly type: 'boost' } & Spender)
  | ({ readonly type: 'rewind'; readonly name: string; readonly toward: 1 | -1 } & Spender)
  | ({ readonly type: 'super'; readonly name: string } & Spender)
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
 * hand), each pummel taken in the hold, and a heavy blow taken (a throw is one). Short: the
 * thumbs play on that screen.
 */
export const HAPTICS = { grabbed: 30, pummel: 12, heavyHit: 15, shatter: 180 } as const;
/** The gamepads' rumble when a KO blows a Boost gauge up (an Ultime's): its length, its strength. */
export const SHATTER_RUMBLE = { ms: 260, strength: 1 } as const;

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

    // Hits, blocks and KOs come from the simulation's contacts: it knows where boxes met. Two
    // grabs teched on the same tick are one tech.
    const contact = contactOn(next.contacts, player);
    const sameTech = contact?.kind === 'tech' && events.some((event) => event.type === 'tech');
    if (contact && !sameTech) events.push(contactEvent(contact, next, config));

    if (after.move && after.actionFrame === 0 && startedNewMove(before, after)) {
      const move = moveOf(config.fighters[player], after.move);
      const { x, y } = after;
      if (move.kind === 'movement') {
        // A backdash moves away from the side it faces.
        const back = move.motion?.dx.some((dx) => dx < 0) ?? false;
        const toward = back === (after.facing === 1) ? -1 : 1;
        if (move.boostCost)
          events.push({ type: 'rewind', by: player, name: move.name, x, y, toward });
        else events.push({ type: 'dash', x, toward });
      } else {
        const heavy = move.damage >= HEAVY_HIT_DAMAGE;
        events.push({ type: 'attack', heavy, by: player, move: after.move });
        const tier = tierOf(move);
        if (tier === 2) events.push({ type: 'boost', by: player, x, y });
        if (tier === 3) events.push({ type: 'super', by: player, name: move.name, x, y });
      }
    }
    if (after.action === 'air' && before.action === 'preJump') events.push({ type: 'jump' });
    if (after.action === 'landing' && before.action !== 'landing') events.push({ type: 'land' });
    if (after.action === 'knockdown' && before.action === 'airHit') {
      events.push({ type: 'fall', x: after.x, away: before.vx < 0 ? -1 : 1 });
    }
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
 * A blocked blow, a hit, or the final blow; a grab, a tech or a throw. A hit is reported even
 * when health does not move (a training dummy at its 1 HP floor), with the damage it really took.
 */
function contactEvent(contact: Contact, next: GameState, config: MatchConfig): FightEvent {
  const attacker = next.fighters[contact.by];
  const defender = next.fighters[contact.by === 0 ? 1 : 0];
  const move = moveOf(config.fighters[contact.by], contact.move);
  const impact: Impact = {
    x: contact.x,
    y: contact.y,
    away: attacker.x >= defender.x ? -1 : 1,
    by: contact.by,
    low: move.guard === 'low',
  };
  switch (contact.kind) {
    case 'block':
      return { type: 'block', ...impact };
    case 'grab':
      return { type: 'grab', ...impact, punish: contact.counter === 'punish' };
    case 'tech':
      return { type: 'tech', ...impact };
    default:
  }
  const held = contact.kind !== 'hit';
  const { counter } = contact;
  if (defender.health === 0) {
    const finish = koFinishOf(tierOf(move), defender.comboCount);
    return { type: 'ko', ...impact, held, counter, finish };
  }
  if (contact.kind === 'throw') return { type: 'throw', ...impact, damage: contact.damage };
  const heavy = move.damage >= HEAVY_HIT_DAMAGE;
  return { type: 'hit', ...impact, damage: contact.damage, heavy, held, counter };
}

function startedNewMove(before: FighterState, after: FighterState): boolean {
  return before.move !== after.move || before.actionFrame > 0;
}

/**
 * How long `player`'s phone vibrates for an event: what it takes only, 0 for none; but a KO that
 * blows a Boost gauge up (an Ultime's) shakes both phones, the one who lands it too.
 */
export function vibrationFor(event: FightEvent, player: 0 | 1): number {
  switch (event.type) {
    case 'grab':
      return event.by === player ? 0 : HAPTICS.grabbed;
    case 'ko':
      if (event.finish === 'finisher') return HAPTICS.shatter;
      return event.by === player ? 0 : HAPTICS.heavyHit;
    case 'throw':
      return event.by === player ? 0 : HAPTICS.heavyHit;
    case 'hit':
      if (event.by === player) return 0;
      if (event.held) return HAPTICS.pummel;
      return event.heavy ? HAPTICS.heavyHit : 0;
    default:
      return 0;
  }
}
