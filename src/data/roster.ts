import type { FighterTemplate } from '../core/config';
import { NAYO } from './fighters/nayo';
import { RIFF } from './fighters/riff';

export type FighterId = 'nayo' | 'riff';

export interface RosterEntry {
  readonly id: FighterId;
  readonly template: FighterTemplate;
  /** One-line summary shown on the character select screen. */
  readonly description: string;
}

export const ROSTER: readonly RosterEntry[] = [
  {
    id: 'nayo',
    template: NAYO,
    description: 'Boxeur-DJ · portée · onde sonore · uppercut',
  },
  {
    id: 'riff',
    template: RIFF,
    description: 'B-girl rapide et agressive · ruée · moins de vie',
  },
];

export function templateOf(id: FighterId): FighterTemplate {
  const entry = ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown fighter: ${id}`);
  return entry.template;
}
