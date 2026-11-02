import { at, behindBack, GUARD, onBall, planted, raised, type Pose } from './common.ts';

/**
 * Her round poses (docs/art/univers.md): played on the round clock.
 *
 * - intro (10 frames of 9 ticks, the 90-tick entrance): she walks in without hurrying, bows to
 *   the room, a hand on her chest, the other at her back, and falls into her guard on the long
 *   beat.
 * - victory (8 frames, 6, 6, 6, 6, then 8, 8, 8, 8 looping from 4): she bows to the opponent on
 *   the floor, a hand on her chest; the back face of the mask watches the room.
 * - timeOver (4 frames of 10, looping): she looks at the watch on her lead wrist, winds it, and
 *   bows all the same.
 */

/** The lead hand on her chest, the other at her back. */
const handOnChest = (pose: Pose): Pose => ({
  ...pose,
  nearFist: at(pose.hip.x + 9 + Math.sin((pose.torso * Math.PI) / 180) * 12, pose.hip.y + 10),
  nearHand: 'open',
  bends: { ...pose.bends, nearElbow: 'down' },
});

/** A bow, `depth` degrees forward, the head lowered with it. */
const bow = (depth: number, hipY = 34): Pose =>
  handOnChest(behindBack({ ...GUARD, hip: at(-3, hipY), torso: depth, head: depth / 3 }));

/** Walking in, the feet at `lead` and `rear`, the lead one in the air when `lift` > 0. */
const step = (lead: number, rear: number, lift: number, hipY: number): Pose =>
  behindBack({
    ...GUARD,
    hip: at(-3, hipY),
    torso: 2,
    nearFoot: lift > 0 ? raised(lead, 4.2 + lift, -15) : onBall(lead, -24),
    farFoot: planted(rear, -6),
  });

export const INTRO: readonly Pose[] = [
  step(-6, -16, 3, 34.5),
  step(4, -14, 0, 33.5),
  step(-2, -8, 0, 34),
  step(10, -12, 2.5, 34.5),
  step(10, -13, 0, 34),
  bow(16),
  bow(34, 33.5),
  bow(36, 33.5),
  bow(14),
  GUARD,
];

export const VICTORY: readonly Pose[] = [
  GUARD,
  bow(10),
  bow(24),
  bow(34, 33.5),
  bow(38, 33.5),
  bow(37, 33.5),
  bow(38, 33),
  bow(37, 33.5),
];

/** The lead wrist up in front of the mask: her watch. */
const watch = (y: number, x = 9): Pose => ({
  ...behindBack({ ...GUARD, hip: at(-3, 34), torso: 4, head: 12 }),
  nearFist: at(x, y),
  bends: { ...GUARD.bends, nearElbow: 'down', farElbow: 'back' },
});

export const TIME_OVER: readonly Pose[] = [watch(58), watch(59, 10), watch(57), bow(20)];
