import type { FighterTemplate } from '../core/config';
import { NAYO } from './fighters/nayo';
import { RIFF } from './fighters/riff';

export type FighterId = 'nayo' | 'riff';

export interface RosterEntry {
  readonly id: FighterId;
  readonly template: FighterTemplate;
  /** One-line summary shown on the character select screen (docs/combat-v2.md §17.3). */
  readonly description: string;
}

export const ROSTER: readonly RosterEntry[] = [
  {
    id: 'nayo',
    template: NAYO,
    description: 'Boxeur-DJ posé · portée · Vinyle · Uppercut invincible',
  },
  {
    id: 'riff',
    template: RIFF,
    // The punk of Zen-Tazzer, her identity in combat v2 (docs/combat-v2.md §6.2, §17.3).
    description: 'Punk de rue explosive · dash · Glissade · deux overheads · moins de vie',
  },
];

export function templateOf(id: FighterId): FighterTemplate {
  const entry = ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown fighter: ${id}`);
  return entry.template;
}
