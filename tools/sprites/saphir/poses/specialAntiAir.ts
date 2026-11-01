import { at, GUARD, planted, raised, smear, type Pose } from './common.ts';

/**
 * specialAntiAir (Contre-ut, docs/saphir.md §4): 8 frames, 2, 3, 3, 3, 6, 6, 6, 6 ticks (38),
 * active on frames 2-3 (ticks 5-10), hitbox 2..28 / 36..106 measured upward and forward. The
 * high note: she leaps and the lead leg goes straight to the sky, the toes pointed at the top of
 * the hitbox, the body leaning back from it. No invincibility, nothing magic: a leg.
 *
 * Like Riff's Genou montant (tools/sprites/riff/poses/specialAntiAir.ts), the leap is drawn inside
 * the cell: the move gives her no lift, and a grounded leg tops out near 80. The hips rise to 65
 * on the active frames (the guard's: 35.5), her hurtboxes follow the drawing. Whether the game
 * lifts her instead is the same open question as Riff's.
 *
 * - 0: the drop: the hips sink, the fists come down a little.
 * - 1: the launch: the rear foot pushes off, the lead leg swings up, her energy rings on the
 *   floor (the Remix redraws it in platine).
 * - 2: the high note, kiai: the leg straight up, the toes on the top of the hitbox, the rear leg
 *   tucked, the torso leaning back, the fists in; the trail up the leg's path.
 * - 3: held a hair higher, the follow-through.
 * - 4: the fall: the leg comes down, the knees fold for the floor.
 * - 5: the landing, low on the guard's marks.
 * - 6: rising.
 * - 7: back in her guard.
 */
export const POSES: readonly Pose[] = [
  {
    ...GUARD,
    hip: at(-2, 31.5),
    torso: 6,
    nearFoot: planted(8, -14),
    farFoot: planted(-13, -20),
    nearFist: at(11, 50),
    farFist: at(6, 52.5),
  },
  {
    ...GUARD,
    hip: at(3, 44),
    torso: -8,
    farFoot: raised(-6, 12, -40),
    nearFoot: raised(21.1, 74.7, 105),
    bends: { ...GUARD.bends, nearKnee: 'back' },
    nearFist: at(12, 63),
    farFist: at(6, 64),
    face: 'effort',
    effects: [
      smear(3, [12, 40], [15, 54], [17, 66]),
      { kind: 'ring', center: at(-2, 1), radius: 12, progress: 0.3, tone: 'sound', squash: 0.3 },
    ],
  },
  {
    ...GUARD,
    hip: at(9, 64),
    torso: -22,
    farFoot: raised(-4, 36, -50),
    nearFoot: raised(17.7, 98.6, 115),
    nearFist: at(10, 90),
    farFist: at(12, 82),
    bends: { ...GUARD.bends, nearKnee: 'back', farKnee: 'down' },
    face: 'kiai',
    effects: [smear(3.5, [17, 66], [18, 82], [18, 98])],
  },
  {
    ...GUARD,
    hip: at(9, 65),
    torso: -23,
    farFoot: raised(-4, 37, -50),
    nearFoot: raised(19.5, 99.1, 115),
    nearFist: at(10, 91),
    farFist: at(12, 83),
    bends: { ...GUARD.bends, nearKnee: 'back', farKnee: 'down' },
    face: 'effort',
    effects: [smear(3, [18, 84], [19, 92], [19.5, 99])],
  },
  {
    ...GUARD,
    hip: at(5, 52),
    torso: -6,
    farFoot: raised(-8, 22, -20),
    nearFoot: raised(16, 32, 0),
    nearFist: at(13, 70),
    farFist: at(7, 70),
  },
  {
    ...GUARD,
    hip: at(-2, 30.5),
    torso: 6,
    nearFoot: planted(9, -6),
    farFoot: planted(-13, -28),
    nearFist: at(11, 49.5),
    farFist: at(6, 52),
  },
  {
    ...GUARD,
    hip: at(-3, 33.5),
    torso: 4,
    farFoot: planted(-14, -10),
    nearFist: at(11.5, 52),
    farFist: at(6.5, 54.5),
  },
  GUARD,
];
