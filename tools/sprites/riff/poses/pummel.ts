import { solve } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, onBall, smear, type Pose } from './common.ts';
import { HOLD, REAR_TOE } from './hold.ts';

export const ANIMATED: boolean = true;

/**
 * pummel (Coup de tête, docs/combat-v2.md §4.3, §11.3): 4 frames, 2, 2, [1], 7 ticks (12), the
 * impact on frame 2 (tick 4), held through its 5-tick hitstop. A headbutt to the face of the
 * opponent she holds (Nayo's held: its frame 1, yanked in, starts again on the impact tick),
 * from hold and back to it. The punk's pummel, nothing like his knee: short, ugly, fast.
 *
 * She rears back, chin up, the upper body tipping away from him (the head travels 7 px back)
 * while the fists stay locked in his collar, hauling on it, the elbows still bent (about 50
 * degrees: tipped further back, the rear arm locked straight from her shoulder to his collar, a
 * long tube, the arm the owner turned down on the Jab, standLight.ts); then she snaps the
 * other way, rising onto the ball of the rear foot, the hips driving in under the shoulders, and
 * smashes her forehead into his face, the chin tucked so the brow leads (the one frame where the
 * head turns past 20 degrees on screen: RotSprite, the brow set, `effort`). The knuckles never
 * leave his collar (at about x 22-26 here): they haul it a pixel or two down onto the blow while
 * the body drives in, so the arms fold and the elbows flare as the head comes through, and the
 * yank shows. A magenta trail follows the head's arc, a small silver star bursts where the heads
 * meet, just above both pairs of eyes (the hitstop and the shake sell the rest). She rocks back
 * off it, chin up, the lid half down (`cool`): unimpressed, the rocking in the head more than in
 * the chest, so that the rear arm stays bent on the grip (47 degrees); the hold loop settles
 * her back into the grip. The fringe whips forward on the snap and flicks back on the recoil by
 * itself.
 */

const headOf = (pose: Pose) => solve(pose, RIFF_BODY).head;

// Frame 0 (2 ticks): the rear-back. The upper body tips away from him, the chin up, the rear
// heel coming down; the fists stay in his collar, the shoulders dragged forward by the grip
// (the rear one 3 px), the elbows bent, hauling.
const REAR: Pose = {
  ...HOLD,
  hip: at(-4, 32.6),
  torso: 13,
  head: -26,
  shrug: 3.2,
  reach: { near: 3, far: 0.8 },
  twist: 0.55,
  nearFoot: onBall(REAR_TOE, -14),
  nearFist: at(20.5, 55),
  farFist: at(20, 49),
};

// Frame 1 (2 ticks): the snap. Up onto the ball of the rear foot, the hips driving in, the head
// coming through ahead of the shoulders; the fists hold the collar, the arms folding.
const DRIVE_BODY: Pose = {
  ...HOLD,
  hip: at(-1.8, 34.2),
  torso: 30,
  head: -16,
  shrug: 2.8,
  twist: 0.3,
  nearFoot: onBall(REAR_TOE, -34),
  nearFist: at(21, 54),
  farFist: at(20.5, 48.5),
  face: 'effort',
};

// Frame 2 (1 tick, the impact, held through the hitstop): the forehead in his face, the chin
// tucked, the fists hauling the collar a pixel down onto it, the elbows flared, the rear heel
// high.
const IMPACT_BODY: Pose = {
  ...HOLD,
  hip: at(-1.4, 34.6),
  torso: 36,
  head: -10,
  shrug: 2.6,
  twist: 0.15,
  nearFoot: onBall(REAR_TOE, -38),
  nearFist: at(20.5, 51),
  farFist: at(21.5, 46),
  face: 'effort',
};

const BACK_HEAD = headOf(REAR);
const SNAP_HEAD = headOf(DRIVE_BODY);
const HIT_HEAD = headOf(IMPACT_BODY);

const DRIVE: Pose = {
  ...DRIVE_BODY,
  effects: [
    smear(
      5,
      [BACK_HEAD.x - 4, BACK_HEAD.y + 4],
      [SNAP_HEAD.x - 3, SNAP_HEAD.y + 5],
      [SNAP_HEAD.x + 2, SNAP_HEAD.y + 5],
    ),
  ],
};

const IMPACT: Pose = {
  ...IMPACT_BODY,
  effects: [
    smear(
      6,
      [BACK_HEAD.x - 2, BACK_HEAD.y + 5],
      [SNAP_HEAD.x, SNAP_HEAD.y + 5],
      [HIT_HEAD.x + 3, HIT_HEAD.y + 4],
    ),
    { kind: 'flash', center: at(21.5, 66.5), radius: 4, tone: 'strike' },
  ],
};

// Frame 3 (7 ticks): she rocks back off it, chin up, unimpressed; the fists back on the hold's
// grip, the rear heel still up. The hold loop settles the rest.
const BACK: Pose = {
  ...HOLD,
  hip: at(-3.5, 32.8),
  torso: 20,
  head: -16,
  shrug: 2.9,
  twist: 0.45,
  nearFoot: onBall(REAR_TOE, -18),
  face: 'cool',
};

export const POSES: readonly Pose[] = [REAR, DRIVE, IMPACT, BACK];
