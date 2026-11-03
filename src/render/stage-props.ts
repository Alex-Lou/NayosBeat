import type Phaser from 'phaser';
import {
  driftAt,
  STAGE_SCALE,
  type StageArtLayer,
  type StageProp,
  type StagePropFrame,
} from '../art/stage-layers';

/** The frame of `prop` its timeline shows `step` steps (1/60 s) after it started: it loops. */
export function propFrameAt(prop: StageProp, step: number): number {
  const total = prop.timeline.reduce((sum, [, steps]) => sum + steps, 0);
  let left = ((Math.floor(step) % total) + total) % total;
  for (const [frame, steps] of prop.timeline) {
    if (left < steps) return frame;
    left -= steps;
  }
  return 0;
}

interface Playing {
  readonly prop: StageProp;
  readonly layer: StageArtLayer;
  readonly image: Phaser.GameObjects.Image;
  /** The frame shown, -1 before the first update. */
  shown: number;
  /** Where its glide has taken it, image pixels (StageDrift). */
  moved: number;
}

/** How far `prop` has glided `step` steps after it started (0 if it does not glide). */
export function propDriftAt(prop: StageProp, step: number): number {
  if (!prop.drift) return 0;
  const total = prop.timeline.reduce((sum, [, steps]) => sum + steps, 0);
  return driftAt(prop.drift, step, total);
}

function frameName(prop: StageProp, index: number): string {
  return `${prop.name}/${index}`;
}

/** Names each frame of `prop` in the props' texture, once: the next fight finds them there. */
function addFrames(texture: Phaser.Textures.Texture, prop: StageProp): void {
  prop.frames.forEach((frame, index) => {
    const name = frameName(prop, index);
    if (frame && !texture.has(name)) {
      texture.add(name, 0, frame.sheetX, frame.sheetY, frame.width, frame.height);
    }
  });
}

/**
 * The stage's animations (docs/art/decor-rue.md §6): small images laid over their layer,
 * scrolling with it, each showing its prop's frame of the moment. A view only: it counts the
 * visual clock's steps, never reads the core (D17), and changes frame whole, nothing in between
 * (D23). Its images go with the fight (`dispose`); the sheet stays in the cache, as the layers do.
 */
export class StagePropsView {
  private readonly playing: Playing[] = [];
  private steps = 0;

  /** `sheet`: the props' sheet in the texture cache (stage-view.ts, `propsKeyOf`). */
  constructor(private readonly sheet: string) {}

  /**
   * Lays the props of `layer` over it, each at the next of `depths` (stage-view.ts `stageDepths`):
   * call right after adding the layer's image.
   */
  add(
    scene: Phaser.Scene,
    layer: StageArtLayer,
    props: readonly StageProp[],
    depths: () => number,
  ): void {
    const texture = scene.textures.get(this.sheet);
    for (const prop of props) {
      if (prop.layer !== layer.name) continue;
      addFrames(texture, prop);
      const image = scene.add
        .image(0, 0, this.sheet)
        .setOrigin(0, 0)
        .setScale(1 / STAGE_SCALE)
        .setScrollFactor(layer.scroll, 1)
        .setDepth(depths())
        .setVisible(false);
      this.playing.push({ prop, layer, image, shown: -1, moved: 0 });
    }
    this.show();
  }

  /** `steps` more steps of 1/60 s of the visual clock. */
  update(steps: number): void {
    this.steps += steps;
    this.show();
  }

  dispose(): void {
    for (const { image } of this.playing) image.destroy();
    this.playing.length = 0;
  }

  private show(): void {
    for (const playing of this.playing) {
      const index = propFrameAt(playing.prop, this.steps);
      const moved = propDriftAt(playing.prop, this.steps);
      if (index === playing.shown && moved === playing.moved) continue;
      playing.shown = index;
      playing.moved = moved;
      const frame: StagePropFrame | null = playing.prop.frames[index] ?? null;
      if (!frame) {
        playing.image.setVisible(false);
        continue;
      }
      playing.image
        .setFrame(frameName(playing.prop, index))
        .setPosition((frame.x + moved) / STAGE_SCALE, playing.layer.y + frame.y / STAGE_SCALE)
        .setVisible(true);
    }
  }
}
