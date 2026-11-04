import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import {
  at,
  energy,
  GUARD,
  lifted,
  planted,
  smear,
  type Effect,
  type Foot,
  type Pose,
} from './common.ts';

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

/**
 * An arm set by its joints, as tools/sprites/anatomy.ts measures them in the torso's frame: the
 * upper arm `shoulder` degrees from hanging (90 = straight ahead, 180 = overhead, negative =
 * behind), the elbow flexed `elbow` degrees (0 = straight, always the way an elbow bends). Gives
 * the hand it puts in place and the bend that makes the solver pick that elbow, not its mirror.
 */
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
  // The other elbow the solver could pick: the mirror image across the shoulder-hand line.
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

/** A pose of `body` with both arms set by their joints, `[shoulder, elbow]` each (see arm). */
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
//
// The rear knee sinks forward over its foot as he coils (the hips stay between the feet): the
// rear heel climbs with it, the foot rolling onto its ball around the toes, which keep their
// mark (tools/sprites/anatomy.ts: a flat foot under that knee would fold the ankle past its
// stop); the coil is a spring loaded on the ball of the rear foot, the throw drives off it.

// Frame 0: the rear hand slips inside the open jacket, the lead glove holds the flap open; the
// chest starts turning away, the hips rock back; the rear heel where the guard holds it.
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
  farFoot: onToes(REAR_TOE, -15),
  bends: { nearElbow: 'down', farElbow: 'down' },
};

// Frame 1: the record comes out of the jacket at the chest, the palms on its rim, and he looks
// down at it as it lights up: its cyan on the gloves, the forearms, under the chin (the effect's
// light, docs/art/nayo-essence.md). Coiled on the rear leg already (its heel up on the ball),
// the chest turning away, the lead shoulder up at the chin.
const COIL_BODY: Body = {
  ...GUARD,
  hip: at(-9.2, 34),
  torso: 7,
  head: 8,
  shrug: 2.8,
  twist: -0.8,
  nearHand: 'open',
  farHand: 'open',
  nearFoot: onToes(LEAD_TOE, -8),
  farFoot: onToes(REAR_TOE, -22),
};
const PRESENT_ARMS = posed({ ...COIL_BODY, head: 18 }, [28, 104], [36, 96]);
/** The record between the palms, in front of the chest. */
const PRESENTED = at(
  (PRESENT_ARMS.nearFist.x + PRESENT_ARMS.farFist.x) / 2 + 1.5,
  (PRESENT_ARMS.nearFist.y + PRESENT_ARMS.farFist.y) / 2 - 0.5,
);
const COIL: Pose = {
  ...PRESENT_ARMS,
  effects: [
    smear(2.5, [1, 56], [1, 52], [PRESENTED.x - 2, PRESENTED.y]),
    record(PRESENTED.x, PRESENTED.y, 0),
  ],
};

// Frame 2: the scratch: the lead palm drags the record back hard, the head nods down on the
// beat; the rear hand lets it ride back under the palm.
const SCRATCH_BODY: Body = {
  ...COIL_BODY,
  hip: at(-9.9, 33.1),
  torso: 8,
  head: 11,
  nearFoot: onToes(LEAD_TOE, -10),
  farFoot: onToes(REAR_TOE, -26),
};
const SCRATCH: Pose = {
  ...posed(SCRATCH_BODY, [-50, 75], [-16, 12]),
  effects: [
    // The record swept down from the chest to the hip.
    smear(3, [PRESENTED.x, PRESENTED.y], [-6, 44], [-12, 36]),
    record(-13.5, 34, -0.15),
    energy(-13.5, 34, 2.6),
  ],
};

// Frame 3: the scratch back and the deepest coil, low on the rear leg, the chest turned right
// away, both heels up; the rear arm swings the record back past the hip, long and loose, flat,
// ready to whip, and the lead hand comes off it, back up in front of the chest. The rear
// shoulder blade draws back with the arm, as a wind-up does: the arm hangs from the top of the
// back, down along it to the record (left where it was, the shoulder sits buried inside the
// padded jacket and the arm seems to grow out of the middle of the back).
const LOAD_BODY: Body = {
  ...COIL_BODY,
  hip: at(-11, 32),
  torso: 6,
  head: 6,
  shrug: 3.2,
  reach: { near: 0, far: -2.2 },
  twist: -0.95,
  nearFoot: onToes(LEAD_TOE, -13),
  farFoot: onToes(REAR_TOE, -30),
};
const LOAD_ARMS = posed(LOAD_BODY, [8, 112], [-26, 14]);
const LOAD: Pose = {
  ...LOAD_ARMS,
  nearHand: 'fist',
  effects: [
    record(LOAD_ARMS.farFist.x - 2.4, LOAD_ARMS.farFist.y + 0.8, 0.05),
    // Charged to the full: it lights the arm that holds it, the back, the hip.
    energy(LOAD_ARMS.farFist.x - 2.4, LOAD_ARMS.farFist.y + 0.8, 4.2),
  ],
};

// Frame 4 (8 ticks, the Vinyle leaves at x 24, y 42): the hips drive through off the rear toe,
// the lead foot stamps a short step, chest squared; one line from the rear toe through the hips
// and the leaning back to the head. The rear arm whips out flat at chest height, the palm open
// just behind the record it let go of, the lead glove pulled back to the ribs, elbow back;
// speed lines stream behind the throwing hand, dust under the stamp.
const THROW_BODY: Body = {
  ...GUARD,
  hip: at(-5.5, 33),
  torso: 17,
  head: 0,
  shrug: 0.6,
  reach: { near: 0, far: 3.5 },
  twist: 0.6,
  farHand: 'open',
  nearFoot: planted(10),
  farFoot: onToes(REAR_TOE, -32),
  face: 'effort',
};
const THROW: Pose = {
  ...THROW_BODY,
  ...posed(THROW_BODY, [-24, 138], [0, 0]),
  farFist: at(19, 43),
  bends: { nearElbow: arm(THROW_BODY, 'near', -24, 138).bend, farElbow: 'down' },
  effects: [
    // The whip: the throwing hand's path from behind the hip, flat out to the release.
    smear(4, [-17, 36], [-6, 40.5], [7, 42.8], [17, 43]),
    { kind: 'speed', center: at(17, 43), length: 9, spread: 4, direction: 0, tone: 'sound' },
    { kind: 'dust', x: 11.5, size: 2.6, progress: 0.15 },
  ],
  // The record just let go (the flying Vinyle takes over at x 24, y 42): it lights the open
  // palm, the forearm and the face from the front.
  glows: [{ center: at(24, 42), reach: 26, power: 1.3, tone: 'sound' }],
};

// Recovery (frames 5-8): the arm follows through and he rolls back into the high guard.

// Frame 5: follow-through, the throwing arm still out, the whole pose drifting on half a pixel;
// the speed lines thin out.
const HOLD_BODY: Body = { ...THROW_BODY, hip: at(-5.2, 33.2), torso: 18, head: 0 };
const HOLD: Pose = {
  ...THROW,
  ...HOLD_BODY,
  nearFist: arm(HOLD_BODY, 'near', -22, 136).fist,
  bends: { nearElbow: arm(HOLD_BODY, 'near', -22, 136).bend, farElbow: 'down' },
  farFist: at(19.5, 43.6),
  effects: [
    { kind: 'speed', center: at(17, 44), length: 6, spread: 3, direction: 0, tone: 'sound' },
    { kind: 'dust', x: 11.5, size: 2.6, progress: 0.55 },
  ],
  // The record on its way: its light slides off the hand.
  glows: [{ center: at(38, 42), reach: 26, power: 0.8, tone: 'sound' }],
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
