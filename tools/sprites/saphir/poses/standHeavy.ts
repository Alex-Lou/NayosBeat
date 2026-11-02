import { at, behindBack, GUARD, planted, raised, smear, type Pose } from './common.ts';

/**
 * standHeavy (Chassé, docs/saphir.md §4): 7 frames, 2, 3, 3, 2, 3, 7, 9 ticks (29), the sole
 * lands on frame 4 (ticks 10-12), hitbox 14..58 / 34..48. The savate's side thrust kick: the
 * rear foot chases the lead one (the « chassé » that names it), the lead knee comes up folded,
 * then the leg drives out straight at the hip, the sole first, the body leaning away from it
 * like the arm of a scale. The game does not move her: the step in is drawn, and stepped back.
 *
 * - 0: the coil: the weight sinks onto the rear leg, the lead heel lifts.
 * - 1: the chase: the rear foot slides up behind the lead one, the lead knee starts up.
 * - 2: the chamber: the lead knee high, the foot folded under it, the sole turned out.
 * - 3: the drive: the leg half out, the torso leaning away.
 * - 4: impact: the leg straight at hip height, the sole on the far edge of the hitbox, the
 *   torso far back, the hands still clasped at her back; its trail behind the foot.
 * - 5: the knee folds back to the chamber.
 * - 6: the foot steps down and she slides back into her guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-4, 34.5),
    torso: -2,
    nearFoot: planted(7, -16),
    farFoot: planted(-14, -10),
  },
  {
    ...GUARD,
    hip: at(4, 36.5),
    torso: -8,
    farFoot: planted(0),
    nearFoot: raised(12, 14, 10),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(9, 37.5),
    torso: -16,
    farFoot: planted(5),
    nearFoot: raised(17, 32, -35),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(16, 37),
    torso: -24,
    farFoot: planted(10),
    nearFoot: raised(37, 40, 30),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
    effects: [smear(3, [18, 33], [28, 37], [37, 40])],
  },
  {
    ...GUARD,
    hip: at(21, 37),
    torso: -28,
    farFoot: planted(14),
    nearFoot: raised(54.5, 41, 90),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
    effects: [smear(3.5, [26, 37], [40, 40], [53, 41])],
  },
  {
    ...GUARD,
    hip: at(11, 37),
    torso: -14,
    farFoot: planted(6),
    nearFoot: raised(20, 30, -38),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(-1, 35),
    torso: 1,
    nearFoot: planted(9, -10),
    farFoot: planted(-12),
  },
];

/** Her hands stay at her back through the whole move: the legs do everything. */
export const POSES: readonly Pose[] = FRAMES.map(behindBack);
