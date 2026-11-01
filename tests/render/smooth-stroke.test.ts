import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { arcStrip, layLine, paintStroke, sweepOf } from '../../src/render/smooth-stroke';
import { FakeObject, FakeTextures } from './finisher-fakes';

/** Vertices of an arc's strip: 103 points (a cap, 101 on the arc, a cap), two each. */
const LENGTH = 103 * 2 * 4;

interface Vertex {
  readonly x: number;
  readonly y: number;
  readonly u: number;
  readonly v: number;
}

/** The strip of an arc, point by point: its vertex inside, its vertex outside. */
function strip(radius: number, width: number, start: number, sweep: number) {
  const out = new Array<number>(LENGTH).fill(Number.NaN);
  arcStrip(out, radius, width, start, sweep);
  const vertex = (at: number): Vertex => ({
    x: out[at] ?? Number.NaN,
    y: out[at + 1] ?? Number.NaN,
    u: out[at + 2] ?? Number.NaN,
    v: out[at + 3] ?? Number.NaN,
  });
  return Array.from({ length: LENGTH / 8 }, (_, point) => ({
    inside: vertex(point * 8),
    outside: vertex(point * 8 + 4),
  }));
}

/** Where the texture's v reads `v` between a point's two vertices. */
function across(point: { inside: Vertex; outside: Vertex }, v: number): Vertex {
  const { inside, outside } = point;
  return {
    x: inside.x + (outside.x - inside.x) * v,
    y: inside.y + (outside.y - inside.y) * v,
    u: inside.u,
    v,
  };
}

const degrees = (angle: number): number => (angle * 180) / Math.PI;

describe('an arc drawn smooth (smooth-stroke.ts)', () => {
  it('reads its sweep as the engine’s Arc does', () => {
    // The hold's ring: from the top, a whole turn, half of it, none, either way.
    expect(sweepOf(-90, 270, false)).toBe(360);
    expect(sweepOf(-90, 90, false)).toBe(180);
    expect(sweepOf(-90, -270, true)).toBe(-180);
    expect(sweepOf(-90, -450, true)).toBe(-360);
    expect(sweepOf(-90, -90, false)).toBe(0);
    expect(sweepOf(-90, -90, true)).toBe(0);
    // Past a whole turn, or the wrong way round: as Arc.js clamps and wraps them.
    expect(sweepOf(0, 400, false)).toBe(360);
    expect(sweepOf(0, -90, false)).toBe(270);
    expect(sweepOf(0, 90, true)).toBe(-270);
  });

  it('lays its opaque texel on the stroke: as thick, centered on the radius, along the arc', () => {
    const points = strip(30, 3, -90, 200);
    const arc = points.slice(1, -1);
    expect(arc).toHaveLength(101);
    arc.forEach((point, i) => {
      for (const [v, radius] of [
        [1 / 3, 28.5],
        [2 / 3, 31.5],
      ] as const) {
        const edge = across(point, v);
        expect(Math.hypot(edge.x, edge.y)).toBeCloseTo(radius, 9);
        expect(degrees(Math.atan2(edge.y, edge.x))).toBeCloseTo(-90 + (200 * i) / 100, 9);
      }
      expect([point.inside.v, point.outside.v]).toEqual([0, 1]);
    });
    // Along it, u crosses the opaque texel: the arc's ends on its edges.
    expect(arc[0]?.inside.u).toBeCloseTo(1 / 3, 12);
    expect(arc[100]?.inside.u).toBeCloseTo(2 / 3, 12);
  });

  it('caps each end with a clear texel past it along the tangent, either way round', () => {
    for (const sweep of [200, -200]) {
      const points = strip(30, 3, -90, sweep);
      const first = points[1];
      const last = points[101];
      const before = points[0];
      const after = points[102];
      if (!first || !last || !before || !after) throw new Error('a strip of 103 points');
      // At the top, the arc leaves rightward (clockwise) or leftward: its start cap behind it.
      const way = Math.sign(sweep);
      expect(before.inside.x - first.inside.x).toBeCloseTo(-3 * way, 9);
      expect(before.inside.y - first.inside.y).toBeCloseTo(0, 9);
      expect([before.inside.u, after.inside.u]).toEqual([0, 1]);
      // Past the end, one texel (the stroke's width) on, square to the radius.
      const end = ((-90 + sweep) * Math.PI) / 180;
      const tangent = { x: -Math.sin(end) * way, y: Math.cos(end) * way };
      expect(after.outside.x - last.outside.x).toBeCloseTo(3 * tangent.x, 9);
      expect(after.outside.y - last.outside.y).toBeCloseTo(3 * tangent.y, 9);
    }
  });

  it('meets itself on a whole turn: no caps, the texture opaque all along', () => {
    const points = strip(30, 3, -90, 360);
    const first = points[1];
    const last = points[101];
    if (!first || !last) throw new Error('a strip of 103 points');
    expect(last.inside.x).toBeCloseTo(first.inside.x, 9);
    expect(last.inside.y).toBeCloseTo(first.inside.y, 9);
    expect(points[0]).toEqual(first);
    expect(points[102]).toEqual(last);
    expect(points.every((point) => point.inside.u === 0.5 && point.outside.u === 0.5)).toBe(true);
  });

  it('covers nothing when empty: every vertex on the start’s radius', () => {
    const points = strip(30, 3, -90, 0);
    for (const { inside, outside } of points) {
      expect([inside.x, outside.x].map((x) => Math.abs(x) < 1e-9)).toEqual([true, true]);
    }
  });
});

describe('a line drawn smooth (smooth-stroke.ts)', () => {
  it('stretches its opaque texel from one end to the other, as thick as the line', () => {
    const image = new FakeObject();
    layLine(image as unknown as Phaser.GameObjects.Image, 10, 20, 70, 100, 1);
    // The middle third of a frame of three texels, stretched: the line's length, centered.
    const half = image.scaleX / 2;
    const ends = [-half, half].map((d) => [
      image.x + Math.cos(image.rotation) * d,
      image.y + Math.sin(image.rotation) * d,
    ]);
    expect(ends[0]?.[0]).toBeCloseTo(10, 9);
    expect(ends[0]?.[1]).toBeCloseTo(20, 9);
    expect(ends[1]?.[0]).toBeCloseTo(70, 9);
    expect(ends[1]?.[1]).toBeCloseTo(100, 9);
    expect(image.scaleY).toBe(1);
  });
});

describe('the stroke’s texture (smooth-stroke.ts)', () => {
  it('is one texel of its color in a clear frame, smoothed by the shader, painted once', () => {
    const textures = new FakeTextures();
    const scene = { textures } as unknown as Phaser.Scene;
    paintStroke(scene, 'stroke', 0xd8e0ec);
    paintStroke(scene, 'stroke', 0xffffff);
    expect(textures.keys()).toEqual(['stroke']);
    expect([...(textures.painted.get('stroke') ?? [])]).toEqual([['1,1', '#d8e0ec']]);
    expect(textures.made.get('stroke')?.smoothPixelArt).toBe(true);
  });
});
