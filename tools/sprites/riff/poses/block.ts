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
 * Her guard, shut: the loaded rear fist drops out of its cock and the forearm comes up as a bar,
 * the lead forearm rises across the ribs with the glove up under the chin, the rear shoulder
 * shrugs into the popped collar and the chin sinks behind it, the body hunched in over the
 * knees. On contact the whole shell is driven back into her: the chest snaps back, the hips give
 * a step's worth, the rear heel slams down to brace, the lead toes peel up, the jaw sets.
 *
 * Standing, two covers (STANDING_COVER at the end of the file):
 * - the full shell (`shell`): the rear forearm a vertical bar in front of the jaw, the glove at the
 *   cheek, the elbow down in front of the ribs; the lead forearm upright before the chest. The
 *   impact is that shell driven back, nothing like the guard: it needs the test that wants the
 *   strip's first frame within 3.5 px of the guard (tests/tools/riff-sprites.test.ts,
 *   FROM_GUARD) to measure the block's impact against its own hold instead, since the
 *   proximity guard (the hold) is what a block lands on.
 * - the tight guard (`tight`, while that test stands): the impact stays within 3.5 px of the guard
 *   on every measured joint, so the hold cannot stray much further without the impact popping
 *   open from it. The cocked fist pulls in tight against the ear (the head ducking back into it,
 *   an earmuff), the lead forearm stands upright before the chest, the glove under the chin
 *   (the wrist rises, the elbow drops under it), the shoulders up, the chin down.
 *
 * Crouching, the full shell always (nothing ties it to the crouch): the rear forearm up before
 * the face, the lead forearm across the top of the lead knee and the chest, the chest folded
 * deeper over the knees, the shoulders up. Its impact rocks the chest back 8 degrees, the hips a
 * couple of pixels back and down, the rear heel down.
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

// Standing: the full shell -------------------------------------------------------------------

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
  at(0.6, -4.6),
  at(5, -12.6),
);

/** Contact: the shell driven back, the chest snapped back, the rear heel slammed down. */
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
  at(-0.4, -4.8),
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
  at(0.2, -4.4),
  at(4.6, -12.4),
);

// Standing: the tight guard ------------------------------------------------------------------

/** Held: the cocked fist tight against the ear, the lead forearm upright before the chest. */
const TIGHT: Pose = {
  ...stance(GUARD, {
    hip: at(-7.6, 31.2),
    torso: 21,
    look: 12,
    shrug: 5,
    twist: 0.25,
    heel: -12,
    lead: -1.5,
  }),
  nearFist: at(-6.6, 59.4),
  farFist: at(9, 49.6),
};

/** Contact: the tight guard driven back, within 3.5 px of her guard. */
const TIGHT_IMPACT: Pose = {
  ...stance(GUARD, {
    hip: at(-8.6, 31),
    torso: 16.5,
    look: 11,
    shrug: 5.2,
    twist: 0.3,
    heel: -2,
    tap: 8,
    lead: -1.5,
    face: 'effort',
  }),
  nearFist: at(-8.8, 58.8),
  farFist: at(8.3, 49.2),
};

const TIGHT_RECOIL: Pose = {
  ...stance(GUARD, {
    hip: at(-7.6, 31.6),
    torso: 21.5,
    look: 12,
    shrug: 5.4,
    twist: 0.22,
    heel: -16,
    tap: 2,
    lead: -1.5,
    face: 'effort',
    effects: [scuff(14, 2.4, 0.55), scuff(-20, 1.8, 0.5)],
  }),
  nearFist: at(-6.2, 60),
  farFist: at(9.2, 50.2),
};

// Crouching: the crouching shell -------------------------------------------------------------

const LOW_HEEL = CROUCH.nearFoot.angle ?? 0;

/** Held: folded deeper over the knees, the rear forearm before the face, the lead one on a knee. */
const LOW_SHELL: Pose = aroundHead(
  stance(CROUCH, {
    hip: at(-10.4, 12.9),
    torso: 30.5,
    look: 14,
    shrug: 5.6,
    twist: 0.22,
    heel: LOW_HEEL,
    lead: -1.5,
  }),
  at(-1.7, -3.8),
  at(3.8, -12),
);

/** Contact: the chest rocked back 8 degrees, the hips back and down, the rear heel down. */
const LOW_IMPACT: Pose = aroundHead(
  stance(CROUCH, {
    hip: at(-12.4, 12.1),
    torso: 22.5,
    look: 12,
    shrug: 6,
    twist: 0.3,
    heel: LOW_HEEL + 12,
    tap: 7,
    lead: -1.5,
    face: 'effort',
  }),
  at(-2.4, -4),
  at(3.2, -12.4),
);

const LOW_RECOIL: Pose = aroundHead(
  stance(CROUCH, {
    hip: at(-10.6, 13.3),
    torso: 31.2,
    look: 14,
    shrug: 6,
    twist: 0.18,
    heel: LOW_HEEL - 4,
    tap: 2,
    lead: -1.5,
    face: 'effort',
    effects: [scuff(14, 2.4, 0.55), scuff(-20, 1.8, 0.5)],
  }),
  at(-1.4, -4.2),
  at(3.8, -11.6),
);

/** The two standing covers: impact, rebound, hold (see above). */
const STANDING = {
  shell: [SHELL_IMPACT, SHELL_RECOIL, SHELL],
  tight: [TIGHT_IMPACT, TIGHT_RECOIL, TIGHT],
} as const;

/**
 * The standing cover she plays: `tight` while the guard test measures the block's impact from
 * the guard, `shell` once it measures it from the hold (see above).
 */
const STANDING_COVER: keyof typeof STANDING = 'tight';

export const POSES: readonly Pose[] = [
  ...STANDING[STANDING_COVER],
  LOW_IMPACT,
  LOW_RECOIL,
  LOW_SHELL,
];
