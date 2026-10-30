import Phaser from 'phaser';
import { DEPTH } from './depth';
import { Shake } from './shake';
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
  /** The screen shakes (not with prefers-reduced-motion). */
  readonly shake: boolean;
}

interface Layer {
  readonly object: { setAlpha(alpha: number): unknown; setVisible(visible: boolean): unknown };
  /** Takes the veil's color, at `at` (world pixels) for a glow. */
  readonly start: (look: VeilLook, at: { readonly x: number; readonly y: number }) => void;
  look: VeilLook | null;
  age: number;
}

/**
 * The screen shake and the veils over the fight (docs/flashs.md §2), purely visual, driven by
 * fight events. The dark and the glows are in the world, behind the fighters, who stay lit; the
 * vignette is on the screen, under the HUD. Never a flash over the whole screen.
 */
export class Effects {
  private readonly shake: Shake;
  private readonly layers: Readonly<Record<VeilKind, Layer>>;
  private frame = 0;
  private lastColor: { readonly color: number; readonly frame: number } | null = null;

  constructor(scene: Phaser.Scene, options: EffectsOptions) {
    this.shake = new Shake(options.shake);
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
    this.layers = {
      dim: layer(dim, (look) => dim.setFillStyle(look.color)),
      halo: layer(halo, (look, at) => halo.setTint(look.color).setPosition(at.x, at.y)),
      eclat: layer(eclat, (look, at) => eclat.setTint(look.color).setPosition(at.x, at.y)),
      vignette: layer(vignette, (look) => vignette.setTint(look.color)),
    };
  }

  /** Adds trauma (the strongest wins); `away`: the picture first jolts with the blow. */
  kick(trauma: number, away?: 1 | -1): void {
    this.shake.kick(trauma, away);
  }

  /**
   * Starts a veil; `at`: world pixels a glow bursts from. A colored veil (a KO's) of another
   * color within COLOR_GAP frames of the last one is dropped.
   */
  veil(look: VeilLook, at: { readonly x: number; readonly y: number } = { x: 0, y: 0 }): void {
    if (look.kind === 'vignette' || look.kind === 'eclat') {
      const last = this.lastColor;
      if (last && last.color !== look.color && this.frame - last.frame < COLOR_GAP) return;
      this.lastColor = { color: look.color, frame: this.frame };
    }
    const layer = this.layers[look.kind];
    layer.look = look;
    // Its first state shows on this display frame's update.
    layer.age = -1;
    layer.start(look, at);
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
