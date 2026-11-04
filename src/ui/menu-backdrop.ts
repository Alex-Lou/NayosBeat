import { STAGE_SCALE } from '../art/stage-layers';
import { element } from './menu';

/** The fight camera's view: the share of a 960 × 540 key art the backdrop scales. */
const VIEW = { width: 480, height: 270 };

/**
 * How much the 480 × 270 view grows to cover `width` × `height`, in image pixels per world pixel.
 * An invalid size keeps the phone's scale.
 */
export function menuStageScale(width: number, height: number): number {
  const cover = Math.max(width / VIEW.width, height / VIEW.height);
  return (cover > 0 ? cover : 1) / STAGE_SCALE;
}

/**
 * The menus' key art, changed per screen (`setArt`) and shown behind their panels. Decoration
 * only: aria-hidden, no render loop, nothing listens to it.
 */
export class MenuBackdrop {
  private readonly root: HTMLDivElement;
  private readonly stage: HTMLDivElement;
  private readonly image: HTMLImageElement;
  private art = '';
  private visible = true;

  constructor(parent: HTMLElement, art: string) {
    this.root = element('div', 'menu-keyart');
    this.root.setAttribute('aria-hidden', 'true');
    this.stage = element('div', 'menu-keyart-stage');
    this.image = document.createElement('img');
    this.image.className = 'menu-keyart-image';
    this.image.alt = '';
    this.image.addEventListener('load', this.onLoad);
    this.image.addEventListener('error', this.onLoad);
    this.stage.appendChild(this.image);
    this.root.appendChild(this.stage);
    this.root.appendChild(element('div', 'menu-keyart-vignette'));
    parent.appendChild(this.root);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.setArt(art);
  }

  /** The key art of the screen on show; the same one does not reload. */
  setArt(art: string): void {
    if (art === this.art) return;
    this.art = art;
    this.root.classList.remove('ready');
    this.image.src = art;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) {
      this.root.classList.add('hidden');
      return;
    }
    this.root.classList.remove('hidden');
    if (this.image.complete) this.root.classList.add('ready');
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.root.remove();
  }

  private readonly onLoad = (): void => {
    if (this.visible) this.root.classList.add('ready');
  };

  private readonly resize = (): void => {
    const width = this.root.clientWidth || window.innerWidth || VIEW.width;
    const height = this.root.clientHeight || window.innerHeight || VIEW.height;
    this.stage.style.setProperty('--menu-art-scale', String(menuStageScale(width, height)));
  };
}
