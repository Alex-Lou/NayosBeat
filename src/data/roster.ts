import type { FighterTemplate } from '../core/config';
import { POLYVALENT, RUSHDOWN } from './fighters';

export type FighterId = 'polyvalent' | 'rushdown';

export interface RosterEntry {
  readonly id: FighterId;
  readonly template: FighterTemplate;
  /** One-line summary shown on the character select screen. */
  readonly description: string;
}

export const ROSTER: readonly RosterEntry[] = [
  {
    id: 'polyvalent',
    template: POLYVALENT,
    description: 'Équilibré · onde de choc · uppercut',
  },
  {
    id: 'rushdown',
    template: RUSHDOWN,
    description: 'Rapide et agressif · ruée · moins de vie',
  },
];

export function templateOf(id: FighterId): FighterTemplate {
  const entry = ROSTER.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown fighter: ${id}`);
  return entry.template;
}
