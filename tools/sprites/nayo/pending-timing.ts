/**
 * Nayo's combos v3 strips (docs/combos-v3.md §5), drawn ahead of their gameplay: the game has
 * no clip nor move for them yet (they come with the combos v3 gameplay, built in parallel).
 * Until it has, the clips they will be played with and their moves' timing and hitboxes (§2.2,
 * §2.4) live here: the generator paces the hanging parts with these ticks, the preview draws
 * these hitboxes on these active frames, tests/tools/nayo-v2-sprites.test.ts checks the poses
 * against them. tools/sprites/clips.ts reads an entry only while no clip of the game plays its
 * strip: the gameplay adds its clips (these frames and ticks, src/art/nayo/clips.ts) and its
 * moves, then deletes this file. Animators: draw to these numbers, do not change them.
 *
 * The moves that travel are moved by the game (the poses stay anchored around x = 0).
 */

import type { Clip } from '../../../src/art/types.ts';
import type { NayoSheet } from '../../../src/art/nayo/sheets.ts';
import { edges, type PendingStrip } from '../clips.ts';

/** Every frame of a strip in order, each shown for its duration. */
function play(sheet: NayoSheet, ticks: readonly number[]): Clip {
  return { sheet, frames: ticks.map((_, index) => index), ticks };
}

export const NAYO_PENDING: Readonly<Partial<Record<NayoSheet, PendingStrip>>> = {
  // Crochet au foie (H, H): 8/3/17 (28), the fist under the ribs on frame 3, hitbox 8..46 /
  // 24..44 (it hits a crouching opponent too). He advances 22 px over action frames 0-7.
  chainHeavy: {
    clip: play('chainHeavy', [3, 3, 2, 3, 6, 6, 5]),
    strike: { startup: 8, active: 3, guard: 'mid', box: edges(8, 46, 24, 44) },
  },
  // Remontant chassé (L, L, ← + H): 7/4/17 (28), the Remontant's active frame 3 and hitbox 4..30
  // / 58..104 (an anti-air: reached upward too). He advances 12 px over action frames 0-6.
  chainLaunch: {
    clip: play('chainLaunch', [2, 3, 2, 4, 5, 6, 6]),
    strike: { startup: 7, active: 4, guard: 'mid', box: edges(4, 30, 58, 104) },
  },
  // Mégabasse (← + BOOST, 3 bars): 2/15/30 (47), after a 20-tick freeze flash on action frame 0
  // (s0, the cue, holds it). Its 12 entries play frames 2 and 3 twice: three blows on action
  // frames 2, 8 and 14 (s2, s2 again, s4), the speaker rings of the front effects covering the
  // hitbox 4..60 / 0..90 on s2, s3 and s4. On the spot.
  super: {
    clip: {
      sheet: 'super',
      frames: [0, 1, 2, 3, 2, 3, 4, 5, 6, 7, 8, 9],
      ticks: [1, 1, 3, 3, 3, 3, 3, 6, 7, 7, 5, 5],
    },
    strike: { startup: 2, active: 15, guard: 'mid', box: edges(4, 60, 0, 90) },
  },
};
