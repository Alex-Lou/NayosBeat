import type { Point } from '../../raster.ts';
import { solve, type Bend } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, smear, toeOf, type Effect, type Foot, type Pose } from './common.ts';
import { POSES as ANGE } from './specialForward.ts';

export const ANIMATED: boolean = true;

/** Frame `frame` of a strip whose poses this one borrows. */
function borrowed(poses: readonly Pose[], frame: number): Pose {
  const pose = poses[frame];
  if (!pose) throw new Error(`No frame ${frame} to borrow`);
  return pose;
}

/**
 * super (Slam, ← + BOOST, 3 bars; docs/combos-v3.md §4): she leaps into the crowd and comes
 * down boots first. 9 frames, 2, 3, 5, 2, [4], [4], 8, 9, 9 ticks (46: 12/8/26,
 * src/art/riff/clips.ts), an overhead, hitbox 0..44 / 0..60. The 20-tick freeze
 * flash takes the dive (frame 3, on screen from tick 10); the first blow lands on tick 12 (frame
 * 4), the second on tick 16 (frame 5, it knocks down).
 *
 * The arc it is drawn against (to be played by the game, like her Saut de l'ange's): the feet
 * lifted by `leapArc(46, { from: 2, to: 16, apexPx: 40 })`, so 8, 16 and 24 px on frame 1, 30
 * to 40 on frame 2 (the top on ticks 8-9), 38 on the flash's tick 10 and 35 on tick 11 (frame
 * 3: the freeze takes her at the top of her dive), 30, 23, 16 and 8 on ticks 12-15 (frame 4: she
 * rides the opponent down through the first blow), on the floor from tick 16 (frame 5, the
 * second blow); carried 30 px forward over ticks 2-11, stopped by the first blow. The poses stay
 * over her feet, the height comes from the engine: the airborne frames from the flash on are
 * drawn with their soles 5 to 9 px up in the cell, so that on screen her hips keep falling, 83
 * at the flash, 70 on the first blow, 48 on its last tick, 34 on the stomp, 26 on the landing.
 *
 * A punk's stage dive that ends in a double stomp. Out of a deep load (pitched in over the lead
 * knee, both arms swung back) she springs off on the diagonal, the arms flung
 * open, then flies out flat over the opponent like a dart, the chest leading, the back arched,
 * the lead arm reaching for him and the rear one swept back over her, the boots trailing high: a
 * body thrown into a crowd. At the top she pitches over at him, and that is the pose the flash
 * freezes: the chest and the eye on the target, both boots cocked under her hips and aimed down
 * at his chest, both arms swept back behind her shoulders like wings, open hands, clear of her
 * head; a platine swoop under her where the boots swung through, a magenta streak inside it, a
 * white-hot glint on their toes. Then the legs drive down together into him while the lead arm
 * flings up beside her head and the rear one back and down (action and reaction: seen three
 * quarters, her rear arm cannot rise behind the head without leaving its shoulder), the kiai, a
 * white-hot star at the soles; she rides him down onto the floor and slams both boots on it,
 * the legs long, both arms thrown back and down: the shockwave shoots up his body in rays of
 * light, platine over magenta, and runs out on the floor ahead of her. She sinks low and rises
 * through her Saut de l'ange's landing while the wave runs on past him, the rays rise off it,
 * and it fades.
 *
 * Nothing like her Saut de l'ange (a corkscrew, two straight heels chopped down from above, the
 * body pitched over them, the fists slammed down by the hips), her j.H (one leg), her front flip,
 * nor Nayo's Mégabasse (fists into the floor, tall speaker rings) or Pied fendu (a one-leg flying
 * side kick leaning back): a flat flying dart, a dive-bomb with wings, a two-boot stomp under a
 * thrown fist, a geyser of light.
 *
 * - 0 (2 ticks): the load, on the floor: deep (hips 25.5), the rear knee driven forward and down
 *   over its high heel (her crouch's sprinter's set, the knees bending toward the toes), pitched
 *   in 35 degrees, both arms swung back as far as shoulders go (the pitch lays them level), the
 *   lead one just under the rear one, a pair of wings (see the lead shoulder below); dust off
 *   both boots.
 * - 1 (3 ticks): her jump's take-off (copied here as it was drawn for this strip, so that a
 *   change to her jump does not move the Slam), tipped onto the launch diagonal (34 degrees of
 *   spin where hers has 22), the arms flung open, the rear one back, the lead one thrown forward
 *   under the chin (both up would cross her face); set down so that the push-off toes just leave
 *   the floor; a short trail under the boots.
 * - 2 (5 ticks, the top): the dart, the boots trailing pointed back (35 degrees off square to the
 *   shin at most: a combat boot), the lead arm reaching for him level under the chin (aimed
 *   higher, its forearm rose across her mouth).
 * - 3 (2 ticks, the flash): the dive-bomb, the hero pose, both arms back like wings, the lead one
 *   just under the rear one.
 * - 4 (4 ticks, active): the double stomp into his chest, the knees soft and bending the way
 *   knees bend, the lead fist thrown up by her head, the white-hot star at the soles.
 * - 5 (4 ticks, active): the contact: both boots slammed on their guard marks, the legs as long
 *   as that wide stance allows (the hips 34, the guard's 32: both legs straight would only give
 *   35), both arms thrown back and down; the floor wave and the rays are what reach the hitbox's
 *   edge.
 * - 6-8: her Saut de l'ange's frames 6 to 8 (the plié, the rise, the guard), the lead foot kept
 *   flat (it already stamped), the wave running on past the hitbox, thinning, and fading.
 *
 * The head stays the source drawing (under stamp.ts's 20 degrees on screen) on every frame. The
 * arms are thrown nearly straight, never locked past their length (an arm out of reach is
 * drawn rigid, a robot's), each elbow bending the way an elbow bends, and a shoulder swings 60
 * degrees behind the chest at most.
 *
 * Seen three quarters, the lead arm (behind the body) needs its shoulder placed with it:
 * - thrown at him (frames 1 and 2), the elbow stays soft (38 degrees short of straight) and the
 *   lead shoulder is held back behind the bust (`reach` -4, -5 on the flat dart), as on her Jab
 *   (standLight.ts): out of the body the arm shows 20 to 21 px. Out of the chest at full length
 *   it showed 25, an arm half again too long (the owner's call);
 * - swung back (frames 0 and 3), its shoulder blade draws in to the spine (`reach` -4), which
 *   on the pitched chest lifts it 3 px, and the arm runs just under the rear one: left on the
 *   front of the chest, the arm crossed the whole bust hidden and only came out at the small of
 *   the back, a hand sprouting from her waist.
 */

const TOE = toeOf(GUARD.nearFoot);
/** The guard's head angle on screen (the face is the drawing under 20 degrees). */
const LOOK = GUARD.torso + GUARD.head;

const rad = (degrees: number): number => (degrees * Math.PI) / 180;

/** Every placed part of `pose` moved by (dx, dy). */
function moved(pose: Pose, dx: number, dy: number): Pose {
  const move = (p: Point): Point => at(p.x + dx, p.y + dy);
  const foot = (f: Foot): Foot => ({ ...f, ...move(f) });
  return {
    ...pose,
    hip: move(pose.hip),
    nearFoot: foot(pose.nearFoot),
    farFoot: foot(pose.farFoot),
    nearFist: move(pose.nearFist),
    farFist: move(pose.farFist),
  };
}

/** The lowest point of a pose's boots (the soles), in its cell. */
function soles(pose: Pose): number {
  const s = solve(pose, RIFF_BODY);
  return Math.min(s.near.toe.y, s.near.heel.y, s.far.toe.y, s.far.heel.y) - RIFF_BODY.footRadius;
}

/** Which way a knee folds to sit at `knee` between `joint` and `ankle`. */
function kneeBend(joint: Point, knee: Point, ankle: Point): Bend {
  const dx = ankle.x - joint.x;
  const dy = ankle.y - joint.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = ((knee.x - joint.x) * dx + (knee.y - joint.y) * dy) / l2;
  const foot = at(joint.x + dx * t, joint.y + dy * t);
  const mirror = at(2 * foot.x - knee.x, 2 * foot.y - knee.y);
  if (Math.abs(knee.x - mirror.x) > Math.abs(knee.y - mirror.y)) {
    return knee.x > mirror.x ? 'front' : 'back';
  }
  return knee.y < mirror.y ? 'down' : 'up';
}

/**
 * A leg folded from its hip joint: the thigh `thigh` degrees off straight down (toward the
 * front), the shin `shin` degrees, the foot at `angle`. Returns the foot and its knee's bend.
 */
function folded(
  pose: Pose,
  side: 'near' | 'far',
  thigh: number,
  shin: number,
  angle: number,
): { foot: Foot; bend: Bend } {
  const joint = solve(pose, RIFF_BODY)[side].hip;
  const knee = at(
    joint.x + Math.sin(rad(thigh)) * RIFF_BODY.thigh,
    joint.y - Math.cos(rad(thigh)) * RIFF_BODY.thigh,
  );
  const ankle = at(
    knee.x + Math.sin(rad(shin)) * RIFF_BODY.shin,
    knee.y - Math.cos(rad(shin)) * RIFF_BODY.shin,
  );
  return { foot: { ...ankle, angle }, bend: kneeBend(joint, knee, ankle) };
}

type Leg = readonly [thigh: number, shin: number, angle: number];

/** The legs of `pose` folded from its hip joints. */
function legs(pose: Pose, near: Leg, far: Leg): Pose {
  const n = folded(pose, 'near', ...near);
  const f = folded(pose, 'far', ...far);
  return {
    ...pose,
    nearFoot: n.foot,
    farFoot: f.foot,
    bends: { ...pose.bends, nearKnee: n.bend, farKnee: f.bend },
  };
}

/**
 * How far a thrown arm reaches from its shoulder: nearly straight (its elbow about 20 degrees
 * off), never locked out past its length (an arm placed out of reach is drawn rigid, a robot's).
 */
const REACH = 21.4;
/**
 * How far the lead arm reaches when thrown at him: its elbow soft, 38 degrees short of straight
 * (see the lead shoulder above).
 */
const THROWN = 20.6;

/** An arm thrown from its shoulder along `degrees` (0 forward, 90 up). */
function flung(pose: Pose, side: 'near' | 'far', degrees: number, reach = REACH): Point {
  const shoulder = solve(pose, RIFF_BODY)[side].shoulder;
  return at(
    shoulder.x + Math.cos(rad(degrees)) * reach,
    shoulder.y + Math.sin(rad(degrees)) * reach,
  );
}

/**
 * Both arms of `pose` thrown along `near` and `far` degrees, on screen: for a spun pose (the
 * borrowed take-off) the targets are turned back, so that the spin lands them there.
 */
function arms(pose: Pose, near: number, far: number, reach = REACH, farReach = reach): Pose {
  const back = rad(pose.spin ?? 0);
  const unspun = (p: Point): Point => {
    const dx = p.x - pose.hip.x;
    const dy = p.y - pose.hip.y;
    return at(
      pose.hip.x + dx * Math.cos(back) - dy * Math.sin(back),
      pose.hip.y + dx * Math.sin(back) + dy * Math.cos(back),
    );
  };
  return elbowsBent({
    ...pose,
    nearFist: unspun(flung(pose, 'near', near, reach)),
    farFist: unspun(flung(pose, 'far', far, farReach)),
  });
}

const BENDS: readonly Bend[] = ['down', 'up', 'front', 'back'];

/** The elbow's bend seen side on, counterclockwise from the upper arm (positive: the way it folds). */
function flexion(pose: Pose, side: 'near' | 'far'): number {
  const { shoulder, elbow, wrist } = solve(pose, RIFF_BODY)[side];
  const a = at(elbow.x - shoulder.x, elbow.y - shoulder.y);
  const b = at(wrist.x - elbow.x, wrist.y - elbow.y);
  return (Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * 180) / Math.PI;
}

/** `pose` with each elbow folding the way an elbow folds (the forearm toward the arm's front). */
function elbowsBent(pose: Pose): Pose {
  let bent = pose;
  for (const side of ['near', 'far'] as const) {
    const key = side === 'near' ? 'nearElbow' : 'farElbow';
    const trials = BENDS.map((bend) => ({ ...bent, bends: { ...bent.bends, [key]: bend } }));
    bent = trials.find((trial) => flexion(trial, side) >= 0) ?? bent;
  }
  return bent;
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** A ring in her energy (`sound`) or the Boost's platine, `squash` < 1 flat on the floor. */
const ring = (
  center: Point,
  radius: number,
  progress: number,
  tone: 'sound' | 'platine',
  squash: number,
): Effect => ({ kind: 'ring', center, radius, progress, tone, squash });

/** A motion trail in the Boost's platine. */
function platine(width: number, ...points: readonly (readonly [number, number])[]): Effect {
  const trail = smear(width, ...points);
  return trail.kind === 'smear' ? { ...trail, tone: 'platine' } : trail;
}

/** Rays shooting up from the floor, their bright heads at `top`, `length` px long. */
const rays = (top: Point, length: number, spread: number, tone: 'sound' | 'platine'): Effect => ({
  kind: 'speed',
  center: top,
  length,
  spread,
  direction: 90,
  tone,
});

/** A white-hot point: a platine flash (its heart is white). */
const hot = (center: Point, radius: number): Effect => ({
  kind: 'flash',
  center,
  radius,
  tone: 'platine',
});

// 0 · The load (2 ticks): deep in the plié, pitched in over the lead knee, both arms swung down
// behind the hips to throw the leap; the floor puffs under both boots.
const LOAD_BODY: Pose = {
  ...GUARD,
  hip: at(-7.5, 25.5),
  torso: 35,
  head: LOOK + 4 - 35,
  shrug: 2.4,
  twist: 0.35,
  nearFoot: onBall(TOE, -56),
  farFoot: GUARD.farFoot,
  reach: { far: -4 },
  bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'front', farKnee: 'front' },
};
// Both arms swung back, as far back as shoulders go (the pitch of the chest lays them level), the
// lead shoulder drawn in to the spine and its arm just under the rear one.
const LOAD: Pose = {
  ...arms(LOAD_BODY, 192, 190),
  effects: [dust(9, 4.5, 0.12), dust(-17, 4, 0.12)],
};

// 1 · The take-off (3 ticks): her jump's, tipped onto the launch diagonal, the arms flung open
// (the rear one back, the lead one forward under the chin, its elbow soft, its shoulder held back
// behind the bust); set down so that the push-off toes just leave the floor (the game is already
// lifting her). A short trail under the boots.
// Her jump's take-off (jumpForward.ts, frame 1, as it was drawn for this strip): long, the rear
// leg pushing straight behind, the lead knee driving.
const JUMP_TAKEOFF: Pose = {
  ...GUARD,
  hip: at(-3, 38),
  torso: 4,
  head: -8,
  shrug: 1.4,
  twist: 0.5,
  nearFoot: { x: -11, y: 8, angle: -58 },
  farFoot: { x: 3, y: 16, angle: -50 },
  bends: { ...GUARD.bends, nearKnee: 'down' },
};
const TIPPED: Pose = arms(
  { ...JUMP_TAKEOFF, spin: 34, head: JUMP_TAKEOFF.head - 12, reach: { far: -4 } },
  190,
  10,
  REACH,
  THROWN,
);
const TAKEOFF: Pose = {
  ...moved(TIPPED, 0, 0.6 - soles(TIPPED)),
  effects: [smear(3, [-10, 4], [-4, 8], [3, 13])],
};

// 2 · The dart (5 ticks, the top): flat over the opponent, the chest leading, the back arched
// (the chest and the rear boot 10 px over the hips), the rear arm swept straight back over her,
// the lead one reaching for him level under the chin (its elbow soft, its shoulder held back
// behind the bust), open hands, both clear of the body; the chin up on the target, the fringe
// trailing.
const DART_BODY: Pose = {
  ...GUARD,
  hip: at(-2, 44),
  torso: 60,
  head: -42,
  shrug: 1.2,
  twist: 0.3,
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'up', farElbow: 'up' },
};
const DART: Pose = arms(
  legs({ ...DART_BODY, reach: { far: -5 } }, [-95, -118, -148], [-80, -100, -130]),
  170,
  6,
  REACH,
  THROWN,
);

// 3 · The dive-bomb (2 ticks, the 20-tick freeze flash): pitched over at the target (50
// degrees: the head stays upright, so the torso carries the pitch), both boots cocked under the
// hips and aimed down at his chest, both arms swept back behind the shoulders like wings, the
// rear one high, the lead one just under it (its shoulder drawn in to the spine), open hands,
// clear of the head. Under her, the platine swoop of the boots
// swinging through from behind, a thin magenta streak inside it; a white-hot glint on the toes.
const BOMB_BODY: Pose = {
  ...GUARD,
  hip: at(-4, 45),
  torso: 50,
  head: -32,
  shrug: 3,
  twist: 0.5,
  reach: { far: -4 },
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'down', farElbow: 'down' },
};
const BOMB: Pose = {
  ...arms(legs(BOMB_BODY, [40, -10, -35], [50, -2, -30]), 174, 172),
  effects: [
    smear(1.5, [-14, 22], [-3, 15], [10, 13]),
    platine(5, [-30, 38], [-22, 23], [-9, 14], [4, 11], [13, 12]),
    hot(at(16.5, 11), 5),
  ],
};

// 4 · The impact (4 ticks, the first blow): both legs driven down together into his chest, the
// weight over the boots, both arms flung up into a V (the reaction to the legs); the kiai; the
// magenta trail of the drive, a white-hot star at the soles.
const STOMP_BODY: Pose = {
  ...GUARD,
  hip: at(4, 40),
  torso: 10,
  head: 2,
  shrug: 3,
  twist: 0.6,
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'down', farElbow: 'down' },
  face: 'kiai',
};
const STOMP: Pose = {
  ...arms(legs(STOMP_BODY, [26, 16, 22], [32, 22, 26]), 216, 62),
  effects: [smear(5, [10, 30], [16, 22], [22, 15], [27, 10]), hot(at(28, 10), 8)],
};

// 5 · The contact (4 ticks, the second blow): she drops off him onto the floor and slams both
// boots down on their marks, the legs long, the body over them, both arms thrown back and up;
// the shockwave shoots up his body in rays (platine over magenta, up to 56 px: the knockdown hits
// all of him, not his feet) and runs out on the floor ahead of her, from her lead boot to the
// hitbox's edge, platine, magenta inside.
const SLAM_BODY: Pose = {
  ...GUARD,
  hip: at(-7.5, 35),
  torso: 12,
  head: LOOK - 12,
  shrug: 3,
  twist: 0.5,
  // The rear leg nearly straight on the slam: it folds into the plié next, without a flip.
  nearFoot: onBall(TOE, -12),
  farFoot: GUARD.farFoot,
  nearHand: 'open',
  farHand: 'open',
  bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'down', farElbow: 'down' },
  face: 'effort',
};
const SLAM: Pose = {
  ...arms(SLAM_BODY, 216, 222),
  effects: [
    ring(at(12, 4), 18, 0.3, 'sound', 0.35),
    ring(at(23, 5), 36, 0.3, 'platine', 0.35),
    rays(at(26, 50), 42, 7, 'sound'),
    rays(at(28, 56), 50, 11, 'platine'),
    dust(10, 5, 0.15),
    dust(-17, 4, 0.15),
  ],
};

// 6-8 · Her Saut de l'ange's landing: the plié, the rise, the guard (the lead foot stays flat:
// it already stamped); the wave runs on past the hitbox, thinning, the rays rising off it, and
// fades.
const TOUCHDOWN: Pose = {
  ...borrowed(ANGE, 6),
  farFoot: GUARD.farFoot,
  effects: [
    ring(at(16, 4), 26, 0.6, 'sound', 0.35),
    ring(at(28, 5), 36, 0.62, 'platine', 0.32),
    rays(at(34, 66), 34, 9, 'platine'),
    dust(10, 5, 0.45),
    dust(-17, 4, 0.45),
  ],
};
const RISE: Pose = {
  ...borrowed(ANGE, 7),
  effects: [ring(at(30, 5), 30, 0.9, 'platine', 0.3), dust(10, 5, 0.8), dust(-17, 4, 0.8)],
};
const SETTLE: Pose = borrowed(ANGE, 8);

export const POSES: readonly Pose[] = [
  LOAD,
  TAKEOFF,
  DART,
  BOMB,
  STOMP,
  SLAM,
  TOUCHDOWN,
  RISE,
  SETTLE,
];
