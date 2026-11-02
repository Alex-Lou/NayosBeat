/**
 * Moves that used to borrow another move's frames, drawn in their own (docs/art/nayo-essence.md
 * §6): the same poses, so the reach and the timing stay those of the frame data, but their own
 * effects and so their own light. The Double direct is one jab more, its echo still in the air;
 * the Marteau is the Overhand from its fist already loaded, a hammer heating up gold.
 */

import type { Effect, Pose } from '../../skeleton.ts';
import { at, smear } from './common.ts';
import { POSES as OVERHAND } from './forwardHeavy.ts';
import { POSES as DIRECT } from './standLight.ts';

function frameOf(poses: readonly Pose[], frame: number): Pose {
  const pose = poses[frame];
  if (!pose) throw new Error(`No frame ${frame} to take`);
  return pose;
}

/** `pose` with `more` effects, its own recolored by `recolor` first. */
function withEffects(
  pose: Pose,
  more: readonly Effect[],
  recolor: (effect: Effect) => Effect = (effect) => effect,
): Pose {
  return { ...pose, effects: [...(pose.effects ?? []).map(recolor), ...more] };
}

/** The hammer's trail in the strikes' gold, not the sound's cyan. */
const gold = (effect: Effect): Effect =>
  effect.kind === 'smear' ? { ...effect, tone: 'strike' } : effect;

const SNAP = frameOf(DIRECT, 1);
const STRIKE = frameOf(DIRECT, 2);

/**
 * jabRepeat (the Double direct, 5 frames): the Direct's frames 1-5. Out again at once from
 * halfway back: the first jab's streak still hangs in the air above the line as the second one
 * goes out (frames 0-1), a double streak into the knuckles on the active frame, its flash on them.
 */
export const JAB_REPEAT: readonly Pose[] = [
  withEffects(SNAP, [
    smear(2, [17, 62.5], [23, 62.4], [SNAP.nearFist.x - 4, SNAP.nearFist.y + 2.6]),
  ]),
  withEffects(STRIKE, [
    smear(2.5, [19, 56], [26, 56.4], [STRIKE.nearFist.x - 3.4, STRIKE.nearFist.y + 2.4]),
  ]),
  ...DIRECT.slice(3),
];

const CLIMB = frameOf(OVERHAND, 2);
const TOP = frameOf(OVERHAND, 3);
const OVER = frameOf(OVERHAND, 4);
const IMPACT = frameOf(OVERHAND, 5);

/** The heat gathered in the loaded fist, `radius` world px. */
const heat = (pose: Pose, radius: number): Effect => ({
  kind: 'energy',
  center: at(pose.farFist.x, pose.farFist.y + 1),
  radius,
  tone: 'strike',
});

/**
 * chainHigh (the Marteau, 7 frames): the Overhand's frames 2-8. The fist loaded behind the ear
 * glows hotter frame by frame (it lights the cheek and the brow from above, gold), its arc trails
 * gold, and it lands with the heavier hammer's shards.
 */
export const CHAIN_HIGH: readonly Pose[] = [
  withEffects(CLIMB, [heat(CLIMB, 1.4)], gold),
  withEffects(TOP, [heat(TOP, 2)], gold),
  withEffects(OVER, [], gold),
  withEffects(
    IMPACT,
    [
      {
        kind: 'shards',
        center: at(IMPACT.farFist.x + 3, IMPACT.farFist.y - 1),
        radius: 12,
        progress: 0.3,
        tone: 'strike',
      },
    ],
    gold,
  ),
  ...OVERHAND.slice(6),
];
