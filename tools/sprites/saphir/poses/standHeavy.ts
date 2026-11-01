import { at, GUARD, planted, raised, smear, type Pose } from './common.ts';

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
 *   torso far back, the fists still up; its trail behind the foot.
 * - 5: the knee folds back to the chamber.
 * - 6: the foot steps down and she slides back into her guard.
 */
export const POSES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-4, 34.5),
    torso: -2,
    nearFoot: planted(7, -16),
    farFoot: planted(-14, -10),
    nearFist: at(11, 53),
    farFist: at(6, 56),
  },
  {
    ...GUARD,
    hip: at(4, 36.5),
    torso: -8,
    farFoot: planted(0),
    nearFoot: raised(12, 14, 10),
    nearFist: at(16, 54),
    farFist: at(10, 57),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(9, 37.5),
    torso: -16,
    farFoot: planted(5),
    nearFoot: raised(17, 32, -35),
    nearFist: at(17, 56),
    farFist: at(11, 59),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(15, 38.5),
    torso: -24,
    farFoot: planted(9),
    nearFoot: raised(37, 40, 30),
    nearFist: at(18, 57),
    farFist: at(11, 60),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
    effects: [smear(3, [18, 33], [28, 37], [37, 40])],
  },
  {
    ...GUARD,
    hip: at(19, 39),
    torso: -28,
    farFoot: planted(12),
    nearFoot: raised(54.5, 41, 90),
    nearFist: at(18, 57),
    farFist: at(19, 63),
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
    nearFist: at(17, 56),
    farFist: at(11, 58),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(-1, 35),
    torso: 1,
    nearFoot: planted(9, -10),
    farFoot: planted(-12),
    nearFist: at(12, 53.5),
    farFist: at(7, 56),
  },
];
