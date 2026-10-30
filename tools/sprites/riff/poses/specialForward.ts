import type { Point } from '../../raster.ts';
import { solve, type Effect, type Foot } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, onHeel, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * specialForward (Saut de l'ange, docs/combat-v2.md §5.5, §10.2, §11.3): 9 frames, 3, 3, 3, 3,
 * 4, 4, 4, 5, 5 ticks (34), the heels land on frame 5 (ticks 16-19), hitbox 0..30 / 16..56, an
 * overhead. The game lifts her off the floor from tick 3 to tick 19 (an arc topping at 34 px on
 * tick 11) and carries her 35 px forward: the poses stay over her feet, the height comes from the
 * engine. In the air she is on frames 1-5 (frame 1 already 6 to 17 px up); frames 0 and 6-8 are
 * on the floor, so the floor's dust and rings only go there (the front effects are drawn with
 * her, at her height: on frame 1 they would float under her boots).
 *
 * A corkscrew that opens into an angel and comes down heels first. Out of a quick coil she
 * springs straight up, wrapping her arms across to wind the spin; at the climb she is a tight
 * corkscrew, arms crossed on her chest, legs crossed and long, turned away, a magenta spiral
 * wound round her; at the top the spin opens: the arms fling out wide like wings, the chest to
 * the sky, the legs piking up in front of her (the angel). Falling, she jackknifes: the heels
 * rise over the opponent's head and her hands reach up for them (the gather before the blow);
 * then the blade drops: a two-heel stomp from above, the body pitched forward over the legs,
 * the chin down, both fists slammed down by her hips, the legs driven steeply down into the
 * hitbox. She lands wide and heavy straight into her plié and rises into the guard. Nothing like
 * her front flip (tucked, rolling over) nor her Talon (one leg, standing), nor Nayo's Pied fendu
 * (a flying side kick leaning back): two heels coming down from above, no somersault.
 *
 * - 0 (3 ticks): the coil: the hips dip, the rear heel pops, the rear fist lags under the chin;
 *   dust off both boots and a small ring squashed on the floor (the push-off, the last ticks on
 *   it).
 * - 1 (3 ticks): the takeoff: long, the rear knee driving up (a short trail under it), the rear
 *   fist wrapping across in front, the lead arm swung back to wind the spin.
 * - 2 (3 ticks): the corkscrew: turned away (`twist`), both fists hugged in to the chest, the
 *   elbows down at her sides, the spiral round her.
 * - 3 (3 ticks): the angel at the top: the arms open on a diagonal, the lead one flung up ahead
 *   of her, the rear one swept back and down (a shoulder goes no farther behind the chest), the
 *   legs piked in front, the boots flexed, the end of the spiral swinging round under her hips.
 * - 4 (4 ticks): the jackknife: the heels raised over the opponent's head, the knees soft and
 *   bending the way knees bend, the hands reaching for the shins; the legs' trail rising.
 * - 5 (4 ticks, active): the stomp: the legs 30 degrees off straight down, the heels together,
 *   the trail arcing over and down into the hitbox, a silver spark and diamonds at the heels;
 *   the line of action runs from the shoulders down the body to the heels; the jaw set.
 * - 6 (4 ticks): the touchdown, wide and low: the lead foot down, its toes a hair up, the rear
 *   foot landing high on its ball on its guard mark, the rear knee driven forward and down
 *   under her, floating over the floor (her crouch's sprinter's set: both knees bend toward the
 *   toes), the rear fist snapping back up toward the chin, the lead hand open low in front; dust
 *   off both boots and a flat ring.
 * - 7 (5 ticks): she rises, the feet fixed (the lead toes down, the rear heel pivoting on the
 *   ball), the fists coming back; the fringe and the chain fall.
 * - 8 (5 ticks): the guard, settling.
 *
 * The body never turns past 40 degrees: the head stays the source drawing (under stamp.ts's 20
 * degrees on screen) the whole way, chin down over the heels on the stomp. In the air the boots
 * point no more than 35 degrees off square to the shin (a combat boot), and the legs, long as
 * they are, keep a soft knee that bends the way knees bend.
 */

const TOE = toeOf(GUARD.nearFoot);
/** The guard's head angle on screen. */
const LOOK = GUARD.torso + GUARD.head;
const LEG = RIFF_BODY.thigh + RIFF_BODY.shin;

/** Where the rear fist sits from the rear shoulder in the guard: under the chin. */
const TUCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** The rear fist home under the chin, carried by its shoulder, nudged by (dx, dy). */
function tucked(pose: Pose, dx = 0, dy = 0): Pose {
  const shoulder = solve(pose, RIFF_BODY).near.shoulder;
  return { ...pose, nearFist: at(shoulder.x + TUCKED.x + dx, shoulder.y + TUCKED.y + dy) };
}

/** A leg by its angle from straight down (toward the front), its length fraction, its foot. */
type Leg = readonly [degrees: number, fraction: number, angle: number];

function legFrom(pose: Pose, side: 'near' | 'far', [degrees, fraction, angle]: Leg): Foot {
  const joint = solve(pose, RIFF_BODY)[side].hip;
  const r = (degrees * Math.PI) / 180;
  return {
    x: joint.x + Math.sin(r) * LEG * fraction,
    y: joint.y - Math.cos(r) * LEG * fraction,
    angle,
  };
}

/** The legs of `pose` placed from its hip joints. */
function legs(pose: Pose, near: Leg, far: Leg): Pose {
  return { ...pose, nearFoot: legFrom(pose, 'near', near), farFoot: legFrom(pose, 'far', far) };
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** A magenta ring squashed flat on the floor: the landing's shockwave. */
const ring = (center: Point, radius: number, progress: number, squash: number): Effect => ({
  kind: 'ring',
  center,
  radius,
  progress,
  tone: 'sound',
  squash,
});

/** A trail wound round the body from `from` (y) up to `to` and back down to `end`. */
function spiral(x: number, from: number, to: number, end: Point): Effect {
  const points: [number, number][] = [];
  const turns = 5;
  for (let k = 0; k < turns; k++) {
    const t = k / (turns - 1);
    points.push([x + (k % 2 === 0 ? -9 : 9) * (0.7 + 0.3 * t), from + (to - from) * t]);
  }
  return smear(3, ...points, [end.x, end.y]);
}

// 0 · The coil (3 ticks).
const COIL: Pose = tucked(
  {
    ...GUARD,
    hip: at(-6.5, 30.2),
    torso: 21,
    head: LOOK - 21,
    shrug: 2.6,
    nearFoot: onBall(TOE, -22),
    farFist: at(9.2, 44),
    effects: [dust(9, 4, 0.12), dust(-18, 3.5, 0.12), ring(at(-4, 1.5), 14, 0.08, 0.3)],
  },
  0.2,
  0.4,
);

// 1 · The takeoff (3 ticks).
const LAUNCH: Pose = {
  ...legs(
    {
      ...GUARD,
      hip: at(-3, 43),
      torso: 6,
      head: LOOK - 6,
      shrug: 2.6,
      twist: 0.2,
      nearFist: at(6, 58),
      farFist: at(-12.8, 48.5),
      bends: { nearElbow: 'down', farElbow: 'up', nearKnee: 'front' },
    },
    [34, 0.74, -45],
    [-10, 0.99, -52],
  ),
  effects: [smear(3, [5, 22], [8.5, 30], [11, 38])],
};

// 2 · The corkscrew (3 ticks).
const CORK: Pose = {
  ...legs(
    {
      ...GUARD,
      hip: at(-1, 45),
      torso: -10,
      head: LOOK + 10,
      shrug: 3,
      twist: -0.9,
      nearFist: at(2, 58),
      farFist: at(5, 57),
      bends: { nearElbow: 'down', farElbow: 'back' },
    },
    [8, 0.99, -33],
    [-2, 0.99, -43],
  ),
  effects: [spiral(-2, 14, 70, at(5, 14))],
};

// 3 · The angel at the top (3 ticks).
const ANGEL: Pose = {
  ...legs(
    {
      ...GUARD,
      hip: at(-2, 42),
      torso: -18,
      head: LOOK - 14 + 18,
      shrug: 1.4,
      twist: 0.85,
      nearFist: at(-24, 42.3),
      nearHand: 'open',
      farFist: at(9.5, 79),
      farHand: 'open',
      bends: { nearElbow: 'up', farElbow: 'down' },
    },
    [80, 0.99, 40],
    [84, 0.99, 45],
  ),
  effects: [smear(3, [-14, 40], [-4, 30], [10, 30], [18, 38])],
};

// 4 · The jackknife (4 ticks): the heels raised over the opponent's head, the hands reaching
// for them.
const JACKKNIFE: Pose = {
  ...legs(
    {
      ...GUARD,
      hip: at(-3, 38),
      torso: -22,
      head: LOOK - 2 + 22,
      shrug: 2.6,
      twist: 0.6,
      nearFist: at(4, 60),
      nearHand: 'open',
      farFist: at(10, 63),
      farHand: 'open',
      bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'up', farKnee: 'up' },
    },
    [148, 0.99, 125],
    [152, 0.99, 128],
  ),
  effects: [smear(4, [30, 38], [30, 50], [24, 62], [15, 68])],
};

// 5 · The stomp (4 ticks, active): pitched over the legs, the chin down, both fists slammed
// down by the hips, the legs driven steeply down, the heels together.
const CHOP: Pose = {
  ...legs(
    {
      ...GUARD,
      hip: at(1.5, 45),
      torso: 12,
      head: LOOK + 6 - 12,
      shrug: 3.2,
      twist: 0.35,
      nearFist: at(-10, 51.5),
      farFist: at(17, 50),
      bends: { nearElbow: 'back', farElbow: 'back' },
      face: 'effort',
    },
    [30, 0.99, 30],
    [33, 0.99, 30],
  ),
  effects: [
    smear(4, [5, 72], [13, 67], [17, 50], [18, 28]),
    { kind: 'flash', center: at(24, 20), radius: 5, tone: 'strike' },
    { kind: 'shards', center: at(23, 20), radius: 8, progress: 0.25, tone: 'strike' },
  ],
};

// 6 · The touchdown (4 ticks): wide and heavy, straight into the plié, the lead heel down with
// its toes coming down, the rear foot landing on its ball on its mark.
const TOUCHDOWN: Pose = tucked(
  {
    ...GUARD,
    hip: at(-7, 26),
    torso: 26,
    head: LOOK - 26,
    shrug: 2.8,
    twist: 0.5,
    nearFoot: onBall(TOE, -56),
    farFoot: onHeel(GUARD.farFoot, 4),
    farFist: at(14, 26),
    farHand: 'open',
    bends: { nearKnee: 'front', farKnee: 'front' },
    effects: [dust(10, 4.5, 0.2), dust(-18, 4, 0.2), ring(at(-4, 2), 20, 0.2, 0.3)],
  },
  -2,
  -5,
);

// 7 · Rising out of the plié, the feet fixed (5 ticks).
const STEP: Pose = tucked(
  {
    ...GUARD,
    hip: at(-6.2, 29.5),
    torso: 22,
    head: LOOK - 22,
    shrug: 2.8,
    nearFoot: onBall(TOE, -20),
    farFist: at(10, 42),
    effects: [dust(10, 4.5, 0.6), dust(-18, 4, 0.6), ring(at(-4, 2), 26, 0.6, 0.3)],
  },
  0.5,
  -2,
);

// 8 · The guard, settling (5 ticks).
const SETTLE: Pose = tucked(
  {
    ...GUARD,
    hip: at(-6.8, 31.2),
    torso: 20,
    head: LOOK - 20,
    nearFoot: onBall(TOE, -14),
  },
  0.3,
  0.6,
);

export const POSES: readonly Pose[] = [
  COIL,
  LAUNCH,
  CORK,
  ANGEL,
  JACKKNIFE,
  CHOP,
  TOUCHDOWN,
  STEP,
  SETTLE,
];
