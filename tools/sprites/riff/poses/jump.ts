import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import {
  at,
  GUARD,
  lifted,
  onBall,
  planted,
  toeOf,
  type Effect,
  type Foot,
  type Pose,
} from './common.ts';

export const ANIMATED: boolean = true;

/**
 * jump: 6 frames. Frame 0 is the pre-jump (3 ticks); frames 1-4 the air (6, 7, 7, 8 ticks, the
 * last held until she lands); frame 5 the landing (2 ticks). The back jump plays it too, so it
 * carries no forward momentum; the forward jump flips (jumpForward.ts) and comes down through the
 * same FALL. Her jump is low and quick: it snaps.
 *
 * Load, stretch, hitch, reach, squash, from the guard back to the guard: the hips dip into the
 * plié as deep as the guard allows and the fists swing down, the floor puffing under the feet;
 * she leaves it on one line of action, the rear leg the long push with the toes pointed, the lead
 * knee already driving, the chest up, the fists thrown up; at the top she hitches, cocky, the lead
 * knee pulled up to the chest and the rear leg folded back under her (a hurdler's tuck, not a
 * cannonball); then both legs open for the floor, the lead foot reaching, the rear leg long and
 * straight behind, and the landing absorbs into the knees with the feet on the guard's spots and
 * dust puffing out. The guard never breaks for long: the rear fist stays loaded by the ear, the
 * lead fist comes up to the chin in the air.
 *
 * In the air her hips ride 36 to 39 px over her feet, the knees bent (the game lifts her): the
 * drawing stays as close as it can to her air boxes.
 */

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

/** The shoulders of `body` (they do not depend on the hands). */
function shouldersOf(body: Body): { near: Point; far: Point } {
  const s = solve({ ...body, nearFist: body.hip, farFist: body.hip }, RIFF_BODY);
  return { near: s.near.shoulder, far: s.far.shoulder };
}

const GUARD_SHOULDERS = shouldersOf(GUARD);
/** Where the guard holds the fists from their shoulders: the rear cocked, the lead low. */
const COCKED = at(
  GUARD.nearFist.x - GUARD_SHOULDERS.near.x,
  GUARD.nearFist.y - GUARD_SHOULDERS.near.y,
);
const LEAD = at(GUARD.farFist.x - GUARD_SHOULDERS.far.x, GUARD.farFist.y - GUARD_SHOULDERS.far.y);

/**
 * The guard's fists on the shoulders of `body`, moved by `near` and `far` (world px): wherever
 * the body goes, the rear fist stays cocked by the ear and the lead fist where the guard holds it.
 */
export function guarded(body: Body, near: Point = at(0, 0), far: Point = at(0, 0)): Pose {
  const { near: n, far: f } = shouldersOf(body);
  return {
    ...body,
    nearFist: at(n.x + COCKED.x + near.x, n.y + COCKED.y + near.y),
    farFist: at(f.x + LEAD.x + far.x, f.y + LEAD.y + far.y),
  };
}

/** A foot in the air, its lowest point `clearance` px over the cell's floor. */
function air(x: number, clearance: number, angle: number): Foot {
  return lifted(planted(x, angle), clearance);
}

/** The guard's head angle on screen (the face is the drawing under 20 degrees). */
const HEAD = GUARD.torso + GUARD.head;
const TOE = toeOf(GUARD.nearFoot);

/** Dust puffing out from under a foot that pushes off or lands, `progress` from 0 (just born). */
function puff(x: number, size: number, progress = 0.25): Effect {
  return { kind: 'dust', x, size, progress };
}

// 0 · Load (pre-jump): the hips dip into the plié and sit back, the chest folds over the lead
// knee, the rear heel rises on its ball; the fists swing down. The feet do not move, the floor
// puffs under them as they drive. As deep as the guard allows (a jump starts from it: every joint
// within 3.5 px of the guard's).
const LOAD: Pose = {
  ...GUARD,
  hip: at(-7.2, 29),
  torso: 21,
  head: HEAD + 1 - 21,
  shrug: 2.6,
  nearFoot: onBall(TOE, -28),
  nearFist: at(GUARD.nearFist.x + 0.6, GUARD.nearFist.y - 1.6),
  farFist: at(GUARD.farFist.x - 0.4, GUARD.farFist.y - 2.2),
  effects: [puff(-15, 3, 0.1), puff(10, 3.4, 0.1)],
};

// 1 · Takeoff: one line of action from the rear toes to the crown. The rear leg the long push,
// the toes pointed; the lead knee already driving up; the chest up, the fists thrown up.
const RISE: Pose = guarded(
  {
    ...GUARD,
    hip: at(-4.6, 38.6),
    torso: 5,
    head: HEAD - 5,
    shrug: 1.4,
    twist: 0.52,
    nearFoot: { x: -18, y: 10.4, angle: -70 },
    farFoot: { x: 0.4, y: 12, angle: -52 },
    bends: { nearKnee: 'front' },
  },
  at(1.4, 4.6),
  at(1, 5),
);

// 2 · Gathering: the lead knee comes up, the rear heel kicks back under her.
const GATHER: Pose = guarded(
  {
    ...GUARD,
    hip: at(-4.4, 37.6),
    torso: 11,
    head: HEAD - 11,
    shrug: 2,
    twist: 0.48,
    nearFoot: air(-15, 8, -70),
    farFoot: air(4, 12, -48),
    bends: { nearKnee: 'down' },
  },
  at(0.8, 2.4),
  at(0.4, 3),
);

// 3 · The top, the hitch: the lead knee high at the chest, the rear leg folded back under her, the
// chest over the knee, the cocked fist up, the lead fist at the chin.
const HITCH: Pose = guarded(
  {
    ...GUARD,
    hip: at(-4, 36.6),
    torso: 15,
    head: HEAD - 15,
    shrug: 2.4,
    twist: 0.44,
    nearFoot: air(-16.5, 13, -80),
    farFoot: air(5.5, 17, -40),
    bends: { nearKnee: 'down' },
  },
  at(0.4, 0.6),
  at(0, 1.4),
);

/**
 * 4 · Fall (held until she lands): the legs open for the floor, the lead foot reaching down and
 * nearly flat, the knee soft; the rear leg long and straight behind her, the toes pointed (so its
 * knee turns out for the landing's plié without a pop, from any air frame); the lead fist back
 * to its place. Also the last frame of the forward flip, and the air attacks' airborne guard.
 */
export const FALL: Pose = guarded(
  {
    ...GUARD,
    hip: at(-5.6, 36.6),
    torso: 15,
    head: HEAD - 15,
    shrug: 2,
    twist: 0.46,
    nearFoot: { x: -22.2, y: 9, angle: -44 },
    farFoot: air(4.5, 1.6, -8),
  },
  at(0.2, 0.2),
  at(-0.2, 0.4),
);

// 5 · Landing: the squash, the feet on the guard's spots, the knees absorbing, the chest over
// them, the fists still sinking with the weight; dust out on both sides. It springs back into
// the guard.
export const LANDING: Pose = {
  ...guarded(
    {
      ...GUARD,
      hip: at(-7.2, 29),
      torso: 21,
      head: HEAD + 1 - 21,
      shrug: 2.6,
      nearFoot: onBall(TOE, -18),
      farFoot: GUARD.farFoot,
    },
    at(0.4, -2),
    at(-0.4, -2.2),
  ),
  effects: [puff(14, 4.5), puff(-22, 4)],
};

export const POSES: readonly Pose[] = [LOAD, RISE, GATHER, HITCH, FALL, LANDING];
