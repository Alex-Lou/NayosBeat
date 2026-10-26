import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, GUARD, planted, smear, type Pose } from './common.ts';

/** The lead fist (wrist) `length` px from the lead shoulder, `angle` degrees above horizontal. */
function leadFist(pose: Omit<Pose, 'nearFist'>, length: number, angle: number): Point {
  const shoulder = solve({ ...pose, nearFist: GUARD.nearFist }).near.shoulder;
  const a = (angle * Math.PI) / 180;
  return at(shoulder.x + Math.cos(a) * length, shoulder.y + Math.sin(a) * length);
}

// Frame 0 (2 ticks): the lead hand leaves the low guard, the lead shoulder starts rolling up,
// the back heel lifts to push.
const LOAD: Pose = {
  ...GUARD,
  hip: at(-2.7, 36.9),
  torso: 1,
  head: 12,
  shrug: 4.2,
  reach: { near: 0.6 },
  twist: -0.15,
  nearFist: at(12.5, 48),
  farFist: at(8, 62.4),
  farFoot: planted(-13.5, -6),
};

// Frame 1 (2 ticks): the fist shoots up the line from the hip, the elbow behind it.
const SNAP_FIST = at(23.5, 53);
const SNAP: Pose = {
  ...GUARD,
  hip: at(-2.1, 36.7),
  torso: 5,
  head: 13,
  shrug: 4.8,
  reach: { near: 2 },
  twist: -0.3,
  nearFist: SNAP_FIST,
  farFist: at(10.5, 62.3),
  farFoot: planted(-13.5, -10),
  effects: [smear(3, [11.5, 46.2], [18, 48.6], [SNAP_FIST.x + 4.6, SNAP_FIST.y + 0.2])],
};

// Frame 2 (3 ticks, active): full extension, the lead shoulder up behind the chin, the rear
// hand glued to the jaw. A thin trail rises from the hip into the knuckles, a small flash.
const STRIKE_BODY = {
  ...GUARD,
  hip: at(-1.2, 36.2),
  torso: 9,
  head: 13,
  shrug: 5,
  reach: { near: 3 },
  twist: -0.4,
  farFist: at(12, 62.3),
  farFoot: planted(-13.5, -14),
};
const STRIKE_FIST = leadFist(STRIKE_BODY, 24.5, -14);
const STRIKE: Pose = {
  ...STRIKE_BODY,
  nearFist: STRIKE_FIST,
  effects: [
    smear(6, [13, 48.6], [21, 50.6], [29, 52.9], [STRIKE_FIST.x + 4.8, STRIKE_FIST.y - 1]),
    {
      kind: 'flash',
      center: at(STRIKE_FIST.x + 6, STRIKE_FIST.y - 1),
      radius: 3.5,
      tone: 'strike',
    },
  ],
};

// Frame 3 (2 ticks): snapped back along the same line.
const RETRACT: Pose = {
  ...GUARD,
  hip: at(-2.3, 36.8),
  torso: 4,
  head: 12,
  shrug: 4.6,
  reach: { near: 1.4 },
  twist: -0.25,
  nearFist: at(21, 52.4),
  farFist: at(9.5, 62.3),
  farFoot: planted(-13.5, -6),
};

// Frame 4 (2 ticks): the hand drops back to the low guard, the shoulder rolls up past its rest.
const DROP: Pose = {
  ...GUARD,
  hip: at(-3.3, 36.8),
  torso: -1,
  head: 12.5,
  shrug: 4.5,
  twist: -0.1,
  nearFist: at(11, 45.5),
  farFist: at(7.8, 62.3),
};

// Frame 5 (3 ticks): settled back in the shell.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-3.2, 37.1),
  torso: -1.6,
  nearFist: at(8, 43.4),
};

/** standLight (Direct): a crisp lead jab out of the Philly shell. Ticks 2,2,3,2,2,3. */
export const POSES: readonly Pose[] = [LOAD, SNAP, STRIKE, RETRACT, DROP, SETTLE];
