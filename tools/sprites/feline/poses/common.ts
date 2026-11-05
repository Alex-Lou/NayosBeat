/**
 * Shared vocabulary of Feline's animation: authoring helpers and reference poses.
 */

import type { Point } from '../../raster.ts';
import { blend, planted, type Effect, type Foot, type Pose } from '../../skeleton.ts';

export { blend, planted, type Effect, type Foot, type Pose };

export const at = (x: number, y: number): Point => ({ x, y });

export function lifted(foot: Foot, height: number): Foot {
  return { ...foot, y: foot.y + height };
}

export function smear(width: number, ...points: readonly (readonly [number, number])[]): Effect {
  return { kind: 'smear', width, points: points.map(([x, y]) => at(x, y)) };
}

export function energy(x: number, y: number, radius: number): Effect {
  return { kind: 'energy', center: at(x, y), radius };
}

export const ease = {
  linear: (t: number): number => t,
  out: (t: number): number => 1 - (1 - t) * (1 - t),
  in: (t: number): number => t * t,
  inOut: (t: number): number => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
} as const;

export function tween(
  a: Pose,
  b: Pose,
  t: number,
  curve: (t: number) => number = ease.inOut,
): Pose {
  return blend(a, b, curve(t));
}

/**
 * Feline's guard (matching `poing_01_garde.png` of Pack_01 & `01_garde_depart.png` of Pack_02):
 * Agile cat-fighter boxer-kickboxer guard: near gloved fist poised at chin/collar height (`x = 9.2,
 * y = 52.5`) with elbow down so her bare deltoid and cyan `▼` triangle are in full view; far gloved
 * fist raised forward at `x = 12.2, y = 57.5`; long C-hook white tail and high ponytail framing her
 * silhouette.
 */
export const GUARD: Pose = {
  hip: at(-6.6, 36.5),
  torso: 13,
  head: 2,
  shrug: 1.0,
  twist: 0.25,
  nearFoot: planted(6.35, -2),
  farFoot: planted(-22, -15),
  nearFist: at(8.6, 52.5),
  farFist: at(8.8, 57.5),
  nearHand: 'fist',
  farHand: 'fist',
  bends: { nearElbow: 'down', farElbow: 'down' },
};

export const CROUCH: Pose = {
  hip: at(-2, 21),
  torso: 36,
  head: -12,
  shrug: 2,
  nearFoot: planted(9),
  farFoot: planted(-11, -14),
  nearFist: at(12.2, 35.5),
  farFist: at(10.5, 44.5),
  nearHand: 'fist',
  farHand: 'fist',
};
