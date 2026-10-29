import { BODY } from '../../skeleton.ts';
import { POSES as REMONTANT } from './backHeavy.ts';
import { at, GUARD, planted, type Effect, type Foot, type Pose } from './common.ts';
import { POSES as INTRO } from './intro.ts';
import { POSES as UPPERCUT } from './specialAntiAir.ts';

/** Drawn: the tests (tests/tools/nayo-v2-sprites.test.ts) check the strip. */
export const ANIMATED: boolean = true;

/**
 * super (Mégabasse, ← + BOOST, 3 bars; docs/combos-v3.md §2.2, §5 row 3): 10 strip frames, the
 * clip plays 12 entries (tools/sprites/nayo/pending-timing.ts): s0 1, s1 1, s2 [3], s3 [3], s2
 * [3], s3 [3], s4 [3], s5 6, s6 7, s7 7, s8 5, s9 5 ticks (47: 2/15/30), three blows on action
 * frames 2, 8 and 14 (s2, s2 again, s4), after a 20-tick freeze flash on action frame 0 (s0
 * holds it). Hitbox x 4..60 / y 0..90, from the floor to above a jump: the speaker rings of the
 * front effects fill it (its reach test measures the effects, forward and up, on s2, s3 and s4).
 * On the spot, back to the GUARD.
 *
 * The DJ drops the bass with his fist. Standing in his guard's stance, he presses the
 * headphones (the cue, held through the flash, the floor lighting up platine under him), drops
 * into the Uppercut's coil with that fist still cocked up by his ear, and hammers it straight
 * down into the floor, three times: BOUM, BOUM, BOUUUM. Down on the rear knee, the hips at the
 * bottom, the chest pitched over the lead knee and the head up on the opponent; one line from
 * the rear fist, flung up and back as the counterweight, through the shoulders and down the
 * lead arm to the floor. Between the blows the fist rebounds to knee height and the rear arm
 * pumps down against it. Each blow gives birth to a speaker ring of platine at the fist, a thick
 * white-hot ")" that rolls out and thins over the opponent, the older one at the hitbox's edge
 * at once (concentric ")" arcs standing on the floor); the 3rd blow drops him lower, throws the
 * three ")))" at once, the outer one white-hot, and cracks the floor. Under the fist, the
 * speaker's own shock in his color (cyan, magenta in the second colorway) ripples on the floor.
 * Then he springs up out of the kneel (the lead glove snapping back to the chin, the rear arm
 * swinging up behind him, the chest opening; the rings fading out over the opponent), punches
 * the rear fist to the sky from his guard's stance (not victory's pose: he is still in the
 * fight), brings it back down behind his head and into the guard (the Remontant's settle).
 *
 * The Boost look: the rings, sparks, speed lines and the crack in `tone: 'platine'`
 * (incandescent white, a dark rim, never gold; ../../vfx.ts), the same in both colorways. The
 * rings' sizes are tuned to the pixel: their seeded sparkles stay within the reach test's 4 px
 * past the hitbox's top, and each ring's small break falls under the floor (out of sight).
 *
 * Faces: cool on the cue, effort on the first two blows, kiai only on the third, focus rising,
 * cool on the salute. The head stays under 20 degrees (drawn upright).
 */

/** Frame `frame` of a strip whose poses this one borrows. */
function borrowed(poses: readonly Pose[], frame: number): Pose {
  const pose = poses[frame];
  if (!pose) throw new Error(`No frame ${frame} to borrow`);
  return pose;
}

/** Where the guard's rear toe touches the floor (heel up). */
const REAR_TOE = ((): number => {
  const a = ((GUARD.farFoot.angle ?? 0) * Math.PI) / 180;
  return GUARD.farFoot.x + (BODY.ankle - BODY.footRadius) * Math.sin(a) + BODY.foot * Math.cos(a);
})();

/**
 * A foot on its toes at `toe`, the heel raised `angle` degrees (negative): the heel rises and
 * sinks around the toe, which stays put on the floor (the rear foot from the guard to the kneel).
 */
function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

/** Where the lead fist meets the floor: the source of the rings. */
const IMPACT = at(22.5, 1);

/**
 * A speaker ring: the front of a tall ellipse of platine standing on the floor around the
 * impact, a ")" open behind (over him nothing is drawn), `size` world px forward of the impact
 * and 2.3 times as tall, `progress` from 0 (born, thick, white-hot) to 1 (thin, dark, gone);
 * centred `ahead` px in front of the impact.
 */
const speaker = (size: number, progress: number, ahead = 0): Effect => ({
  kind: 'ring',
  center: at(IMPACT.x + ahead, IMPACT.y),
  radius: size / (0.35 + 0.65 * progress),
  progress,
  tone: 'platine',
  squash: 2.3,
});

/**
 * A ring born with a blow, thick and white-hot, around the spark just ahead of the knuckles (a
 * ring born right at the fist would wrap the arm and the face above it): it rolls out into a
 * speaker ring on the next frame.
 */
const born = (size: number, progress: number, ahead: number): Effect =>
  speaker(size, progress, ahead);

/** The speaker's shock on the floor under the fist, in his own sound color. */
const floorRing = (radius: number, progress: number): Effect => ({
  kind: 'ring',
  center: at(IMPACT.x, 1.5),
  radius,
  progress,
  tone: 'sound',
  squash: 0.3,
});

/** The impact spark, `ahead` px in front of the knuckles, so the fist on the floor still reads. */
const spark = (radius: number, ahead: number): Effect => ({
  kind: 'flash',
  center: at(IMPACT.x + ahead, 0),
  radius,
  tone: 'platine',
});

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/**
 * The fist's speed, just in front of the forearm (a trail would hide behind the arm, which
 * comes straight down along it): platine streaks trailing up from the glove, `length` long.
 */
const drive = (x: number, y: number, length: number): Effect => ({
  kind: 'speed',
  center: at(x, y),
  length,
  spread: 1.6,
  direction: -90,
  tone: 'platine',
});

/**
 * A crack in the floor through `points`: a jagged fissure of light on the floor line, each
 * stretch hottest where it leaves the one before.
 */
const crack = (...points: readonly (readonly [number, number])[]): Effect[] =>
  points.slice(1).map(([x, y], i) => {
    const [fromX, fromY] = points[i] ?? [x, y];
    const dx = x - fromX;
    const dy = y - fromY;
    return {
      kind: 'speed',
      center: at(fromX, fromY),
      length: Math.hypot(dx, dy),
      spread: 0.6,
      // Speed lines stream back from `center`, away from where the part moves.
      direction: (Math.atan2(-dy, -dx) * 180) / Math.PI,
      tone: 'platine',
    };
  });

/**
 * The 3rd blow's crack, out of the impact both ways, clear of the spark's heart (it reads on
 * its own once the spark is gone, while the dust settles on it).
 */
const CRACK: readonly Effect[] = [
  ...crack([33, -0.3], [38, -1], [42.5, -0.2], [48, -0.9], [51.5, -0.3]),
  ...crack([12.5, -0.4], [8.5, -1], [5.5, -0.3]),
];

// s0 (1 tick, held through the 20-tick freeze) · The cue: the intro's frame 5, the fingers
// pinching the headphones' cup, the rear hand in the back pocket, the chin up, cool; but on his
// guard's legs (the rear heel up on the guard's mark), so it carries on from any move out of
// the guard and the coil drops straight out of it, the rear toe pinned. A glint behind the cup
// and a thin pulse over the collar (never over the face), and the floor lights up under him:
// the Boost.
const CUE_HIP = at(-5.6, 38.4);
const CUE: Pose = ((): Pose => {
  const set = borrowed(INTRO, 5);
  // The hands ride the body: the cup and the pocket move with the hips.
  const dx = CUE_HIP.x - set.hip.x;
  const dy = CUE_HIP.y - set.hip.y;
  const ride = (p: { x: number; y: number }) => at(p.x + dx, p.y + dy);
  return {
    ...set,
    hip: CUE_HIP,
    nearFoot: GUARD.nearFoot,
    farFoot: GUARD.farFoot,
    nearFist: ride(set.nearFist),
    farFist: ride(set.farFist),
    effects: [
      { kind: 'flash', center: ride(at(-6, 66)), radius: 2.5, tone: 'platine' },
      {
        kind: 'ring',
        center: ride(at(-4, 64.5)),
        radius: 13,
        progress: 0.85,
        tone: 'platine',
        squash: 0.4,
      },
      {
        kind: 'ring',
        center: at(-7, 1.5),
        radius: 26,
        progress: 0.62,
        tone: 'platine',
        squash: 0.3,
      },
    ],
  };
})();

// s1 (1 tick) · The coil: the Uppercut's dip (its hips, legs, lean and look), but the lead fist
// raised high, cocked up from the cup over the back of the head (the elbow back, the face clear)
// above the floor it is about to hit; the rear fist dropped low behind the hip, ready to whip up
// and back as the lead one hammers down.
const COIL: Pose = {
  ...borrowed(UPPERCUT, 0),
  shrug: 1.2,
  twist: 0.2,
  nearFist: at(-1, 68),
  farFist: at(-11, 34),
  bends: { nearElbow: 'back', farElbow: 'down' },
  effects: [dust(5, 3.2, 0.15), dust(-18, 3, 0.2)],
};

// s2 · The blow: the lead fist driven down into the floor ahead of the lead foot, the arm
// slanting forward clear of the knee, the shoulder rolled into it; down on the rear knee (the
// rear foot pivoting on its toe), the chest pitched over the lead knee, the head up on the
// opponent; the rear arm flung up and back, nearly straight, the counterweight on the line of
// action.
const POUND: Pose = {
  hip: at(-6, 21),
  torso: 55,
  head: -36,
  shrug: 0,
  reach: { near: 3 },
  twist: -0.35,
  nearFoot: planted(GUARD.nearFoot.x),
  farFoot: onToes(REAR_TOE, -55),
  nearFist: at(22, 7.5),
  farFist: at(-9.5, 46.5),
  bends: { nearElbow: 'up', farElbow: 'down' },
  face: 'effort',
};

// s4 · The 3rd blow: s2's pose with the whole weight in it, the hips a notch lower (as low as
// the rear knee allows, a hair over the floor), the chest pitched a degree further and the lead
// shoulder sunk into the punch, the rear arm flung higher. The shout.
const SLAM: Pose = {
  ...POUND,
  hip: at(-6, 20.4),
  torso: 56,
  head: -37,
  reach: { near: 4 },
  farFoot: onToes(REAR_TOE, -57),
  farFist: at(-6, 49.5),
  face: 'kiai',
};

// s3 · The rebound: the fist bounces back up to knee height, the elbow cocked up behind it for
// the next blow; the body comes up 2 px off the knee and the rear arm pumps down against it.
const REBOUND: Pose = {
  ...POUND,
  hip: at(-6, 23),
  torso: 51,
  head: -32,
  reach: { near: 1.5 },
  twist: -0.2,
  farFoot: onToes(REAR_TOE, -50),
  nearFist: at(21, 20),
  farFist: at(-12, 38),
};

// s5 (6 ticks) · The rise: he drives up out of the kneel, the first and biggest part of the way
// (it eases into the salute): the legs pushing, the rear heel still up, the chest coming up
// and starting to open; the lead glove snapped back up to the chin, the elbow under it; the
// rear arm swinging up behind him on its way to the sky, clear of the hair.
const RISE: Pose = {
  hip: at(-6.2, 30),
  torso: 28,
  head: -10,
  shrug: 0.8,
  twist: 0.4,
  nearFoot: planted(GUARD.nearFoot.x),
  farFoot: onToes(REAR_TOE, -40),
  nearFist: at(15, 47),
  farFist: at(-15, 60),
  bends: { nearElbow: 'down', farElbow: 'back' },
  face: 'focus',
};

// s6 (7 ticks) · The salute: back in his guard's stance, the lead glove at the chin, the rear
// fist punched straight up to the sky (behind the head, so the face stays clear), eyes still on
// the opponent.
const SALUTE: Pose = {
  ...GUARD,
  hip: at(-6.4, 37.5),
  torso: 11,
  head: 2,
  nearFist: at(9, 55),
  farFist: at(-7, 83),
  bends: { nearElbow: 'down', farElbow: 'back' },
  face: 'cool',
};

// s7 (7 ticks) · The fold: the Remontant's settle (its hips, lean and rear heel, a touch down
// into the knees), but the arm coming down is the rear one, the salute's: down on its arc
// beside and behind the head, the elbow out back; the lead glove stays at the chin.
const FOLD: Pose = {
  ...borrowed(REMONTANT, 5),
  nearFist: at(9, 56),
  farFist: at(-7, 74),
  bends: { nearElbow: 'down', farElbow: 'back' },
};

export const POSES: readonly Pose[] = [
  CUE,
  COIL,
  // BOUM: a ring born just ahead of the fist, thick and white-hot, and one already at the
  // hitbox's edge; the shock under the fist, the speed of the fist just in front of the forearm.
  {
    ...POUND,
    effects: [
      drive(26.5, 13, 9),
      speaker(37.7, 0.58),
      born(11.7, 0.12, 6.5),
      floorRing(14, 0.15),
      spark(5, 6),
      dust(23, 3.5, 0.3),
    ],
  },
  // The rings roll out: the outer one passes the edge, thinning, the newborn one has run out to
  // 28.6 (it is the outer one when s2 comes back, a new ring born behind it).
  {
    ...REBOUND,
    effects: [speaker(39.6, 0.75), speaker(28.6, 0.45), floorRing(14, 0.6), dust(23, 3.5, 0.65)],
  },
  // BOUUUM: the three rings at once (the outer one white-hot, a new one born ahead of the fist),
  // a bigger spark ahead of the knuckles and the crack in the floor.
  {
    ...SLAM,
    effects: [
      drive(26.5, 13, 10),
      speaker(37.5, 0.33),
      speaker(32.5, 0.5),
      born(13.1, 0.12, 8.5),
      floorRing(18, 0.12),
      spark(6.5, 9.5),
      dust(23, 4.5, 0.3),
      ...CRACK,
    ],
  },
  // The rings fade out over the opponent, the dust settles on the crack.
  {
    ...RISE,
    effects: [
      speaker(39.9, 0.9),
      speaker(36.9, 0.84),
      speaker(33, 0.82),
      ...CRACK,
      dust(23, 4.5, 0.75),
    ],
  },
  { ...SALUTE, effects: [dust(23, 4.5, 0.95)] },
  FOLD,
  // The idle's last frame, then the guard.
  borrowed(REMONTANT, 6),
  GUARD,
];
