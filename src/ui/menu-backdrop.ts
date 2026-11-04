import { STAGE_SCALE } from '../art/stage-layers';
import { element, type MenuBackdropName } from './menu';

/** The fight camera's view: the share of a 960 × 540 key art the backdrop scales. */
const VIEW = { width: 480, height: 270 };

/** Where the animated waves sit on each key art, and the radii of the three rings (image px). */
const SCENES: Readonly<
  Record<MenuBackdropName, { readonly x: string; readonly y: string; readonly eq: string }>
> = {
  home: { x: '62.5%', y: '51%', eq: '60%' },
  select: { x: '50%', y: '54%', eq: '50%' },
  stage: { x: '50%', y: '102%', eq: '50%' },
  system: { x: '50%', y: '48%', eq: '50%' },
};
const WAVE_RADII = [230, 290, 350] as const;

/**
 * How much the 480 × 270 view grows to cover `width` × `height`, in image pixels per world pixel.
 * An invalid size keeps the phone's scale.
 */
export function menuStageScale(width: number, height: number): number {
  const cover = Math.max(width / VIEW.width, height / VIEW.height);
  return (cover > 0 ? cover : 1) / STAGE_SCALE;
}

/**
 * The menus' key art, changed per screen (`setScene`) and shown behind their panels. Decoration
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
    this.stage.append(element('div', 'menu-dj'), element('div', 'menu-crowd'));
    for (const [index, radius] of WAVE_RADII.entries()) {
      const wave = element('div', `menu-wave menu-wave-${index + 1}`);
      wave.style.boxShadow = dotRing(radius, 72);
      this.stage.appendChild(wave);
    }
    const eq = element('div', 'menu-eq');
    for (let index = 0; index < 18; index++) {
      const bar = element('span', 'menu-eq-bar');
      bar.style.height = `${20 + ((index * 37) % 56)}px`;
      bar.style.background = ['#30e8ff', '#ff3ca0', '#e07a22'][index % 3] ?? '#30e8ff';
      bar.style.animationDelay = `-${(index * 97) % 1200}ms`;
      eq.appendChild(bar);
    }
    this.stage.appendChild(eq);
    this.root.appendChild(this.stage);
    this.root.appendChild(element('div', 'menu-keyart-vignette'));
    parent.appendChild(this.root);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.setArt(art);
  }

  /** The key art and the waves' focus of the screen on show. */
  setScene(name: MenuBackdropName, art: string): void {
    const scene = SCENES[name];
    this.stage.style.setProperty('--wave-x', scene.x);
    this.stage.style.setProperty('--wave-y', scene.y);
    this.stage.style.setProperty('--eq-x', scene.eq);
    if (name === 'home') this.root.classList.add('is-home');
    else this.root.classList.remove('is-home');
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

/** A ring of `count` dots at `radius`, as one box-shadow: no element per dot. */
function dotRing(radius: number, count: number): string {
  const dots: string[] = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    dots.push(
      `${Math.round(Math.cos(angle) * radius)}px ${Math.round(Math.sin(angle) * radius)}px 0 currentColor`,
    );
  }
  return dots.join(', ');
}
