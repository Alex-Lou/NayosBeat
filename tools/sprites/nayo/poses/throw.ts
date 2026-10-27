import { at, GUARD, lifted, planted, type Effect, type Foot, type Pose } from './common.ts';

/**
 * throw (Projection): out of the high guard both hands shoot out for the collar and close on it.
 * Then, the way the game throws (the opponent leaves forward and up off the grab, flies about
 * 45 px and lands on its own knockdown), he launches it: one drive off the rear foot through the
 * hips into both arms, the hands opening forward and up as they let go. The arms float a beat in
 * the follow-through, drop, and the gloves come back up into the guard. The opponent is not
 * drawn: the speed lines leaving his hands sell the launch, its own knockdown makes the dust.
 * Ticks 3,[2],4,4,5,5,4 (grab: frame 1, held through the hitstop).
 */

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** Where the toe tip of a foot touches the floor (a foot on the ball pivots around it). */
function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  return foot.x + 2.3 * Math.sin(a) + 7 * Math.cos(a);
}

/** A foot on the floor turned to `angle` around its toe tip at `toe`: the toe never slides. */
function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(toe - 2.3 * Math.sin(a) - 7 * Math.cos(a), angle);
}

const REAR_TOE = toeOf(GUARD.farFoot);
/** The lead foot slides in for the grab and stays there through the launch. */
const IN = 9.5;

// Frame 0 (3 ticks): the reach. Straight out of the guard, both hands opening for the collar
// and the lapel, the lead arm long: the grab is the closing of this reach, not a jump forward.
// The lead foot slides in, the rear heel lifts.
const REACH: Pose = {
  ...GUARD,
  hip: at(-4.6, 36.1),
  torso: 18,
  head: -1,
  shrug: 1.6,
  twist: 0.1,
  reach: { near: 2, far: 2 },
  nearFoot: lifted(planted(8.2, 4), 1.2),
  farFoot: onToes(REAR_TOE, -19),
  nearFist: at(25.5, 56.6),
  farFist: at(22.5, 61.2),
  nearHand: 'open',
  farHand: 'open',
};

// Frame 1 (2 ticks, active, held through the hitstop): both fists close, on the collar and on
// the lapel.
const GRAB: Pose = {
  ...GUARD,
  hip: at(-3, 35.7),
  torso: 20,
  head: -1,
  shrug: 1.2,
  twist: 0.05,
  reach: { near: 3, far: 3 },
  nearFoot: planted(IN),
  farFoot: onToes(REAR_TOE, -22),
  nearFist: at(25, 55.4),
  farFist: at(24.4, 60.4),
  face: 'effort',
  effects: [{ kind: 'flash', center: at(29.5, 58), radius: 4, tone: 'strike' }],
};

// Frame 2 (4 ticks): the launch. One line from the rear toe through the hips into both arms,
// driven forward and up, the arms long; the hands open, palms out, as they let go. Speed lines
// streak off just ahead of them where the opponent leaves, a puff of dust off the rear toe.
const RELEASE: Pose = {
  ...GUARD,
  hip: at(-1.5, 35.2),
  torso: 27,
  head: -8,
  shrug: 2,
  twist: -0.6,
  reach: { near: 3, far: 3 },
  nearFoot: planted(IN),
  farFoot: onToes(REAR_TOE, -33),
  nearFist: at(35.9, 57.7),
  farFist: at(31.3, 60.5),
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
  effects: [
    { kind: 'speed', center: at(48, 64), length: 10, spread: 3.5, direction: 15, tone: 'strike' },
    dust(REAR_TOE, 3, 0.15),
  ],
};

// Frame 3 (4 ticks): the follow-through. The arms float on up after the opponent, the hands
// still open, the weight settling back off the drive (the dust spreading).
const FOLLOW: Pose = {
  ...GUARD,
  hip: at(-2.5, 35.6),
  torso: 23,
  head: -5,
  shrug: 1.8,
  twist: -0.45,
  reach: { near: 2, far: 2 },
  nearFoot: planted(IN),
  farFoot: onToes(REAR_TOE, -27),
  nearFist: at(33, 61.5),
  farFist: at(29.5, 63.5),
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
  effects: [dust(REAR_TOE, 3, 0.55)],
};

// Frame 4 (5 ticks): the arms drop, the fists close, the weight comes back and the lead foot
// steps home.
const DROP: Pose = {
  ...GUARD,
  hip: at(-4.5, 35.8),
  torso: 18,
  head: 0,
  shrug: 1.8,
  twist: -0.2,
  reach: { near: 1, far: 0.5 },
  nearFoot: lifted(planted(8, 2), 1.2),
  farFoot: onToes(REAR_TOE, -19),
  nearFist: at(17, 52),
  farFist: at(15, 57),
};

// Frame 5 (5 ticks): most of the way home, the gloves back up at the chin and the cheek.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-5.8, 35.9),
  torso: 16,
  head: 1,
  shrug: 1.5,
  twist: -0.05,
  reach: { near: 0.3 },
  nearFoot: planted(6.6, -1.5),
  farFoot: onToes(REAR_TOE, -16.5),
  nearFist: at(10.5, 53.6),
  farFist: at(11.6, 61.5),
};

// Frame 6 (4 ticks): the guard.
export const POSES: readonly Pose[] = [REACH, GRAB, RELEASE, FOLLOW, DROP, SETTLE, GUARD];
