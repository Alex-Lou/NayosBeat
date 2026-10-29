/**
 * Nayo's combos v3 strips (docs/combos-v3.md §5) drawn ahead of their gameplay: the game has no
 * clip nor move for them yet (the Crochet au foie and the Remontant chassé play theirs since
 * the combos v3 layers 1-2, src/art/nayo/clips.ts; the Mégabasse comes with the super, layer
 * 4). Until it has, the clip each will be played with and its move's timing and hitbox (§2.2,
 * §2.4) live here: the generator paces the hanging parts with these ticks, the preview draws
 * these hitboxes on these active frames, tests/tools/nayo-v2-sprites.test.ts checks the poses
 * against them. tools/sprites/clips.ts reads an entry only while no clip of the game plays its
 * strip: the gameplay adds its clip (these frames and ticks, src/art/nayo/clips.ts) and its
 * move, then deletes its entry (a test fails until it does), and this file with the last one.
 * Animators: draw to these numbers, do not change them.
 */

import type { NayoSheet } from '../../../src/art/nayo/sheets.ts';
import { edges, type PendingStrip } from '../clips.ts';

export const NAYO_PENDING: Readonly<Partial<Record<NayoSheet, PendingStrip>>> = {
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
