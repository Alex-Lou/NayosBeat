import { at, GUARD, type Pose } from './common.ts';

/**
 * Her bust on the select screen (tools/sprites/portrait.ts, docs/saphir.md): her guard, the head
 * lowered toward the opponent, the mask before a halo of record grooves (her past as a record
 * dealer, in her sapphire), two notes over the shoulder. Framed as a portrait drawn by hand is:
 * the square around the head, enlarged twice.
 */
export const PORTRAIT: Pose = {
  ...GUARD,
  torso: 4,
  head: -9,
  effects: [
    { kind: 'grooves', center: at(-2, 63), radius: 13, from: 100, to: 260, progress: 0.2 },
    { kind: 'notes', center: at(8, 70), count: 2, progress: 0.3 },
  ],
};
