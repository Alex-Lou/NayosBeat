import { at, type Effect } from './common.ts';

/**
 * The flying Vinyle, looping: still the sound wave's strip (the 8-frame disc of
 * docs/combat-v2.md §11.2 comes from the art track), placed over the Vinyle's hitbox (−10..10
 * px, 32 to 52 px high): its crescents lead at the hitbox's front edge, the orb and its tail
 * cover the rest, so nothing it can hit is left undrawn.
 */
export const PROJECTILE: readonly Effect[] = [0, 1, 2, 3, 4, 5].map((frame) => ({
  kind: 'wave',
  center: at(-5, 42),
  phase: frame / 6,
}));
