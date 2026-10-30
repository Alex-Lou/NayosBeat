import { at, onHeel, planted, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * timeOver: 4 frames of 10 ticks, looping (0.67 s, about 3.75 loops in the 150-tick round end):
 * lost on time, and she sulks. The rear fist jammed on her hip, the lead hand shoved in the
 * front pocket of her jeans, the shoulders hunched up; the hips pushed back over the rear leg and
 * the chest over the lead one (an S, the hip cocked), the head hung forward past 20 degrees
 * (RotSprite, the same angle in every frame, so it never boils), the look from under the lid;
 * and the lead toes tap the floor once a loop, slow and impatient, the heel planted. No tears, no
 * slump, no tantrum: a punk who did not finish the job, hates it, and is waiting for this to be
 * over.
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
 * world px) with the hands riding it as one piece, so the jacket, the sleeve's patch and the face
 * stay crisp; the legs flex under the breath. The rear foot never moves; the lead heel never
 * slides (onHeel).
 *
 * The arms: the rear one akimbo (drawn over the body), the elbow out at the back at the waist,
 * the forearm down to the glove on the side of the hip, knuckles down; the lead one hangs behind
 * the body, from the shoulder down along the side and bent forward into the pocket, the hand
 * hidden behind the lead thigh: seen three quarters, the chest turned a little away, only the
 * near arm shows. It used to fold both arms under the bust, but seen three quarters the lead
 * forearm crossing toward the near side runs back on screen, an elbow bent the wrong way
 * (sprites:anatomy's elbowReversed); with the lead upper arm hanging, no forearm folded the
 * right way crosses the body without its hand popping out in front of the chest.
 */

/** The lead boot's mark, flat. */
const LEAD = planted(4);

/** The sulk's stance, before the hands find the hip and the pocket. */
const STANCE: Pose = {
  hip: at(-8.5, 34.3),
  torso: 8,
  head: 14,
  shrug: 2.5,
  nearFoot: planted(-12),
  farFoot: LEAD,
  nearFist: at(0, 0),
  farFist: at(0, 0),
  bends: { nearElbow: 'back', farElbow: 'back', nearKnee: 'front' },
  twist: -0.3,
  face: 'cool',
};

/** The arms: the rear fist jammed on the hip, the lead hand shoved in the front pocket. */
const SULK: Pose = {
  ...STANCE,
  nearFist: at(STANCE.hip.x - 5.2, STANCE.hip.y + 4),
  farFist: at(STANCE.hip.x + 4.5, STANCE.hip.y - 1.5),
};

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
