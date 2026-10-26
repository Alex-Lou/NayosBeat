import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Effect, type Pose } from './common.ts';

/** The lead fist (wrist) `length` px from the lead shoulder, `angle` degrees above horizontal. */
function leadFist(pose: Omit<Pose, 'nearFist'>, length: number, angle: number): Point {
  const shoulder = solve({ ...pose, nearFist: GUARD.nearFist }).near.shoulder;
  const a = (angle * Math.PI) / 180;
  return at(shoulder.x + Math.cos(a) * length, shoulder.y + Math.sin(a) * length);
}

/**
 * The lead glove as drawn (solved): its middle and the front of its knuckles, along the
 * forearm past the wrist.
 */
function glove(pose: Pose): { middle: Point; knuckles: Point } {
  const { wrist, forearm } = solve(pose).near;
  const along = (distance: number): Point =>
    at(wrist.x + forearm.x * distance, wrist.y + forearm.y * distance);
  return { middle: along(2.6), knuckles: along(5.4) };
}

/**
 * The hook's trail: the near side of a flat ellipse (a horizontal swing seen from the side),
 * from about shoulder height in front of the chest, sweeping forward into the glove, `width`
 * px wide at the fist. It ends moving forward, not upward: a hook, not a shovel. It ends in
 * the middle of the glove, so its rounded end hides under it instead of bulging past it.
 */
function hookArc(pose: Pose, radius: number, depth: number, width: number): Effect {
  const end = glove(pose).middle;
  const points = [-70, -55, -40, -25, -12, -4].map((degrees): [number, number] => {
    const a = (degrees * Math.PI) / 180;
    return [end.x - radius + Math.cos(a) * radius, end.y + Math.sin(a) * depth];
  });
  return smear(width, ...points);
}

const HOOK_ARM = { nearElbow: 'up', farElbow: 'down' } as const;

// Frame 0 (3 ticks): the load. Weight sinks onto the back leg, the lead shoulder dips and the
// chest opens toward us, the lead hand drops to the hip: everything goes the other way first.
const LOAD: Pose = {
  ...GUARD,
  hip: at(-4.1, 35.4),
  torso: -5,
  head: 17,
  shrug: 1.2,
  twist: 0.45,
  nearFist: at(3.5, 45.5),
  farFist: at(6.4, 61.4),
  nearFoot: planted(5.6, -5),
};

// Frame 1 (3 ticks): the lead foot steps in, the hips come forward, the fist is cocked high
// by the chin, rear hand glued to the jaw.
const STEP: Pose = {
  ...GUARD,
  hip: at(-2.2, 35.3),
  torso: 4,
  head: 6,
  shrug: 1.6,
  twist: 0.15,
  nearFist: at(11, 58.5),
  farFist: at(11.5, 61.2),
  nearFoot: lifted(planted(9, 8), 2.4),
  farFoot: planted(-13.5, -8),
};

// Frame 2 (2 ticks): the hook whips around, elbow up at shoulder height, hips already through.
const SWING_BODY = {
  ...GUARD,
  hip: at(1.4, 35),
  torso: 16,
  head: 3,
  shrug: 2.5,
  reach: { near: 2 },
  twist: -0.35,
  farFist: at(13.5, 61),
  nearFoot: planted(10.5),
  farFoot: planted(-13.5, -16),
  bends: HOOK_ARM,
};
const SWING_ARM: Pose = { ...SWING_BODY, nearFist: leadFist(SWING_BODY, 22, -7) };
const SWING: Pose = { ...SWING_ARM, effects: [hookArc(SWING_ARM, 19, 3, 5)] };

// Frame 3 (4 ticks, active): impact. One long line from the back heel to the fist, the chin
// tucked behind the lead shoulder, jaw set.
const IMPACT_BODY = {
  ...GUARD,
  hip: at(2.8, 34.6),
  torso: 27,
  head: 4,
  shrug: 3.5,
  reach: { near: 3 },
  twist: -0.7,
  farFist: at(19, 60.5),
  nearFoot: planted(10.5, -6),
  farFoot: planted(-13.5, -22),
  bends: HOOK_ARM,
  face: 'effort' as const,
};
const IMPACT_ARM: Pose = { ...IMPACT_BODY, nearFist: leadFist(IMPACT_BODY, 24.6, -2) };
const IMPACT_KNUCKLES = glove(IMPACT_ARM).knuckles;
const IMPACT: Pose = {
  ...IMPACT_ARM,
  effects: [
    hookArc(IMPACT_ARM, 29, 4.5, 6),
    // At the contact point just ahead of the glove: it frames the knuckles, never hides them.
    {
      kind: 'flash',
      center: at(IMPACT_KNUCKLES.x + 3.5, IMPACT_KNUCKLES.y),
      radius: 4.5,
      tone: 'strike',
    },
  ],
};

// Frame 4 (3 ticks): follow-through, the arm folding back across, still set.
const THROUGH_BODY = {
  ...GUARD,
  hip: at(2.4, 34.8),
  torso: 24,
  head: 4,
  shrug: 3,
  reach: { near: 1.5 },
  twist: -0.85,
  farFist: at(16, 60.5),
  nearFoot: planted(10.5, -4),
  farFoot: planted(-13.5, -18),
  bends: { nearElbow: 'down' as const, farElbow: 'down' as const },
  face: 'effort' as const,
};
const THROUGH: Pose = { ...THROUGH_BODY, nearFist: leadFist(THROUGH_BODY, 20, -8) };

// Frame 5 (3 ticks): the weight comes back over the hips, the hand drops toward the low guard.
const BACK: Pose = {
  ...GUARD,
  hip: at(0.4, 35.4),
  torso: 13,
  head: 6,
  shrug: 2.8,
  twist: -0.5,
  nearFist: at(21, 49),
  farFist: at(13, 61.5),
  nearFoot: planted(10.5),
  farFoot: planted(-13.5, -10),
};

// Frame 6 (3 ticks): the lead foot steps back home.
const STEP_BACK: Pose = {
  ...GUARD,
  hip: at(-2, 36.2),
  torso: 4,
  head: 8,
  shrug: 3,
  twist: -0.2,
  nearFist: at(12.5, 45.5),
  farFist: at(9, 62),
  nearFoot: lifted(planted(7.8, -6), 2.2),
};

// Frames 7-8 (3 + 4 ticks): rolls the shoulder back up into the shell, a touch past, settles.
const ROLL: Pose = {
  ...GUARD,
  hip: at(-3.6, 36.8),
  torso: -3.5,
  head: 11,
  shrug: 4.2,
  nearFist: at(8.5, 43.5),
  farFist: at(7.2, 62.4),
};
const SETTLE: Pose = { ...GUARD, hip: at(-3.2, 37.1) };

/** standHeavy (Crochet): a stepping lead hook, the hips through it. Ticks 3,3,2,4,3,3,3,3,4. */
export const POSES: readonly Pose[] = [
  LOAD,
  STEP,
  SWING,
  IMPACT,
  THROUGH,
  BACK,
  STEP_BACK,
  ROLL,
  SETTLE,
];
