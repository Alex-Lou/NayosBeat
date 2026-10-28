import { at, GUARD, onBall, planted, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * hold (docs/combat-v2.md §4.1, §11.3): 2 frames, 6, 6 ticks, looped. She holds the opponent
 * by the collar; the opponent (not drawn: Nayo's held) stands at contact, centers 27-28 px
 * apart, and she is drawn over him.
 *
 * A street fighter's grip, two-handed and close, the headbutt already loaded: the rear fist (the
 * near arm, crossing her chest) twisted in the collar under his chin, its knuckles at about
 * (23, 59); the lead one lower in his lapel, about (21, 54); the elbows down, the chest in his
 * face, the chin up and the sideways look an inch from his: in control, cocky, never straining
 * (the effort shows on the headbutt and the throws). The lead foot stays where the grab stepped
 * it, the rear leg drives long behind on its ball. The loop is a short jerk on the collar: the
 * hips sink half a pixel back, the fists draw him in a pixel, the rear shoulder rolls up into
 * the collar; then she gives it back. The fringe and the belt's chain answer the jerk on their
 * own. pummel and both throws start from it, pummel comes back to it.
 */

/** Where the grab's step puts her lead foot: it stays there through the hold. */
export const LEAD_IN = 11.5;
/** The ball of her rear foot (the guard's): it pivots on it, never slides. */
export const REAR_TOE = toeOf(GUARD.nearFoot);

// Frame 0 (6 ticks): the grip. The fists in the collar, the weight in over the lead foot, the
// rear leg long behind on its ball.
const CLINCH = {
  ...GUARD,
  hip: at(-3.2, 32.8),
  torso: 23,
  head: -11,
  shrug: 2.6,
  reach: { near: 0.6, far: 0.4 },
  twist: 0.35,
  nearFoot: onBall(REAR_TOE, -18),
  farFoot: planted(LEAD_IN),
} as const;
export const HOLD: Pose = { ...CLINCH, nearFist: at(21.5, 55.5), farFist: at(21, 49.5) };

// Frame 1 (6 ticks): the jerk. The hips sink back half a pixel, the rear shoulder rolls up, the
// fists draw the collar in a pixel after them.
const JERK: Pose = {
  ...CLINCH,
  hip: at(-3.7, 32.3),
  shrug: 2.9,
  nearFist: at(20.5, 55),
  farFist: at(20, 49),
};

export const POSES: readonly Pose[] = [HOLD, JERK];
