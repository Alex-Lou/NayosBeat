import Phaser from 'phaser';
import { DEPTH } from './depth';
import type { FightEvent } from './fight-events';
import type { FlashBudget } from './flash-budget';
import {
  CALM_LIVE_DELTA,
  channels,
  DIM_TIMING,
  dimLevel,
  emits,
  FIGHTER_LIFT,
  glowAlpha,
  glowScale,
  LIVE_DELTA,
  peakFalloff,
  strongestGlows,
  Z_RATIO,
  type Glow,
  type LightTier,
} from './live-lights';
import type { Light } from './move-lights';

/**
 * The moves' live lights (docs/art/nayo-vivante.md §2), drawn: each source of light-rig.ts (a
 * hand, a disc in flight, a fist on the floor, a heavy blow's flare) lights the street with a glow
 * (Phaser's PointLight, added over the stage, under the fighters) and both fighters with Phaser's
 * per-pixel lights (LightsManager, `setLighting`), in its color. Under a super's freeze, the whole
 * stage dims (a multiplying tint, the fighters left as they are) and the super's glow relights the
 * street around its fist. Nothing of it reads the core back (D17); the sources come from the
 * tick's state, the dim from the display clock, nothing in between (D23).
 *
 * Never a flash (docs/flashs.md §5): the glows raise none of the stage's large colors by
 * LIVE_DELTA (CALM_LIVE_DELTA calm), those that overlap shared out (`glowScale`); what they would
 * raise by 0.1 or more (a lit window, a lamp, a sign: `emits`) is drawn again over them, as it is,
 * the props too. What a light raises by 0.1 on the fighters asks the flash budget once, as it comes
 * on (`admit`, never a slot); refused, or the flashes calm, that light leaves the fighters as they
 * are for its whole life. Off (`tier`, the adaptive quality's), and drawn by Canvas, none of it:
 * the dim is then the super's dark veil (FightFeedback, `liveDim` false).
 */

/** Lights made with the fight: as many as the game's light shader takes (main.ts, maxLights). */
export const LIVE_LIGHTS = 4;
/**
 * Phaser 4.2.1 hands its PointLight's shader `color.r × intensity` (BatchHandlerPointLight.js), its
 * Color's channels in 0 to 255 (IntegerToColor): an opacity is that many times smaller there.
 */
const GLOW_UNIT = 255;
/** The stage's pixels that light themselves, and its props, over the glows. */
const EMITTERS_DEPTH = DEPTH.pools + 0.002;

/** Something drawn that the lights may fall on. */
export interface Litable {
  setLighting(on: boolean): unknown;
}

export interface LightShowLook {
  /** The stage's large colors: no glow changes them by LIVE_DELTA. */
  readonly stage: readonly number[];
  /** Every color a light may take in this fight (the energies, the platine). */
  readonly colors: readonly number[];
  /** The flash budget, which a light asks for the fighters it lights. */
  readonly budget: FlashBudget;
  /** What each fighter lights at ΔL ≥ 0.1 under a light (live-lights.ts FIGHTER_LIGHT_AREAS). */
  readonly fighterAreas: readonly [number, number];
  readonly groundY: number;
}

/** A source's decision as it came on: a move and its disc share one, a flare has its own. */
interface Decision {
  shining: boolean;
  granted: boolean;
}

/** A stage image and its emitters drawn again over the glows, or its prop, raised over them. */
interface StageImage {
  readonly image: Phaser.GameObjects.Image;
  /** Its pixels that light themselves; null for a prop (raised whole). */
  readonly emitters: Phaser.GameObjects.Image | null;
  readonly depth: number;
}

export class LightShow {
  /** The flashes calm (reduced or off): fainter, never asking. Read every frame. */
  calm = false;
  private tier: LightTier = 'off';
  private readonly glows: Phaser.GameObjects.PointLight[] = [];
  private readonly lights: Phaser.GameObjects.Light[] = [];
  private readonly shapes: Glow[] = Array.from({ length: LIVE_LIGHTS }, () => ({
    x: 0,
    y: 0,
    radius: 1,
    color: 0,
    alpha: 0,
  }));
  private readonly decisions: Decision[] = Array.from({ length: 4 }, () => ({
    shining: false,
    granted: false,
  }));
  private stage: StageImage[] = [];
  /** The textures it painted (the emitters), freed with it. */
  private readonly painted: string[] = [];
  private fighters: readonly Litable[] = [];
  private emittersShown = false;
  /** Display frames into the super's dim; Infinity: none. Its player: held while its light is. */
  private dimAge = Infinity;
  private dimBy: 0 | 1 = 0;
  private dimShown = 1;
  /** A glow's heart by color, normal and calm, out of a dim; under one, worked out each frame. */
  private readonly hearts = new Map<number, readonly [number, number]>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly look: LightShowLook,
  ) {}

  /**
   * The stage's images (stage-view.ts): its layers, each with its emitters painted for this fight's
   * colors, and its props. They all dim under a super.
   */
  lightStage(
    layers: readonly Phaser.GameObjects.Image[],
    props: readonly Phaser.GameObjects.Image[],
  ): void {
    const strongest = strongestGlows(this.look.colors, this.look.stage);
    this.stage = [
      ...layers.map((image) => ({
        image,
        emitters: this.emittersOf(image, strongest),
        depth: image.depth,
      })),
      ...props.map((image) => ({ image, emitters: null, depth: image.depth })),
    ];
  }

  /** The fighters' bodies, which granted lights fall on. */
  lightFighters(bodies: readonly Litable[]): void {
    this.fighters = bodies;
    this.apply();
  }

  /** The adaptive quality's tier: lights only above `off`. */
  setTier(tier: LightTier): void {
    if (tier === this.tier) return;
    this.tier = tier;
    this.apply();
  }

  get on(): boolean {
    return this.tier !== 'off';
  }

  /** A super's freeze dims the stage (its dark veil's place). */
  react(event: FightEvent): void {
    if (event.type !== 'freeze' || !this.on) return;
    this.dimAge = 0;
    this.dimBy = event.by;
  }

  /**
   * Shows this frame's `count` first `sources` (light-rig.ts), `frames` display frames on;
   * `off`, none (the Finisher's scene lights its own stage).
   */
  update(sources: readonly Light[], count: number, frames: number, off: boolean): void {
    if (!this.on) return;
    this.dimAge += frames;
    // Held as long as the super's own light shines (a move's, by who froze the game).
    const { attack } = DIM_TIMING;
    if (this.dimAge > attack && this.dimAge < Infinity && this.shines(sources, count)) {
      this.dimAge = attack;
    }
    const level = dimLevel(this.dimAge);
    if (level !== this.dimShown) this.dim(level);
    const shown = off ? 0 : Math.min(count, LIVE_LIGHTS);
    this.decide(sources, shown);
    const delta = this.calm ? CALM_LIVE_DELTA : LIVE_DELTA;
    let fighterSum = 0;
    for (let i = 0; i < shown; i++) {
      const source = sources[i];
      const shape = this.shapes[i];
      if (!source || !shape) continue;
      shape.x = source.x;
      shape.y = this.look.groundY - source.height;
      shape.radius = source.radius;
      shape.color = source.color;
      shape.alpha = source.strength * this.heartOf(source.color, delta, level);
      if (this.lightsFighters(source)) {
        fighterSum += source.strength * Math.max(...channels(source.color));
      }
    }
    const scale = shown > 0 ? glowScale(this.shapes, shown, this.look.stage, delta, level) : 0;
    // The fighters' lights added up never lift a channel past FIGHTER_LIFT, what they were
    // measured under (a bound: as if they all shone on one pixel).
    const share = fighterSum > 1 ? 1 / fighterSum : 1;
    this.glows.forEach((glow, i) => {
      const shape = this.shapes[i];
      const source = sources[i];
      const light = this.lights[i];
      if (i >= shown || !shape || !source || !light || shape.alpha <= 0) {
        if (glow.visible) glow.setVisible(false);
        if (light?.visible) light.setVisible(false);
        return;
      }
      glow.setPosition(shape.x, shape.y).setVisible(true);
      glow.color.setTo((shape.color >> 16) & 0xff, (shape.color >> 8) & 0xff, shape.color & 0xff);
      glow.radius = shape.radius;
      glow.intensity = (shape.alpha * scale) / GLOW_UNIT;
      if (!this.lightsFighters(source)) {
        if (light.visible) light.setVisible(false);
        return;
      }
      const z = shape.radius * Z_RATIO;
      light.x = shape.x;
      light.y = shape.y;
      light
        .setRadius(shape.radius)
        .setZ(z)
        .setColor(shape.color)
        .setIntensity((FIGHTER_LIFT * source.strength * share) / peakFalloff(shape.radius, z))
        .setVisible(true);
    });
    this.showEmitters(shown > 0);
  }

  /** Frees what it made: its glows and lights, its textures, the lighting of what it lit, the dim. */
  dispose(): void {
    this.tier = 'off';
    this.apply();
    const manager = this.scene.lights;
    for (const light of this.lights) manager.removeLight(light);
    this.lights.length = 0;
    for (const glow of this.glows) glow.destroy();
    this.glows.length = 0;
    for (const { emitters } of this.stage) emitters?.destroy();
    this.stage = [];
    for (const key of this.painted) this.scene.textures.remove(key);
    this.painted.length = 0;
    manager.disable();
    // Phaser's own culling back.
    delete (manager as Partial<Pick<Phaser.GameObjects.LightsManager, 'getLights'>>).getLights;
  }

  /** Whether the dimming player's move still lights (its super). */
  private shines(sources: readonly Light[], count: number): boolean {
    for (let i = 0; i < count; i++) {
      const source = sources[i];
      if (source?.by === this.dimBy && source.source === 'move') return true;
    }
    return false;
  }

  /** Whether `source` lights the fighters: granted as it came on, the flashes normal. */
  private lightsFighters(source: Light): boolean {
    return !this.calm && this.decisions[keyOf(source)]?.granted === true;
  }

  /**
   * Each source coming on decides once: granted (the fighters it lights fit the budget), it lights
   * them for its whole life; refused, or calm, never. A move and its disc share one decision.
   */
  private decide(sources: readonly Light[], shown: number): void {
    let present = 0;
    for (let i = 0; i < shown; i++) {
      const source = sources[i];
      if (source) present |= 1 << keyOf(source);
    }
    this.decisions.forEach((decision, key) => {
      if (!(present & (1 << key))) decision.shining = false;
    });
    for (let i = 0; i < shown; i++) {
      const source = sources[i];
      const decision = source ? this.decisions[keyOf(source)] : undefined;
      if (!decision || decision.shining) continue;
      decision.shining = true;
      const area = this.look.fighterAreas[0] + this.look.fighterAreas[1];
      decision.granted = !this.calm && this.look.budget.admit(area);
    }
  }

  /** A glow's heart: its color's bound, calm the calm one, under a dim worked out anew. */
  private heartOf(color: number, delta: number, level: number): number {
    if (level < 1) return glowAlpha(color, this.look.stage, delta, level);
    let hearts = this.hearts.get(color);
    if (!hearts) {
      hearts = [
        glowAlpha(color, this.look.stage, LIVE_DELTA),
        glowAlpha(color, this.look.stage, CALM_LIVE_DELTA),
      ];
      this.hearts.set(color, hearts);
    }
    return delta === LIVE_DELTA ? hearts[0] : hearts[1];
  }

  /** The emitters and the props over the glows while any shows, back in their place after. */
  private showEmitters(on: boolean): void {
    if (on === this.emittersShown) return;
    this.emittersShown = on;
    for (const { image, emitters, depth } of this.stage) {
      if (emitters) emitters.setVisible(on && image.visible);
      else image.setDepth(on ? EMITTERS_DEPTH : depth);
    }
  }

  private dim(level: number): void {
    this.dimShown = level;
    const gray = Math.round(255 * level) * 0x010101;
    for (const { image, emitters } of this.stage) {
      for (const each of emitters ? [image, emitters] : [image]) {
        if (level >= 1) each.clearTint();
        else each.setTint(gray).setTintMode(Phaser.TintModes.MULTIPLY);
      }
    }
  }

  /** On: the glows and lights made; off: none of it, the stage as drawn. */
  private apply(): void {
    const on = this.on;
    if (on && this.glows.length === 0) {
      const manager = this.scene.lights.enable().setAmbientColor(0xffffff);
      for (let i = 0; i < LIVE_LIGHTS; i++) {
        this.lights.push(manager.addLight(0, 0, 1, 0xffffff, 0).setVisible(false));
        this.glows.push(
          this.scene.add
            .pointlight(0, 0, 0xffffff, 1, 0, 1)
            .setDepth(DEPTH.pools)
            .setVisible(false),
        );
      }
      uncull(manager);
    }
    for (const light of this.lights) light.setVisible(false);
    for (const glow of this.glows) glow.setVisible(false);
    // The fighters stay lit from the start, the lights hidden: the light shader is ready (made
    // during the intro) before the first light, and nothing changes while none shows.
    for (const body of this.fighters) body.setLighting(on);
    for (const decision of this.decisions) decision.shining = false;
    this.showEmitters(false);
    if (!on) {
      this.dimAge = Infinity;
      this.dim(1);
    }
  }

  /**
   * `image`'s pixels that light themselves (`emits` under the `strongest` glows of this fight),
   * painted once on a canvas for the fight: an image laid exactly over it, over the glows, hidden
   * until one shows. None if nothing of it would rise by 0.1.
   */
  private emittersOf(
    image: Phaser.GameObjects.Image,
    strongest: ReturnType<typeof strongestGlows>,
  ): Phaser.GameObjects.Image | null {
    const source = image.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const key = `${image.texture.key}#emitters`;
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    const canvas = this.scene.textures.createCanvas(key, source.width, source.height);
    if (!canvas) return null;
    this.painted.push(key);
    const context = canvas.context;
    context.drawImage(source, 0, 0);
    const pixels = context.getImageData(0, 0, source.width, source.height);
    if (keepEmitters(pixels.data, strongest) === 0) return null;
    context.putImageData(pixels, 0, 0);
    canvas.refresh();
    return this.scene.add
      .image(image.x, image.y, key)
      .setOrigin(image.originX, image.originY)
      .setScale(image.scaleX, image.scaleY)
      .setScrollFactor(image.scrollFactorX, image.scrollFactorY)
      .setDepth(EMITTERS_DEPTH)
      .setVisible(false);
  }
}

/**
 * Keeps, in RGBA `pixels`, only those that light themselves (`emits`): the others turn clear.
 * Returns how many it kept.
 */
export function keepEmitters(
  pixels: Uint8ClampedArray,
  strongest: ReturnType<typeof strongestGlows>,
): number {
  const known = new Map<number, boolean>();
  let kept = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if ((pixels[i + 3] ?? 0) === 0) continue;
    const color = ((pixels[i] ?? 0) << 16) | ((pixels[i + 1] ?? 0) << 8) | (pixels[i + 2] ?? 0);
    let keep = known.get(color);
    if (keep === undefined) {
      keep = emits(color, strongest);
      known.set(color, keep);
    }
    if (keep) kept++;
    else pixels[i + 3] = 0;
  }
  return kept;
}

/**
 * Phaser 4.2.1 culls the lights against the camera's `worldView`, which ignores the camera's
 * origin (Camera.js, preRender: centered on scroll + half its size): with the fight camera's,
 * (0, 0), the view it tests lies (width / 2)(1 − 1 / zoom) off, and a light by the fighters falls
 * out of it. LIVE_LIGHTS stay within the shader's maxLights: none needs culling, every light that
 * shows goes (`dispose` gives Phaser its own back).
 */
function uncull(manager: Phaser.GameObjects.LightsManager): void {
  manager.getLights = (camera) => {
    const shown = manager.lights.filter((light) => light.willRender(camera));
    (manager as { visibleLights: number }).visibleLights = shown.length;
    return shown.map((light) => ({ light, distance: 0 })) as unknown as Phaser.GameObjects.Light[];
  };
}

/** A move and its disc share a decision (0, 1 by player); a flare its own (2, 3). */
function keyOf(source: Light): number {
  return source.by + (source.source === 'flare' ? 2 : 0);
}
