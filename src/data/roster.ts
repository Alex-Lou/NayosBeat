import type { FighterTemplate } from '../core/config';
import { NAYO } from './fighters/nayo';
import { RIFF } from './fighters/riff';

export type FighterId = 'nayo' | 'riff';

export interface RosterEntry {
  readonly id: FighterId;
  readonly template: FighterTemplate;
  /** One-line summary shown on the character select screen (docs/combat-v2.md §17.3). */
  readonly description: string;
  /**
   * Its Finisher's name (docs/finisher.md §2, §3): its super let go armed, named on its first
   * locked contact only. The core knows no name of it: the Finisher has no data of its own.
   */
  readonly finisher: string;
}

export const ROSTER: readonly RosterEntry[] = [
  {
    id: 'nayo',
    template: NAYO,
    description: 'Boxeur-DJ posé · portée · Vinyle · Uppercut invincible · Mégabasse',
    finisher: 'Le Quatre',
  },
  {
    id: 'riff',
    template: RIFF,
    // The punk of Zen-Tazzer, her identity in combat v2 (docs/combat-v2.md §6.2, §17.3).
    description: 'Punk de rue explosive · dash · Glissade · deux overheads · moins de vie',
    finisher: 'Larsen',
  },
];

export function templateOf(id: FighterId): FighterTemplate {
  const entry = ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown fighter: ${id}`);
  return entry.template;
}

/** The Finisher's name of the fighter playing `template`; for one outside the roster, its super's. */
export function finisherNameOf(template: FighterTemplate): string {
  for (const entry of ROSTER) if (entry.template === template) return entry.finisher;
  return template.moves.super?.name ?? template.name;
}
