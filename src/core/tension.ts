import type { FighterTemplate, MatchConfig, TensionRules } from './config';
import type { Contact, FighterState } from './state';

/**
 * A fighter's own gauge, the tension (docs/watt-arsenal.md §3.2): only for a fighter whose
 * template has `tension` rules. It fills as the fighter catches (a grab that holds, a pummel),
 * absorbs a blow with its armor or takes one, and loses a point every `decayEvery` ticks. A
 * round starts it empty. Pure: the same contacts on the same frame give the same gauge.
 */

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
  let gain = 0;
  for (const contact of contacts) gain += gainOf(contact, contact.by === index, rules);
  const decay = gain === 0 && fighter.tension > 0 && frame % rules.decayEvery === 0 ? 1 : 0;
  const tension = Math.min(rules.max, Math.max(0, fighter.tension + gain - decay));
  return tension === fighter.tension ? fighter : { ...fighter, tension };
}

/** What a contact gives the fighter: as the one who caught (`own`), or the one touched. */
function gainOf(contact: Contact, own: boolean, rules: TensionRules): number {
  if (own) {
    if (contact.kind === 'grab') return rules.gains.grab;
    return contact.kind === 'pummel' ? rules.gains.pummel : 0;
  }
  if (contact.kind === 'armor') return rules.gains.armor;
  return contact.kind === 'hit' ? rules.gains.hit : 0;
}
