import { at, onHeel, type Pose } from './common.ts';
import { CROUCH } from './crouch.ts';
import { LEAD_TOE, onToes, REAR_TOE, skid } from './hitHigh.ts';

export const ANIMATED: boolean = true;

/**
 * hitCrouch (docs/combat-v2.md §9.4, §11.1): 3 frames, 3, 4 ticks, the last held to the end of
 * the stun. Any blow that lands while she crouches: the same whiplash as her standing hit, low,
 * out of her get-down and back into it.
 *
 * - 0, held through the hitstop: the jolt is in the hips, thrown 4 px back onto the rear foot,
 *   its heel slammed flat off the ball, the turned-out rear knee flung wide; the lead toes pop
 *   up; the chest snapped upright out of its lean and the head whipped back over it (24 degrees
 *   on screen: the head turns); the guard blown open, hands open: the rear arm thrown back and
 *   low, near straight, the lead hand up off the knee in front.
 * - 1: the rebound, the hips first: they come back in and the rear heel springs back up on its
 *   ball, the rear knee closing in, while the chest still hangs back nearly upright (8 degrees
 *   of lean against the crouch's 27) with the head on it, chin up (the source drawing); the
 *   arms dangle a beat behind, the feet scrape back under the pushback. She glares through it.
 * - 2, held: back in her get-down, still recoiled: the hips 1.5 px back, the chest 7 degrees up
 *   from the crouch's lean, the rear shoulder shrugged into the collar, the rear fist pulled in
 *   from the ear to cover the jaw; the eyes open, the jaw set. One step from the crouch, whose
 *   clip takes over from its frame 0 at the end of the stun.
 */

/** The crouch's rear heel (degrees up, negative): the ball she springs on. */
const REAR_HEEL = CROUCH.nearFoot.angle ?? 0;

/** 0, through the hitstop: the hips thrown back, the rear heel slammed flat, guard open. */
const SNAP: Pose = {
  ...CROUCH,
  hip: at(-13, 15.6),
  torso: 4,
  head: -28,
  shrug: 0,
  twist: 0.6,
  nearFoot: onToes(CROUCH.nearFoot, 0),
  farFoot: onHeel(CROUCH.farFoot, 10),
  nearFist: at(-34, 27),
  farFist: at(7, 30),
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

/** 1: the hips come back in ahead of the chest, which still hangs back; the arms dangling. */
const REBOUND: Pose = {
  ...CROUCH,
  hip: at(-11.8, 14.2),
  torso: 8,
  head: -14,
  shrug: 1.4,
  twist: 0.5,
  nearFoot: onToes(CROUCH.nearFoot, REAR_HEEL + 8),
  farFoot: onHeel(CROUCH.farFoot, 2),
  nearFist: at(-27, 23),
  farFist: at(6, 27),
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
  effects: [skid(LEAD_TOE, 2.4, 0.45), skid(REAR_TOE, 1.8, 0.4)],
};

/** 2, held to the end of the stun: back in her get-down, still recoiled, glaring. */
const SHAKEN: Pose = {
  ...CROUCH,
  hip: at(-10.5, 14.6),
  torso: 20,
  head: -10,
  shrug: 3,
  twist: 0.36,
  nearFist: at(-3, 40),
  farFist: at(7.5, 26.5),
  face: 'effort',
};

export const POSES: readonly Pose[] = [SNAP, REBOUND, SHAKEN];
