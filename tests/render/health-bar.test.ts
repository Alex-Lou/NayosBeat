import { describe, expect, it, vi } from 'vitest';
import { gaugeSpans, type GaugeLook } from '../../src/render/boost-gauge';
import { freshBoost, stepBoost } from '../../src/render/boost-motion';
import {
  BAR_BOX,
  BAR_LENGTH,
  BAR_ROWS,
  EMBER_RISE,
  HealthBar,
  healthBarSpans,
  healthBlastShake,
  healthPaintKey,
  hitFlashArea,
  SHATTER_VIEW,
  type HealthBarLook,
} from '../../src/render/health-bar';
import { hitStyleOf, hudColorOf } from '../../src/render/hit-styles';
import type { Span } from '../../src/render/hud-paint';
import { over, relativeLuminance } from '../../src/render/luminance';
import {
  BAR_BREAK_TICKS,
  BAR_CRACK_TICKS,
  FLASH_TICKS,
  freshHealth,
  stepHealth,
  type HealthMotion,
} from '../../src/render/health-motion';
import type { Breakage } from '../../src/render/boost-motion';
import { darkestOf, FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { fakeScene, pixelOf } from './hud-fakes';

const ENERGY = 0x30e8ff;
const LEFT: HealthBarLook = { side: 0, energy: ENERGY, flashes: true, motion: true };
const RIGHT: HealthBarLook = { ...LEFT, side: 1 };
const CALM: HealthBarLook = { ...LEFT, flashes: false, motion: false };
/** The core of each tube (its third row). */
const CORE = { health: 0xf0c94a, danger: 0xff7a1e, trail: 0xb80200, flash: 0xffffff };
const EMPTY_CORE = 0x1c1228;
/** The third row of the left player's tube: where it starts, its y. */
const ROW = { start: 7, y: 3 } as const;

/** The color of the third row at `along` pixels from the bar's inner end (the timer's side). */
function inner(spans: Parameters<typeof pixelOf>[0], along: number): number | undefined {
  return pixelOf(spans, ROW.start + BAR_LENGTH - 1 - along, ROW.y);
}

describe('the health bar (docs/art/direction-hud.md)', () => {
  it('keeps the health left against the timer, the loss opening on the screen edge', () => {
    const half = healthBarSpans(freshHealth(0, 0.5), LEFT, 0);
    expect(inner(half, 0)).toBe(CORE.health);
    expect(inner(half, BAR_LENGTH / 2 - 2)).toBe(CORE.health);
    // The fill's front, a pixel lighter (Street Fighter 6).
    expect(inner(half, BAR_LENGTH / 2 - 1)).toBe(0xf8e4a5);
    expect(inner(half, BAR_LENGTH / 2)).toBe(EMPTY_CORE);
    expect(inner(half, BAR_LENGTH - 1)).toBe(EMPTY_CORE);
  });

  it('is mirrored for the right player', () => {
    const left = healthBarSpans(freshHealth(0, 0.4), LEFT, 0);
    const right = healthBarSpans(freshHealth(0, 0.4), RIGHT, 0);
    for (let y = 0; y < BAR_BOX.height; y++) {
      for (let x = 0; x < BAR_BOX.width; x++) {
        expect(pixelOf(right, x, y), `${x}, ${y}`).toBe(pixelOf(left, BAR_BOX.width - 1 - x, y));
      }
    }
  });

  it('slants toward the timer, within its box, the energy on its top rim', () => {
    const spans = healthBarSpans(freshHealth(0), LEFT, 0);
    // The top row starts 7 pixels further in than the bottom one.
    expect(pixelOf(spans, 8, 1)).not.toBe(CORE.health);
    expect(pixelOf(spans, 9, 1)).toBeDefined();
    expect(pixelOf(spans, 2, 8)).toBeDefined();
    expect(pixelOf(spans, 20, 0)).toBe(ENERGY);
    for (const span of spans) {
      expect(span.x).toBeGreaterThanOrEqual(0);
      expect(span.x + span.width).toBeLessThanOrEqual(BAR_BOX.width);
      expect(span.y + span.height).toBeLessThanOrEqual(BAR_BOX.height);
    }
  });

  it('lights up what a blow takes for a few ticks, then leaves it red behind the bar', () => {
    const hit = stepHealth(freshHealth(0), 0.75, false, 1);
    const lost = Math.round(BAR_LENGTH * 0.8);
    expect(inner(healthBarSpans(hit, LEFT, 1), 0)).toBe(CORE.health);
    expect(inner(healthBarSpans(hit, LEFT, 1), lost)).toBe(CORE.flash);
    let later = hit;
    for (let tick = 0; tick < FLASH_TICKS; tick++) {
      later = stepHealth(later, 0.75, false, later.frame + 1);
    }
    expect(inner(healthBarSpans(later, LEFT, later.frame), lost)).toBe(CORE.trail);
    // No flash with reduced motion: the red trail at once.
    expect(inner(healthBarSpans(hit, CALM, 1), lost)).toBe(CORE.trail);
  });

  it('turns orange in danger, embers rising above it, none with reduced motion', () => {
    const low = freshHealth(0, 0.2);
    const spans = healthBarSpans(low, LEFT, 40);
    expect(inner(spans, 0)).toBe(CORE.danger);
    expect(spans.some((span) => span.y < 0)).toBe(true);
    expect(healthBarSpans(low, CALM, 40).some((span) => span.y < 0)).toBe(false);
    // Over a whole cycle, every ember stays in the room the HUD leaves above the bar, and each
    // shows its two sizes and three colors there.
    const tube = new Set(healthBarSpans(low, CALM, 0).map(({ color }) => color));
    const sizes = new Set<number>();
    const colors = new Set<number>();
    for (let frame = 0; frame < 48; frame++) {
      const all = healthBarSpans(low, LEFT, frame);
      const rising = all.slice(healthBarSpans(low, CALM, frame).length);
      expect(rising.length).toBeGreaterThan(0);
      for (const ember of rising) {
        expect(ember.y).toBeGreaterThanOrEqual(-EMBER_RISE);
        sizes.add(ember.width);
        colors.add(ember.color);
      }
    }
    expect([...sizes].sort()).toEqual([1, 2]);
    expect(colors.size).toBe(3);
    for (const color of colors) expect(tube.has(color)).toBe(false);
    // Embers move with the clock, so the bar repaints; still, it does not.
    expect(healthPaintKey(low, LEFT, 40)).not.toBe(healthPaintKey(low, LEFT, 41));
    expect(healthPaintKey(low, CALM, 40)).toBe(healthPaintKey(low, CALM, 41));
    expect(healthPaintKey(freshHealth(0, 0.6), LEFT, 40)).toBe(
      healthPaintKey(freshHealth(0, 0.6), LEFT, 41),
    );
  });

  it('shakes a pixel side to side on a heavy blow, and repaints only when it changes', () => {
    const { scene, graphics } = fakeScene();
    const bar = new HealthBar(scene, 8, 6, LEFT);
    const [view] = graphics;
    for (let frame = 0; frame <= 60; frame++) bar.update(1, false, frame);
    const clears = view?.clears ?? 0;
    for (let frame = 61; frame <= 70; frame++) bar.update(1, false, frame);
    expect(view?.clears).toBe(clears);
    expect(view?.x).toBe(8);
    bar.update(0.8, false, 71);
    expect([7, 9]).toContain(view?.x);
    for (let frame = 72; frame <= 90; frame++) bar.update(0.8, false, frame);
    expect(view?.x).toBe(8);
    // Reduced motion: still.
    const calm = fakeScene();
    const still = new HealthBar(calm.scene, 8, 6, CALM);
    still.update(1, false, 0);
    still.update(0.5, false, 1);
    expect(calm.graphics[0]?.x).toBe(8);
  });

  it('keeps a pixel of a fighter left with 1 health point, unlike a KO', () => {
    const last = freshHealth(0, 1 / 1000);
    expect(inner(healthBarSpans(last, CALM, 0), 0)).not.toBe(EMPTY_CORE);
    expect(inner(healthBarSpans(freshHealth(0, 0), CALM, 0), 0)).toBe(EMPTY_CORE);
  });

  it('fills up as the match starts', () => {
    const { scene, graphics } = fakeScene();
    const bar = new HealthBar(scene, 0, 0, LEFT);
    bar.update(1, false, 0);
    expect(inner(graphics[0]?.spans ?? [], 0)).toBe(EMPTY_CORE);
    for (let frame = 1; frame <= 60; frame++) bar.update(1, false, frame);
    expect(inner(graphics[0]?.spans ?? [], BAR_LENGTH - 1)).toBe(CORE.health);
  });

  it('cracks at a KO that ends a combo, its red trail still showing; whole again next round', () => {
    const cracked = brokenAfter('crack', BAR_CRACK_TICKS);
    const spans = healthBarSpans(cracked, LEFT, cracked.frame);
    // The cracks: light over the empty tube, the rim cut over them.
    expect(spans.filter((span) => span.color === 0x8c7fa6).length).toBeGreaterThan(10);
    expect(pixelOf(spans, 140 + 2 + 7 + 1, 0)).toBe(0x0c0612);
    // The red trail of the combo, under the cracks.
    expect(spans.some((span) => span.color === CORE.trail)).toBe(true);
    // Reduced motion: the same cracks at once, no chips falling.
    const calm = healthBarSpans(brokenAfter('crack', 0), CALM, 0);
    expect(calm.filter((span) => span.color === 0x8c7fa6).length).toBe(
      spans.filter((span) => span.color === 0x8c7fa6).length,
    );
    expect(calm.some((span) => (span.alpha ?? 1) < 1 && span.width === 2)).toBe(false);
    // A new round: whole again.
    const next = stepHealth(cracked, 1, false, cracked.frame + 1);
    expect(next.broken).toBe(-1);
  });

  it('blows up at an Ultime: shards of glass and of the red trail fly, the frame stays dim', () => {
    const early = healthBarSpans(brokenAfter('shatter', 2), LEFT, 0);
    const shards = early.filter((span) => (span.alpha ?? 1) < 1);
    expect(shards.length).toBeGreaterThan(80);
    expect(
      new Set(shards.map((span) => `${span.width}x${span.height}`)).size,
    ).toBeGreaterThanOrEqual(3);
    expect(shards.some((span) => span.color === 0xffffff)).toBe(false);
    // The frame dim, its tube empty: no trail left inside.
    const after = healthBarSpans(brokenAfter('shatter', BAR_BREAK_TICKS), LEFT, 0);
    expect(after.every((span) => (span.alpha ?? 1) === 1)).toBe(true);
    expect(pixelOf(after, 20, 0)).toBe(0x3a3448);
    expect(inner(after, 0)).toBe(EMPTY_CORE);
    // Reduced motion: the dim frame at once, nothing flying, no shake.
    const calm = healthBarSpans(brokenAfter('shatter', 0), CALM, 0);
    expect(calm.every((span) => (span.alpha ?? 1) === 1)).toBe(true);
    expect(healthBlastShake(brokenAfter('shatter', 1), CALM)).toBe(0);
    // It shakes 2 px, then 1, then stops.
    expect(Math.abs(healthBlastShake(brokenAfter('shatter', 1), LEFT))).toBe(2);
    expect(Math.abs(healthBlastShake(brokenAfter('shatter', 9), LEFT))).toBe(1);
    expect(healthBlastShake(brokenAfter('shatter', 12), LEFT)).toBe(0);
  });

  it('stays whole at a plain KO', () => {
    const plain = stepHealth(stepHealth(freshHealth(0, 0.1), 0, false, 1), 0, false, 60);
    expect(plain.broken).toBe(-1);
    const spans = healthBarSpans(plain, LEFT, 60);
    expect(spans.some((span) => span.color === 0x3a3448 || span.color === 0x8c7fa6)).toBe(false);
  });
});

/** A bar knocked out from 20 % on tick 1, `breakage` breaking it, `ticks` later. */
function brokenAfter(breakage: Breakage, ticks: number): HealthMotion {
  let motion = stepHealth(freshHealth(0, 0.2), 0, false, 1, breakage);
  for (let tick = 0; tick < ticks; tick++) {
    motion = stepHealth(motion, 0, false, motion.frame + 1, breakage);
  }
  return motion;
}

describe("the health bar under the player's options (docs/flashs.md §4)", () => {
  const NO_FLASHES: HealthBarLook = { ...LEFT, flashes: false };
  const STILL: HealthBarLook = { ...LEFT, motion: false };

  it('drops the white of a hit with the flashes reduced, keeping its embers and shards', () => {
    const hit = stepHealth(freshHealth(0, 1), 0.75, false, 1);
    const lost = Math.round(BAR_LENGTH * 0.8);
    expect(inner(healthBarSpans(hit, NO_FLASHES, 1), lost)).toBe(CORE.trail);
    const low = freshHealth(0, 0.2);
    expect(healthBarSpans(low, NO_FLASHES, 40).some((span) => span.y < 0)).toBe(true);
    const shards = (look: HealthBarLook) =>
      healthBarSpans(brokenAfter('shatter', 2), look, 0).filter((span) => (span.alpha ?? 1) < 1);
    expect(shards(NO_FLASHES).length).toBeGreaterThan(20);
    expect(shards(STILL)).toEqual([]);
  });

  it('keeps the white of a hit when only the motion stops, without shake nor embers', () => {
    const hit = stepHealth(freshHealth(0, 1), 0.75, false, 1);
    const lost = Math.round(BAR_LENGTH * 0.8);
    expect(inner(healthBarSpans(hit, STILL, 1), lost)).toBe(CORE.flash);
    expect(healthBarSpans(freshHealth(0, 0.2), STILL, 40).some((span) => span.y < 0)).toBe(false);
    expect(healthBlastShake(brokenAfter('shatter', 1), STILL)).toBe(0);
  });

  it('keeps the shards in their own colors with the flashes reduced: hot only when normal', () => {
    const colors = (look: HealthBarLook, ticks: number) =>
      new Set(
        healthBarSpans(brokenAfter('shatter', ticks), look, 0)
          .filter((span) => (span.alpha ?? 1) < 1 && span.width > 2)
          .map((span) => span.color),
      );
    // Hot (lighter) for their first ticks with the flashes normal, as they cool down otherwise.
    expect(colors(LEFT, 1)).not.toEqual(colors(LEFT, 6));
    expect(colors(NO_FLASHES, 1)).toEqual(colors(LEFT, 6));
  });

  it('asks the budget for the white of a hit: refused, the blow shows red at once', () => {
    const { scene, graphics } = fakeScene();
    const lights = vi.fn(() => false);
    const bar = new HealthBar(scene, 8, 6, LEFT, lights);
    for (let frame = 0; frame <= 60; frame++) bar.update(1, false, frame);
    expect(lights).not.toHaveBeenCalled();
    bar.update(0.75, false, 61);
    // What the blow took: a quarter of the bar, on its 8 rows.
    expect(lights).toHaveBeenCalledWith(Math.round(BAR_LENGTH * 0.25) * BAR_ROWS);
    expect((graphics[0]?.spans ?? []).some((span) => span.color === 0xffffff)).toBe(false);
    // Asked once a blow, not again while it shows.
    bar.update(0.75, false, 62);
    expect(lights).toHaveBeenCalledTimes(1);
    expect(hitFlashArea(stepHealth(freshHealth(0, 1), 0.5, false, 1))).toBe(88 * BAR_ROWS);
  });

  it('breaks still when told so: no shards fly, the frame dims at once', () => {
    const { scene, graphics } = fakeScene();
    const bar = new HealthBar(scene, 8, 6, LEFT);
    for (let frame = 0; frame <= 60; frame++) bar.update(0.2, false, frame);
    bar.update(0, false, 61, 'shatter', true);
    bar.update(0, false, 63, 'shatter', true);
    expect((graphics[0]?.spans ?? []).every((span) => (span.alpha ?? 1) === 1)).toBe(true);
  });

  it('follows a new choice from the next update on', () => {
    const { scene, graphics } = fakeScene();
    const bar = new HealthBar(scene, 8, 6, LEFT);
    // A new match: the bar fills up first.
    for (let frame = 0; frame <= 60; frame++) bar.update(1, false, frame);
    bar.update(0.75, false, 61);
    const white = (graphics[0]?.spans ?? []).some((span) => span.color === 0xffffff);
    expect(white).toBe(true);
    bar.setComfort({ flashes: false, motion: true });
    bar.update(0.75, false, 62);
    expect((graphics[0]?.spans ?? []).some((span) => span.color === 0xffffff)).toBe(false);
  });
});

/** The HUD band over the sky (hud.ts), behind the bars and the gauges: the stage's darkest color. */
const SKY = darkestOf(FIGHT_STAGE_COLORS);
const BAND = over(0x0c0614, SKY, 0.55);
/** Where they are painted: their boxes, with room around for what flies at first. */
const ROOM = { width: 220, height: 40, x: 10, y: 15 } as const;

/** The luminance of each pixel of `spans` painted over `backdrop`, around them. */
function luminances(spans: readonly Span[], backdrop: number): Float64Array {
  const colors = new Int32Array(ROOM.width * ROOM.height).fill(backdrop);
  for (const { x, y, width, height, color, alpha = 1 } of spans) {
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        const px = x + column + ROOM.x;
        const py = y + row + ROOM.y;
        if (px < 0 || py < 0 || px >= ROOM.width || py >= ROOM.height) continue;
        const at = py * ROOM.width + px;
        colors[at] = over(color, colors[at] ?? backdrop, alpha);
      }
    }
  }
  const known = new Map<number, number>();
  return Float64Array.from(colors, (color) => {
    let luminance = known.get(color);
    if (luminance === undefined) known.set(color, (luminance = relativeLuminance(color)));
    return luminance;
  });
}

/** Pixels that rise by ΔL 0.1 or more from `before` to `after` (a flash starting). */
function rising(before: readonly Span[], after: readonly Span[], backdrop: number): number {
  const from = luminances(before, backdrop);
  const to = luminances(after, backdrop);
  return to.reduce((count, value, at) => count + (value - (from[at] ?? 0) >= 0.1 ? 1 : 0), 0);
}

describe("what an Ultime's KO lights on the HUD (docs/flashs.md §4)", () => {
  const energies = (['nayo', 'riff'] as const).flatMap((fighter) =>
    (['main', 'alt'] as const).map((colorway) => hudColorOf(hitStyleOf(fighter, colorway))),
  );

  it('blows a bar and its gauge up on SHATTER_VIEW px² at most, hot or not', () => {
    for (const [flashes, most] of [
      [true, SHATTER_VIEW.hot],
      [false, SHATTER_VIEW.plain],
    ] as const) {
      let bar = 0;
      let gauge = 0;
      for (const backdrop of [SKY, BAND]) {
        for (const energy of energies) {
          const look: HealthBarLook = { side: 0, energy, flashes, motion: true };
          for (const health of [0.02, 0.05, 0.1, 0.3, 0.5]) {
            for (const trail of [health, health + 0.1, health + 0.3, 0.9]) {
              // Comboed down from `trail` to `health`: the trail waits, then the KO.
              let motion = stepHealth(freshHealth(0, Math.min(1, trail)), health, true, 1);
              motion = stepHealth(motion, health, true, 25);
              const knocked = stepHealth(motion, 0, true, 26, 'shatter');
              const lit = rising(
                healthBarSpans(motion, look, 25),
                healthBarSpans(knocked, look, 26),
                backdrop,
              );
              bar = Math.max(bar, lit);
            }
          }
          const gaugeLook: GaugeLook = { side: 0, energy, flashes, motion: true };
          for (let boost = 0; boost <= 3000; boost += 100) {
            const whole = freshBoost(0, boost);
            const blown = stepBoost(whole, boost, 'shatter', 1);
            const lit = rising(
              gaugeSpans(whole, gaugeLook, 0),
              gaugeSpans(blown, gaugeLook, 1),
              backdrop,
            );
            gauge = Math.max(gauge, lit);
          }
        }
      }
      expect(bar + gauge, `flashes ${flashes}`).toBeLessThanOrEqual(most);
      expect(bar + gauge, `flashes ${flashes}`).toBeGreaterThan(most * 0.9);
    }
  });
});
