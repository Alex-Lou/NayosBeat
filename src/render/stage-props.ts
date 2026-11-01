import type Phaser from 'phaser';
import {
  STAGE_SCALE,
  type StageArtLayer,
  type StageProp,
  type StagePropFrame,
} from '../art/stage-layers';
import { DEPTH } from './depth';

/** The props' sheet in the texture cache: its frames are added to it by name, once. */
export const PROPS_KEY = 'stage/props';

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

  /** Lays the props of `layer` over it: call right after adding the layer's image. */
  add(scene: Phaser.Scene, layer: StageArtLayer, props: readonly StageProp[]): void {
    const texture = scene.textures.get(PROPS_KEY);
    for (const prop of props) {
      if (prop.layer !== layer.name) continue;
      addFrames(texture, prop);
      const image = scene.add
        .image(0, 0, PROPS_KEY)
        .setOrigin(0, 0)
        .setScale(1 / STAGE_SCALE)
        .setScrollFactor(layer.scroll, 1)
        .setDepth(DEPTH.stage)
        .setVisible(false);
      this.playing.push({ prop, layer, image, shown: -1 });
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
      if (index === playing.shown) continue;
      playing.shown = index;
      const frame: StagePropFrame | null = playing.prop.frames[index] ?? null;
      if (!frame) {
        playing.image.setVisible(false);
        continue;
      }
      playing.image
        .setFrame(frameName(playing.prop, index))
        .setPosition(frame.x / STAGE_SCALE, playing.layer.y + frame.y / STAGE_SCALE)
        .setVisible(true);
    }
  }
}
