import { at, behindBack, GUARD, onBall, planted, raised, smear, type Pose } from './common.ts';

/**
 * forwardHeavy (Fouetté plongeant, docs/saphir.md §4): 8 frames, 4, 4, 4, 6, 3, 5, 5, 5 ticks
 * (36), the heel lands on frame 4 (ticks 18-20), hitbox 12..44 / 36..70, an overhead; the game
 * carries her 10 px in over ticks 6-14. The Plongé (chainHigh) plays frames 2 to 7 of it. A
 * leaping axe kick: she springs off the rear foot, the lead leg rising straight over her, and
 * drops the heel on the head on her way down: the needle dropping on the record. Drawn in the
 * cell like the Contre-ut (the move gives her no lift).
 *
 * - 0: the dip, the weight on the rear leg.
 * - 1: the spring, the lead knee driving up.
 * - 2-3: in the air, the lead leg straight up over her, the toes at the ceiling; held a beat.
 * - 4: the plunge: still in the air, the heel comes down on the far edge of the hitbox, the
 *   trail falling from the top.
 * - 5: the landing on the lead foot.
 * - 6-7: back in the guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-4, 31.5),
    torso: 4,
    nearFoot: onBall(10, -36),
    farFoot: planted(-13, -24),
  },
  {
    ...GUARD,
    hip: at(0, 42),
    torso: -8,
    nearFoot: raised(12, 30, -20),
    farFoot: raised(-8, 10, -50),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(6, 50),
    torso: -22,
    nearFoot: raised(15, 81, 100),
    farFoot: raised(-4, 22, -50),
    bends: { ...GUARD.bends, nearKnee: 'back', farKnee: 'down' },
    face: 'effort',
    effects: [smear(2.5, [12, 44], [15, 62], [16, 78])],
  },
  {
    ...GUARD,
    hip: at(9, 51),
    torso: -24,
    nearFoot: raised(19, 82, 100),
    farFoot: raised(-2, 22, -50),
    bends: { ...GUARD.bends, nearKnee: 'back', farKnee: 'down' },
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(12, 46),
    torso: -12,
    nearFoot: raised(37, 59, 55),
    farFoot: raised(2, 18, -50),
    bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'down' },
    face: 'kiai',
    effects: [smear(3.5, [20, 84], [32, 78], [38, 64])],
  },
  {
    ...GUARD,
    hip: at(8, 33),
    torso: 6,
    nearFoot: onBall(20, -34),
    farFoot: planted(-6, -20),
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
