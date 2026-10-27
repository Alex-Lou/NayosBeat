import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, GUARD, planted, type Foot, type Pose } from './common.ts';

/**
 * hold (docs/combat-v2.md §4.1, §11.2): 2 frames, 6, 6 ticks, looped. He holds the opponent by
 * the collar; the opponent (not drawn: see held) stands at contact, centers 27-28 px apart.
 *
 * The grip the grab closed, two-handed and at the collar, never at the face: the lead fist on the
 * collar under the opponent's chin (knuckles at about (26, 57)), the rear one lower on the lapel
 * (about (23, 50)), under the lead forearm so both hands show; elbows down, the weight forward
 * over the lead foot, which stays where the grab stepped it, the rear one on its ball. With held
 * folded over (frame 1) his face shows above the lead glove. In control, not straining (the
 * composed stare; the effort shows on the knee and the throws): the loop is a short tug, the
 * fists drawing a pixel in and the hips sinking half a pixel, then giving back. Whole-pixel
 * moves and one torso angle, so the neon never boils. pummel and both throws start from it,
 * pummel comes back to it.
 */

/** Where the toe tip of a foot touches the floor (a foot on the ball pivots around it). */
export function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  return foot.x + 2.3 * Math.sin(a) + 7 * Math.cos(a);
}

/** A foot on the floor turned to `angle` around its toe tip at `toe`: the toe never slides. */
export function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(toe - 2.3 * Math.sin(a) - 7 * Math.cos(a), angle);
}

/**
 * A wrist `length` px from the `side` shoulder of `pose` (as solved), `angle` degrees above
 * horizontal: arms placed from the body, so they stay the length they should.
 */
export function fromShoulder(
  pose: Omit<Pose, 'nearFist' | 'farFist'>,
  side: 'near' | 'far',
  length: number,
  angle: number,
): Point {
  const { shoulder } = solve({ ...pose, nearFist: GUARD.nearFist, farFist: GUARD.farFist })[side];
  const a = (angle * Math.PI) / 180;
  return at(shoulder.x + Math.cos(a) * length, shoulder.y + Math.sin(a) * length);
}

export const REAR_TOE = toeOf(GUARD.farFoot);
/** Where the grab's step puts the lead foot: it stays there through the hold. */
export const LEAD_IN = 9.5;

// Frame 0 (6 ticks): the clinch. Both fists in the collar at arm's length, the lead one on the
// collar under his chin, the rear one on the lapel below it; the shoulders reaching after them,
// the weight forward over the lead foot.
const CLINCH = {
  ...GUARD,
  hip: at(-5.4, 35.4),
  torso: 18,
  head: -1,
  shrug: 1.6,
  reach: { near: 2, far: 2 },
  twist: 0.05,
  nearFoot: planted(LEAD_IN),
  farFoot: onToes(REAR_TOE, -21),
} as const;
export const HOLD: Pose = { ...CLINCH, nearFist: at(24, 55.5), farFist: at(21, 48.5) };

// Frame 1 (6 ticks): the tug. The hips sink half a pixel back, the elbows give a little: the
// fists draw the collar in after them.
const TUG_BODY = { ...CLINCH, hip: at(-5.9, 34.9), shrug: 1.9 } as const;
const TUG: Pose = { ...TUG_BODY, nearFist: at(23, 55), farFist: at(20, 48) };

export const POSES: readonly Pose[] = [HOLD, TUG];
