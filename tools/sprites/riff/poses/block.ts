import type { Point } from '../../raster.ts';
import { solve, type Face } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, onHeel, toeOf, type Effect, type Pose } from './common.ts';
import { CROUCH } from './crouch.ts';

export const ANIMATED: boolean = true;

/**
 * block: 6 frames. Standing 0-2 (2, 3 ticks, then held while the blockstun lasts), crouching 3-5
 * (the same). The last frame of each is also her proximity guard (§3.6), held before anything
 * lands: it must read « she covers » at 1x. The first is the impact: the cover rocked back by the
 * blow, held through the hitstop; the second springs back a hair past the cover.
 *
 * Her guard, shut: the rear fist rises from under the chin and the forearm comes up as a bar,
 * the lead forearm rises across the ribs with the glove up under the chin, the rear shoulder
 * shrugs into the popped collar and the chin sinks behind it, the body hunched in over the
 * knees. On contact the whole shell is driven back into her: the chest snaps back, the hips give
 * a step's worth, the rear foot braces on its ball, the lead toes peel up, the jaw sets.
 *
 * Standing, the full shell: the rear forearm a vertical bar in front of the neck, the glove on
 * the jaw, the elbow down in front of the ribs; the lead forearm upright before the chest. The
 * impact is that shell driven back, 8.6 px from its hold by design: a block lands on the
 * proximity guard (the hold, the last frame), not on her open guard, which the strip leaves at
 * once (tests/tools/riff-sprites.test.ts does not ask its first frame to start from the guard).
 *
 * Crouching, the same shell on the crouch's legs (the rear knee forward and low, floating over
 * the floor, the rear boot on its ball): the rear forearm up before the jaw, the lead forearm
 * across the chest over the lead knee, the chest folded deeper over the knees, the shoulders up.
 * Its impact rocks the chest back 8 degrees and drives the hips back over the rear foot, the
 * rear knee lifting with them and the heel easing down; never lower, or the knee would touch
 * the floor.
 *
 * The rear glove keeps clear of the face's middle: its wrist about 9 px under the head's center
 * and 2 in front, the glove over the chin and the jaw, the knuckles at the corner of the mouth,
 * the eye and the nose in view, its elbow open enough not to crush the biceps (147 degrees at
 * most). Seen three quarters, that glove is the back of a black fist: 4.5 px under the head's
 * center, it covered the eye, the nose and the mouth at once and read as a mask or a gag, not a
 * cover (the face of Riff is compact: the eye 2 px under the center, the mouth 4, the chin 5.5).
 *
 * The face is the source drawing (the head under 20 degrees on screen), its look a hair more
 * chin-down than the guard's; effort on the impact and the rebound. Everything stays inside her
 * box: at point blank the fighters touch, never clinch.
 */

/** Dust where the feet scrape back: an already spreading puff. */
function scuff(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

/** `body` with its fists placed from its head (world px): a cover is built around the face. */
function aroundHead(body: Body, near: Point, far: Point): Pose {
  const { head } = solve({ ...body, nearFist: body.hip, farFist: body.hip }, RIFF_BODY);
  return {
    ...body,
    nearFist: at(head.x + near.x, head.y + near.y),
    farFist: at(head.x + far.x, head.y + far.y),
  };
}

interface Cover {
  readonly hip: Point;
  readonly torso: number;
  /** The head's angle on screen (the guard's: 9). */
  readonly look: number;
  readonly shrug: number;
  readonly twist: number;
  /** The rear heel on its ball (degrees, negative: up). */
  readonly heel: number;
  /** The lead toes rocked up on the heel (degrees). */
  readonly tap?: number;
  /** The lead shoulder drawn back (negative) or reaching (positive), px. */
  readonly lead?: number;
  readonly face?: Face;
  readonly effects?: readonly Effect[];
}

/** A cover's body on the feet of `base` (guard or crouch): the rear foot pivots on its ball. */
function stance(base: Pose, c: Cover): Body {
  return {
    ...base,
    hip: c.hip,
    torso: c.torso,
    head: c.look - c.torso,
    shrug: c.shrug,
    twist: c.twist,
    reach: { far: c.lead ?? 0 },
    nearFoot: onBall(toeOf(base.nearFoot), c.heel),
    farFoot: c.tap ? onHeel(base.farFoot, c.tap) : base.farFoot,
    bends: { ...base.bends, nearElbow: 'down', farElbow: 'down' },
    face: c.face ?? 'focus',
    effects: c.effects ?? [],
  };
}

// Standing: the shell -------------------------------------------------------------------

/** The shell held: hunched in, the rear forearm before the jaw, the lead one before the chest. */
const SHELL: Pose = aroundHead(
  stance(GUARD, {
    hip: at(-8.4, 31),
    torso: 23,
    look: 13,
    shrug: 5,
    twist: 0.2,
    heel: -12,
    lead: -1.5,
  }),
  at(2.2, -9),
  at(5, -12.6),
);

/** Contact: the shell driven back, the chest snapped back, the rear foot braced on its ball. */
const SHELL_IMPACT: Pose = aroundHead(
  stance(GUARD, {
    hip: at(-10.6, 30.6),
    torso: 13,
    look: 11,
    shrug: 5.4,
    twist: 0.28,
    heel: -2,
    tap: 8,
    lead: -1.5,
    face: 'effort',
  }),
  at(2, -8.6),
  at(6.2, -13),
);

/** The rebound, a pixel past the hold: the hips lead, the fists a beat behind. */
const SHELL_RECOIL: Pose = aroundHead(
  stance(GUARD, {
    hip: at(-8.6, 31.6),
    torso: 23.2,
    look: 13,
    shrug: 5.4,
    twist: 0.16,
    heel: -16,
    tap: 2,
    lead: -1.5,
    face: 'effort',
    effects: [scuff(14, 2.4, 0.55), scuff(-20, 1.8, 0.5)],
  }),
  at(2, -8.8),
  at(4.6, -12.4),
);

// Crouching: the crouching shell -------------------------------------------------------------

/** The crouch's rear heel: high on its ball, its knee floating forward over the floor. */
const LOW_HEEL = CROUCH.nearFoot.angle ?? 0;

/**
 * Held: folded deeper over the lead knee, the rear forearm upright before the neck (the glove on
 * the jaw, the elbow down before the ribs), the lead forearm across the chest over the knee.
 */
const LOW_SHELL: Pose = aroundHead(
  stance(CROUCH, {
    hip: at(-14.2, 17.2),
    torso: 38.5,
    look: 14,
    shrug: 5.6,
    twist: 0.22,
    heel: LOW_HEEL - 1,
    lead: -1.5,
  }),
  at(2.2, -9),
  at(4.2, -12.4),
);

/**
 * Contact: the chest rocked back 8 degrees and the hips driven back over the rear foot, the
 * rear knee coming up off the floor with them, the heel easing down; the lead toes peel up.
 */
const LOW_IMPACT: Pose = aroundHead(
  stance(CROUCH, {
    hip: at(-15, 17.4),
    torso: 31,
    look: 12,
    shrug: 6,
    twist: 0.3,
    heel: LOW_HEEL + 4,
    tap: 7,
    lead: -1.5,
    face: 'effort',
  }),
  at(1.8, -9),
  at(3.6, -12.8),
);

/** The rebound, a pixel past the hold: the hips lead, the fists a beat behind. */
const LOW_RECOIL: Pose = aroundHead(
  stance(CROUCH, {
    hip: at(-14.3, 17.1),
    torso: 39,
    look: 14,
    shrug: 6,
    twist: 0.18,
    heel: LOW_HEEL - 2,
    tap: 2,
    lead: -1.5,
    face: 'effort',
    effects: [scuff(14, 2.4, 0.55), scuff(-20, 1.8, 0.5)],
  }),
  at(2.2, -8.8),
  at(4.4, -12),
);

export const POSES: readonly Pose[] = [
  SHELL_IMPACT,
  SHELL_RECOIL,
  SHELL,
  LOW_IMPACT,
  LOW_RECOIL,
  LOW_SHELL,
];
