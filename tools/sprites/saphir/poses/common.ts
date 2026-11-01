/**
 * Shared vocabulary of Saphir's animation: the reference poses every strip starts from.
 * Character space (see skeleton.ts): feet anchor at the origin, x toward the opponent, y up, in
 * world pixels; a flat foot on the ground has its ankle at SAPHIR_BODY.ankle.
 */

import type { Point } from '../../raster.ts';
import { blend, planted as plantedOn, type Effect, type Foot, type Pose } from '../../skeleton.ts';
import { SAPHIR_BODY } from '../body.ts';

export { blend, type Effect, type Foot, type Pose };

export const at = (x: number, y: number): Point => ({ x, y });

/** A foot planted at `x` on her own shoes (see skeleton.ts). */
export function planted(x: number, angle = 0): Foot {
  return plantedOn(x, angle, SAPHIR_BODY);
}

/** Motion trail of a fast limb through `points` (tail first), `width` px wide at the limb. */
export function smear(width: number, ...points: readonly (readonly [number, number])[]): Effect {
  return { kind: 'smear', width, points: points.map(([x, y]) => at(x, y)) };
}

/** A foot off the floor, its ankle at (`x`, `y`), turned `angle` degrees (positive: toes up). */
export function raised(x: number, y: number, angle = 0): Foot {
  return { x, y, angle };
}

/**
 * Where her hands rest with the torso of `pose`: clasped at the small of her back, the elbows
 * out behind her. Her signature (docs/saphir.md §9): she fights with her legs alone, the hands
 * leave her back only to grab.
 */
export function behindBack(pose: Pose): Pose {
  const t = (pose.torso * Math.PI) / 180;
  const up = { x: Math.sin(t), y: Math.cos(t) };
  const back = { x: -Math.cos(t), y: Math.sin(t) };
  const hand = (distance: number, behind: number): Point =>
    at(
      pose.hip.x + up.x * distance + back.x * behind,
      pose.hip.y + up.y * distance + back.y * behind,
    );
  return {
    ...pose,
    nearFist: hand(3, 3.5),
    farFist: hand(3.5, 3),
    bends: { ...pose.bends, nearElbow: 'back', farElbow: 'back' },
  };
}

/**
 * The guard, her signature: upright and in profile, the hands clasped at the small of her back,
 * the chin up, the weight on the rear leg and the lead foot on its toes, poised like a dancer's:
 * she will fight with her legs alone (docs/saphir.md §9). Nothing like Nayo's crouched boxer or
 * Riff's brawler: no fists up, nothing to read but the feet. The torso nearly upright (2
 * degrees), the head over the back and not ahead of it, raised a little; under head.ts's 20
 * degrees, the mask is the one drawn, never turned.
 */
export const GUARD: Pose = behindBack({
  hip: at(-3, 35.5),
  torso: 2,
  head: -3,
  nearFoot: planted(8, -24),
  farFoot: planted(-14),
  nearFist: at(0, 0),
  farFist: at(0, 0),
});
