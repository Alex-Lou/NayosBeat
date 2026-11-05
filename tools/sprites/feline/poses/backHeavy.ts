import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Foot, type Pose } from './common.ts';
import { hung } from './jump.ts';

/**
 * backHeavy (Sursaut / Rising Flash Kick Launcher): 7 frames, 2, 2, 3, [4], 5, 6, 6 ticks (28),
 * active frame 3 (ticks 7-10), hitbox x 4..30 / y 58..104, a launcher that misses crouchers.
 * Instead of Nayo's short uppercut punch, Koda pivots on his rear leg, leans his torso back, and
 * lashes his silver-greaved lead leg skyward in a high crescent flash kick while his rear silver
 * gauntlet slashes upward in tandem, projecting a vertical jade blade column to y = 104.
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

function withSkyKick(body: Body, foot: Point, ankle = 88): Body {
  const withFoot: Body = {
    ...body,
    nearFoot: { x: foot.x, y: foot.y, angle: 0 },
    bends: { ...body.bends, nearKnee: 'up' },
  };
  return { ...withFoot, nearFoot: hung(withFoot, 'near', ankle) };
}

const REAR_TOE = solve(GUARD).far.toe.x;

function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

// Frame 0 (2 ticks): Quick dip into the knees, coiling the torso and crossing the silver gauntlets.
const DIP_BODY: Body = {
  ...GUARD,
  hip: at(-6.2, 33.8),
  torso: 18,
  head: -2,
  shrug: 1.0,
  twist: 0.25,
  nearFoot: planted(6.35),
  farFoot: onToes(REAR_TOE, -24),
};
const DIP: Pose = posed(DIP_BODY, [22, 92], [38, 88]);

// Frame 1 (2 ticks): Weight shifts onto the rear foot as the lead knee chambers up toward the
// chest.
const CHAMBER_RAW: Body = {
  ...GUARD,
  hip: at(-2.5, 36.8),
  torso: 6,
  head: 4,
  shrug: 1.6,
  twist: 0.15,
  nearFoot: at(10, 26),
  farFoot: planted(-10.0, -8),
  face: 'focus',
};
const CHAMBER: Pose = posed(withSkyKick(CHAMBER_RAW, at(10, 26), 94), [28, 96], [52, 88]);

// Frame 2 (3 ticks): The silver-greaved leg whips upward in front of the chest while the lead
// silver gauntlet slashes up alongside it.
const RISE_RAW: Body = {
  ...GUARD,
  hip: at(0.5, 38.5),
  torso: -12,
  head: 12,
  shrug: 2.8,
  twist: -0.25,
  nearFoot: at(24, 50),
  farFoot: planted(-7.0, -10),
  face: 'effort',
};
const RISE: Pose = {
  ...posed(withSkyKick(RISE_RAW, at(24, 50), 90), [118, 36], [-18, 26]),
  effects: [smear(4.0, [10, 32], [18, 42], [25, 52])],
};

// Frame 3 (4 ticks, active): Peak of the rising flash kick + skyward gauntlet slash! The lead leg
// is lashed high (`nearFoot` at `24, 60`), the lead silver gauntlet extends overhead (`[148, 18]`),
// and a vertical jade speed cone + flash reaches y = 104 (hitbox 4..30, y 58..104).
const TOP_RAW: Body = {
  ...GUARD,
  hip: at(2.0, 39.5),
  torso: -14,
  head: 14,
  shrug: 3.4,
  reach: { near: 2.5 },
  twist: -0.4,
  nearFoot: at(24, 60),
  farFoot: planted(-5.5, -12),
  face: 'kiai',
};
const TOP_POSE = posed(withSkyKick(TOP_RAW, at(24, 60), 88), [148, 18], [-22, 24]);
const CONTACT = at(19, 89.5);
const TOP: Pose = {
  ...TOP_POSE,
  effects: [
    smear(4.8, [16, 52], [20, 68], [18, 82]),
    {
      kind: 'speed',
      center: at(21, 99),
      length: 24,
      spread: 6,
      direction: 90,
      tone: 'sound',
    },
    {
      kind: 'flash',
      center: CONTACT,
      radius: 6,
      tone: 'strike',
    },
  ],
  glows: [{ center: CONTACT, reach: 26, power: 1.1, tone: 'sound' }],
};

// Frame 4 (5 ticks): Re-chambering the high kick on the way down while a jade ring lingers high.
const FOLD_RAW: Body = {
  ...GUARD,
  hip: at(-0.5, 38.2),
  torso: -2,
  head: 6,
  shrug: 2.4,
  twist: -0.25,
  nearFoot: at(14, 42),
  farFoot: planted(-9.0, -10),
  face: 'effort',
};
const FOLD: Pose = {
  ...posed(withSkyKick(FOLD_RAW, at(14, 42), 92), [112, 48], [-12, 32]),
  effects: [
    { kind: 'ring', center: at(19, 86), radius: 10, progress: 0.55, tone: 'sound', squash: 0.5 },
  ],
};

// Frame 5 (6 ticks): Setting the lead foot back down toward its guard mark.
const SETTLE_BODY: Body = {
  ...GUARD,
  hip: at(-4.8, 36.2),
  torso: 11,
  head: 2,
  shrug: 1.6,
  nearFoot: lifted(planted(7.5, 0), 1.0),
  farFoot: onToes(REAR_TOE, -18),
};
const SETTLE: Pose = posed(SETTLE_BODY, [24, 88], [38, 92]);

// Frame 6 (6 ticks): Back in GUARD.
export const POSES: readonly Pose[] = [DIP, CHAMBER, RISE, TOP, FOLD, SETTLE, GUARD];
