import type { FighterTemplate, MatchConfig, TensionRules } from './config';
import { FLAG_CHARGED, type Contact, type FighterAction, type FighterState } from './state';

/**
 * A fighter's own gauge, the tension (docs/watt-arsenal.md §3.2): only for a fighter whose
 * template has `tension` rules. It fills as the fighter catches (a grab that holds, a pummel),
 * lands a blow or a throw, absorbs a blow with its armor or takes one, and loses a point every
 * `decayEvery` ticks in neutral while under `max`. Once full (`max`), it stays locked in
 * SURTENSION until the next plain special spends it.
 */

const DECAY_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'idle',
  'walkForward',
  'walkBack',
  'crouch',
  'guard',
]);

/** The gauge after this tick's `contacts`, on frame `frame`, for both fighters. */
export function tensioned(
  fighters: readonly [FighterState, FighterState],
  contacts: readonly Contact[],
  frame: number,
  config: MatchConfig,
): readonly [FighterState, FighterState] {
  const [a, b] = fighters;
  const nextA = withTension(a, 0, contacts, frame, config.fighters[0]);
  const nextB = withTension(b, 1, contacts, frame, config.fighters[1]);
  return nextA === a && nextB === b ? fighters : [nextA, nextB];
}

/** Whether the fighter's gauge is full: its next special is electrified (§3.2). */
export function isCharged(fighter: FighterState, template: FighterTemplate): boolean {
  return template.tension !== undefined && fighter.tension >= template.tension.max;
}

function withTension(
  fighter: FighterState,
  index: 0 | 1,
  contacts: readonly Contact[],
  frame: number,
  template: FighterTemplate,
): FighterState {
  const rules = template.tension;
  if (!rules) return fighter;
  const spending = (fighter.flags & FLAG_CHARGED) !== 0;
  let gain = 0;
  for (const contact of contacts) {
    gain += gainOf(contact, contact.by === index, spending, rules);
  }
  const canDecay =
    gain === 0 &&
    fighter.tension > 0 &&
    fighter.tension < rules.max &&
    DECAY_ACTIONS.has(fighter.action);
  const decay = canDecay && frame % rules.decayEvery === 0 ? 1 : 0;
  const tension = Math.min(rules.max, Math.max(0, fighter.tension + gain - decay));
  return tension === fighter.tension ? fighter : { ...fighter, tension };
}

/** What a contact gives the fighter: as the one who caught or struck (`own`), or the one touched. */
function gainOf(contact: Contact, own: boolean, spending: boolean, rules: TensionRules): number {
  if (own) {
    if (spending) return 0;
    if (contact.kind === 'grab') return rules.gains.grab;
    if (contact.kind === 'pummel') return rules.gains.pummel;
    if (contact.kind === 'hit' || contact.kind === 'throw') return rules.gains.strike ?? 0;
    return 0;
  }
  if (contact.kind === 'armor') return rules.gains.armor;
  return contact.kind === 'hit' ? rules.gains.hit : 0;
}
