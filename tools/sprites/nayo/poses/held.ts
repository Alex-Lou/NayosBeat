import type { Point } from '../../raster.ts';
import { BODY } from '../../skeleton.ts';
import { at, GUARD, planted, type Foot, type Pose } from './common.ts';

/**
 * held (docs/combat-v2.md §4, §11.1): 2 frames, 4, 4 ticks, looped; frame 1 (yanked in) starts
 * again on the knee's impact tick (pummel frame 2, tick 6) and holds through its 6-tick
 * hitstop. Held by the collar, he struggles; the holder (not drawn: see hold) stands at
 * contact, centers 27-28 px apart, and is drawn over him: his fists sit on this collar, at
 * about (1-5, 49-57) here.
 *
 * A strain, not a beating: the collar stays pinned in the holder's fists (the neck moves 2 px
 * between the frames, the head 3), and the fight shows in the rest of him. He sits back on the
 * rear leg, the lead leg braced long in front, the chin up, the rear hand shoving the holder's
 * belly at arm's length, the lead one tearing at the wrist; then the grip yanks him back in: the
 * chest tips over the collar, the shoulders hunch, the rear arm gives, the heels come up onto
 * the balls. Effort on both frames, the eyes on the holder; the knee's flash, hitstop and shake
 * sell the hit on frame 1. The neon holds still: the lead shoulder moves by whole sprite pixels
 * and the upper arm keeps its angle (the sleeve emblem only slides), the torso turns 7 degrees.
 */

/** Where the toe tip of a foot touches the floor (a foot on the ball pivots around it). */
function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  return foot.x + 2.3 * Math.sin(a) + 7 * Math.cos(a);
}

/** A foot on the floor turned to `angle` around its toe tip at `toe`: the toe never slides. */
export function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(toe - 2.3 * Math.sin(a) - 7 * Math.cos(a), angle);
}

/** Where his toes stay while he is held (thrownBack lifts him off them). */
export const LEAD_TOE = toeOf(planted(3.5));
export const REAR_TOE = toeOf(GUARD.farFoot) - 3;

/** The lead upper arm hangs down and a little back, the forearm up across to the wrist. */
const UPPER = -100;

interface Upper {
  /** Where the lead shoulder goes (on the half-pixel grid, so the emblem never re-rasterizes). */
  readonly shoulder: Point;
  readonly torso: number;
  readonly shrug: number;
  /** The lead forearm's direction, world degrees (0 = forward, 90 = up). */
  readonly forearm: number;
}

/**
 * The hips that put the lead shoulder of a torso at `torso`, rolled by `shrug`, on `shoulder`
 * (skeleton.ts: shoulder = hips + up * 21.5 + front * 1.2 + shrug * (up + front * 0.45)), and
 * the lead wrist placed from that shoulder: upper arm at UPPER, forearm at `forearm`.
 */
function placed({ shoulder, torso, shrug, forearm }: Upper): Pick<Pose, 'hip' | 'nearFist'> {
  const r = (torso * Math.PI) / 180;
  const up = at(Math.sin(r), Math.cos(r));
  const front = at(up.y, -up.x);
  const rise = BODY.shoulder + shrug;
  const ahead = 1.2 + shrug * 0.45;
  const hip = at(
    shoulder.x - up.x * rise - front.x * ahead,
    shoulder.y - up.y * rise - front.y * ahead,
  );
  const u = (UPPER * Math.PI) / 180;
  const f = (forearm * Math.PI) / 180;
  const nearFist = at(
    shoulder.x + Math.cos(u) * BODY.upperArm + Math.cos(f) * BODY.forearm,
    shoulder.y + Math.sin(u) * BODY.upperArm + Math.sin(f) * BODY.forearm,
  );
  return { hip, nearFist };
}

// Frame 0 (4 ticks): the strain. He sits back away from the grip: the hips back and low over
// the rear foot, flat, the rear knee bent; the lead leg braced long in front; the chin up and
// back. The rear hand shoves the holder's belly at arm's length, the lead one tears at the
// wrist on his collar.
const STRAIN: Pose = {
  ...placed({ shoulder: at(-2.5, 56), torso: 14, shrug: 1.6, forearm: 62 }),
  torso: 14,
  head: -10,
  shrug: 1.6,
  twist: -0.2,
  nearFoot: planted(3.5),
  farFoot: onToes(REAR_TOE, -2),
  farFist: at(16.5, 47),
  farHand: 'open',
  face: 'effort',
};

// Frame 1 (4 ticks, and from the impact tick of every knee): yanked in. The grip hauls the
// collar back: the chest tips over it, the shoulders hunch, the chin drops a little (14 degrees
// all told); the rear arm gives, the lead hand keeps its hold on the wrist; the heels come up
// onto the balls of the feet.
const YANKED: Pose = {
  ...placed({ shoulder: at(0, 55.5), torso: 21, shrug: 3, forearm: 66 }),
  torso: 21,
  head: -7,
  shrug: 3,
  twist: 0,
  nearFoot: onToes(LEAD_TOE, -9),
  farFoot: onToes(REAR_TOE, -15),
  farFist: at(13, 44),
  farHand: 'open',
  face: 'effort',
};

export const POSES: readonly Pose[] = [STRAIN, YANKED];
