import { at, type Effect } from './common.ts';

/** The flying sound wave, looping: its hitbox is centered 43 px above the ground. */
export const PROJECTILE: readonly Effect[] = [0, 1, 2, 3, 4, 5].map((frame) => ({
  kind: 'wave',
  center: at(0, 43),
  phase: frame / 6,
}));
