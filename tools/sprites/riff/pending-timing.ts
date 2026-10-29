/**
 * Riff's combos v3 strips (docs/combos-v3.md §4, §5) drawn ahead of their gameplay: the game has
 * no clip nor move for them yet (the Coup de boule and the Retourné sauté play theirs since the
 * combos v3 layers 1-2, src/art/riff/clips.ts; the Slam comes with the super, layer 4). Until
 * it has, the clip each will be played with and its move's timing and hitbox live here: the
 * generator paces the fringe and the chain with these ticks, the preview draws these hitboxes
 * on these active frames, tests/tools/riff-sprites.test.ts checks the poses against them.
 * tools/sprites/clips.ts reads an entry only while no clip of the game plays its strip: the
 * gameplay adds its clip (these frames and ticks, src/art/riff/clips.ts) and its move, then
 * deletes its entry (a test fails until it does), and this file with the last one. Animators:
 * draw to these numbers, do not change them.
 *
 * The Slam is lifted and carried by the game, like the Saut de l'ange (the poses stay over her
 * feet).
 */

import type { Clip } from '../../../src/art/types.ts';
import type { RiffSheet } from '../../../src/art/riff/sheets.ts';
import { edges, type PendingStrip } from '../clips.ts';

/** Every frame of a strip in order, each shown for its duration. */
function play(sheet: RiffSheet, ticks: readonly number[]): Clip {
  return { sheet, frames: ticks.map((_, index) => index), ticks };
}

export const RIFF_PENDING: Readonly<Partial<Record<RiffSheet, PendingStrip>>> = {
  // Slam (← + BOOST, 3 bars): 12/8/26 (46), an overhead, hitbox 0..44 / 0..60. The game lifts
  // her on `leapArc(46, { from: 2, to: 16, apexPx: 40 })` (about 8 px on tick 2, 40 on ticks
  // 8-9, 30 on the first blow's tick 12, on the floor from tick 16, the second blow), as
  // poses/super.ts draws her, and carries her 30 px forward over ticks 2-11. Frames: 0 the load (2 ticks) and 1 the take-off (3), her
  // jumpForward's; 2 the leap into the crowd (5); 3 the dive (2), on screen from tick 10, when
  // the 20-tick freeze flash takes it; 4 the impact, boots first (4, the first blow on tick
  // 12); 5 the stomp and the shockwave (4, the second blow on tick 16, which knocks down); then
  // 8, 9 and 9 ticks back up into her guard.
  super: {
    clip: play('super', [2, 3, 5, 2, 4, 4, 8, 9, 9]),
    strike: { startup: 12, active: 8, guard: 'overhead', box: edges(0, 44, 0, 60) },
  },
};
