/**
 * Small drawing helpers shared by the fighters' looks: folds at the joints, bands across limbs,
 * head-local points.
 */

import type { Material, PixelCanvas, Point } from './raster.ts';
import { add, radians, scale, sub, type Skeleton } from './skeleton.ts';

/** Where to draw: the canvas and the world point (character space) to cell pixel mapping. */
export interface Pen {
  readonly canvas: PixelCanvas;
  readonly at: (p: Point) => Point;
}

/** Head-local offsets (x toward the face, y up, turned with the head) to world points. */
export function headLocal(s: Skeleton): (dx: number, dy: number) => Point {
  const angle = radians(s.headAngle);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return (dx, dy) => add(s.head, { x: dx * cos + dy * sin, y: -dx * sin + dy * cos });
}

/** Two short folds on the inside of a bent joint (elbow, knee), in the material's shadow. */
export function creases(
  ctx: Pen,
  root: Point,
  joint: Point,
  end: Point,
  material: Material,
  group: string,
): void {
  const a = unit(sub(root, joint));
  const b = unit(sub(end, joint));
  // Inside of the bend: between the two segments.
  const inside = unit(add(a, b));
  const bent = Math.hypot(inside.x, inside.y) > 0.1 && a.x * b.x + a.y * b.y > -0.94;
  if (!bent) return;
  const fold = { ...material, base: material.deep, light: material.shadow, shadow: material.deep };
  for (const [along, length] of [
    [0.9, 2.0],
    [-0.9, 1.6],
  ] as const) {
    const start = add(
      add(joint, scale(inside, 1.4)),
      scale(a.x * along > 0 ? a : b, Math.abs(along)),
    );
    const tip = add(start, scale(inside, -length));
    const across = { x: -inside.y * 0.25, y: inside.x * 0.25 };
    ctx.canvas.decal(
      [
        ctx.at(add(start, across)),
        ctx.at(add(tip, across)),
        ctx.at(sub(tip, across)),
        ctx.at(sub(start, across)),
      ],
      fold,
      group,
    );
  }
}

/** Thin bands across a limb segment, at fractions `ts` of its length. */
export function stripeAcross(
  ctx: Pen,
  from: Point,
  to: Point,
  ts: readonly number[],
  material: Material,
  halfWidth: number,
  group: string,
): void {
  const along = sub(to, from);
  const u = unit(along);
  const v = { x: -u.y, y: u.x };
  const band = 0.22;
  for (const t of ts) {
    const a = add(from, scale(along, t));
    const corner = (du: number, dv: number): Point =>
      ctx.at(add(a, add(scale(u, du), scale(v, dv))));
    ctx.canvas.decal(
      [
        corner(-band, -halfWidth),
        corner(band, -halfWidth),
        corner(band, halfWidth),
        corner(-band, halfWidth),
      ],
      material,
      group,
    );
  }
}

export function unit(p: Point): Point {
  const length = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / length, y: p.y / length };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
