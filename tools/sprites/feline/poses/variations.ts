/**
 * Moves that share another move's choreography with their own effects and light:
 * - jabRepeat (Double paume, 5 frames): standLight's frames 1-5 with a twin open-palm echo trail;
 * - chainHigh (Enclume, 7 frames): forwardHeavy's Axe Kick frames 2-8 with golden strike energy
 *   gathered on the raised silver shin-greave and golden impact shards.
 */

import type { Effect, Pose } from '../../skeleton.ts';
import { at, smear } from './common.ts';
import { POSES as AXE_KICK } from './forwardHeavy.ts';
import { POSES as DIRECT } from './standLight.ts';

function frameOf(poses: readonly Pose[], frame: number): Pose {
  const pose = poses[frame];
  if (!pose) throw new Error(`No frame ${frame} to take`);
  return pose;
}

function withEffects(
  pose: Pose,
  more: readonly Effect[],
  recolor: (effect: Effect) => Effect = (effect) => effect,
): Pose {
  return { ...pose, effects: [...(pose.effects ?? []).map(recolor), ...more] };
}

const gold = (effect: Effect): Effect =>
  effect.kind === 'smear' ? { ...effect, tone: 'strike' } : effect;

const SNAP = frameOf(DIRECT, 1);
const STRIKE = frameOf(DIRECT, 2);

export const JAB_REPEAT: readonly Pose[] = [
  withEffects(SNAP, [
    smear(2, [17, 62.5], [23, 62.4], [SNAP.nearFist.x - 4, SNAP.nearFist.y + 2.6]),
  ]),
  withEffects(STRIKE, [
    smear(2.5, [19, 56], [26, 56.4], [STRIKE.nearFist.x - 3.4, STRIKE.nearFist.y + 2.4]),
  ]),
  ...DIRECT.slice(3),
];

const CLIMB = frameOf(AXE_KICK, 2);
const TOP = frameOf(AXE_KICK, 3);
const OVER = frameOf(AXE_KICK, 4);
const IMPACT = frameOf(AXE_KICK, 5);

const heelHeat = (pose: Pose, radius: number): Effect => ({
  kind: 'energy',
  center: at(pose.nearFoot.x + 2, pose.nearFoot.y + 1),
  radius,
  tone: 'strike',
});

export const CHAIN_HIGH: readonly Pose[] = [
  withEffects(CLIMB, [heelHeat(CLIMB, 1.8)], gold),
  withEffects(TOP, [heelHeat(TOP, 2.4)], gold),
  withEffects(OVER, [], gold),
  withEffects(
    IMPACT,
    [
      {
        kind: 'shards',
        center: at(IMPACT.nearFoot.x + 4, IMPACT.nearFoot.y),
        radius: 12,
        progress: 0.3,
        tone: 'strike',
      },
    ],
    gold,
  ),
  ...AXE_KICK.slice(6),
];
