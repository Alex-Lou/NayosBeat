import type { FighterId } from '../data/roster';
import { NAYO, NAYO_ALT } from './nayo';
import { RIFF, RIFF_ALT } from './riff';
import type { FighterArt } from './types';

export type Colorway = 'main' | 'alt';

/** Sprites of each fighter that has some, per colorway; the others are drawn as grey boxes. */
const ART_BY_FIGHTER: Partial<Record<FighterId, Readonly<Record<Colorway, FighterArt>>>> = {
  nayo: { main: NAYO, alt: NAYO_ALT },
  riff: { main: RIFF, alt: RIFF_ALT },
};

export function artOf(fighter: FighterId, colorway: Colorway = 'main'): FighterArt | undefined {
  return ART_BY_FIGHTER[fighter]?.[colorway];
}
