import { describe, expect, it } from 'vitest';
import {
  BAR_BOX,
  BAR_LENGTH,
  EMBER_RISE,
  HealthBar,
  healthBarSpans,
  healthBlastShake,
  healthPaintKey,
  type HealthBarLook,
} from '../../src/render/health-bar';
import {
  BAR_BREAK_TICKS,
  BAR_CRACK_TICKS,
  FLASH_TICKS,
  freshHealth,
  stepHealth,
  type HealthMotion,
} from '../../src/render/health-motion';
import type { Breakage } from '../../src/render/boost-motion';
import { fakeScene, pixelOf } from './hud-fakes';

const ENERGY = 0x30e8ff;
const LEFT: HealthBarLook = { side: 0, energy: ENERGY, reducedMotion: false };
const RIGHT: HealthBarLook = { ...LEFT, side: 1 };
const CALM: HealthBarLook = { ...LEFT, reducedMotion: true };
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
