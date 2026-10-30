import type { Point } from '../../raster.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, onHeel, planted, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * held (docs/combat-v2.md §4, §11.1): 2 frames, 4, 4 ticks, looped; frame 1 (yanked in) starts
 * again on the impact tick of every pummel (Nayo's knee, tick 6; her own headbutt, tick 4) and
 * holds through its hitstop. Held by the collar, she fights it; the holder (not drawn: Nayo's or
 * her own hold) stands at contact, centers 27 px apart (26 against herself), and is drawn over
 * her: his fists sit on her collar, at about (1-7, 44-57) here.
 *
 * Never scared, never a victim's cringe: a street fighter caught, and furious about it. A
 * tug-of-war against the grip, the hips rocking 5 px against a collar that does not move:
 * - 0, the strain: she sits back against the pull, the hips back over the rear foot, flat, the
 *   lead leg braced long in front, the heel dug in and the toes up, the knee behind the boot (the
 *   shin slopes back to the hips); the torso one long diagonal from the hips up to the collar in
 *   his fists, the chest opened to the viewer. The lead hand clamps his wrist; the rear arm hangs
 *   from its shoulder, the elbow down at her waist, the forearm aimed forward under his arms, the
 *   fist balled low in front of her ribs: a hook to his body, loaded. Let go, or else.
 * - 1, yanked in: the collar hauled down and in, the hips jerked forward and under it, the knees
 *   buckling over the toes, up on the balls of both feet; the shoulders hunched up into the
 *   popped collar, the chin tucked. The loaded fist never leaves the screen, under his forearms:
 *   the yank jerks it 4 to 5 px forward, the elbow still down, and the strain draws it back in
 *   (a pump, never a flap). The knee's (or the headbutt's) flash, hitstop and shake sell the hit
 *   on this frame.
 * Effort on both frames (a wince alternating with it at 7.5 a second would only blink).
 *
 * The collar stays pinned in his fists: the base of her neck at (2.5, 51.5) and (4, 50), within
 * 3.5 px of the middle of Nayo's fists through his hold and pummel (the knee's impact hauls them
 * down to about (4.5, 47): frame 1, 3.2 px away), within 4.5 px of her own holder's. The head
 * stays the source drawing (19 degrees on screen on both frames, so the loop never flips it to
 * RotSprite and back): above Nayo's forearms, her face and the sideways look read over his arms
 * even on the knee. Her feet never slide: the rear foot rocks onto its ball on a fixed toe, the
 * lead foot rolls from its dug-in heel onto its ball.
 *
 * Against herself the holder's head sits 8 px from hers through the hold, and her headbutt
 * (pummel frame 2) lands its head at about (8, 62), within 3 px of the center of hers: the head
 * of a fighter whose collar is pinned at x 2.5-4 sits on a 10.5 px circle around it, at x 8-10
 * for any lean into the grip, so only the holder's strips can open that gap.
 */

/** The hips that put the base of her neck on `neck` with the torso leaning `torso` degrees. */
export function byNeck(neck: Point, torso: number): Point {
  const r = (torso * Math.PI) / 180;
  return at(neck.x - RIFF_BODY.neck * Math.sin(r), neck.y - RIFF_BODY.neck * Math.cos(r));
}

/** Where her rear foot stands while she is held, flat (thrownBack lifts her off its toe). */
const REAR_FOOT = planted(-24);
export const REAR_TOE = toeOf(REAR_FOOT);
/** Where her lead foot stands, its heel dug in, then up on its ball. */
const LEAD_FOOT = planted(8.5);
const LEAD_TOE = toeOf(LEAD_FOOT);

// Frame 0 (4 ticks): the strain. Sitting back against the grip: the hips back over the flat rear
// foot, the lead leg braced long in front on its dug-in heel, the torso a long diagonal up to the
// collar, the chest open; the lead hand clamps his wrist, the rear fist balled low in front of the
// ribs, the elbow down at the waist, drawn back in.
const STRAIN: Pose = {
  ...GUARD,
  hip: byNeck(at(2.5, 51.5), 40),
  torso: 40,
  head: -21,
  shrug: 2.6,
  twist: 0.4,
  nearFoot: REAR_FOOT,
  farFoot: onHeel(LEAD_FOOT, 18),
  nearFist: at(5.5, 40),
  farFist: at(8.5, 52),
  farHand: 'open',
  face: 'effort',
};

// Frame 1 (4 ticks, and from the impact tick of every pummel): yanked in. The collar hauled down
// and in, the hips jerked forward under it, the knees over the toes, up on the balls of both
// feet; the shoulders hunched into the collar, the chest turned away; the low fist jerked forward
// under his arms, still loaded, the elbow down; the lead hand still on his wrist.
const YANKED: Pose = {
  ...GUARD,
  hip: byNeck(at(4, 50), 32),
  torso: 32,
  head: -13,
  shrug: 3.6,
  twist: 0.15,
  nearFoot: onBall(REAR_TOE, -20),
  farFoot: onBall(LEAD_TOE, -16),
  nearFist: at(10, 41),
  farFist: at(9.5, 50),
  farHand: 'open',
  face: 'effort',
};

export const POSES: readonly Pose[] = [STRAIN, YANKED];
