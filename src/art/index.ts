import type { FighterId } from '../data/roster';
import { KODA, KODA_ALT } from './koda';
import { NAYO, NAYO_ALT } from './nayo';
import { RIFF, RIFF_ALT } from './riff';
import { SAPHIR, SAPHIR_ALT } from './saphir';
import { WATT, WATT_ALT } from './watt';
import type { FighterArt } from './types';

export type Colorway = 'main' | 'alt';

/** Sprites of each fighter that has some, per colorway; the others are drawn as grey boxes. */
const ART_BY_FIGHTER: Partial<Record<FighterId, Readonly<Record<Colorway, FighterArt>>>> = {
  nayo: { main: NAYO, alt: NAYO_ALT },
  riff: { main: RIFF, alt: RIFF_ALT },
  saphir: { main: SAPHIR, alt: SAPHIR_ALT },
  watt: { main: WATT, alt: WATT_ALT },
  koda: { main: KODA, alt: KODA_ALT },
};

export function artOf(fighter: FighterId, colorway: Colorway = 'main'): FighterArt | undefined {
  return ART_BY_FIGHTER[fighter]?.[colorway];
}
