import { STAGE_LAYERS, STAGE_SCALE, type StageVariant } from '../art/stage-layers';
import type { FighterLook } from './fighter-look';
import { cutElement, idleKeyframes } from './idle-figure';
import { element } from './menu';

/** The fight camera's view: what the backdrop shows of the stage, in world pixels. */
const VIEW = { width: 480, height: 270 };

/** Where the fighters' feet stand: the stage's ground line (src/art/stage-layers.ts). */
const GROUND_Y = STAGE_LAYERS.floor.y;

/** A fighter standing on the home screen, at its place in the street. */
export interface HomeFighter {
  readonly look: FighterLook;
  /** The middle of its feet, in world pixels from the view's left edge. */
  readonly x: number;
  /** 1 faces right, -1 faces left. */
  readonly facing: 1 | -1;
}

/**
 * How much the 480 × 270 view grows to cover `width` × `height`, in image pixels per world pixel
 * (the stage is drawn at STAGE_SCALE, src/art/stage-layers.ts). Whole or not, the browser keeps
 * its pixels hard (image-rendering: pixelated); a phone crops the sky rather than the floor.
 */
export function homeStageScale(width: number, height: number): number {
  const cover = Math.max(width / VIEW.width, height / VIEW.height);
  return (cover > 0 ? cover : 1) / STAGE_SCALE;
}

/**
 * The street and two fighters behind the title and the home menu (docs/art/decor-rue.md), laid
 * out without Phaser: the menus need no render loop. Decoration only (aria-hidden), its idle
 * stops with reduced motion.
 */
export class HomeBackdrop {
  private readonly root: HTMLDivElement;
  private readonly stage: HTMLDivElement;
  private readonly playing: { readonly sprite: HTMLElement; readonly look: FighterLook }[] = [];
  private readonly animations: Animation[] = [];
  private readonly layerCount: number;
  private loaded = 0;
  private visible = true;
  private still: boolean;

  constructor(
    parent: HTMLElement,
    variant: StageVariant | undefined,
    fighters: readonly HomeFighter[],
    still = false,
  ) {
    this.still = still;
    this.root = element('div', 'home-backdrop');
    this.root.setAttribute('aria-hidden', 'true');
    this.stage = element('div', 'home-stage');
    this.root.appendChild(this.stage);

    const layers = variant?.art.layers ?? [];
    this.layerCount = layers.length;
    for (const layer of layers) {
      const image = document.createElement('img');
      image.className = 'home-layer';
      image.alt = '';
      image.addEventListener('load', this.onLayerLoad);
      image.addEventListener('error', this.onLayerLoad);
      image.style.left = `${(VIEW.width - layer.width) * (STAGE_SCALE / 2)}px`;
      image.style.top = `${layer.y * STAGE_SCALE}px`;
      image.style.width = `${layer.width * STAGE_SCALE}px`;
      image.style.height = `${layer.height * STAGE_SCALE}px`;
      image.src = layer.url;
      this.stage.appendChild(image);
    }
    // The street is optional (a checkout without its drawn layers): the dark backdrop stays.
    if (this.layerCount === 0) this.root.classList.add('ready');

    for (const { look, x, facing } of fighters) {
      const figure = element('div', 'home-fighter');
      figure.style.left = `${x * STAGE_SCALE - look.width / 2}px`;
      figure.style.top = `${GROUND_Y * STAGE_SCALE - look.height}px`;
      figure.style.width = `${look.width}px`;
      figure.style.height = `${look.height}px`;
      if (facing === -1) figure.style.transform = 'scaleX(-1)';
      figure.appendChild(element('div', 'home-fighter-shadow'));
      const sprite = cutElement(look, look.idle[0]?.frame ?? 0, {
        x: 0,
        y: 0,
        width: look.width,
        height: look.height,
      });
      figure.appendChild(sprite);
      this.stage.appendChild(figure);
      this.playing.push({ sprite, look });
    }

    this.root.appendChild(element('div', 'home-vignette'));
    parent.appendChild(this.root);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.sync();
  }

  /** The player's « Tremblement » or the system's reduced motion: the fighters stand still. */
  setStill(still: boolean): void {
    this.still = still;
    this.sync();
  }

  /** Shown on the title, the notice and the home menu; hidden everywhere else. */
  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) this.root.classList.remove('hidden');
    else this.root.classList.add('hidden');
    this.sync();
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.root.remove();
  }

  private readonly onLayerLoad = (): void => {
    this.loaded += 1;
    if (this.loaded >= this.layerCount) this.root.classList.add('ready');
  };

  private readonly resize = (): void => {
    const width = this.root.clientWidth || window.innerWidth || VIEW.width;
    const height = this.root.clientHeight || window.innerHeight || VIEW.height;
    this.stage.style.setProperty('--home-scale', String(homeStageScale(width, height)));
  };

  /** Plays the idle only while it is shown and the player lets it move. */
  private sync(): void {
    const run = this.visible && !this.still;
    if (run && this.animations.length === 0) this.play();
    else if (!run) this.stop();
  }

  private play(): void {
    for (const { sprite, look } of this.playing) {
      if (look.idle.length < 2) continue;
      const { keyframes, duration } = idleKeyframes(look, {
        x: 0,
        y: 0,
        width: look.width,
        height: look.height,
      });
      this.animations.push(sprite.animate(keyframes, { duration, iterations: Infinity }));
    }
  }

  private stop(): void {
    for (const animation of this.animations) animation.cancel();
    this.animations.length = 0;
  }
}
