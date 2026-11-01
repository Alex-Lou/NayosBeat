import { describe, expect, it } from 'vitest';
import { FinisherProps } from '../../src/render/finisher-props';
import { fakeStage, type FakeObject } from './finisher-fakes';

/** A scratch across the flat, in world pixels. */
const SCRATCH = { x1: 10, y1: 20, x2: 410, y2: 220 } as const;

/** The ends of a smooth line's opaque texel: the middle third of its stretched frame. */
function ends(image: FakeObject): number[][] {
  const half = image.scaleX / 2;
  return [-half, half].map((d) => [
    image.x + Math.cos(image.rotation) * d,
    image.y + Math.sin(image.rotation) * d,
  ]);
}

describe("the needle's scratch (docs/finisher.md §3.5)", () => {
  it('is a smooth stroke with WebGL: from its start to the share drawn, 1 px thick', () => {
    const { scene, made, textures } = fakeStage();
    const props = new FinisherProps(scene, 400, 1000, 'full');
    const [needle] = made.images;
    if (!needle) throw new Error('the needle is an image');
    expect(needle.visible).toBe(false);

    props.showNeedle(SCRATCH, 0.5);
    expect(needle.visible).toBe(true);
    const [start, tip] = ends(needle);
    expect(start?.[0]).toBeCloseTo(10, 9);
    expect(start?.[1]).toBeCloseTo(20, 9);
    expect(tip?.[0]).toBeCloseTo(210, 9);
    expect(tip?.[1]).toBeCloseTo(120, 9);
    expect(needle.scaleY).toBe(1);

    props.showNeedle(SCRATCH, 0);
    expect(needle.visible).toBe(false);
    props.showNeedle(SCRATCH, 1);
    props.hide();
    expect(needle.visible).toBe(false);
    // Its texture: one texel of its silver.
    expect([...(textures.painted.get('finisher:needle') ?? [])]).toEqual([['1,1', '#d8e0ec']]);
  });

  it('is a line drawn by Canvas, which smooths it itself: no texture made', () => {
    const { scene, made, textures } = fakeStage();
    const props = new FinisherProps(scene, 400, 1000, 'simple');
    // The cone, then the needle, then the studs.
    const needle = made.graphics[1];
    if (!needle) throw new Error('the needle is a graphics');
    props.showNeedle(SCRATCH, 0.5);
    expect([needle.visible, needle.draws]).toEqual([true, 1]);
    props.hide();
    expect(needle.visible).toBe(false);
    expect(made.images).toEqual([]);
    expect(textures.keys()).toEqual([]);
  });
});
