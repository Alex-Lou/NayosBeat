import { at, ease, GUARD, lifted, planted, tween, type Effect, type Pose } from './common.ts';

/**
 * victory: 8 frames, 6,6,6,6 then 8x4 looping from frame 4. He comes out of the guard (the rear
 * foot steps in, the gloves come down), chambers the rear fist low at his belt, the knees
 * loading, and drives it up to the sky on his toes, a flash of sound at the knuckles; then he
 * holds it up, standing tall and easy, the lead hand hooked at his pocket, and bounces on the
 * beat: a dip of the knees on each beat (frame 4) while the raised fist pumps up against it (a
 * counter-motion, the arm keeping a little slack) and a ring of sound is born around it,
 * spreading and fading over the bar. Composed, no grin: the stare stays on the loser.
 *
 * The rear (far) arm is the one raised: drawn behind the head, it never hides the face, and the
 * lead sleeve's emblem stays crisp at his side. In the loop the body is pixel-locked like idle:
 * it moves by whole sprite pixels (0.5 world px) and never turns, the lead arm moving with it as
 * one piece, so the jacket, the emblem and the headphone ring never boil; only the knees and the
 * raised forearm (no neon on it) move freely. Everything in front stays inside the pushbox (the
 * loser may stand at point blank): the fist goes up, not forward.
 */

/**
 * A ring of sound around the raised fist, `progress` from 0 (born) to 1 (faded). Its center
 * stays put while the fist pumps, so each ring spreads as one shape.
 */
const ring = (progress: number): Effect => ({
  kind: 'ring',
  center: at(7, 83),
  radius: 10,
  progress,
  tone: 'sound',
});

/** Standing tall and easy, chest up, the rear fist up to the sky, the lead hand at his pocket. */
const UP: Pose = {
  hip: at(-2.5, 40.2),
  torso: -2,
  head: 5,
  shrug: 0.5,
  nearFoot: planted(GUARD.nearFoot.x),
  farFoot: planted(-12),
  nearFist: at(5, 41.5),
  // A hint of bend left in the raised arm: it has the slack to pump.
  farFist: at(6.5, 80),
  bends: { nearElbow: 'back', farElbow: 'front' },
  face: 'cool',
};

// 0 · Out of the guard: the rear foot steps in off its ball, the body rises, the gloves drop.
const STEP: Pose = {
  ...tween(GUARD, UP, 0.45, ease.out),
  farFoot: lifted(planted(-16.5, -12), 1.6),
  nearFist: at(8, 47),
  farFist: at(6.5, 54),
  bends: { nearElbow: 'down', farElbow: 'down' },
  face: 'cool',
};

// 1 · The rear foot lands; the coil: the far fist chambers low at the belt behind him, the
// knees load deep, the chest coils a touch forward over them.
const COCK: Pose = {
  ...UP,
  hip: at(-3.6, 37.6),
  torso: 8,
  head: 2,
  shrug: 1,
  nearFist: at(6, 44),
  farFist: at(3, 47),
  bends: { nearElbow: 'back', farElbow: 'down' },
};

// 2 · Punching the sky: up on the toes, the arm all the way up, a flash of sound at the fist.
const SKY: Pose = {
  ...UP,
  hip: at(-2.8, 41),
  torso: 0,
  head: 2,
  nearFoot: planted(GUARD.nearFoot.x, -8),
  farFoot: planted(-12, -10),
  nearFist: at(4.5, 39),
  // Not locked straight: a hint of bend even at full stretch.
  farFist: at(5.5, 84.5),
  effects: [{ kind: 'flash', center: at(6.5, 88.5), radius: 5, tone: 'sound' }],
};

/**
 * The bounce, frame by frame from the beat: how far the body sinks (world px, whole sprite
 * pixels), how high the raised fist pumps over its rest (in the world: it rises as the knees
 * dip, the counter-motion that sells the pump), and the ring's progress.
 */
const BOUNCE = [
  { dip: 1.5, pump: 1.5, ring: 0.3 },
  { dip: 0.5, pump: 0.5, ring: 0.52 },
  { dip: 0, pump: 0, ring: 0.74 },
  { dip: 0.5, pump: -0.5, ring: 0.94 },
] as const;

function bounce(phase: 0 | 1 | 2 | 3): Pose {
  const { dip, pump, ring: progress } = BOUNCE[phase];
  const fist = at(UP.farFist.x, UP.farFist.y + pump);
  return {
    ...UP,
    hip: at(UP.hip.x, UP.hip.y - dip),
    // The lead arm rides the body as one piece.
    nearFist: at(UP.nearFist.x, UP.nearFist.y - dip),
    farFist: fist,
    effects: [ring(progress)],
  };
}

// 3 · Settles out of the reach onto the first beat, the flash spreading into a ring; then the
// loop (4-7): beat, up, top, down.
export const POSES: readonly Pose[] = [
  STEP,
  COCK,
  SKY,
  { ...bounce(3), effects: [ring(0.7)] },
  bounce(0),
  bounce(1),
  bounce(2),
  bounce(3),
];
