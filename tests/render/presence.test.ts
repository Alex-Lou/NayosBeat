import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import type { FighterArt } from '../../src/art/types';
import { hitStyleOf } from '../../src/render/hit-styles';
import { luminanceDelta } from '../../src/render/luminance';
import { AURA_DELTA, AURA_REACH, BREATH, PARTICLES, Presence } from '../../src/render/presence';
import { signatureOf } from '../../src/render/signatures';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { DETAIL, paletteOf } from '../../tools/sprites/nayo/palette';
import { SAPHIR } from '../../tools/sprites/saphir/index';
import {
  DETAIL as SAPHIR_DETAIL,
  paletteOf as saphirPaletteOf,
} from '../../tools/sprites/saphir/palette';
import { drawStrip } from '../../tools/sprites/sheet';
import { fake, type Fake } from './live-fakes';

vi.mock('phaser', () => ({ default: { BlendModes: { NORMAL: 0, ADD: 1 } } }));

/** The filtered sprites: their filters, as added, and what they show. */
const sprites = vi.hoisted(
  () =>
    [] as {
      shown: boolean;
      destroyed: boolean;
      filters: { kind: string; args: unknown[]; glow: Record<string, unknown> }[];
    }[],
);
vi.mock('../../src/render/anchored-sprite', () => ({
  AnchoredSprite: class {
    private readonly state = {
      shown: false,
      destroyed: false,
      filters: [] as { kind: string; args: unknown[]; glow: Record<string, unknown> }[],
    };
    constructor() {
      sprites.push(this.state);
    }
    added() {
      return this;
    }
    setAlpha() {
      return this;
    }
    setDepth() {
      return this;
    }
    show() {
      this.state.shown = true;
    }
    hide() {
      this.state.shown = false;
    }
    destroy() {
      this.state.destroyed = true;
    }
    filtered<T>(add: (filters: unknown) => T): T {
      const filters = this.state.filters;
      return add({
        addGlow: (...args: unknown[]) => {
          const glow: Record<string, unknown> = {
            color: args[0],
            outerStrength: args[1],
            setPaddingOverride: () => glow,
          };
          filters.push({ kind: 'glow', args, glow });
          return glow;
        },
        addKey: (...args: unknown[]) => {
          filters.push({ kind: 'key', args, glow: {} });
        },
      });
    }
  },
}));

const CYAN = hitStyleOf('nayo').energy;
const NAYO_LEDS = signatureOf('nayo')?.presence?.leds;

function presence(specks?: 'square' | 'diamond') {
  sprites.length = 0;
  const shapes: Fake[] = [];
  const scene = {
    add: {
      rectangle: () => {
        const shape = fake({ alpha: 0 });
        const setAlpha = (alpha: number) => ((shape.alpha = alpha), shape);
        Object.assign(shape, { setAlpha });
        shapes.push(shape);
        return shape;
      },
    },
  } as unknown as Phaser.Scene;
  const shown = new Presence(scene, {} as FighterArt, {
    energy: CYAN,
    leds: NAYO_LEDS?.main ?? 0,
    stage: FIGHT_STAGE_COLORS,
    mode: 'full',
    ...(specks && { specks }),
  });
  const [aura, leds] = sprites;
  const glow = aura?.filters.find((filter) => filter.kind === 'glow')?.glow ?? {};
  return { shown, shapes, aura, leds, glow };
}

/** `frames` frames of its life, following a body standing at 300, 230. */
function live(shown: Presence, frames: number, each?: (frame: number) => void): void {
  for (let frame = 0; frame < frames; frame++) {
    shown.follow('idle', 0, 300, 230, false, true);
    shown.update(1);
    each?.(frame);
  }
}

describe("Nayo's presence (docs/art/nayo-vivante.md §3)", () => {
  it('shines his LEDs in their own color: the soft core of his palette, in each colorway', () => {
    const toHex = ({ r, g, b }: { r: number; g: number; b: number }) => (r << 16) | (g << 8) | b;
    for (const colorway of ['main', 'alt'] as const) {
      const core = paletteOf(colorway)[DETAIL.neonCore];
      expect(core).toBeDefined();
      expect(NAYO_LEDS?.[colorway]).toBe(toHex(core as { r: number; g: number; b: number }));
    }
    const { leds } = presence();
    expect(leds?.filters.map(({ kind }) => kind)).toEqual(['key', 'glow']);
    expect(leds?.filters[0]?.args[0]).toMatchObject({ color: NAYO_LEDS?.main, isolate: true });
  });

  it('breathes its aura slowly, under 1 Hz, never by a jump; held still', () => {
    const { shown, glow } = presence();
    shown.setTier('full');
    const reach: number[] = [];
    live(shown, BREATH * 2, () => reach.push(glow.outerStrength as number));
    expect(Math.min(...reach)).toBeCloseTo(AURA_REACH.low, 1);
    expect(Math.max(...reach)).toBeCloseTo(AURA_REACH.high, 1);
    expect(BREATH).toBeGreaterThanOrEqual(60);
    for (let i = 1; i < reach.length; i++) {
      expect(Math.abs((reach[i] ?? 0) - (reach[i - 1] ?? 0))).toBeLessThan(0.1);
    }
    shown.still = true;
    const held: number[] = [];
    live(shown, 30, () => held.push(glow.outerStrength as number));
    expect(new Set(held).size).toBe(1);
  });

  it('draws its aura in a deep tone that changes no color of the stage by AURA_DELTA, opaque', () => {
    const { glow } = presence();
    for (const backdrop of FIGHT_STAGE_COLORS) {
      expect(luminanceDelta(glow.color as number, backdrop, 1)).toBeLessThan(AURA_DELTA);
    }
  });

  it('fades its particles in and out over their life: never a blink', () => {
    const { shown, shapes } = presence();
    shown.setTier('full');
    expect(shapes).toHaveLength(PARTICLES);
    const last = shapes.map(() => 0);
    let seen = 0;
    live(shown, 400, () => {
      shapes.forEach((shape, i) => {
        const alpha = shape.visible ? (shape.alpha as number) : 0;
        expect(Math.abs(alpha - (last[i] ?? 0))).toBeLessThan(0.05);
        last[i] = alpha;
        if (alpha > 0) seen++;
      });
    });
    expect(seen).toBeGreaterThan(400);
  });

  it('keeps the particles alone lean, nothing off; nothing moves with the screen still', () => {
    const { shown, shapes, aura, leds } = presence();
    shown.setTier('lean');
    live(shown, 200);
    expect(aura?.shown || leds?.shown).toBe(false);
    expect(shapes.some((shape) => shape.visible)).toBe(true);
    shown.setTier('off');
    live(shown, 10);
    expect(shapes.some((shape) => shape.visible)).toBe(false);
    shown.setTier('full');
    shown.still = true;
    live(shown, 10);
    expect(shapes.some((shape) => shape.visible)).toBe(false);
    expect(aura?.shown).toBe(true);
  });

  it("shows nothing of it under the Finisher's silhouette", () => {
    const { shown, shapes, aura } = presence();
    shown.setTier('full');
    for (let frame = 0; frame < 200; frame++) {
      shown.follow('idle', 0, 300, 230, false, false);
      shown.update(1);
    }
    expect(aura?.shown).toBe(false);
    expect(shapes.some((shape) => shape.visible)).toBe(false);
  });

  it('frees what it made', () => {
    const { shown, shapes } = presence();
    shown.dispose();
    expect(sprites.every((sprite) => sprite.destroyed)).toBe(true);
    expect(shapes.every((shape) => shape.destroyed)).toBe(true);
  });
});

describe("Saphir's presence (docs/saphir.md §9)", () => {
  const toHex = ({ r, g, b }: { r: number; g: number; b: number }) => (r << 16) | (g << 8) | b;
  const glints = (sheet: string) =>
    drawStrip(SAPHIR, sheet).pixels.filter((slot) => slot === SAPHIR_DETAIL.maskGlow).length;

  it('shines the glint of her mask in its own color, in each colorway', () => {
    const leds = signatureOf('saphir')?.presence?.leds;
    for (const colorway of ['main', 'alt'] as const) {
      const glint = saphirPaletteOf(colorway)[SAPHIR_DETAIL.maskGlow];
      expect(glint).toBeDefined();
      expect(leds?.[colorway]).toBe(toHex(glint as { r: number; g: number; b: number }));
    }
  });

  it('cuts her specks like the gem: diamonds, a square turned 45°; anyone else squares', () => {
    expect(signatureOf('saphir')?.presence?.specks).toBe('diamond');
    const angles = (specks?: 'square' | 'diamond') =>
      presence(specks).shapes.map(
        ({ calls }) => calls.find(([name]) => name === 'setAngle')?.[1][0],
      );
    expect(angles('diamond').every((angle) => angle === 45)).toBe(true);
    expect(angles().every((angle) => angle === 0)).toBe(true);
  });

  it('draws the glint in both slits of her guard, and none when she is hit', () => {
    expect(glints('idle')).toBeGreaterThan(0);
    expect(glints('hitHigh')).toBe(0);
  });
});
