import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import {
  at,
  GUARD,
  onBall,
  planted,
  smear,
  toeOf,
  type Effect,
  type Foot,
  type Pose,
} from './common.ts';
import { dust, IDLE_SETTLE, stageOf } from './dashForward.ts';
import { guarded } from './jump.ts';
import { pointed } from './jumpLight.ts';

export const ANIMATED: boolean = true;

/**
 * dashBack (docs/combat-v2.md §3.3, §11.3): 6 frames, 1, 4, 4, 3, 3, 5 ticks (20). Her small
 * back flip. The game carries her 48 px back over ticks 1-14 and only along the floor: the flip's
 * height is in the poses (a hop of about 10 px), and grabs miss her on ticks 0-10, the frames she
 * is off the floor. The poses stay anchored around x = 0.
 *
 * A back tuck, the guard kept: she does not jump away, she shows off. A short dip, then the set:
 * the lead foot flicks her off the floor, the body long and straight from the pointed toes to the
 * crown, tipped back only 20 degrees, the chest up, both arms thrown up over her head to lead
 * the turn, the face clear between them, the eyes on the opponent (the head the drawing).
 * Nothing hangs limp: it is a take-off, never a knock-back (airHit). Then she balls up
 * and goes over the top, the boots sweeping a magenta arc that carries the half turn; she comes
 * round with the knees still tucked, the shoulders already pitched forward, opens out onto the
 * guard's marks and soaks the landing into her plié, dust out from both boots, and rises into
 * the guard on the idle's last frame.
 *
 * - 0 (1 tick): the dip: the hips sink and the heels lift, the fists sink with the weight.
 * - 1 (4 ticks): the set: tipped back 20 degrees, the legs long under her, the lead toe just off
 *   the floor, both arms thrown up over the head; the push-off puff left where she stood.
 * - 2 (4 ticks): over the top, upside down, balled up; the boots' arc.
 * - 3 (3 ticks): coming round: upright again, the chest forward, the knees tucked, the boots
 *   reaching for the floor, the guard back on.
 * - 4 (3 ticks): the landing, on the guard's marks: low in the plié, dust at both boots.
 * - 5 (5 ticks): the idle's last frame, the dust thinning.
 *
 * Upside down the head is turned by exactly 180 degrees (lossless); the upright frames keep it
 * under 20 degrees, the face as drawn. The fringe and the belt's chain whip round by themselves.
 */

/** Ticks of each frame (her clip, src/art/riff/clips.ts). */
const TICKS = [1, 4, 4, 3, 3, 5] as const;
/** The game's backdash curve (§3.3): px per tick on ticks 1 to 14, backward. */
const SPEEDS = [
  6.61, 6.12, 5.64, 5.14, 4.65, 4.17, 3.67, 3.18, 2.7, 2.2, 1.72, 1.22, 0.74, 0.24,
] as const;

const stage = stageOf(
  SPEEDS.map((speed) => -speed),
  TICKS,
);

/** The guard's on-screen head tilt. */
const LOOK = GUARD.torso + GUARD.head;
/** The guard's marks: the rear toe tip and the lead foot's. */
const REAR_TOE = toeOf(GUARD.nearFoot);
const LEAD_TOE = toeOf(GUARD.farFoot);

const rad = (degrees: number): number => (degrees * Math.PI) / 180;

/** `p` turned `degrees` around `c`, clockwise for positive degrees (a forward somersault). */
function turn(p: Point, degrees: number, c: Point = at(0, 0)): Point {
  const a = -rad(degrees);
  const d = at(p.x - c.x, p.y - c.y);
  return at(
    c.x + d.x * Math.cos(a) - d.y * Math.sin(a),
    c.y + d.x * Math.sin(a) + d.y * Math.cos(a),
  );
}

/** Every placed part of a pose moved by (dx, dy), the whole body spun around the hip. */
function moved(pose: Pose, dx: number, dy: number, spin: number): Pose {
  const move = (p: Point): Point => at(p.x + dx, p.y + dy);
  const foot = (f: Foot): Foot => ({ ...f, ...move(f) });
  return {
    ...pose,
    hip: move(pose.hip),
    nearFoot: foot(pose.nearFoot),
    farFoot: foot(pose.farFoot),
    nearFist: move(pose.nearFist),
    farFist: move(pose.farFist),
    spin,
  };
}

/**
 * A pose spun `spin` degrees whose feet and fists are given where they show on screen: they are
 * turned back into the body's own frame, around the hip.
 */
function spun(pose: Pose, spin: number): Pose {
  const local = (p: Point): Point => turn(p, -spin, pose.hip);
  const foot = (f: Foot): Foot => ({ ...local(f), angle: (f.angle ?? 0) + spin });
  return {
    ...pose,
    spin,
    nearFoot: foot(pose.nearFoot),
    farFoot: foot(pose.farFoot),
    nearFist: local(pose.nearFist),
    farFist: local(pose.farFist),
  };
}

/**
 * `pose` with one arm raised from its shoulder `shoulder` degrees off hanging (90: level in front,
 * 180: along the torso over the head) and the elbow bent `elbow` degrees, as it shows on screen:
 * the fist is turned back into the body's own frame for a spun pose.
 */
function raised(pose: Pose, side: 'near' | 'far', shoulder: number, elbow: number): Pose {
  const s = solve(pose, RIFF_BODY);
  const a = rad(shoulder);
  const upper = at(
    -s.up.x * Math.cos(a) + s.front.x * Math.sin(a),
    -s.up.y * Math.cos(a) + s.front.y * Math.sin(a),
  );
  const e = rad(elbow);
  const fore = at(
    upper.x * Math.cos(e) - upper.y * Math.sin(e),
    upper.x * Math.sin(e) + upper.y * Math.cos(e),
  );
  const { shoulder: root } = s[side];
  const fist = at(
    root.x + upper.x * RIFF_BODY.upperArm + fore.x * RIFF_BODY.forearm,
    root.y + upper.y * RIFF_BODY.upperArm + fore.y * RIFF_BODY.forearm,
  );
  const local = turn(fist, -(pose.spin ?? 0), pose.hip);
  return side === 'near' ? { ...pose, nearFist: local } : { ...pose, farFist: local };
}

/**
 * A leg folded from its hip joint (hips at the origin leaning `torso` degrees): the thigh along
 * `thigh` degrees, the knee bent `knee` degrees, the shin folding back under the thigh the way a
 * knee bends, the foot `ankle` degrees off the shin (90 square; a combat boot points to about 60).
 */
function tucked(torso: number, side: 'near' | 'far', thigh: number, knee: number, ankle: number) {
  const across = (side === 'near' ? 1 : -1) * RIFF_BODY.hipSpread;
  const joint = at(Math.cos(rad(torso)) * across, -Math.sin(rad(torso)) * across);
  const kneeAt = at(
    joint.x + Math.cos(rad(thigh)) * RIFF_BODY.thigh,
    joint.y + Math.sin(rad(thigh)) * RIFF_BODY.thigh,
  );
  const shin = thigh - knee;
  return {
    x: kneeAt.x + Math.cos(rad(shin)) * RIFF_BODY.shin,
    y: kneeAt.y + Math.sin(rad(shin)) * RIFF_BODY.shin,
    angle: shin + ankle,
  };
}

// 0 · The dip (1 tick).
const DIP: Pose = guarded(
  {
    ...GUARD,
    hip: at(-7.2, 30.2),
    torso: 16.5,
    head: LOOK + 2 - 16.5,
    shrug: 2.6,
    nearFoot: onBall(REAR_TOE, -18),
    farFoot: onBall(LEAD_TOE, -12),
  },
  at(0.4, -1),
  at(-0.6, -1.2),
);

/** The tip of the takeoff: the body tipped back this far, the rest of the turn is the swoosh's. */
const SET = -20;

// 1 · The takeoff (4 ticks), the set of the back tuck, placed as it shows on screen: tipped back
// only 20 degrees, one long line from the pointed lead toe (just leaving the floor) through the
// hips to the crown, the chest up; both arms thrown up over the head to lead the turn, the look
// still on the opponent. The rear arm goes straight up along the back of the head, past the ear
// (172 degrees off hanging on the torso, the elbow soft): its shoulder blade rises with it, the
// shoulder drawn 3 px back (`reach`), which leaves the elbow room to pass behind the head rather
// than through it; up there the forearm folds toward the back, so its elbow is picked in front
// (`nearElbow: 'front'`: 'down' would fold it the wrong way). The lead arm rises in front of the
// fringe. (Raised forward at 125 degrees instead, the rear sleeve crossed the face from the jaw to
// the eye: a masked face, an arm guarding it, not a take-off.)
const SET_BODY: Pose = spun(
  {
    ...GUARD,
    hip: at(-6.5, 40),
    torso: -3,
    head: -8 + 3 - SET,
    shrug: 2.4,
    twist: 0.55,
    reach: { near: -3 },
    nearFoot: { x: -1.5, y: 15, angle: -64 },
    farFoot: { x: 6.1, y: 11.1, angle: -70 },
    nearFist: at(-31.5, 78),
    farFist: at(-7, 63),
    bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'front', farElbow: 'down' },
  },
  SET,
);
const LAUNCH: Pose = pointed(raised(raised(SET_BODY, 'near', 172, 18), 'far', 150, 30));

/** The ball's lean, upright with the hip at the origin. */
const BALLED = 14;

/**
 * The ball, upright with the hip at the origin: the knees up at the chest, each folded 150
 * degrees (the heel under the seat, never the shin through the thigh), the toes softly pointed;
 * the hands round the shins below the knees, the elbows at the sides.
 */
const TUCK: Pose = {
  ...GUARD,
  hip: at(0, 0),
  torso: BALLED,
  head: 6,
  shrug: 2.6,
  twist: 0.3,
  nearFoot: tucked(BALLED, 'near', 40, 150, 62),
  farFoot: tucked(BALLED, 'far', 34, 150, 62),
  nearFist: at(11, 6),
  farFist: at(14, 3),
  bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'down', farElbow: 'down' },
};
/**
 * The point of the ball (from the hip, upright) that goes over the top at APEX: low in the ball,
 * so that upside down the head comes within her hurtbox of these ticks (src/data/fighters/riff.ts).
 */
const BALL = at(6, 7);
/** Where the middle of the ball goes over the top. */
const APEX = at(-7, 47);

// 2 · Over the top (4 ticks): turned 200 degrees back, the head at exactly 180 on screen.
const OVER: Pose = (() => {
  const spin = -200;
  const hip = turn(BALL, spin);
  return moved(TUCK, APEX.x - hip.x, APEX.y - hip.y, spin);
})();

// 3 · Coming round (3 ticks): the body upright again (40 degrees past a full turn, the chest
// forward), the knees still tucked, the boots reaching down for the floor; the guard back on for
// the landing (the rear fist under the chin, the lead one low in front, both turned with the
// chest).
const ROUND: Pose = guarded(
  {
    ...GUARD,
    hip: at(-5, 37),
    torso: 28,
    head: -10,
    shrug: 2.4,
    twist: 0.4,
    nearFoot: { x: -18, y: 14, angle: -40 },
    farFoot: { x: -6, y: 12, angle: -30 },
    bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'down', farElbow: 'down' },
  },
  at(0.6, 0.4),
  at(1.6, 1.2),
);

// 4 · The landing (3 ticks), on the guard's marks (the game carries her about a pixel more).
const LAND: Pose = guarded(
  {
    ...GUARD,
    hip: at(-6.5, 29),
    torso: 26,
    head: LOOK + 1 - 26,
    shrug: 2.8,
    twist: 0.4,
    nearFoot: onBall(REAR_TOE, -24),
    farFoot: planted(GUARD.farFoot.x),
  },
  at(1, -2),
  at(2, -2.5),
);

/**
 * The boots' arc up the front of the ball and over the top, ending above them: wide of the ball
 * (the trail is drawn behind the body), on the way the boots came.
 */
const SWOOSH: Effect = (() => {
  const boots = solve(OVER, RIFF_BODY).near.ankle;
  const end = (Math.atan2(boots.y - APEX.y, boots.x - APEX.x) * 180) / Math.PI;
  const radius = 18;
  const points = [0, 0.25, 0.5, 0.75, 1].map((t): [number, number] => {
    const a = rad(end - 130 + 130 * t);
    return [APEX.x + radius * Math.cos(a), APEX.y + radius * Math.sin(a)];
  });
  return smear(4, ...points);
})();

export const POSES: readonly Pose[] = [
  { ...DIP, effects: [dust(LEAD_TOE, 3, 0.1)] },
  // The push-off puff, left on the stage where the lead toe flicked her off.
  { ...LAUNCH, effects: [dust(stage(LEAD_TOE, 0, 1), 3.5, 0.45)] },
  { ...OVER, effects: [SWOOSH] },
  ROUND,
  { ...LAND, effects: [dust(REAR_TOE, 4, 0.2), dust(LEAD_TOE, 4, 0.2)] },
  {
    ...IDLE_SETTLE,
    effects: [dust(stage(REAR_TOE, 4, 5), 4, 0.6), dust(stage(LEAD_TOE, 4, 5), 4, 0.6)],
  },
];
