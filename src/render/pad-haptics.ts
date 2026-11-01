import { rumblePad, type Rumble } from '../input/haptics';
import { shatters, type FightEvent } from './fight-events';

/**
 * Each player's own gamepad rumbles for its own blows (docs/polish/AUDIT-ET-PLAN.md, P23, L10):
 * what it takes, harder for a heavy one; what it gives, a light tap of the weak motor alone for
 * a heavy one; its guard, a brush.
 */
export const RUMBLES = {
  lightTaken: { ms: 25, strength: 0.25 },
  heavyTaken: { ms: 60, strength: 0.6 },
  heavyGiven: { ms: 30, strength: 0.3, weakOnly: true },
  guard: { ms: 20, strength: 0.2 },
  /** Caught in a grab: the cue to break free, as the phone's (fight-events.ts, HAPTICS). */
  grabbed: { ms: 30, strength: 0.3 },
} as const satisfies Record<string, Rumble>;

/**
 * How `player`'s gamepad rumbles for an event, or nothing. A KO that blows a gauge up rumbles
 * every pad already (fight-feedback.ts, SHATTER_RUMBLE), the Finisher's in its scene: not here.
 */
export function rumbleFor(event: FightEvent, player: 0 | 1): Rumble | null {
  switch (event.type) {
    case 'hit': {
      // A blow in a hold (a pummel) is a light one, however hard.
      const heavy = event.heavy && !event.held;
      if (event.by === player) return heavy ? RUMBLES.heavyGiven : null;
      return heavy ? RUMBLES.heavyTaken : RUMBLES.lightTaken;
    }
    case 'ko':
      if (event.finish === 'finale' || shatters(event.finish)) return null;
      return event.by === player ? RUMBLES.heavyGiven : RUMBLES.heavyTaken;
    case 'throw':
      return event.by === player ? null : RUMBLES.heavyTaken;
    case 'block':
      return event.by === player ? null : RUMBLES.guard;
    case 'grab':
      return event.by === player ? null : RUMBLES.grabbed;
    default:
      return null;
  }
}

/** Rumbles each player's gamepad, found by `padOf` (the one bound to it), for each event. */
export class PadHaptics {
  constructor(private readonly padOf: (player: 0 | 1) => Gamepad | undefined) {}

  react(event: FightEvent): void {
    for (const player of [0, 1] as const) {
      const rumble = rumbleFor(event, player);
      if (!rumble) continue;
      const pad = this.padOf(player);
      if (pad) rumblePad(pad, rumble);
    }
  }
}
