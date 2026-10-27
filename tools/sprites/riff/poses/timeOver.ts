import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, onHeel, planted, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * timeOver: 4 frames of 10 ticks, looping (0.67 s, about 3.75 loops in the 150-tick round end):
 * lost on time, and she sulks. Arms folded tight under the bust, the elbows out, the shoulders
 * hunched up; the hips pushed back over the rear leg and the chest over the lead one (an S, the
 * hip cocked), the head hung forward past 20 degrees (RotSprite, the same angle in every frame,
 * so it never boils), the look from under the lid; and the lead toes tap the floor once a loop,
 * slow and impatient, the heel planted. No tears, no slump, no tantrum: a punk who did not
 * finish the job, hates it, and is waiting for this to be over.
 *
 * - 0 · the sulk, the lead boot flat on its mark.
 * - 1 · the toes come up 7 degrees on the heel; she takes a breath, the shoulders rising a
 *   pixel.
 * - 2 · the toes slap down with the huff: the body drops two pixels.
 * - 3 · the body half way back up.
 *
 * The gesture survives repetition: a tap of the toes is what an impatient foot does over and
 * over, where a dirt kick on every loop turned into a tantrum (no dust either, nothing thrown).
 * Pixel-locked like idle: the upper body never turns, it moves by whole sprite pixels (0.5
 * world px) with the folded arms riding it as one piece, so the jacket, the sleeve's patch and
 * the face stay crisp; the legs flex under the breath. The rear foot never moves; the lead heel
 * never slides (onHeel). The folded arms: the rear forearm across under the bust (drawn over
 * the body), its elbow out at the back, its hand tucked toward the lead arm's crook; the lead
 * elbow out in front of the jacket, its hand hidden behind the body: one glove shows.
 */

/** The lead boot's mark, flat. */
const LEAD = planted(4);

/** The sulk's stance, before the arms fold. */
const STANCE: Pose = {
  hip: at(-8.5, 34.3),
  torso: 8,
  head: 14,
  shrug: 2.5,
  nearFoot: planted(-12),
  farFoot: LEAD,
  nearFist: at(0, 0),
  farFist: at(0, 0),
  bends: { nearElbow: 'back', farElbow: 'front', nearKnee: 'front' },
  twist: -0.3,
  face: 'cool',
};

/** The arms folded, from the shoulders: the rear forearm across, the lead elbow out in front. */
const SULK: Pose = (() => {
  const { near, far } = solve(STANCE, RIFF_BODY);
  return {
    ...STANCE,
    nearFist: at(near.shoulder.x + 7.5, near.shoulder.y - 7.2),
    farFist: at(far.shoulder.x - 0.4, far.shoulder.y - 3.1),
  };
})();

/** The sulk with the body `rise` world px up (whole sprite pixels), the lead toes `tap` up. */
function breath(rise: number, tap: number): Pose {
  return {
    ...SULK,
    hip: at(SULK.hip.x, SULK.hip.y + rise),
    nearFist: at(SULK.nearFist.x, SULK.nearFist.y + rise),
    farFist: at(SULK.farFist.x, SULK.farFist.y + rise),
    farFoot: onHeel(LEAD, tap),
  };
}

export const POSES: readonly Pose[] = [
  breath(0, 0),
  breath(0.5, 7),
  breath(-1, 0),
  breath(-0.5, 0),
];
