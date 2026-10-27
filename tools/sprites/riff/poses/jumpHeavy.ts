import type { Point } from '../../raster.ts';
import { solve, type Bend, type Face } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, type Effect, type Pose } from './common.ts';
import { FALL } from './jump.ts';
import { legAt, sweep } from './jumpLight.ts';

export const ANIMATED: boolean = true;

/**
 * jumpHeavy (Talon sauté, docs/combat-v2.md §10.2, §11.3): 6 frames, 3, 3, 5, 3, 3, 3 ticks
 * (20), the chop on frame 2 (ticks 6-10), hitbox 2..32 / -4..18 (an overhead deep enough to
 * catch a crouching guard). The last frame (the jump's FALL) is held until she lands.
 *
 * Her ground Talon taken to the air: a flying axe kick, heel first. Nothing like Nayo's dive
 * (leaning back behind a straight leg): she raises the lead leg high in front of her face, the
 * sole to the sky, then chops it down through a wide arc to the front-bottom, the whole body
 * folding over it, the rear leg thrown long behind as a counterweight: one long diagonal from the
 * rear boot through the hips to the heel, the chest pitched in over the strike and the loaded
 * rear fist still cocked by the ear. The foot flexed, toes up: the heel and the lugged sole lead.
 *
 * - 0 (3 ticks): the chamber: the lead knee snaps up to the chest, the shoulders start back.
 * - 1 (3 ticks): the axe up, an aerial layout (nothing like the ground Talon's standing raise):
 *   the body laid 30 degrees back, the lead leg straight up past her face, the sole to the sky,
 *   the rear knee tucked up under her, the cocked arm out behind for balance; a trail along the
 *   swing up.
 * - 2 (5 ticks, active): the chop: the heel on the far edge of the hitbox, a trail along the arc
 *   it came down, the heavy spark (as her other heavies) on the heel; the jaw set (`effort`).
 * - 3 (3 ticks): the follow-through: the heel sinks on, the shape held through the impact.
 * - 4 (3 ticks): the lead knee folds back up under her, the shoulders come upright.
 * - 5 (3 ticks, held): the airborne guard (the jump's FALL).
 *
 * The head stays the source drawing (under 20 degrees on screen) and rides the torso: back on
 * the raise, pitched in on the chop, so the fringe whips forward with it.
 */

/** The guard's on-screen head tilt. */
const LOOK = GUARD.torso + GUARD.head;

interface Key {
  readonly hip: Point;
  readonly torso: number;
  /** The look on screen, in degrees chin down from the guard's. */
  readonly chin: number;
  readonly shrug: number;
  readonly twist: number;
  /** The lead (far) leg: angle from its hip joint, length to the ankle, the foot's angle. */
  readonly lead: readonly [number, number, number];
  /** The rear (near) ankle and the foot's angle. */
  readonly rear: readonly [number, number, number];
  readonly nearFist: Point;
  readonly farFist: Point;
  readonly face?: Face;
  readonly leadKnee?: Bend;
  readonly rearKnee?: Bend;
}

function key(k: Key): Pose {
  const lead = legAt(k.hip, k.torso, 'far', k.lead[0], k.lead[1]);
  return {
    ...FALL,
    hip: k.hip,
    torso: k.torso,
    head: LOOK + k.chin - k.torso,
    shrug: k.shrug,
    twist: k.twist,
    farFoot: { ...lead, angle: k.lead[2] },
    nearFoot: { x: k.rear[0], y: k.rear[1], angle: k.rear[2] },
    nearFist: k.nearFist,
    farFist: k.farFist,
    face: k.face ?? 'focus',
    bends: {
      nearKnee: k.rearKnee ?? 'front',
      farKnee: k.leadKnee ?? 'up',
      nearElbow: 'down',
      farElbow: 'down',
    },
  };
}

// 0 · The chamber (3 ticks).
const CHAMBER = key({
  hip: at(-4.5, 38.5),
  torso: -3,
  chin: 3,
  shrug: 2.2,
  twist: 0.4,
  lead: [-30, 12, -40],
  rear: [-11, 17, -55],
  nearFist: at(-15, 63),
  farFist: at(2, 50),
});

/** The raised leg's angle from its hip joint: straight up, a little toward the opponent. */
const RAISE_ANGLE = 80;

// 1 · The axe up (3 ticks), an aerial layout: the body laid far back, the lead leg straight up
// past the face, the sole to the sky, the rear knee tucked up under her.
const RAISE = key({
  hip: at(-4.5, 37.5),
  torso: -30,
  chin: -4,
  shrug: 2.6,
  twist: 0.55,
  lead: [RAISE_ANGLE, 31.5, 160],
  rear: [-6, 22, -50],
  nearFist: at(-31, 58),
  farFist: at(-6, 50),
});

// 2 · The chop (5 ticks, active).
const CHOP = key({
  hip: at(1, 36),
  torso: 24,
  chin: 8,
  shrug: 2.6,
  twist: 0.35,
  lead: [-54, 31.5, 36],
  rear: [-28.5, 41, -175],
  nearFist: at(-10, 62),
  farFist: at(-6, 42),
  face: 'effort',
  rearKnee: 'down',
});

// 3 · The follow-through (3 ticks).
const FOLLOW = key({
  hip: at(0.5, 35.5),
  torso: 22,
  chin: 8,
  shrug: 2.6,
  twist: 0.37,
  lead: [-58, 30.5, 30],
  rear: [-27.5, 37.5, -168],
  nearFist: at(-10, 61),
  farFist: at(-5, 42),
  face: 'effort',
  rearKnee: 'down',
});

// 4 · The knee folds back (3 ticks).
const RECOIL = key({
  hip: at(-3, 37),
  torso: 10,
  chin: 3,
  shrug: 2.3,
  twist: 0.42,
  lead: [-40, 22, -20],
  rear: [-14, 12, -45],
  nearFist: at(-13, 61),
  farFist: at(3, 49),
  rearKnee: 'back',
});

/**
 * The heavy spark (vfx.ts: radius 4.5 and up, the jagged star with its arcs) where the heel
 * lands: on the underside of the sole, just in front of its back corner.
 */
const HEEL = solve(CHOP, RIFF_BODY).far.heel;
const SPARK: Effect = {
  kind: 'flash',
  center: at(HEEL.x + 4.7, HEEL.y - 0.2),
  radius: 5,
  tone: 'strike',
};

const fx = (pose: Pose, ...effects: Effect[]): Pose => ({ ...pose, effects });

export const POSES: readonly Pose[] = [
  CHAMBER,
  fx(RAISE, sweep(RAISE.hip, RAISE.torso, 'far', 8, RAISE_ANGLE - 2, 33, 3)),
  fx(CHOP, sweep(CHOP.hip, CHOP.torso, 'far', 15, -52, 30.5, 3), SPARK),
  FOLLOW,
  RECOIL,
  FALL,
];
