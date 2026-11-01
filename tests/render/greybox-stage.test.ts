import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import {
  drawGreyboxStage,
  FLOOR,
  GROUND_Y,
  WALL,
  type GreyboxLook,
} from '../../src/render/greybox-stage';
import { over, relativeLuminance } from '../../src/render/luminance';
import { VIEW_SIZE } from '../../src/render/view';

const WIDTH = 960;
const HEIGHT = VIEW_SIZE.height;
const SKY = 0x1b1b2f;
const GROUND = 0x3a3a5c;

/** The stage as drawn: each world pixel's color, and how many screen borders were stroked. */
interface Painted {
  at(x: number, y: number): number;
  readonly borders: number;
  /** Graphics made: the stage is drawn once, into one (two with the border). */
  readonly graphics: number;
}

/**
 * Draws the grey box into a fake scene that paints what its Graphics fill, pixel by pixel, over
 * the camera's background, blended as WebGL does (luminance.ts `over`).
 */
function paint(look: Partial<GreyboxLook> = {}): Painted {
  const pixels = new Uint32Array(WIDTH * HEIGHT);
  let borders = 0;
  let graphics = 0;
  const makeGraphics = () => {
    graphics++;
    let color = 0;
    let alpha = 1;
    let fixed = false;
    const object = {
      fillStyle(fill: number, opacity = 1) {
        color = fill;
        alpha = opacity;
        return object;
      },
      fillRect(x: number, y: number, width: number, height: number) {
        if (fixed) throw new Error('The screen border is stroked, never filled');
        for (let row = Math.max(0, y); row < Math.min(HEIGHT, y + height); row++) {
          for (let column = Math.max(0, x); column < Math.min(WIDTH, x + width); column++) {
            const i = row * WIDTH + column;
            pixels[i] = over(color, pixels[i] ?? 0, alpha);
          }
        }
        return object;
      },
      lineStyle: () => object,
      strokeRect() {
        borders++;
        return object;
      },
      setScrollFactor(factor: number) {
        fixed = factor === 0;
        return object;
      },
      setDepth: () => object,
    };
    return object;
  };
  const scene = {
    cameras: { main: { setBackgroundColor: (color: number) => pixels.fill(color) } },
    add: { graphics: makeGraphics },
  } as unknown as Phaser.Scene;
  drawGreyboxStage(scene, WIDTH, { debug: false, ...look });
  return {
    at: (x, y) => pixels[y * WIDTH + x] ?? Number.NaN,
    borders,
    graphics,
  };
}

/** Away from the walls and the floor darkening at their foot. */
const OPEN = { from: WALL.shade.width + 8, to: WIDTH - WALL.shade.width - 8 };

describe('the grey box floor measures distances (docs/polish/AUDIT-ET-PLAN.md P9)', () => {
  const stage = paint();

  it('draws a light horizon on the ground line, the sky just above it', () => {
    for (let x = OPEN.from; x < OPEN.to; x++) {
      expect(stage.at(x, GROUND_Y)).toBe(FLOOR.horizon);
      expect(stage.at(x, GROUND_Y - 1)).toBe(SKY);
    }
  });

  it('hangs a 1×4 tick every 16 world px, a 2×6 one every 64, from the horizon', () => {
    const ticks = { short: [] as number[], long: [] as number[] };
    for (let x = OPEN.from; x < OPEN.to; x++) {
      const column = Array.from({ length: 8 }, (_, dy) => stage.at(x, GROUND_Y + 1 + dy));
      const depth = column.findIndex((color) => color !== FLOOR.tick);
      // Under each tick, the ground again.
      expect(column[depth]).toBe(GROUND);
      if (depth === 4) ticks.short.push(x);
      else if (depth === 6) ticks.long.push(x);
      else expect(depth).toBe(0);
    }
    const xs = Array.from({ length: OPEN.to - OPEN.from }, (_, i) => OPEN.from + i);
    // A long tick is 2 px wide, from each multiple of 64; a short one at each other 16.
    expect(ticks.long).toEqual(xs.filter((x) => x % 64 === 0 || x % 64 === 1));
    expect(ticks.short).toEqual(xs.filter((x) => x % 16 === 0 && x % 64 !== 0));
    expect(ticks.long.length).toBeGreaterThan(20);
  });

  it('measures in world px from the stage’s left end, wherever the camera is', () => {
    expect(stage.at(64 * 3, GROUND_Y + 6)).toBe(FLOOR.tick);
    expect(stage.at(64 * 3 + 16, GROUND_Y + 4)).toBe(FLOOR.tick);
    expect(stage.at(64 * 3 + 16, GROUND_Y + 5)).toBe(GROUND);
    expect(stage.at(64 * 3 + 8, GROUND_Y + 1)).toBe(GROUND);
  });
});

describe('the grey box corners', () => {
  const stage = paint();

  it('stand a wall at each end, its light edge toward the stage', () => {
    for (const y of [0, 100, GROUND_Y - 1]) {
      for (let x = 0; x < WALL.width - 1; x++) {
        expect(stage.at(x, y)).toBe(WALL.color);
        expect(stage.at(WIDTH - 1 - x, y)).toBe(WALL.color);
      }
      expect(stage.at(WALL.width - 1, y)).toBe(WALL.edge);
      expect(stage.at(WIDTH - WALL.width, y)).toBe(WALL.edge);
      expect(stage.at(WALL.width, y)).toBe(SKY);
      expect(stage.at(WIDTH - WALL.width - 1, y)).toBe(SKY);
    }
  });

  it('darken the floor toward each wall, from nothing 24 px away to 25 % black at its foot', () => {
    const y = GROUND_Y + 20;
    const darkest = over(0x000000, GROUND, WALL.shade.darkest);
    expect(stage.at(0, y)).toBe(darkest);
    expect(stage.at(WIDTH - 1, y)).toBe(darkest);
    expect(stage.at(WALL.shade.width, y)).toBe(GROUND);
    expect(stage.at(WIDTH - 1 - WALL.shade.width, y)).toBe(GROUND);
    for (let x = 1; x <= WALL.shade.width; x++) {
      const lighter = relativeLuminance(stage.at(x, y));
      expect(lighter).toBeGreaterThanOrEqual(relativeLuminance(stage.at(x - 1, y)));
      expect(stage.at(WIDTH - 1 - x, y)).toBe(stage.at(x, y));
    }
  });
});

describe('the grey box screen border', () => {
  it('shows in the debug view only, to spot scaling artifacts', () => {
    expect(paint({ debug: false }).borders).toBe(0);
    expect(paint({ debug: true }).borders).toBe(1);
  });

  it('is drawn once, with the stage: nothing redrawn, nothing to flash', () => {
    expect(paint({ debug: false }).graphics).toBe(1);
    expect(paint({ debug: true }).graphics).toBe(2);
  });
});
