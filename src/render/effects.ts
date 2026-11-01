import Phaser from 'phaser';
import { DEPTH } from './depth';
import type { RenderMode } from './render-mode';
import { Shake, type ShakeAxis } from './shake';
import {
  GLOW_SIZE,
  glowProfile,
  veilAlpha,
  veilLife,
  vignetteProfile,
  type VeilKind,
  type VeilLook,
} from './veils';
import { VIEW_SIZE } from './view';

/** A colored veil of another color this soon after the last one is dropped: never cyan then magenta. */
export const COLOR_GAP = 60;
const GLOW_TEXTURE = 'fx:glow';
const GLOW_RESOLUTION = 256;
const VIGNETTE_TEXTURE = 'fx:vignette';
const VIGNETTE_RESOLUTION = { width: 128, height: 72 } as const;
/** Under the HUD (10), which stays readable through a veil (docs/art/direction-hud.md §8). */
const VIGNETTE_DEPTH = 9;

export interface EffectsOptions {
  /** The stage's width, world pixels: the dark covers it all. */
  readonly stageWidth: number;
  /** How far the screen shakes (SHAKE_STRENGTH of the player's « Tremblement »). */
  readonly shake: number;
  /** How the game is drawn: without tints, only the dark shows (render-mode.ts). */
  readonly mode: RenderMode;
}

interface Layer {
  readonly object: { setAlpha(alpha: number): unknown; setVisible(visible: boolean): unknown };
  /** Takes the veil's color, at `at` (world pixels) for a glow, `size` times its size. */
  readonly start: (
    look: VeilLook,
    at: { readonly x: number; readonly y: number },
    size: number,
  ) => void;
  look: VeilLook | null;
  age: number;
}

/**
 * The screen shake and the veils over the fight (docs/flashs.md §2), purely visual, driven by
 * fight events. The dark and the glows are in the world, behind the fighters, who stay lit; the
 * vignette is on the screen, under the HUD. Never a flash over the whole screen. Drawn without
 * tints (`mode` simple), the glows and the vignette, white textures tinted per veil, would show
 * white: they are cut, the dark alone stays (a rectangle's fill).
 */
export class Effects {
  private readonly shake: Shake;
  private readonly layers: Readonly<Record<VeilKind, Layer>>;
  private readonly mode: RenderMode;
  private frame = 0;
  private lastColor: { readonly color: number; readonly frame: number } | null = null;

  constructor(scene: Phaser.Scene, options: EffectsOptions) {
    this.shake = new Shake(options.shake);
    this.mode = options.mode;
    paintTextures(scene);
    const { width, height } = VIEW_SIZE;
    const dim = scene.add
      .rectangle(-width, -height, options.stageWidth + 2 * width, 3 * height, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH.dim);
    const glow = (kind: 'halo' | 'eclat') =>
      scene.add
        .image(0, 0, GLOW_TEXTURE)
        .setDepth(DEPTH.backdrop)
        .setDisplaySize(GLOW_SIZE[kind], GLOW_SIZE[kind]);
    const halo = glow('halo');
    const eclat = glow('eclat');
    const vignette = scene.add
      .image(0, 0, VIGNETTE_TEXTURE)
      .setOrigin(0, 0)
      .setDisplaySize(width, height)
      .setScrollFactor(0)
      .setDepth(VIGNETTE_DEPTH);
    const layer = (object: Layer['object'], start: Layer['start']): Layer => {
      object.setVisible(false);
      return { object, start, look: null, age: 0 };
    };
    const glowStart =
      (image: Phaser.GameObjects.Image, kind: 'halo' | 'eclat'): Layer['start'] =>
      (look, at, size) => {
        const side = GLOW_SIZE[kind] * size;
        image.setTint(look.color).setPosition(at.x, at.y).setDisplaySize(side, side);
      };
    this.layers = {
      dim: layer(dim, (look) => dim.setFillStyle(look.color)),
      halo: layer(halo, glowStart(halo, 'halo')),
      eclat: layer(eclat, glowStart(eclat, 'eclat')),
      vignette: layer(vignette, (look) => vignette.setTint(look.color)),
    };
  }

  /** The player's « Tremblement », at once (the pause's options). */
  setShake(strength: number): void {
    this.shake.strength = strength;
  }

  /**
   * Adds trauma (the strongest wins); `away`: the picture first jolts with the blow; `axis` and
   * `zoom`: one axis only, the offset divided by the close-up (the Finisher's, Shake.kick).
   */
  kick(trauma: number, away?: 1 | -1, axis?: ShakeAxis, zoom?: number): void {
    this.shake.kick(trauma, away, axis, zoom);
  }

  /**
   * Starts a veil; `at`: world pixels a glow bursts from; `size`: a glow's size over its own
   * (GLOW_SIZE), smaller at the Finisher's close up (docs/finisher.md §1.14). A colored veil (a
   * KO's) of another color within COLOR_GAP frames of the last one is dropped; without tints,
   * every one but the dark.
   */
  veil(
    look: VeilLook,
    at: { readonly x: number; readonly y: number } = { x: 0, y: 0 },
    size = 1,
  ): void {
    if (this.mode === 'simple' && look.kind !== 'dim') return;
    if (look.kind === 'vignette' || look.kind === 'eclat') {
      const last = this.lastColor;
      if (last && last.color !== look.color && this.frame - last.frame < COLOR_GAP) return;
      this.lastColor = { color: look.color, frame: this.frame };
    }
    const layer = this.layers[look.kind];
    layer.look = look;
    // Its first state shows on this display frame's update.
    layer.age = -1;
    layer.start(look, at, size);
  }

  /** Advances the shake and the veils by one display frame. */
  update(): void {
    this.frame += 1;
    this.shake.update();
    for (const layer of Object.values(this.layers)) {
      const { look } = layer;
      if (!look) continue;
      layer.age += 1;
      if (layer.age >= veilLife(look)) {
        layer.look = null;
        layer.object.setVisible(false);
        continue;
      }
      layer.object.setAlpha(veilAlpha(look, layer.age));
      layer.object.setVisible(true);
    }
  }

  get shakeX(): number {
    return this.shake.x;
  }

  get shakeY(): number {
    return this.shake.y;
  }
}

/** The glow and the vignette, white, their profiles in alpha: painted once, tinted per veil. */
function paintTextures(scene: Phaser.Scene): void {
  const glowCenter = (GLOW_RESOLUTION - 1) / 2;
  paintAlpha(scene, GLOW_TEXTURE, GLOW_RESOLUTION, GLOW_RESOLUTION, (x, y) =>
    glowProfile(Math.hypot(x - glowCenter, y - glowCenter) / (GLOW_RESOLUTION / 2)),
  );
  const { width, height } = VIGNETTE_RESOLUTION;
  paintAlpha(scene, VIGNETTE_TEXTURE, width, height, (x, y) =>
    vignetteProfile(((x + 0.5) / width) * 2 - 1, ((y + 0.5) / height) * 2 - 1),
  );
}

function paintAlpha(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  alphaAt: (x: number, y: number) => number,
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  const image = texture.context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      image.data[i] = 255;
      image.data[i + 1] = 255;
      image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(alphaAt(x, y) * 255);
    }
  }
  texture.context.putImageData(image, 0, 0);
  texture.refresh();
}
