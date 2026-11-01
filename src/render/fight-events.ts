import type { FighterTemplate, MatchConfig } from '../core/config';
import { finisherLocked } from '../core/finisher';
import type { MoveId } from '../core/move-data';
import { moveOf, tierOf } from '../core/moves';
import type { Contact, CounterHit, FighterState, GameState, RoundPhase } from '../core/state';
import { finisherNameOf } from '../data/roster';

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
 * A blow that went through the guard, the `damage` it really took: `held` when it landed in a
 * hold (a pummel, a throw); `counter` when it caught the defender attacking or recovering (the
 * core's `isCounterHit`); `tier`, its move's (3: a super); `pulse`, a blow of a super before its
 * last (BOOM, BOOM, BOOOOM: docs/flashs.md §2).
 */
interface Blow extends Impact {
  readonly damage: number;
  readonly held: boolean;
  readonly counter: CounterHit | null;
  readonly tier: number;
  readonly pulse: boolean;
}

/**
 * How the final blow knocked its fighter out, what the Boost gauge shows of it
 * (docs/combos-v3.md §1.8.6, docs/finisher.md §1.13): `plain`, a blow on its own (the gauge stays
 * whole); `combo`, the end of a combo of COMBO_KO_HITS blows or more (it cracks); `ultimate`, a
 * super (it shatters); `finale`, the last blow of a super the Finisher locks (it shatters too,
 * on the landing once the Finisher's scene plays: until then, as an Ultime's).
 */
export type KoFinish = 'plain' | 'combo' | 'ultimate' | 'finale';
/** Blows of a combo, the final one included, from which its KO cracks the gauge. */
export const COMBO_KO_HITS = 3;

/**
 * How a KO lands: the final blow's tier (3: a super), the blows of the combo it ends, and
 * whether it is the last blow of the Finisher's lock (`finale`).
 */
export function koFinishOf(tier: number, comboHits: number, finale: boolean): KoFinish {
  if (finale) return 'finale';
  if (tier >= 3) return 'ultimate';
  return comboHits >= COMBO_KO_HITS ? 'combo' : 'plain';
}

/**
 * A blow that lands heavy (bigger sparks, shake and sound, the victim trembling more): a heavy
 * move, a counter-hit (CONTRE, PUNITION), the final blow.
 */
export function landsHeavy(blow: Extract<FightEvent, { type: 'hit' | 'ko' }>): boolean {
  return blow.type === 'ko' || blow.heavy || blow.counter !== null;
}

/** The KO blows the loser's Boost gauge up: an Ultime's, the Finisher's. */
export function shatters(finish: KoFinish): boolean {
  return finish === 'ultimate' || finish === 'finale';
}

export type FightEvent =
  | ({ readonly type: 'hit'; readonly heavy: boolean } & Blow)
  | ({ readonly type: 'block' } & Impact)
  | ({ readonly type: 'ko'; readonly finish: KoFinish } & Blow)
  /** A grab caught `by`'s opponent; `punish`: caught recovering, it cannot break free. */
  | ({ readonly type: 'grab'; readonly punish: boolean } & Impact)
  /** `by` broke free of a grab (one event for two grabs on the same tick). */
  | ({ readonly type: 'tech' } & Impact)
  /** `by` threw: the opponent flies, `damage` taken. */
  | ({ readonly type: 'throw'; readonly damage: number } & Impact)
  /**
   * A fighter sent flying lands on its back at `x` (stage sub-pixels), pushed `away`; `ko`, the
   * body of a fighter knocked out in the air (`landingOf`).
   */
  | { readonly type: 'fall'; readonly x: number; readonly away: 1 | -1; readonly ko: boolean }
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
   * a step toward `toward`; the super (its name), as it starts.
   */
  | ({ readonly type: 'boost' } & Spender)
  | ({ readonly type: 'rewind'; readonly name: string; readonly toward: 1 | -1 } & Spender)
  | ({ readonly type: 'super'; readonly name: string } & Spender)
  /**
   * The super's flash freezes the whole game (Nayo's on its first frame, Riff's at the top of
   * her dive), `by` facing `toward`: once, never if the super was cut short before it.
   */
  | ({ readonly type: 'freeze'; readonly toward: 1 | -1 } & Spender)
  /**
   * The Finisher (docs/finisher.md §1.6): `by`'s armed super locks the pair on its first contact,
   * at `x`, `y` (stage sub-pixels), its name shown only then; then its last blow lands, pushing
   * `away`, in a match (with the KO) as in training (the dummy kept at 1 HP).
   */
  | {
      readonly type: 'finisherLock';
      readonly by: 0 | 1;
      readonly name: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: 'finisherBlow';
      readonly by: 0 | 1;
      readonly x: number;
      readonly y: number;
      readonly away: 1 | -1;
    }
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
    if (contact && !sameTech) {
      const event = contactEvent(contact, next, config);
      events.push(event);
      if (event.type === 'hit' || event.type === 'ko')
        finisherEvents(prev, next, event, config, events);
    }

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
    if (reachedSuperFlash(before, after, config.fighters[player])) {
      events.push({ type: 'freeze', by: player, x: after.x, y: after.y, toward: after.facing });
    }
    if (after.action === 'air' && before.action === 'preJump') events.push({ type: 'jump' });
    if (after.action === 'landing' && before.action !== 'landing') events.push({ type: 'land' });
    const fell = after.action === 'knockdown' && before.action === 'airHit';
    // Knocked out in the air: the body lands once (it never bounces), the ko going on.
    const fellOut =
      after.action === 'ko' && before.action === 'ko' && before.y > 0 && after.y === 0;
    if (fell || fellOut) {
      events.push({ type: 'fall', x: after.x, away: before.vx < 0 ? -1 : 1, ko: fellOut });
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
  const { counter, damage } = contact;
  const tier = tierOf(move);
  // A super's blow before its last: its attacker is still in it, short of the last pulse.
  const last = tier === 3 ? move.pulses?.[move.pulses.length - 1]?.frame : undefined;
  const pulse = last !== undefined && attacker.move === contact.move && attacker.actionFrame < last;
  const blow = { ...impact, damage, held, counter, tier, pulse };
  if (defender.health === 0) {
    // A double KO is never the Finisher's: it locks only a pair that nothing else touches.
    const finale = finisherLocked(next, contact.by) && attacker.health > 0;
    return { type: 'ko', ...blow, finish: koFinishOf(tier, defender.comboCount, finale) };
  }
  if (contact.kind === 'throw') return { type: 'throw', ...impact, damage };
  return { type: 'hit', ...blow, heavy: move.damage >= HEAVY_HIT_DAMAGE };
}

/**
 * The Finisher's moments on a blow of its super (docs/finisher.md §1.6): the lock that takes on
 * this contact, its name with it; the last blow, the KO's in a match, the 1 HP floor's on the
 * training dummy.
 */
function finisherEvents(
  prev: GameState,
  next: GameState,
  blow: Blow,
  config: MatchConfig,
  events: FightEvent[],
): void {
  const { by, x, y } = blow;
  if (!finisherLocked(next, by)) return;
  if (!finisherLocked(prev, by)) {
    events.push({ type: 'finisherLock', by, name: finisherNameOf(config.fighters[by]), x, y });
  }
  if (!blow.pulse) events.push({ type: 'finisherBlow', by, x, y, away: blow.away });
}

function startedNewMove(before: FighterState, after: FighterState): boolean {
  return before.move !== after.move || before.actionFrame > 0;
}

/**
 * A super reached the frame its flash freezes the game on: on that tick only, the freeze holding
 * its frame the ticks after.
 */
function reachedSuperFlash(
  before: FighterState,
  after: FighterState,
  template: FighterTemplate,
): boolean {
  if (after.action !== 'attack' || !after.move) return false;
  const move = moveOf(template, after.move);
  if (tierOf(move) !== 3 || move.flash?.frame !== after.actionFrame) return false;
  return before.move !== after.move || before.actionFrame !== after.actionFrame;
}

/** What a body landing on its back makes seen, heard and felt: its dust, its thud (sound, jolt). */
export interface Landing {
  readonly dust: boolean;
  readonly thud: boolean;
}

const LANDINGS = {
  fall: { dust: true, thud: true },
  // Its dust is the ko's own (fx/ko, which koLanding plays from the floor): drawn once.
  ko: { dust: false, thud: true },
  silent: { dust: false, thud: false },
} as const satisfies Record<string, Landing>;

/**
 * How a body sent flying lands (docs/art/animation-plan.md §2, V1): in its dust, with a thud.
 * Knocked out in the air, with the thud alone; but silent after the Finisher (`finish`: the KO's,
 * null before one), whose scene plays its own landing, and with the animation of before
 * (`legacy`), where a body knocked out landed without a sound.
 */
export function landingOf(
  fall: Extract<FightEvent, { type: 'fall' }>,
  finish: KoFinish | null,
  legacy: boolean,
): Landing {
  if (!fall.ko) return LANDINGS.fall;
  return finish === 'finale' || legacy ? LANDINGS.silent : LANDINGS.ko;
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
      if (shatters(event.finish)) return HAPTICS.shatter;
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
