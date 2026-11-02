import { at, behindBack, GUARD, onBall, planted, raised, smear, type Pose } from './common.ts';

/**
 * super (Coda, docs/saphir.md §6): 9 frames, 2, 3, 3, 2, 6, 6, 6, 10, 10 ticks (48), a blow a
 * frame on frames 4, 5 and 6 (ticks 10, 16 and 22), hitbox 10..54 / 4..64; the game carries her
 * 24 px in over ticks 2-12. DOU, BI, DOUM: the orchestra comes back to her. Two swing steps in,
 * then three blows in one breath, each leg in turn, the hands still at her back: a low kick to
 * the shin, a fouetté to the ribs, the heel's revers that floors. Her energy bursts off each
 * blow.
 *
 * - 0: the long beat, the weight dips.
 * - 1-2: the swing steps in, the lead foot reaching out.
 * - 3: the rear foot steps up, the lead knee lifting low.
 * - 4: DOU: the lead foot sweeps the shin, low and long, the hips dropped.
 * - 5: BI: the rear leg whips round at the ribs, the toes pointed.
 * - 6: DOUM: the lead heel at the chest, the leg straight, the torso far back; the trail a whole
 *   circle round her.
 * - 7: the knee folds back.
 * - 8: back in her guard.
 */
const FRAMES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-2, 33.5),
    torso: 6,
    head: 4,
  },
  {
    ...GUARD,
    hip: at(2, 34),
    torso: 2,
    nearFoot: raised(16, 7, -15),
    farFoot: planted(-12, -10),
  },
  {
    ...GUARD,
    hip: at(6, 33.5),
    torso: 4,
    nearFoot: onBall(20, -28),
    farFoot: planted(-6, -10),
  },
  {
    ...GUARD,
    hip: at(10, 32),
    torso: 8,
    nearFoot: raised(18, 10, -20),
    farFoot: planted(4, -10),
    face: 'effort',
  },
  {
    ...GUARD,
    hip: at(20, 24),
    torso: -14,
    nearFoot: raised(47, 8, 0),
    farFoot: onBall(8, -50),
    face: 'kiai',
    effects: [
      smear(3, [26, 6], [38, 6], [47, 7]),
      { kind: 'energy', center: at(53, 8), radius: 3.5 },
    ],
  },
  {
    ...GUARD,
    hip: at(20, 36),
    torso: -24,
    nearFoot: onBall(22, -28),
    farFoot: raised(50, 46, 55),
    bends: { ...GUARD.bends, farKnee: 'up' },
    face: 'kiai',
    effects: [
      smear(3, [8, 24], [30, 44], [50, 48]),
      { kind: 'energy', center: at(54, 50), radius: 3.5 },
    ],
  },
  {
    ...GUARD,
    hip: at(20, 37),
    torso: -28,
    nearFoot: raised(48.5, 52, 90),
    farFoot: planted(16, -20),
    bends: { ...GUARD.bends, nearKnee: 'up' },
    face: 'kiai',
    effects: [
      smear(3.5, [4, 24], [6, 58], [24, 70], [38, 64], [45, 56]),
      { kind: 'energy', center: at(53, 52), radius: 4.5 },
    ],
  },
  {
    ...GUARD,
    hip: at(12, 34),
    torso: -8,
    nearFoot: raised(22, 20, -30),
    farFoot: planted(10),
    bends: { ...GUARD.bends, nearKnee: 'up' },
  },
  {
    ...GUARD,
    hip: at(-2, 34),
    farFoot: planted(-13),
  },
];

/** Her hands stay at her back through the whole move: the legs do everything. */
export const POSES: readonly Pose[] = FRAMES.map(behindBack);
