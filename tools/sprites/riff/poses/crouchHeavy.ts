import type { Point } from '../../raster.ts';
import { solve, type Bend, type Effect, type Foot } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, planted, smear, toeOf, type Pose } from './common.ts';
import { ANIMATED as CROUCH_ANIMATED, POSES as CROUCH_STRIP } from './crouch.ts';

export const ANIMATED: boolean = true;

/**
 * crouchHeavy (Windmill): 8 frames, 2, 2, 3, 3, 4, 4, 5, 5 ticks (28), the sweep on frame 3
 * (ticks 7-9), hitbox 10..44 / 2..14, low, knocks down. Her power move turned into a sweep: out
 * of the crouch she sits back onto her rear hand, rolls onto her upper back a hand's breadth off
 * the floor, and her legs open in a V and wheel round her like the blades of a windmill. Read
 * from the side, both legs turn one full round clockwise: the rear leg from behind, up, over
 * the top, down the floor into the opponent's ankles, tucked under her and back to its print;
 * the lead leg from the floor in front, swept out behind, up, over and down in front again.
 * The chest turns through it (to the viewer, then away, then back): she spins on her back.
 *
 * - 0: the sit-back: the hips sink, the body drops back over them (the head back above the
 *   hips), the rear hand reaches back for its print, the rear knee chambers up off the floor
 *   (its trail starts), the lead foot pushes on its ball.
 * - 1: down on the hand, the rear leg shot straight up in front of her (its trail rising), the
 *   lead leg swept out low behind: the V, both legs clear of the head.
 * - 2: the V turns over, wide open in the air; the shoulders sink toward the floor.
 * - 3: the sweep: the body slides forward over the planted hand, the rear leg long on the floor,
 *   the boot hooked into the ankles, the lead leg straight up; the trail comes down the whole
 *   arc into the floor, a gold flash and dust at the boot.
 * - 4: on round: the rear leg tucks under her, the lead leg comes down in front (its own trail);
 *   the dust rises.
 * - 5: the lead foot lands, the rear knee tucks behind, the hand pushes off the floor.
 * - 6: up on her feet, a little higher than the crouch, the rear hand coming back up open.
 * - 7: the crouch at rest (crouch.ts), where its loop picks up.
 *
 * The rear hand is planted on one print from frame 1 to frame 4 (it never slides). On the floor
 * the head counters the body's lean (it stays the source drawing, upright on screen: the
 * sideways look on the opponent the whole way round). The legs in the air are placed by their
 * angle from the hip (polar), nearly straight, the toes pointed along them: a V of long legs
 * reads as a power move, bent ones as someone sitting on the floor.
 */

const TOE = toeOf(GUARD.nearFoot);
const LEAD_TOE = toeOf(GUARD.farFoot);
const LEG = RIFF_BODY.thigh + RIFF_BODY.shin;

/** Where the cocked rear fist sits from the rear shoulder in the guard. */
const COCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** The loaded rear fist carried by its shoulder, nudged by (dx, dy). */
function cocked(pose: Pose, dx = 0, dy = 0): Pose {
  const shoulder = solve(pose, RIFF_BODY).near.shoulder;
  return { ...pose, nearFist: at(shoulder.x + COCKED.x + dx, shoulder.y + COCKED.y + dy) };
}

/** Her crouch as crouch.ts draws it, for as long as that strip is not animated. */
const FALLBACK: Pose = cocked({
  ...GUARD,
  hip: at(-8.5, 15.5),
  torso: 26,
  head: -15,
  shrug: 2.6,
  nearFoot: onBall(TOE, -20),
  farFoot: GUARD.farFoot,
  farFist: at(8.5, 24.5),
  twist: 0.4,
});

/** The crouch at rest (the first frame of its loop): where the move starts and lands. */
const REST: Pose = (CROUCH_ANIMATED ? CROUCH_STRIP[3] : undefined) ?? FALLBACK;

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** A leg by its angle from the hip joint (degrees, y up), its length fraction, its foot angle. */
type Polar = readonly [number, number, number];

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** The head's on-screen tilt: it counters the torso, the look stays on the opponent. */
  readonly look: number;
  readonly near: Foot | Polar;
  readonly far: Foot | Polar;
  readonly knees: { readonly near: Bend; readonly far: Bend };
  /** The rear hand open on (or reaching for) the floor; cocked by the ear when absent. */
  readonly palm?: readonly [number, number];
  /** The rear shoulder pushed up into the collar (the supporting arm's), 3 by default. */
  readonly shrug?: number;
  /** The lead fist. */
  readonly fist: readonly [number, number];
  readonly twist: number;
  readonly face?: Pose['face'];
  readonly effects?: readonly Effect[];
}

function key(k: Key): Pose {
  const body: Pose = {
    ...REST,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: k.look - k.torso,
    shrug: k.shrug ?? (k.palm ? 3 : (REST.shrug ?? 0)),
    farFist: at(k.fist[0], k.fist[1]),
    bends: {
      nearKnee: k.knees.near,
      farKnee: k.knees.far,
      nearElbow: k.palm ? 'back' : (REST.bends?.nearElbow ?? 'down'),
    },
    twist: k.twist,
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  const joints = solve(body, RIFF_BODY);
  const place = (spec: Foot | Polar, joint: Point): Foot => {
    if (!Array.isArray(spec)) return spec as Foot;
    const [degrees, fraction, angle] = spec as Polar;
    const r = (degrees * Math.PI) / 180;
    return {
      x: joint.x + Math.cos(r) * LEG * fraction,
      y: joint.y + Math.sin(r) * LEG * fraction,
      angle,
    };
  };
  const pose: Pose = {
    ...body,
    nearFoot: place(k.near, joints.near.hip),
    farFoot: place(k.far, joints.far.hip),
  };
  return k.palm ? { ...pose, nearFist: at(k.palm[0], k.palm[1]), nearHand: 'open' } : cocked(pose);
}

/** Where the rear hand is planted from frame 1 to frame 4: it never slides. */
const PALM = [-22, 3] as const;

const KEYS: readonly Key[] = [
  // 0: the sit-back: the rear knee chambers, the rear hand reaches back for its print.
  {
    hip: [-7.8, 12.6],
    torso: -12,
    look: 8,
    near: { x: -4, y: 10.5, angle: -60 },
    far: onBall(LEAD_TOE, -30),
    knees: { near: 'up', far: 'front' },
    palm: [-21.5, 11.5],
    shrug: 1,
    fist: [5, 29],
    twist: 0.45,
    effects: [smear(3, [-21, 5], [-14, 5], [-7, 8.5])],
  },
  // 1: down on the hand, the rear leg shot straight up, the lead leg swept out behind: the V.
  {
    hip: [-4.5, 13.5],
    torso: -56,
    look: 4,
    near: [95, 0.99, 115],
    far: [190, 0.97, 210],
    knees: { near: 'back', far: 'down' },
    palm: PALM,
    shrug: 1.5,
    fist: [-8, 32],
    twist: 0.6,
    effects: [smear(4, [-4.5, 12], [-5.5, 24], [-6.5, 34], [-7.5, 41.5]), dust(-21, 2.5, 0.1)],
  },
  // 2: the V turns over, wide open in the air; the shoulders sink, the chest turns.
  {
    hip: [-1, 12.6],
    torso: -70,
    look: 2,
    near: [42, 0.99, 62],
    far: [122, 0.97, 142],
    knees: { near: 'up', far: 'back' },
    palm: PALM,
    shrug: 1.5,
    fist: [-9, 34],
    twist: 0.05,
    effects: [smear(5, [-6, 44], [6, 46], [16, 40], [21, 33]), dust(-21, 2.5, 0.35)],
  },
  // 3: the sweep: the body slides forward over the planted hand, the chest turned away.
  {
    hip: [2, 11.8],
    torso: -74,
    look: 0,
    near: { x: 32.5, y: 5.5, angle: 25 },
    far: [85, 0.97, 105],
    knees: { near: 'up', far: 'back' },
    palm: PALM,
    shrug: 1,
    fist: [-7, 36],
    twist: -0.5,
    face: 'effort',
    effects: [
      smear(5, [14, 44], [26, 37], [31.5, 24], [34, 12], [35, 7]),
      { kind: 'flash', center: at(44.5, 6), radius: 4.5, tone: 'strike' },
      dust(38, 4, 0.15),
    ],
  },
  // 4: on round: the rear leg tucks under her, the lead leg comes down in front.
  {
    hip: [0.5, 13.5],
    torso: -60,
    look: 2,
    near: { x: -2, y: 9, angle: -45 },
    far: [14, 0.96, 34],
    knees: { near: 'back', far: 'up' },
    palm: PALM,
    shrug: 2,
    fist: [-7, 34],
    twist: -0.25,
    face: 'effort',
    effects: [smear(4, [6, 45], [17, 42], [25.5, 34], [30, 25.5]), dust(38, 4, 0.5)],
  },
  // 5: the lead foot lands, the rear knee tucks behind, the hand pushes off the floor.
  {
    hip: [-5.5, 13],
    torso: -20,
    look: 6,
    near: { x: -11, y: 9, angle: -20 },
    far: planted(GUARD.farFoot.x),
    knees: { near: 'up', far: 'front' },
    palm: [-18.5, 10],
    shrug: 1,
    fist: [2, 30],
    twist: 0.3,
    effects: [dust(38, 4, 0.85)],
  },
  // 6: up on her feet, a little higher than the crouch, the rear hand coming back up.
  {
    hip: [-6.5, 16.8],
    torso: 20,
    look: 9,
    near: onBall(TOE, -24),
    far: planted(GUARD.farFoot.x),
    knees: { near: 'back', far: 'front' },
    palm: [-14.5, 27],
    shrug: 2.6,
    fist: [8, 29],
    twist: 0.42,
  },
];

export const POSES: readonly Pose[] = [...KEYS.map(key), REST];
