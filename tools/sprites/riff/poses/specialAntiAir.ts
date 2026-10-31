import type { Point } from '../../raster.ts';
import { solve, type Effect } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * specialAntiAir (Genou montant, docs/combat-v2.md §5.5, §10.2, §11.3): 8 frames, 2, 2, 3, 3,
 * 6, 6, 6, 6 ticks (34), active on frames 2-3 (ticks 4-9), hitbox 4..28 / 30..92 measured
 * upward; the game carries her 12 px forward over ticks 0-7 and makes her invincible to air
 * attacks over ticks 0-5.
 *
 * Known spec gap (§10.2 against §11's « la hauteur vient du moteur, la pose reste ancrée aux
 * pieds »): a knee reaching y 92 cannot come from a grounded pose (on her toes the knee tops out
 * near 57), and §10.2 gives the move no lift, so the leap is drawn inside the cell: the hips at
 * 73-74 on frames 2-3 and 64 on frame 4 (the guard's: 32), the lowest boot 34, 35 and 26 px off
 * the floor, the top of the hair at 111. The engine keeps her shadow and her pushbox on the
 * floor meanwhile; her hurtboxes follow the drawing (src/data/fighters/riff.ts: 32..111 over
 * ticks 4-9, 24..106 over ticks 10-15), so a grounded low passes under the boots it would have
 * hit 26 to 35 px up, and an air attack meets her drawn head. To be settled in the spec, one
 * of: a lift curve for the move (like the Saut de l'ange's: up from tick 3 to about 34 px over
 * ticks 4-9, 26 at ticks 10-15, down by tick 16), these poses then dropped onto her feet by
 * those heights and the boxes restated from her feet; or a hitbox low enough for a grounded
 * knee (about 30..60) with a hop of 10 px at most, the trail and the diamonds carrying the
 * height, and her standing hurtbox back. Until then the drawing keeps the leap, so the knee
 * honestly reaches the box.
 *
 * Her « freeze explosif »: a b-girl hitting a freeze on the beat, in mid-air, with a knee in it.
 * Out of the guard she sinks for two ticks, then everything goes up at once: the lead leg drives
 * off the floor, the rear knee rips up through in front of her and she freezes at the top of the
 * leap, arched back like a bow, the knee at the top of the hitbox, the shin hanging under it,
 * the lead leg long below, both arms flung back like the tail of the freeze, the head thrown
 * back on what she hit. Then she hangs a beat and drops hard into her plié. Nothing like Nayo's
 * uppercut (a fist up the front of the body, a column of sound): her anti-air is the leg, the
 * arch and a burst of silver diamonds.
 *
 * - 0 (2 ticks): the drop: the hips sink over the lead knee, the rear heel pops off the floor;
 *   the rear fist under the chin and the lead fist hang a beat behind (they stay put while she
 *   sinks).
 * - 1 (2 ticks): the launch: the lead leg stretched long, its toes just off the floor they
 *   pushed (pointed as far as a combat boot lets them),
 *   the rear knee driving up through the front, the rear fist ripping down past the hip, the
 *   lead fist whipping up and out in front of her face (the face stays clear, the arm leads the
 *   rise); a magenta shockwave squashed on the floor, dust, the knee's trail.
 * - 2 (3 ticks, active): the freeze, kiai: arched back, the knee high in front of the chest (it
 *   must clear the torso, which the renderer draws over the near thigh), the rear arm flung
 *   back and down behind her, the lead one thrown up over her head (behind it), open: the tail
 *   and the crest of the arch;
 *   the knee's trail up its path, a silver spark at the top of the knee, the diamonds bursting.
 * - 3 (3 ticks, active): the freeze held a hair higher (the follow-through), the jaw set; the
 *   diamonds fly out.
 * - 4 (6 ticks): the hang just past the top, 10 px under it: the freeze breaks, the knee drops,
 *   the legs start to switch for the floor (the rear foot reaching back, the lead leg swinging
 *   under her), the fists come in, the rear one back under the chin as in the guard (turned with
 *   the chest), the lead one home in front of the chest, its elbow low in front of the body
 *   (held low by the hip with the shoulder drawn back and the elbow folded square behind her,
 *   that far arm read as a broken one, seen three quarters: the owner turned it down). The fall
 *   is all ahead of her: it snaps into the next frame.
 * - 5 (6 ticks): the landing, hard: 38 px down at once, low and wide on the guard's marks, the
 *   hips 6 px under the guard's, the rear heel high on its ball and the rear knee driven forward
 *   and down, floating over the floor (her crouch's sprinter's set), the lead fist low, the rear
 *   one trailing down a beat; dust under both boots and a flat magenta ring.
 * - 6 (6 ticks): the overshoot: the hips over the guard's, the lead fist a touch high, the rear
 *   one at the chin (any higher, it covers the mouth).
 * - 7 (6 ticks): the guard.
 *
 * The head stays the source drawing (under stamp.ts's 20 degrees on screen) and acts with the
 * torso: thrown back with the arch, so the fringe whips back and falls on the landing.
 */

const TOE = toeOf(GUARD.nearFoot);
const LEAD_TOE = toeOf(GUARD.farFoot);
/** The guard's head angle on screen. */
const LOOK = GUARD.torso + GUARD.head;

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

/** A leg by forward kinematics from its hip joint: thigh, shin and foot angles (degrees). */
type Leg = readonly [thigh: number, shin: number, foot: number];

function ankle(pose: Pose, side: 'near' | 'far', [thigh, shin]: Leg): Point {
  const joint = solve(pose, RIFF_BODY)[side].hip;
  const t = (thigh * Math.PI) / 180;
  const s = (shin * Math.PI) / 180;
  return at(
    joint.x + Math.cos(t) * RIFF_BODY.thigh + Math.cos(s) * RIFF_BODY.shin,
    joint.y + Math.sin(t) * RIFF_BODY.thigh + Math.sin(s) * RIFF_BODY.shin,
  );
}

/** The legs of `pose` placed by their angles (the knee bends must match them). */
function legs(pose: Pose, near: Leg, far: Leg): Pose {
  return {
    ...pose,
    nearFoot: { ...ankle(pose, 'near', near), angle: near[2] },
    farFoot: { ...ankle(pose, 'far', far), angle: far[2] },
  };
}

/**
 * An arm thrown from its shoulder `degrees` off hanging (relative to the chest: 90 in front,
 * negative behind), nearly straight (its elbow about 20 degrees off, the way it bends): flung
 * back, a shoulder goes 60 degrees behind the chest at most.
 */
function swung(pose: Pose, side: 'near' | 'far', degrees: number): Point {
  const { shoulder } = solve(pose, RIFF_BODY)[side];
  const lean = (pose.torso * Math.PI) / 180;
  const down = at(-Math.sin(lean), -Math.cos(lean));
  const front = at(Math.cos(lean), -Math.sin(lean));
  const r = (degrees * Math.PI) / 180;
  const reach = 21.4;
  return at(
    shoulder.x + reach * (Math.cos(r) * down.x + Math.sin(r) * front.x),
    shoulder.y + reach * (Math.cos(r) * down.y + Math.sin(r) * front.y),
  );
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** The silver spark of the knee's impact. */
const spark = (center: Point, radius: number): Effect => ({
  kind: 'flash',
  center,
  radius,
  tone: 'strike',
});

/** Her silver diamonds bursting off the knee. */
const diamonds = (radius: number, progress: number): Effect => ({
  kind: 'shards',
  center: at(12, 89),
  radius,
  progress,
  tone: 'strike',
});

/** The launch's shockwave, squashed flat on the floor under the lead foot. */
const shockwave = (radius: number, progress: number): Effect => ({
  kind: 'ring',
  center: at(6, 2),
  radius,
  progress,
  tone: 'sound',
  squash: 0.3,
});

// 0 · The drop (2 ticks).
const DROP: Pose = tucked(
  {
    ...GUARD,
    hip: at(-6.5, 30),
    torso: 21.5,
    head: LOOK - 21.5,
    shrug: 2.8,
    nearFoot: onBall(TOE, -22),
    farFist: at(10, 44.8),
  },
  0.4,
  -0.3,
);

// 1 · The launch (2 ticks).
const LAUNCH: Pose = {
  ...GUARD,
  hip: at(-3, 43),
  torso: 0,
  head: LOOK,
  shrug: 3,
  twist: 0.3,
  nearFoot: { x: -1, y: 35, angle: -50 },
  // The lead foot just off the floor, pointed as far as the boot lets it (it pushed off).
  farFoot: { x: LEAD_TOE - 4.4, y: 13.2, angle: -16 },
  nearFist: at(-16, 46),
  farFist: at(13, 75),
  bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'back', farElbow: 'down' },
  face: 'effort',
  effects: [
    smear(4, [-20, 20], [-12, 28], [-3, 40], [5, 52]),
    shockwave(16, 0.15),
    dust(12, 4, 0.15),
  ],
};

/** The freeze's body: arched back, the head thrown back, the arms flung back. */
const ARCH_BODY: Pose = {
  ...GUARD,
  hip: at(1, 73),
  torso: -30,
  head: -12 + 30,
  shrug: 3.4,
  twist: 0.55,
  farHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'front', nearElbow: 'back', farElbow: 'front' },
  face: 'kiai',
};

/**
 * The arms of the freeze: the rear one flung back and down behind her, the lead one thrown up
 * over her head (behind it), open: the tail and the crest of the arch.
 */
function flungBack(pose: Pose): Pose {
  return { ...pose, nearFist: swung(pose, 'near', -42), farFist: swung(pose, 'far', 165) };
}
const ARCH: Pose = flungBack(ARCH_BODY);

// 2 · The freeze (3 ticks, active).
const FREEZE: Pose = {
  ...legs(ARCH, [50, -95, -35], [-108, -104, -44]),
  effects: [
    smear(5, [-10, 46], [-2, 62], [5, 76], [9, 88]),
    spark(at(16, 95), 5),
    diamonds(10, 0.2),
    shockwave(22, 0.45),
  ],
};

// 3 · Held a hair higher (3 ticks, active).
const HELD: Pose = {
  ...legs(
    flungBack({ ...ARCH_BODY, hip: at(1, 74), torso: -31, head: 19, face: 'effort' }),
    [52, -93, -33],
    [-106, -102, -42],
  ),
  effects: [diamonds(12, 0.55), shockwave(26, 0.75)],
};

// 4 · The hang just past the top (6 ticks): the freeze breaks, the knee drops, the legs start
// to switch for the floor (the rear foot reaching back, the lead leg swinging under her), the
// fists come in.
const HANG: Pose = tucked(
  {
    ...GUARD,
    hip: at(-2, 64),
    torso: 8,
    head: LOOK - 8,
    shrug: 2.8,
    twist: 0.45,
    nearFoot: { x: -11, y: 40, angle: -45 },
    farFoot: { x: 5, y: 34, angle: -30 },
    // The lead fist home in front of the chest, the elbow low in front of the body.
    farFist: at(12.5, 80.1),
    bends: { nearKnee: 'front', farKnee: 'front' },
    effects: [diamonds(13, 0.9)],
  },
  -0.6,
  -1.7,
);

// 5 · The landing (6 ticks): hard, low, wide, on the guard's marks; the lead fist low, the rear
// one trailing down a beat; dust under both boots and a flat ring.
const LAND: Pose = tucked(
  {
    ...GUARD,
    hip: at(-7, 26),
    torso: 28,
    head: LOOK - 28,
    shrug: 2.8,
    twist: 0.5,
    nearFoot: onBall(TOE, -56),
    farFist: at(12, 31),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'front' },
    effects: [
      dust(12, 4.5, 0.2),
      dust(-20, 4, 0.2),
      { kind: 'ring', center: at(-4, 2), radius: 18, progress: 0.2, tone: 'sound', squash: 0.3 },
    ],
  },
  -1,
  -8,
);

// 6 · Rising past the guard (6 ticks): the hips over it, the lead fist a touch high.
const RISE: Pose = tucked(
  {
    ...GUARD,
    hip: at(-6.7, 33.5),
    torso: 18,
    head: LOOK - 18,
    shrug: 2.6,
    nearFoot: onBall(TOE, -13),
    farFist: at(9.8, 48),
    effects: [dust(12, 4.5, 0.65), dust(-20, 4, 0.65)],
  },
  0.4,
  -0.4,
);

export const POSES: readonly Pose[] = [DROP, LAUNCH, FREEZE, HELD, HANG, LAND, RISE, GUARD];
