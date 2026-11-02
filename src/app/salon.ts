/**
 * The online salon (docs/multijoueur.md §7, gate 1), between the pairing and the fight: both
 * players see each other's name and accept or refuse; the host chooses the place (drawn already
 * when it chose « Aléatoire »); then each one chooses a fighter, the other's unseen until both
 * have. Pure: an event in, the salon and the messages to send out. A message out of turn ends it.
 */

import type { FighterId } from '../data/roster';
import type { NetMessage } from '../net/protocol';

/** A place as both devices show it: the map's name and its atmosphere's (`atmosphereName`). */
export interface StagePick {
  readonly map: string;
  readonly atmosphere: string;
}

/** What both devices agreed on: the host is player 1, the guest player 2. */
export interface MatchPlan {
  readonly stage: StagePick;
  readonly fighters: readonly [FighterId, FighterId];
}

/** What a received place or fighter must be: one this game has. */
export interface SalonRules {
  readonly role: 'host' | 'guest';
  readonly isFighter: (id: string) => id is FighterId;
  readonly isStage: (stage: StagePick) => boolean;
}

/** How the salon ended without a fight: this player refused, the other one did, or spoke nonsense. */
export type SalonEnd = 'refused' | 'refusedByThem' | 'protocol';

export type Salon =
  /** Names exchanged (`them`: null until the other's arrives), each one accepting or not. */
  | {
      readonly phase: 'meeting';
      readonly them: string | null;
      readonly accepted: boolean;
      readonly theyAccepted: boolean;
    }
  /** Both accepted: the host chooses the place, the guest waits for it. */
  | { readonly phase: 'stage'; readonly them: string }
  | {
      readonly phase: 'fighters';
      readonly them: string;
      readonly stage: StagePick;
      readonly mine: FighterId | null;
      readonly theirs: FighterId | null;
    }
  | { readonly phase: 'ready'; readonly them: string; readonly plan: MatchPlan }
  /** The host started the fight with this input delay: the salon is over, the fight begins. */
  | {
      readonly phase: 'fight';
      readonly them: string;
      readonly plan: MatchPlan;
      readonly delay: number;
    }
  | { readonly phase: 'over'; readonly them: string | null; readonly end: SalonEnd };

export type SalonEvent =
  | { readonly type: 'received'; readonly message: NetMessage }
  /** This player's answer; `refuse` is also what the time to answer running out gives. */
  | { readonly type: 'accept' }
  | { readonly type: 'refuse' }
  /** The host chose the place. */
  | { readonly type: 'stage'; readonly stage: StagePick }
  | { readonly type: 'fighter'; readonly fighter: FighterId }
  /** The host starts the fight, with the input delay it measured (docs/multijoueur.md §9.1). */
  | { readonly type: 'start'; readonly delay: number };

export interface SalonStep {
  readonly salon: Salon;
  readonly send: readonly NetMessage[];
}

const NOTHING: readonly NetMessage[] = [];

/** The salon as it opens: this player's name goes first. */
export function openSalon(name: string): SalonStep {
  return {
    salon: { phase: 'meeting', them: null, accepted: false, theyAccepted: false },
    send: [{ type: 'name', name }],
  };
}

export function salonStep(salon: Salon, event: SalonEvent, rules: SalonRules): SalonStep {
  switch (salon.phase) {
    case 'meeting':
      return meeting(salon, event);
    case 'stage':
      return stage(salon, event, rules);
    case 'fighters':
      return fighters(salon, event, rules);
    case 'ready':
      return ready(salon, event, rules);
    case 'fight':
    case 'over':
      return still(salon);
  }
}

function meeting(salon: Extract<Salon, { phase: 'meeting' }>, event: SalonEvent): SalonStep {
  const { them } = salon;
  if (event.type === 'refuse')
    return { salon: { phase: 'over', them, end: 'refused' }, send: [event] };
  if (event.type === 'accept') {
    if (them === null || salon.accepted) return still(salon);
    return agreed({ ...salon, accepted: true }, [event]);
  }
  if (event.type !== 'received') return still(salon);
  const { message } = event;
  if (message.type === 'name' && them === null) return still({ ...salon, them: message.name });
  if (message.type === 'accept' && them !== null && !salon.theyAccepted) {
    return agreed({ ...salon, theyAccepted: true }, NOTHING);
  }
  if (message.type === 'refuse')
    return { salon: { phase: 'over', them, end: 'refusedByThem' }, send: NOTHING };
  return broken(them);
}

/** Both accepted: on to the place. */
function agreed(
  salon: Extract<Salon, { phase: 'meeting' }>,
  send: readonly NetMessage[],
): SalonStep {
  const { them } = salon;
  if (!salon.accepted || !salon.theyAccepted || them === null) return { salon, send };
  return { salon: { phase: 'stage', them }, send };
}

function stage(
  salon: Extract<Salon, { phase: 'stage' }>,
  event: SalonEvent,
  rules: SalonRules,
): SalonStep {
  const toFighters = (pick: StagePick): Salon => ({
    phase: 'fighters',
    them: salon.them,
    stage: pick,
    mine: null,
    theirs: null,
  });
  if (event.type === 'stage' && rules.role === 'host') {
    const { map, atmosphere } = event.stage;
    return { salon: toFighters(event.stage), send: [{ type: 'stage', map, atmosphere }] };
  }
  if (event.type !== 'received') return still(salon);
  const { message } = event;
  if (rules.role === 'guest' && message.type === 'stage') {
    const pick = { map: message.map, atmosphere: message.atmosphere };
    if (rules.isStage(pick)) return still(toFighters(pick));
  }
  return broken(salon.them);
}

function fighters(
  salon: Extract<Salon, { phase: 'fighters' }>,
  event: SalonEvent,
  rules: SalonRules,
): SalonStep {
  if (event.type === 'fighter') {
    if (salon.mine !== null) return still(salon);
    return chosen({ ...salon, mine: event.fighter }, [event], rules);
  }
  if (event.type !== 'received') return still(salon);
  const { message } = event;
  if (message.type !== 'fighter' || salon.theirs !== null || !rules.isFighter(message.fighter)) {
    return broken(salon.them);
  }
  return chosen({ ...salon, theirs: message.fighter }, NOTHING, rules);
}

/** Both chose: the plan, the host's fighter first. */
function chosen(
  salon: Extract<Salon, { phase: 'fighters' }>,
  send: readonly NetMessage[],
  rules: SalonRules,
): SalonStep {
  const { mine, theirs, them, stage: pick } = salon;
  if (mine === null || theirs === null) return { salon, send };
  const fighters = rules.role === 'host' ? ([mine, theirs] as const) : ([theirs, mine] as const);
  return { salon: { phase: 'ready', them, plan: { stage: pick, fighters } }, send };
}

/** Both agreed: the host starts the fight, and the guest is told so. */
function ready(
  salon: Extract<Salon, { phase: 'ready' }>,
  event: SalonEvent,
  rules: SalonRules,
): SalonStep {
  const fight = (delay: number): Salon => ({ ...salon, phase: 'fight', delay });
  if (event.type === 'start' && rules.role === 'host') {
    return { salon: fight(event.delay), send: [{ type: 'start', delay: event.delay }] };
  }
  if (event.type !== 'received') return still(salon);
  if (event.message.type === 'start' && rules.role === 'guest') {
    return still(fight(event.message.delay));
  }
  return broken(salon.them);
}

function still(salon: Salon): SalonStep {
  return { salon, send: NOTHING };
}

function broken(them: string | null): SalonStep {
  return { salon: { phase: 'over', them, end: 'protocol' }, send: NOTHING };
}
