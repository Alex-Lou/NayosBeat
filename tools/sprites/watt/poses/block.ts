import { at, GUARD, onBall, onHeel, planted, springAnkle, type Pose } from './common.ts';
import { POSES as CROUCH_POSES } from './crouch.ts';

export const ANIMATED: boolean = true;

/**
 * block: 6 frames. Standing 0-2 (2, 3 ticks, then held while the blockstun lasts), crouching 3-5
 * (the same). The last frame of each is also his proximity guard, held before anything lands:
 * it must read « he covers » at 1x. The first is the impact: the cover rocked back by the blow,
 * held through the hitstop; the second springs back a hair past the cover.
 *
 * His guard, shut: both gauntlets come up as two bars in front of the chest, the clamps under
 * the bulb's cap, the elbows down over the ribs, the shoulders up into the collar. The filament
 * stays in view over the clamps: he watches through his cover. On contact the whole shell is
 * driven back into him: the chest rocks back, the hips give, the rear boot braces on its ball
 * and the lead toes peel up; a colosse gives little, 2 px.
 *
 * Crouching, the same shell on the crouch's legs, the clamps before the collar.
 *
 * Inside his pushbox (tests/tools/watt-sprites.test.ts): the lead clamp's tip at x = 13.5
 * standing, under 15.
 */

const HEAD = GUARD.torso + GUARD.head;

/** The cover held: the two gauntlets up before the chest, the clamps under the bulb. */
const SHELL: Pose = {
  ...GUARD,
  hip: at(-9.5, 37),
  torso: 6,
  head: HEAD - 6,
  shrug: 3.8,
  nearFist: at(0.5, 65),
  farFist: at(5.5, 62.5),
};

/** The blow on it: the shell driven back, the rear boot bracing, the lead toes up. */
const SHELL_IMPACT: Pose = {
  ...SHELL,
  hip: at(-11, 37),
  torso: 2,
  head: HEAD - 2,
  shrug: 4.2,
  nearFoot: onBall(-18, -26),
  farFoot: onHeel(planted(7.5), 8),
  nearFist: at(-1.5, 64.5),
  farFist: at(3.5, 62),
  face: 'effort',
};

/** Springing back, a hair past the cover. */
const SHELL_RECOIL: Pose = {
  ...SHELL,
  hip: at(-9.2, 37.2),
  torso: 7,
  head: HEAD - 7,
  nearFist: at(1, 65.3),
  farFist: at(6, 62.8),
};

/** The crouch held (crouch.ts, frame 3). */
const CROUCH = CROUCH_POSES[3] ?? GUARD;

/** The cover on the crouch's legs: the clamps before the collar. */
const LOW_SHELL: Pose = springAnkle({
  ...CROUCH,
  torso: 10,
  head: HEAD - 10,
  shrug: 4,
  nearFist: at(-1.5, 53),
  farFist: at(4, 51),
});

const LOW_IMPACT: Pose = springAnkle({
  ...LOW_SHELL,
  hip: at(CROUCH.hip.x - 1.8, CROUCH.hip.y + 0.4),
  torso: 5,
  head: HEAD - 5,
  shrug: 4.4,
  nearFist: at(-3.5, 52.5),
  farFist: at(2, 50.5),
  face: 'effort',
});

const LOW_RECOIL: Pose = springAnkle({
  ...LOW_SHELL,
  hip: at(CROUCH.hip.x + 0.3, CROUCH.hip.y - 0.2),
  torso: 11,
  head: HEAD - 11,
  nearFist: at(-1.1, 53.1),
  farFist: at(4.4, 51.1),
});

export const POSES: readonly Pose[] = [
  SHELL_IMPACT,
  SHELL_RECOIL,
  SHELL,
  LOW_IMPACT,
  LOW_RECOIL,
  LOW_SHELL,
];
