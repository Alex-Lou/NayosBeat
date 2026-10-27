import { BODY, solve } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Effect, type Foot, type Pose } from './common.ts';

/**
 * The record in his hands at `(x, y)`, before it lights up into the flying Vinyle: smaller,
 * no afterimages, turned `phase` of a turn (the scratch rocks it back and forth).
 */
const record = (x: number, y: number, phase: number): Effect => ({
  kind: 'disc',
  center: at(x, y),
  radius: 5,
  phase,
  afterimages: 0,
});

/** Where the guard's toes touch the floor: the lead foot's and the rear one's (heel up). */
const LEAD_TOE = solve(GUARD).near.toe.x;
const REAR_TOE = solve(GUARD).far.toe.x;

/**
 * A foot on its toes at `toe`, the heel raised `angle` degrees (negative): the heel rises and
 * sinks around the toe, which stays put on the floor.
 */
function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

// Startup (frames 0-3, 3 ticks each): out of the high guard, the rear hand pulls a record out
// of the jacket and the weight rocks back onto the rear leg; hunched over it at the rear hip
// like a DJ over the decks, he gives it a scratch, then coils for a flat sidearm throw.

// Frame 0: the rear hand slips inside the open jacket, the lead glove holds the flap open; the
// chest starts turning away, the hips rock back.
const DRAW: Pose = {
  ...GUARD,
  hip: at(-7.8, 35.4),
  torso: 10,
  head: 8,
  shrug: 2.6,
  twist: -0.5,
  nearFist: at(7, 50),
  farFist: at(1, 56),
  nearHand: 'open',
  farHand: 'open',
  nearFoot: onToes(LEAD_TOE, -4),
  farFoot: onToes(REAR_TOE, -11),
  bends: { nearElbow: 'down', farElbow: 'down' },
};

// Frame 1: the record comes out and sweeps down to the rear hip, coiled on the rear leg (its
// heel sinks), chest turned away, the lead shoulder up at the chin; the palms hold the record
// by its rim (lead palm on top, rear one under it).
const COIL: Pose = {
  ...GUARD,
  hip: at(-9.2, 34),
  torso: 7,
  head: 8,
  shrug: 2.8,
  twist: -0.8,
  nearFist: at(-9.5, 47),
  farFist: at(-14, 37.5),
  nearHand: 'open',
  farHand: 'open',
  nearFoot: onToes(LEAD_TOE, -8),
  farFoot: onToes(REAR_TOE, -7),
  bends: { nearElbow: 'front', farElbow: 'front' },
  effects: [smear(2.5, [1, 56], [-5, 51], [-13, 40]), record(-12, 42, 0)],
};

// Frame 2: the scratch: the lead palm drags the record back hard, the head nods down on the
// beat.
const SCRATCH: Pose = {
  ...COIL,
  hip: at(-9.9, 33.1),
  torso: 8,
  head: 11,
  nearFist: at(-15, 48.5),
  farFist: at(-15.5, 37.5),
  nearFoot: onToes(LEAD_TOE, -10),
  farFoot: onToes(REAR_TOE, -6),
  effects: [record(-14.2, 42.8, -0.15)],
};

// Frame 3: the scratch back and the deepest coil, low on the rear leg, the chest turned right
// away, lead heel up; the rear hand cocks the record behind the hip, flat, ready to whip.
const LOAD: Pose = {
  ...COIL,
  hip: at(-11, 32),
  torso: 6,
  head: 6,
  shrug: 3.2,
  twist: -0.95,
  nearFist: at(-8.5, 46),
  farFist: at(-15.5, 37),
  nearFoot: onToes(LEAD_TOE, -13),
  farFoot: onToes(REAR_TOE, -6),
  effects: [record(-12.5, 41, 0.05)],
};

// Frame 4 (8 ticks, the Vinyle leaves at x 24, y 42): the hips drive through off the rear toe,
// the lead foot stamps a short step, chest squared; one line from the rear toe through the hips
// and the leaning back to the head. The rear arm whips out flat at chest height, the palm open
// just behind the record it let go of, the lead glove pulled back to the chest; speed lines
// stream behind the throwing hand, dust under the stamp.
const THROW: Pose = {
  ...GUARD,
  hip: at(-5.5, 33),
  torso: 17,
  head: 0,
  shrug: 0.6,
  reach: { near: 0, far: 3.5 },
  twist: 0.6,
  nearFist: at(4, 52),
  farFist: at(19, 43),
  farHand: 'open',
  nearFoot: planted(10),
  farFoot: onToes(REAR_TOE, -28),
  bends: { nearElbow: 'down', farElbow: 'down' },
  face: 'effort',
  effects: [
    { kind: 'speed', center: at(17, 43), length: 9, spread: 4, direction: 0, tone: 'sound' },
    { kind: 'dust', x: 11.5, size: 2.6, progress: 0.15 },
  ],
};

// Recovery (frames 5-8): the arm follows through and he rolls back into the high guard.

// Frame 5: follow-through, the throwing arm still out, the whole pose drifting on half a pixel;
// the speed lines thin out.
const HOLD: Pose = {
  ...THROW,
  hip: at(-5.2, 33.2),
  torso: 18,
  head: 0,
  nearFist: at(4.5, 52.5),
  farFist: at(19.5, 43.6),
  effects: [
    { kind: 'speed', center: at(17, 44), length: 6, spread: 3, direction: 0, tone: 'sound' },
    { kind: 'dust', x: 11.5, size: 2.6, progress: 0.55 },
  ],
};

// Frame 6: the hands come back up toward the chin, the hips rock back, the lead foot steps
// home.
const RETURN: Pose = {
  ...GUARD,
  hip: at(-5.4, 35.3),
  torso: 15,
  head: 2,
  shrug: 1.6,
  reach: { near: 0.6, far: 0.6 },
  twist: 0.2,
  nearFist: at(15, 50.5),
  farFist: at(14.5, 57),
  nearFoot: lifted(planted(7.6, -4), 1),
  farFoot: onToes(REAR_TOE, -17),
  effects: [{ kind: 'dust', x: 11.5, size: 2.6, progress: 0.85 }],
};

// Frame 7: back in the high guard, up a hair past it on the bounce, the lead shoulder rolling
// up to the chin and the far glove a beat late.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(-6.9, 37.1),
  torso: 14,
  head: 3,
  shrug: 2.2,
  nearFist: at(8.8, 55.6),
  farFist: at(10.5, 61.4),
};

/**
 * Frame 8: the idle's last frame (the lead shoulder still up on the breath): the idle's own
 * 9 -> 0 beat carries him on into the loop, no frozen copy of the guard at the hand-off.
 */
const IDLE_HANG: Pose = {
  ...GUARD,
  shrug: 1.68,
  nearFist: at(8.82, 54.97),
  farFist: at(10.3, 62.3),
};

/**
 * special (Vinyle, docs/combat-v2.md §5.4): he pulls a record out of his jacket, scratches it at
 * the rear hip like a DJ, and throws it flat with a whip of the rear arm. Ticks 3,3,3,3,8,6,5,5,5;
 * the record leaves the hand at the start of frame 4, where the flying Vinyle takes over (x 24,
 * y 42). Starts from the high guard and ends on the idle's last frame (the guard, shoulder up on
 * the breath); the toes keep their marks while the heels rise and sink.
 */
export const POSES: readonly Pose[] = [
  DRAW,
  COIL,
  SCRATCH,
  LOAD,
  THROW,
  HOLD,
  RETURN,
  SETTLE,
  IDLE_HANG,
];
