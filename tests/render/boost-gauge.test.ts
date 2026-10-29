import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { BOOST_MAX } from '../../src/core/rules';
import {
  BLINK_TICKS,
  blinkOn,
  BoostGauge,
  GAUGE_STEP,
  segmentSteps,
} from '../../src/render/boost-gauge';

/** An engine text or rectangle standing in for the real one: it records its repaints. */
class FakeShape {
  readonly repaints: string[] = [];
  width: number;
  fill: number;
  rim: number | undefined;
  alpha = 1;
  color: string;
  constructor(width = 0, fill = 0, color = '') {
    this.width = width;
    this.fill = fill;
    this.color = color;
  }
  setScrollFactor(): this {
    return this;
  }
  setDepth(): this {
    return this;
  }
  setOrigin(): this {
    return this;
  }
  setStrokeStyle(width?: number, color?: number): this {
    this.repaints.push('rim');
    this.rim = width === undefined ? undefined : color;
    return this;
  }
  setSize(width: number): this {
    this.repaints.push('size');
    this.width = width;
    return this;
  }
  setFillStyle(color: number): this {
    this.repaints.push('fill');
    this.fill = color;
    return this;
  }
  setAlpha(alpha: number): this {
    this.repaints.push('alpha');
    this.alpha = alpha;
    return this;
  }
  setColor(color: string): this {
    this.repaints.push('color');
    this.color = color;
    return this;
  }
}

const ENERGY = 0x00e5ff;

/** A gauge on a fake scene: its word, then each segment's track and fill. */
function gaugeOn(): { gauge: BoostGauge; word: FakeShape; fills: FakeShape[] } {
  const shapes: FakeShape[] = [];
  let word = new FakeShape();
  const scene = {
    add: {
      text: (_x: number, _y: number, _text: string, style: { color?: string }) => {
        word = new FakeShape(0, 0, style.color);
        return word;
      },
      rectangle: (_x: number, _y: number, width: number, _height: number, fill: number) => {
        const shape = new FakeShape(width, fill);
        shapes.push(shape);
        return shape;
      },
    },
  } as unknown as Phaser.Scene;
  const gauge = new BoostGauge(scene, 8, 30, 1, ENERGY, {});
  // Each segment's track, then its fill.
  return { gauge, word, fills: shapes.filter((_, index) => index % 2 === 1) };
}

const repaintsOf = (shapes: readonly FakeShape[]): number =>
  shapes.reduce((count, shape) => count + shape.repaints.length, 0);

describe('the Boost gauge on the HUD (docs/combos-v3.md §1.8.6)', () => {
  it('fills each segment in steps of 1/20 of a bar, the outer one first', () => {
    expect([0, 1, 2].map((segment) => segmentSteps(1050, segment))).toEqual([20, 1, 0]);
    expect([0, 1, 2].map((segment) => segmentSteps(BOOST_MAX, segment))).toEqual([20, 20, 20]);
    expect(segmentSteps(49, 0)).toBe(0);
  });

  it('repaints only when the gauge moves by a step', () => {
    const { gauge, word, fills } = gaugeOn();
    gauge.update(0, 0);
    const painted = repaintsOf([word, ...fills]);
    gauge.update(GAUGE_STEP - 1, 1);
    gauge.update(GAUGE_STEP - 1, 2);
    expect(repaintsOf([word, ...fills])).toBe(painted);
    gauge.update(GAUGE_STEP, 3);
    expect(repaintsOf([word, ...fills])).toBeGreaterThan(painted);
  });

  it('draws the full bars platine white rimmed with the energy color, the one filling in it', () => {
    const { gauge, fills } = gaugeOn();
    gauge.update(1500, 0);
    expect(fills.map(({ fill }) => fill)).toEqual([0xffffff, ENERGY, ENERGY]);
    expect(fills.map(({ rim }) => rim)).toEqual([ENERGY, undefined, undefined]);
    expect(fills.map(({ width }) => width)).toEqual([40, 20, 0]);
  });

  it('full, turns its word white and blinks it at 2 Hz, 3 at most (D21)', () => {
    expect(BLINK_TICKS).toBeGreaterThanOrEqual(10);
    const { gauge, word } = gaugeOn();
    const shown: number[] = [];
    for (let frame = 0; frame < 60; frame++) {
      gauge.update(BOOST_MAX, frame);
      shown.push(word.alpha);
    }
    expect(word.color).toBe('#ffffff');
    // On, then off, 15 ticks each: two blinks a second.
    const changes = shown.filter((alpha, frame) => frame > 0 && alpha !== shown[frame - 1]);
    expect(changes).toHaveLength(3);
    expect(shown.slice(0, BLINK_TICKS).every((alpha) => alpha === 1)).toBe(true);
    expect(blinkOn(BLINK_TICKS)).toBe(false);
    // Spent, it stops blinking and takes its color back.
    gauge.update(BOOST_MAX - 1000, 60);
    expect(word.alpha).toBe(1);
    expect(word.color).toBe('#00e5ff');
  });
});
