import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, onHeel, toeOf, type Effect, type Foot, type Pose } from './common.ts';
import { CROUCH } from './crouch.ts';

export const ANIMATED: boolean = true;

/**
 * hitCrouch (docs/combat-v2.md §9.4, §11.1): 3 frames, 3, 4 ticks, the last held to the end of
 * the stun. Any blow that lands while she crouches: the same whiplash as her standing hit, low,
 * out of her get-down and back into it. Her knees bend toward her toes throughout, as in the
 * crouch: the rear knee forward and low over the floor, the rear boot on its ball, its heel only
 * as low as the ankle lets it come (MIN_ANKLE, common.ts), the lead knee up over its foot.
 *
 * - 0, held through the hitstop: the jolt is in the hips, thrown 3.5 px back and up over the
 *   rear foot, the rear knee lifted off the floor with them and the heel knocked down a few
 *   degrees; the lead toes pop up; the chest snapped upright out of its lean and the head whipped
 *   back over it (24 degrees on screen: the head turns); the guard blown open, hands open: the
 *   rear arm flung back and low, nearly straight, the elbow soft (bent the way an elbow bends),
 *   the lead hand up in front, at the height of the chest.
 * - 1: the rebound, the hips first: they come back in and down and the rear heel springs back
 *   up on its ball, while the chest still hangs back nearly upright (10 degrees of lean against
 *   the crouch's 35) with the head on it, chin up (the source drawing); the arms dangle a beat
 *   behind, the feet scrape back under the pushback. She glares through it.
 * - 2, held: back in her get-down, still recoiled: the hips 1.5 px back, the chest 7 degrees up
 *   from the crouch's lean, the rear shoulder shrugged into the collar, the rear fist pulled in
 *   tight under the jaw (the elbow down on the ribs, the forearm up across the chest, a hair
 *   higher than in the crouch, never over the mouth); the eyes open, the jaw set. One step from
 *   the crouch, whose clip takes over from its frame 0 at the end of the stun.
 */

/** Dust kicked up by a foot scraping back under the blow (the pushback slides her). */
function skid(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

/** `foot` turned to `angle` on its ball: the toe stays on its floor pixel, the heel swings. */
function onToes(foot: Foot, angle: number): Foot {
  return onBall(toeOf(foot), angle);
}

/** Where the lead and rear toes scrape on the floor. */
const LEAD_TOE = toeOf(GUARD.farFoot);
const REAR_TOE = toeOf(GUARD.nearFoot);

/** The crouch's rear heel (degrees up, negative): the ball she springs on. */
const REAR_HEEL = CROUCH.nearFoot.angle ?? 0;

/** `pose` with its rear fist placed from its head (world px): tucked under the jaw. */
function byJaw(pose: Pose, offset: Point): Pose {
  const { head } = solve(pose, RIFF_BODY);
  return { ...pose, nearFist: at(head.x + offset.x, head.y + offset.y) };
}

/** 0, through the hitstop: the hips thrown back, the chest snapped up, the guard blown open. */
const SNAP: Pose = {
  ...CROUCH,
  hip: at(-17, 16.2),
  torso: 5,
  head: -29,
  shrug: 0,
  twist: 0.6,
  nearFoot: onToes(CROUCH.nearFoot, REAR_HEEL + 8),
  farFoot: onHeel(CROUCH.farFoot, 10),
  nearFist: at(-32.5, 20),
  farFist: at(4.5, 29.5),
  nearHand: 'open',
  farHand: 'open',
  bends: { ...CROUCH.bends, nearElbow: 'up', farElbow: 'down' },
  face: 'hurt',
};

/** 1: the hips come back in ahead of the chest, which still hangs back; the arms dangling. */
const REBOUND: Pose = {
  ...CROUCH,
  hip: at(-15.5, 16.6),
  torso: 10,
  head: -14,
  shrug: 1.4,
  twist: 0.5,
  nearFoot: onToes(CROUCH.nearFoot, REAR_HEEL + 2),
  farFoot: onHeel(CROUCH.farFoot, 2),
  nearFist: at(-25.5, 20),
  farFist: at(4.5, 26.5),
  nearHand: 'open',
  farHand: 'open',
  bends: { ...CROUCH.bends, nearElbow: 'up', farElbow: 'down' },
  face: 'effort',
  effects: [skid(LEAD_TOE, 2.4, 0.45), skid(REAR_TOE, 1.8, 0.4)],
};

/** 2, held to the end of the stun: back in her get-down, still recoiled, glaring. */
const SHAKEN: Pose = byJaw(
  {
    ...CROUCH,
    hip: at(-14.5, 17.7),
    torso: 28,
    head: -18,
    shrug: 3,
    twist: 0.36,
    nearFoot: onToes(CROUCH.nearFoot, REAR_HEEL + 1),
    farFist: at(7.5, 28),
    face: 'effort',
  },
  at(1.6, -11),
);

export const POSES: readonly Pose[] = [SNAP, REBOUND, SHAKEN];
