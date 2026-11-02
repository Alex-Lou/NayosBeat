import { at, behindBack, GUARD, onBall, planted, raised, smear, type Pose } from './common.ts';

/**
 * forwardHeavy (Fouetté plongeant, docs/saphir.md §4): 8 frames, 4, 4, 4, 6, 3, 5, 5, 5 ticks
 * (36), the foot lands on frame 4 (ticks 18-20), hitbox 12..44 / 36..70, an overhead; the game
 * carries her 10 px in over ticks 6-14. The Plongé (chainHigh) plays frames 2 to 7 of it. The
 * leg rises high over the guard and plunges down on the head, heel first: the needle dropping
 * on the record.
 *
 * - 0-1: the weight back, the lead knee rising.
 * - 2-3: the leg high over her, straight, the toes at the ceiling; held a beat.
 * - 4: the plunge: the heel comes down on the far edge of the hitbox, the trail falling from
 *   the top.
 * - 5: the foot sinks on through.
 * - 6-7: back in the guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-4, 34),
    torso: -6,
    nearFoot: onBall(10, -34),
  },
  {
    ...GUARD,
    hip: at(0, 35),
    torso: -10,
    farFoot: planted(-12),
    nearFoot: raised(14, 30, -20),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(6, 36.5),
    torso: -22,
    farFoot: planted(-6),
    nearFoot: raised(17, 68, 100),
    bends: { ...GUARD.bends, nearKnee: 'back' },
    face: 'effort',
    effects: [smear(2.5, [14, 32], [17, 50], [17, 66])],
  },
  {
    ...GUARD,
    hip: at(8, 37),
    torso: -24,
    farFoot: planted(-4),
    nearFoot: raised(20, 68.5, 100),
    bends: { ...GUARD.bends, nearKnee: 'back' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(12, 37),
    torso: -12,
    farFoot: planted(0),
    nearFoot: raised(37, 59, 55),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'kiai',
    effects: [smear(3.5, [20, 72], [32, 70], [38, 62])],
  },
  {
    ...GUARD,
    hip: at(8, 35),
    torso: 4,
    farFoot: planted(-2),
    nearFoot: raised(28, 26, -30),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(2, 34),
    torso: 2,
    nearFoot: onBall(14, -30),
    farFoot: planted(-8),
  },
  {
    ...GUARD,
    hip: at(-2, 34),
    farFoot: planted(-12),
  },
];

/** Her hands stay at her back through the whole move: the legs do everything. */
export const POSES: readonly Pose[] = FRAMES.map(behindBack);
