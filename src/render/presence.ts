import type Phaser from 'phaser';
import type { FighterArt } from '../art/types';
import { AnchoredSprite } from './anchored-sprite';
import type { LightTier } from './live-lights';
import { alphaForDelta, toneUnder } from './luminance';
import type { RenderMode } from './render-mode';
import { darkestOf } from './stage-view';
import { DIM_COLOR } from './veils';

/**
 * A fighter's permanent presence (docs/art/nayo-vivante.md §3): what shows it alive between its
 * blows, never on the beat of anything, nothing that blinks.
 * - An aura: its body drawn again behind it, through Phaser's Glow filter (knockout: the glow
 *   alone), in its energy darkened until it changes no color of the stage by AURA_DELTA at full
 *   opacity (`toneUnder`): a deep halo that breathes slowly, its reach in and out, BREATH frames
 *   a cycle (under 1 Hz). Still (« Tremblement : aucun »), it holds its breath.
 * - Its outfit's LEDs: its body drawn again over it, added, through Phaser's Key filter (only the
 *   LEDs' color kept) then a Glow: they shine around them, steadily.
 * - Sound particles: a few specks of its energy drifting up around its chest, each fading in and
 *   out over its long life, out of step with the others.
 *
 * The filters are the adaptive quality's first cut (light-quality.ts): `full` shows them all,
 * `lean` the particles alone, `off` nothing. Drawn by Canvas, `off` always (no filter, no tint).
 * Nothing reads the core (D17); it lives on the display clock (D23: nothing interpolated between
 * ticks, the body's frame is the tick's).
 */

/** Its aura and its particles change no color of the stage by this much (calm: less). */
export const AURA_DELTA = 0.08;
export const CALM_AURA_DELTA = 0.05;
/** A breath of the aura, display frames: 0.4 Hz. */
export const BREATH = 150;
/** The aura's reach, its Glow's outer strength, breathing between these. */
export const AURA_REACH = { low: 1.6, high: 3.2 } as const;
/** The aura's glow: samples (quality), and how far it looks, texture px (Phaser's defaults: 10). */
const AURA_GLOW = { quality: 5, distance: 7, scale: 1.8 } as const;
const LED_GLOW = { quality: 4, distance: 5, scale: 1.3, strength: 2.4 } as const;
/** Just behind its body, just over it. */
const AURA_DEPTH = -0.03;
const LED_DEPTH = 0.006;
/** The LEDs added at this opacity: an accent over them, not a white blot. */
const LED_ALPHA = 0.7;
/** How close a pixel's color must be to the LEDs' to be kept (Key's threshold, 0 to 1). */
const LED_THRESHOLD = 0.04;

/** Sound particles: how many, each's life (display frames), world px over the feet. */
export const PARTICLES = 9;
const PARTICLE_LIFE = 150;
const PARTICLE_RISE = 0.22;
const CHEST = { low: 50, high: 110, spread: 26 } as const;
/** A speck at its brightest. */
const SPECK_ALPHA = 0.85;

/** What a fighter's presence is made of: its LEDs' color in its colorway (signatures.ts). */
export interface PresenceLook {
  readonly energy: number;
  readonly leds: number;
  /** The stage's large colors: the aura's and the particles' tones are set on them. */
  readonly stage: readonly number[];
  readonly mode: RenderMode;
}

interface Particle {
  readonly shape: Phaser.GameObjects.Rectangle;
  /** Display frames into its life (negative: not yet), and where it rises from, over the feet. */
  age: number;
  dx: number;
  height: number;
  sway: number;
}

export class Presence {
  /** The flashes calm: a fainter aura and fainter particles. Read every frame. */
  calm = false;
  /** The screen kept still: the aura holds its breath, the particles stay home. */
  still = false;
  private tier: LightTier = 'off';
  private readonly aura: AnchoredSprite;
  private readonly leds: AnchoredSprite;
  private readonly auraGlow: Phaser.Filters.Glow | undefined;
  private readonly particles: Particle[];
  /** The aura's color at full opacity, and the particles' opacity, normal and calm. */
  private readonly tones: readonly [number, number];
  private readonly specks: readonly [number, number];
  private readonly energy: number;
  private clock = 0;
  private x = 0;
  private feet = 0;
  private shown = false;

  constructor(scene: Phaser.Scene, art: FighterArt, look: PresenceLook) {
    this.energy = look.energy;
    const darkest = darkestOf(look.stage);
    this.tones = [
      toneUnder(look.energy, DIM_COLOR, look.stage, AURA_DELTA),
      toneUnder(look.energy, DIM_COLOR, look.stage, CALM_AURA_DELTA),
    ];
    // A speck is a few px²: far under any flash's area, whatever its opacity (docs/flashs.md §5).
    this.specks = [SPECK_ALPHA, alphaForDelta(look.energy, darkest, CALM_AURA_DELTA)];
    this.aura = new AnchoredSprite(scene, art, 'body', look.mode);
    this.leds = new AnchoredSprite(scene, art, 'body', look.mode).added().setAlpha(LED_ALPHA);
    this.auraGlow = this.aura.filtered((filters) => {
      const glow = filters.addGlow(
        this.tones[0],
        AURA_REACH.low,
        0,
        AURA_GLOW.scale,
        true,
        AURA_GLOW.quality,
        AURA_GLOW.distance,
      );
      glow.setPaddingOverride(null);
      return glow;
    });
    this.leds.filtered((filters) => {
      filters.addKey({ color: look.leds, isolate: true, threshold: LED_THRESHOLD });
      const glow = filters.addGlow(
        look.energy,
        LED_GLOW.strength,
        0,
        LED_GLOW.scale,
        false,
        LED_GLOW.quality,
        LED_GLOW.distance,
      );
      glow.setPaddingOverride(null);
      return glow;
    });
    this.aura.hide();
    this.leds.hide();
    this.particles = Array.from({ length: PARTICLES }, (_, i) => ({
      shape: scene.add.rectangle(0, 0, i % 3 === 0 ? 3 : 2, 2, look.energy).setVisible(false),
      age: -Math.round((i * PARTICLE_LIFE) / PARTICLES),
      // Spread out from the start, by its index: the golden angle around the chest.
      dx: Math.sin(i * 2.399) * CHEST.spread,
      height: CHEST.low + ((i * 0.618) % 1) * (CHEST.high - CHEST.low) * 0.6,
      sway: i * 2.399,
    }));
  }

  /** The adaptive quality's tier: `full`, everything; `lean`, the particles; `off`, nothing. */
  setTier(tier: LightTier): void {
    this.tier = tier;
    if (tier !== 'full') {
      this.aura.hide();
      this.leds.hide();
    }
    if (tier === 'off') for (const { shape } of this.particles) shape.setVisible(false);
  }

  /** Behind its body (`depth`: the body's), and over it. */
  setDepth(depth: number): void {
    this.aura.setDepth(depth + AURA_DEPTH);
    this.leds.setDepth(depth + LED_DEPTH);
    for (const { shape } of this.particles) shape.setDepth(depth + LED_DEPTH);
  }

  /**
   * Follows the body shown (`sheet`, `frame`, at x, y, flipped or not); `visible` false (a
   * Finisher's silhouette, the fighter gone), none of it shows.
   */
  follow(
    sheet: string,
    frame: number,
    x: number,
    y: number,
    flip: boolean,
    visible: boolean,
  ): void {
    this.x = x;
    this.feet = y;
    this.shown = visible && this.tier !== 'off';
    if (this.tier === 'full' && visible) {
      this.aura.show(sheet, frame, x, y, flip);
      this.leds.show(sheet, frame, x, y, flip);
    } else {
      this.aura.hide();
      this.leds.hide();
    }
  }

  /** `frames` display frames on: the aura's breath, the particles drifting. */
  update(frames: number): void {
    this.clock += frames;
    const calm = this.calm ? 1 : 0;
    if (this.auraGlow) {
      const breath = this.still ? 0.5 : 0.5 - 0.5 * Math.cos((2 * Math.PI * this.clock) / BREATH);
      this.auraGlow.outerStrength = AURA_REACH.low + (AURA_REACH.high - AURA_REACH.low) * breath;
      this.auraGlow.color = this.tones[calm];
    }
    const peak = this.specks[calm];
    for (const particle of this.particles) this.drift(particle, frames, peak);
  }

  /** Frees what it made: its sprites and their filters, its particles. */
  dispose(): void {
    this.aura.destroy();
    this.leds.destroy();
    for (const { shape } of this.particles) shape.destroy();
    this.particles.length = 0;
  }

  /** One particle `frames` on: born again around the chest once its life is over. */
  private drift(particle: Particle, frames: number, peak: number): void {
    particle.age += frames;
    if (particle.age >= PARTICLE_LIFE) {
      particle.age -= PARTICLE_LIFE;
      // Out of step with the others, from its own index and the clock (no randomness to keep).
      const seed = Math.sin(this.clock * 12.9898 + particle.sway * 78.233) * 43758.5453;
      const random = seed - Math.floor(seed);
      particle.dx = (random * 2 - 1) * CHEST.spread;
      particle.height = CHEST.low + random * (CHEST.high - CHEST.low) * 0.6;
      particle.sway = random * Math.PI * 2;
    }
    const { shape, age } = particle;
    if (!this.shown || this.still || age < 0 || this.tier === 'off') {
      if (shape.visible) shape.setVisible(false);
      return;
    }
    const t = age / PARTICLE_LIFE;
    // In and out smoothly over its whole life: never a blink.
    const alpha = peak * Math.sin(Math.PI * t) ** 2;
    const x = this.x + particle.dx + Math.sin(particle.sway + age / 24) * 4;
    const y = this.feet - particle.height - age * PARTICLE_RISE;
    shape.setPosition(Math.round(x), Math.round(y)).setAlpha(alpha).setVisible(true);
  }
}
