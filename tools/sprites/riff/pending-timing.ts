/**
 * Riff's combos v3 strips (docs/combos-v3.md §4, §5), drawn ahead of their gameplay: the game
 * has no clip nor move for them yet (they come with the combos v3 gameplay, built in parallel,
 * whose prototype holds their frame data). Until it has, the clips they will be played with and
 * their moves' timing and hitboxes live here: the generator paces the fringe and the chain with
 * these ticks, the preview draws these hitboxes on these active frames,
 * tests/tools/riff-sprites.test.ts checks the poses against them. tools/sprites/clips.ts reads an
 * entry only while no clip of the game plays its strip: the gameplay adds its clips (these
 * frames and ticks, src/art/riff/clips.ts) and its moves, then deletes this file. Animators:
 * draw to these numbers, do not change them.
 *
 * The moves that travel are moved by the game (the poses stay anchored around x = 0), and the
 * Slam is lifted by it, like the Saut de l'ange (the poses stay over her feet).
 */

import type { Clip } from '../../../src/art/types.ts';
import type { RiffSheet } from '../../../src/art/riff/sheets.ts';
import { edges, type PendingStrip } from '../clips.ts';

/** Every frame of a strip in order, each shown for its duration. */
function play(sheet: RiffSheet, ticks: readonly number[]): Clip {
  return { sheet, frames: ticks.map((_, index) => index), ticks };
}

export const RIFF_PENDING: Readonly<Partial<Record<RiffSheet, PendingStrip>>> = {
  // Coup de boule (H, H, after her Coup de coude): 6/2/14 (22), the forehead in on frame 3
  // (ticks 6-7), hitbox 8..34 / 50..66. Three quick frames of 2 ticks in (the load, the lunge,
  // the drive), the impact held 2 (the hitstop holds it longer), then 7 and 7 back to her
  // guard. She advances 12 px over action frames 0-5.
  chainHeavy: {
    clip: play('chainHeavy', [2, 2, 2, 2, 7, 7]),
    strike: { startup: 6, active: 2, guard: 'mid', box: edges(8, 34, 50, 66) },
  },
  // Retourné sauté (L, L, ← + H): 6/5/15 (26), her Retourné's timing (2, 2, 2, [5], 5, 5, 5)
  // with its frames 0-1 redrawn as the call hop: 14 px forward over action frames 0-5 (the
  // game moves her), then the take-off (frame 2) and the scorpion on frame 3 (ticks 6-10),
  // hitbox -12..22 / 58..100 (reached upward), launching.
  chainLaunch: {
    clip: play('chainLaunch', [2, 2, 2, 5, 5, 5, 5]),
    strike: { startup: 6, active: 5, guard: 'mid', box: edges(-12, 22, 58, 100) },
  },
  // Slam (← + BOOST, 3 bars): 12/8/26 (46), an overhead, hitbox 0..44 / 0..60. The game lifts
  // her from action frame 2 to 12 on a half sine 40 px high (about 11 px on frame 2, 40 on
  // frames 6-7, 22 on frame 10, 11 on frame 11, on the floor from frame 12) and carries her 30
  // px forward over frames 2-11. Frames: 0 the load (2 ticks) and 1 the take-off (3), her
  // jumpForward's; 2 the leap into the crowd (5); 3 the dive (2), on screen from tick 10, when
  // the 20-tick freeze flash takes it; 4 the impact, boots first (4, the first blow on tick
  // 12); 5 the stomp and the shockwave (4, the second blow on tick 16, which knocks down); then
  // 8, 9 and 9 ticks back up into her guard.
  super: {
    clip: play('super', [2, 3, 5, 2, 4, 4, 8, 9, 9]),
    strike: { startup: 12, active: 8, guard: 'overhead', box: edges(0, 44, 0, 60) },
  },
};
