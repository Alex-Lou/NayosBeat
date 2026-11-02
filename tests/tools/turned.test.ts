import { describe, expect, it } from 'vitest';
import { anatomyIssues } from '../../tools/sprites/anatomy';
import { GUARD as NAYO_GUARD } from '../../tools/sprites/nayo/poses/common';
import { GUARD as RIFF_GUARD } from '../../tools/sprites/riff/poses/common';
import { RIFF_BODY } from '../../tools/sprites/riff/body';
import type { Point } from '../../tools/sprites/raster';
import {
  BODY,
  solve,
  type Body,
  type Pose,
  type Side,
  type Skeleton,
} from '../../tools/sprites/skeleton';

/** Every joint of a side, by name. */
function joints(side: Side): Readonly<Record<string, Point>> {
  const { shoulder, elbow, wrist, hip, knee, ankle, heel, toe } = side;
  return { shoulder, elbow, wrist, hip, knee, ankle, heel, toe };
}

/** A point mirrored around the vertical through `x0`. */
const flip = (p: Point, x0: number): Point => ({ x: 2 * x0 - p.x, y: p.y });

function expectMirrored(turned: Skeleton, plain: Skeleton): void {
  const x0 = plain.hip.x;
  expect(turned.turned).toBe(true);
  expect(plain.turned).toBe(false);
  expect(turned.hip).toEqual(plain.hip);
  for (const key of ['neck', 'head'] as const) {
    expect(turned[key].x).toBeCloseTo(flip(plain[key], x0).x, 9);
    expect(turned[key].y).toBeCloseTo(plain[key].y, 9);
  }
  expect(turned.headAngle).toBeCloseTo(-plain.headAngle, 9);
  expect(turned.front.x).toBeCloseTo(-plain.front.x, 9);
  expect(turned.up.x).toBeCloseTo(-plain.up.x, 9);
  for (const name of ['near', 'far'] as const) {
    const a = joints(turned[name]);
    const b = joints(plain[name]);
    for (const [joint, point] of Object.entries(b)) {
      expect(a[joint]?.x, `${name} ${joint}`).toBeCloseTo(flip(point, x0).x, 9);
      expect(a[joint]?.y, `${name} ${joint}`).toBeCloseTo(point.y, 9);
    }
  }
}

const CASES: readonly (readonly [string, Pose, Body])[] = [
  ['Nayo', NAYO_GUARD, BODY],
  ['Riff', RIFF_GUARD, RIFF_BODY],
  ['a spun pose', { ...NAYO_GUARD, spin: 40 }, BODY],
];

describe('a turned pose (Pose.turned)', () => {
  it.each(CASES)('%s: the same body mirrored around the hip', (_, pose, body) => {
    expectMirrored(solve({ ...pose, turned: true }, body), solve(pose, body));
  });

  it.each(CASES)('%s: anatomy measured before the mirror', (_, pose, body) => {
    expect(anatomyIssues({ ...pose, turned: true }, body)).toEqual(anatomyIssues(pose, body));
  });

  it('a pose is not turned unless it says so', () => {
    expect(solve(NAYO_GUARD).turned).toBe(false);
    expect(solve({ ...NAYO_GUARD, turned: false }).turned).toBe(false);
  });
});
