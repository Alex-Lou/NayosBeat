import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, ease, GUARD, planted, smear, tween, type Foot, type Pose } from './common.ts';

/**
 * standLight (Paume vive / Knife-Hand Whip): 6 frames, ticks 2, 2, [3], 2, 2, 3 (active: frame 2,
 * hitbox x 10..40 / y 46..58).
 * From his open-chest kung-fu guard (lead hand chambered at the hip, rear palm extended), Koda
 * whips his lead knife-hand up from his hip in a fast horizontal chop while drawing his rear hand
 * back toward his solar plexus, then returns to his open-chest stance.
 */

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

function arm(
  body: Body,
  which: 'near' | 'far',
  shoulder: number,
  elbow: number,
): { fist: Point; bend: Bend } {
  const s = solve({ ...body, nearFist: GUARD.nearFist, farFist: GUARD.farFist });
  const root = s[which].shoulder;
  const turn = (v: Point, degrees: number): Point => {
    const a = (degrees * Math.PI) / 180;
    return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
  };
  const upper = turn({ x: -s.up.x, y: -s.up.y }, shoulder);
  const joint = add(root, scale(upper, BODY.upperArm));
  const fist = add(joint, scale(turn(upper, elbow), BODY.forearm));
  const line = sub(fist, root);
  const axis = scale(line, 1 / (Math.hypot(line.x, line.y) || 1));
  const offset = sub(joint, root);
  const along = offset.x * axis.x + offset.y * axis.y;
  const mirror = add(root, sub(scale(axis, 2 * along), offset));
  const dx = joint.x - mirror.x;
  const dy = joint.y - mirror.y;
  const bend: Bend =
    Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'down' : 'up') : dx > 0 ? 'front' : 'back';
  return { fist: at(fist.x, fist.y), bend };
}

function posed(body: Body, near: readonly [number, number], far: readonly [number, number]): Pose {
  const lead = arm(body, 'near', near[0], near[1]);
  const rear = arm(body, 'far', far[0], far[1]);
  return {
    ...body,
    nearFist: lead.fist,
    farFist: rear.fist,
    bends: { ...body.bends, nearElbow: lead.bend, farElbow: rear.bend },
  };
}

function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  return foot.x + 2.3 * Math.sin(a) + 7 * Math.cos(a);
}

function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(toe - 2.3 * Math.sin(a) - 7 * Math.cos(a), angle);
}

const LEAD_TOE = toeOf(GUARD.nearFoot);
const REAR_TOE = toeOf(GUARD.farFoot);

// Frame 0 (2 ticks): The hip-chambered lead hand uncoils upward as the rear hand draws back toward
// the chest.
const START_BODY: Body = {
  ...GUARD,
  hip: at(-6.0, 36.2),
  torso: 14,
  head: 2,
  shrug: 1.4,
  reach: { near: 0.8 },
  twist: 0.1,
  nearFoot: onToes(LEAD_TOE, -1),
  farFoot: onToes(REAR_TOE, -18),
};
const START: Pose = posed(START_BODY, [28, 86], [34, 92]);

// Frame 1 (2 ticks): Three-quarters out: the lead silver gauntlet and open knife-hand whip forward
// at chest height while the rear hand chambers at the sternum.
const SNAP_BODY: Body = {
  ...GUARD,
  hip: at(-4.9, 36.0),
  torso: 17,
  head: 0,
  shrug: 2.2,
  reach: { near: 2.0, far: -1.5 },
  twist: -0.25,
  nearFoot: onToes(LEAD_TOE, 0),
  farFoot: onToes(REAR_TOE, -21),
};
const SNAP_ARM = posed(SNAP_BODY, [66, 36], [22, 98]);
const SNAP: Pose = {
  ...SNAP_ARM,
  effects: [smear(3, [12, 46], [22, 50], [SNAP_ARM.nearFist.x + 2, SNAP_ARM.nearFist.y])],
};

// Frame 2 (3 ticks, active): Full extension of the knife-hand chop (hitbox x 10..40, y 46..58)!
// The lead open palm reaches x ~ 36 (with the fingers and blade smear reaching x ~ 41), while the
// rear hand stays chambered low at the ribs.
const STRIKE_BODY: Body = {
  ...GUARD,
  hip: at(-3.5, 35.8),
  torso: 20,
  head: -2,
  shrug: 2.8,
  reach: { near: 3.4, far: -2.0 },
  twist: -0.4,
  nearFoot: onToes(LEAD_TOE, 0),
  farFoot: onToes(REAR_TOE, -24),
};
const STRIKE_ARM = posed(STRIKE_BODY, [96, 8], [18, 96]);
const STRIKE: Pose = {
  ...STRIKE_ARM,
  effects: [
    smear(4, [20, 50], [28, 51], [37.5, 52.0]),
    { kind: 'flash', center: at(39.8, 52.0), radius: 3.5, tone: 'strike' },
  ],
};

// Frame 3 (2 ticks): Drawing the lead hand back down toward the hip as the rear palm extends
// forward again.
const RETRACT_BODY: Body = {
  ...GUARD,
  hip: at(-5.2, 36.0),
  torso: 16,
  head: 1,
  shrug: 2.0,
  reach: { near: 1.2, far: -0.8 },
  twist: -0.1,
  nearFoot: onToes(LEAD_TOE, -0.5),
  farFoot: onToes(REAR_TOE, -20),
};
const RETRACT: Pose = posed(RETRACT_BODY, [42, 68], [46, 82]);

// Frame 4 (2 ticks): Dropping the lead hand back to the waist while the rear open palm takes its
// forward guard post.
const HOME: Pose = {
  ...GUARD,
  hip: at(-6.8, 36.0),
  torso: 13,
  head: 2,
  shrug: 1.3,
  twist: 0.25,
  nearFist: at(-6.8, 40.8),
  farFist: at(10.2, 55.4),
};

// Frame 5 (3 ticks): Settled into GUARD.
const SETTLE: Pose = tween(HOME, GUARD, 0.75, ease.out);

export const POSES: readonly Pose[] = [START, SNAP, STRIKE, RETRACT, HOME, SETTLE];
