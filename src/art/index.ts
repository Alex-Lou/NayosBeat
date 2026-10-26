import type { FighterId } from '../data/roster';
import { NAYO } from './nayo';
import type { FighterArt } from './types';

/** Sprites of each fighter that has some; the others are drawn as grey boxes. */
const ART_BY_FIGHTER: Partial<Record<FighterId, FighterArt>> = {
  polyvalent: NAYO,
};

export function artOf(fighter: FighterId): FighterArt | undefined {
  return ART_BY_FIGHTER[fighter];
}
