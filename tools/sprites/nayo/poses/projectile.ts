import { at, type Effect } from './common.ts';

/**
 * The flying Vinyle (docs/combat-v2.md §11.2), looping 8 frames of 2 ticks: a 20 px record of
 * light exactly over its hitbox (−10..10 px, 32 to 52 px high), turning an eighth of a turn
 * a frame, three afterimages behind it.
 */
export const PROJECTILE: readonly Effect[] = [0, 1, 2, 3, 4, 5, 6, 7].map((frame) => ({
  kind: 'disc',
  center: at(0, 42),
  radius: 10,
  phase: frame / 8,
  afterimages: 3,
}));
