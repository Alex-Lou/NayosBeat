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
 * The guard of the savate: upright and in profile, the weight on the rear leg, the lead heel up
 * so the front foot can leave at once; the lead fist out at chin height, the rear one by the
 * chin, elbows in. She stands taller than Nayo's crouched boxer and lighter than Riff's base:
 * ready to step out as much as in (docs/saphir.md §9). The torso nearly upright (2 degrees),
 * the head over the back and not ahead of it; head angle 2, under head.ts's 20: the mask is the
 * one drawn, never turned.
 */
export const GUARD: Pose = {
  hip: at(-3, 35.5),
  torso: 2,
  head: 0,
  nearFoot: planted(8, -12),
  farFoot: planted(-14),
  nearFist: at(12, 54),
  farFist: at(7, 56.5),
  bends: { nearElbow: 'down', farElbow: 'down' },
};
