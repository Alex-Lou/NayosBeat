import Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import type { GameState } from '../core/state';
import { DEPTH } from './depth';
import { GLOW_TEXTURE, paintVeilTextures } from './effects';
import { landsHeavy, type FightEvent } from './fight-events';
import { addAlphaFor } from './luminance';
import {
  castOn,
  collectLights,
  lightPool,
  MAX_LIGHTS,
  poolScale,
  poolUnder,
  type Cast,
  type Light,
  type Pool,
} from './move-lights';
import type { RenderMode } from './render-mode';
import { PLATINE, type Signature } from './signatures';
import { CALM_DELTA, VEIL_DELTA } from './veils';

/**
 * The lights of the moves, drawn (docs/art/nayo-vfx.md §2): a pool of colored light on the floor
 * under each source (an added ellipse, soft), the shadows of both fighters leaning away from them
 * and the glow on a fighter near the other one's lights (`casts`, which the fighters' views draw).
 * A heavy blow of a fighter whose signature flares lights its impact a moment. The sources come
 * from the state (move-lights.ts); the flares fade on the display clock. Never a flash: the pools
 * together raise the floor by VEIL_DELTA at most (CALM_DELTA with the flashes calm), the glow by
 * GLOW_DELTA, over every color of the stage, so they ask the budget nothing. Drawn without tints
 * (`mode` simple), there is no light at all: the pools are tints, and a shadow leaning toward
 * nothing would read as a mistake.
 */

/** The glow on a body raises it by this much at most (calm: CALM_GLOW_DELTA). */
export const GLOW_DELTA = 0.035;
export const CALM_GLOW_DELTA = 0.02;
/** A pool is this many times as high as it is wide: an ellipse lying on the floor. */
export const POOL_FLATNESS = 0.22;
/** A heavy blow's flare lasts this many display frames, fading. */
const FLARE_LIFE = 20;
const FLARES = 4;

interface Flare {
  x: number;
  height: number;
  color: number;
  by: 0 | 1;
  /** Display frames since it lit; past FLARE_LIFE, out. */
  age: number;
}

export interface LightRigLook {
  readonly groundY: number;
  readonly signatures: readonly [Signature | null, Signature | null];
  readonly energies: readonly [number, number];
  readonly stage: readonly number[];
  readonly mode: RenderMode;
}

export class LightRig {
  /** The flashes calm (reduced or off): fainter pools and glows. Read every frame. */
  calm = false;
  /** How the lights fall on each player, this frame. */
  readonly casts: readonly [Cast, Cast] = [
    { lean: 0, glowColor: 0, glow: 0 },
    { lean: 0, glowColor: 0, glow: 0 },
  ];
  private readonly lights: Light[] = lightPool();
  private readonly pools: Pool[];
  private readonly images: readonly Phaser.GameObjects.Image[];
  private readonly flares: Flare[];
  private nextFlare = 0;
  /** By color: a pool's alpha at full weight and the glow's at its strongest, normal and calm. */
  private readonly alphas = new Map<number, readonly [number, number, number, number]>();
  private readonly fullPool = (color: number): number =>
    this.alphas.get(color)?.[this.calm ? 1 : 0] ?? 0;

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    private readonly look: LightRigLook,
  ) {
    paintVeilTextures(scene);
    this.pools = Array.from({ length: MAX_LIGHTS }, () => ({
      x: 0,
      width: 0,
      color: 0,
      weight: 0,
    }));
    this.images = this.pools.map(() =>
      scene.add
        .image(0, look.groundY, GLOW_TEXTURE)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.pools)
        .setVisible(false),
    );
    this.flares = Array.from({ length: FLARES }, () => ({
      x: 0,
      height: 0,
      color: 0,
      by: 0 as const,
      age: FLARE_LIFE,
    }));
    for (const color of [...look.energies, PLATINE]) {
      this.alphas.set(color, [
        addAlphaFor(color, look.stage, VEIL_DELTA),
        addAlphaFor(color, look.stage, CALM_DELTA),
        addAlphaFor(color, look.stage, GLOW_DELTA),
        addAlphaFor(color, look.stage, CALM_GLOW_DELTA),
      ]);
    }
  }

  /** A heavy blow (a CONTRE, a KO) of a fighter whose signature flares lights its impact. */
  react(event: FightEvent): void {
    if (event.type !== 'hit' && event.type !== 'ko') return;
    if (!this.look.signatures[event.by]?.flares || !landsHeavy(event)) return;
    const flare = this.flares[this.nextFlare];
    if (!flare) return;
    this.nextFlare = (this.nextFlare + 1) % this.flares.length;
    flare.x = toPx(event.x);
    flare.height = toPx(event.y);
    flare.color = event.tier >= 2 ? PLATINE : this.look.energies[event.by];
    flare.by = event.by;
    flare.age = 0;
  }

  /**
   * Gathers this frame's lights (`state`'s, and the flares, aged by `frames` display frames),
   * draws their pools and works out how they fall on each fighter; `off`, none shows (the
   * Finisher's scene lights its own stage).
   */
  update(state: GameState, frames: number, off: boolean): void {
    const { lights, look } = this;
    const shown = look.mode !== 'simple' && !off;
    let count = shown
      ? collectLights(state, this.config, look.signatures, look.energies, lights)
      : 0;
    for (const flare of this.flares) {
      if (flare.age >= FLARE_LIFE) continue;
      const light = lights[count];
      if (shown && light) {
        light.x = flare.x;
        light.height = flare.height;
        light.color = flare.color;
        light.by = flare.by;
        light.strength = (1 - flare.age / FLARE_LIFE) ** 1.5;
        count++;
      }
      flare.age += frames;
    }
    this.drawPools(count);
    for (const player of [0, 1] as const) {
      const fighter = state.fighters[player];
      const cast = this.casts[player];
      castOn(player, toPx(fighter.x), toPx(fighter.y), lights, count, cast);
      const alphas = this.alphas.get(cast.glowColor);
      cast.glow *= alphas?.[this.calm ? 3 : 2] ?? 0;
    }
  }

  private drawPools(count: number): void {
    const { pools, images, lights } = this;
    for (let i = 0; i < count; i++) {
      const light = lights[i];
      const pool = pools[i];
      if (light && pool) poolUnder(light, pool);
    }
    const delta = this.calm ? CALM_DELTA : VEIL_DELTA;
    const scale = count > 0 ? poolScale(pools, count, this.fullPool, this.look.stage, delta) : 0;
    images.forEach((image, i) => {
      const pool = pools[i];
      if (i >= count || !pool) {
        if (image.visible) image.setVisible(false);
        return;
      }
      image
        .setTint(pool.color)
        .setPosition(pool.x, this.look.groundY)
        .setDisplaySize(pool.width, pool.width * POOL_FLATNESS)
        .setAlpha(this.fullPool(pool.color) * pool.weight * scale)
        .setVisible(true);
    });
  }
}
