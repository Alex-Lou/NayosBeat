import type { GameState } from '../core/state';
import { landsHeavy, type FightEvent } from './fight-events';

/** The last blow a fighter took, hit or blocked: what its impact freeze shakes (hit-shake.ts). */
export interface TakenBlow {
  /** The tick it landed on (`GameState.frame`). */
  readonly frame: number;
  /** The impact freeze it set off (`GameState.hitstop` on that tick). */
  readonly hitstop: number;
  /** A heavy blow, a counter-hit (CONTRE, PUNITION) or the final blow. */
  readonly heavy: boolean;
  /** Away from the attacker. */
  readonly away: 1 | -1;
}

/**
 * What the view remembers of the fight beyond the state it draws (docs/art/animation-plan.md §2,
 * V1): noted on every simulation tick, right after its events, and reset with each match, a
 * rematch starting over in its intro with no event to tell it. For now, the last blow each
 * fighter took; the deaths (the last of each victim in the match) and the reactions keep theirs
 * here too. The state alone never tells: its contacts last one tick, the freeze longer.
 */
export class FightMemory {
  private readonly taken: [TakenBlow | null, TakenBlow | null] = [null, null];

  /** `next`: the state after the tick; `events`: what the tick did (detectEvents). */
  note(next: GameState, events: readonly FightEvent[]): void {
    for (const event of events) {
      if (event.type !== 'hit' && event.type !== 'ko' && event.type !== 'block') continue;
      const heavy = event.type !== 'block' && landsHeavy(event);
      const blow = { frame: next.frame, hitstop: next.hitstop, heavy, away: event.away };
      this.taken[event.by === 0 ? 1 : 0] = blow;
    }
  }

  /** The last blow `player` took, if any since the match started. */
  blowOn(player: 0 | 1): TakenBlow | null {
    return this.taken[player];
  }

  /** A new match: nothing to remember. */
  reset(): void {
    this.taken[0] = null;
    this.taken[1] = null;
  }
}
