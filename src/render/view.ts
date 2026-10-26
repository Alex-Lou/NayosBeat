import { ART_SCALE } from '../art/types';
import { CAMERA_WIDTH_PX } from '../core/constants';
import type { Size } from './pixel-scaling';

/** What the camera shows, in world pixels. */
export const VIEW_SIZE: Size = { width: CAMERA_WIDTH_PX, height: 270 };

/** High definition canvas: twice as fine as the sprites (1920x1080). */
const HD_SCALE = ART_SCALE * 2;

/**
 * Below this, the high definition canvas would be shrunk on screen until a sprite pixel spans
 * less than 1.5 screen pixels: it is not worth its cost.
 */
const HD_MIN_FIT = 0.75;

/**
 * Canvas pixels per world pixel. At least as fine as the sprites, so they show every pixel they
 * have; twice that when the screen can show it, so glows, rays and sparks are drawn in high
 * definition over the pixel art (the world is zoomed by the camera and looks the same). Phones
 * keep the lighter canvas.
 */
export function renderScaleFor(viewport: Size, devicePixelRatio: number, touch: boolean): number {
  if (touch) return ART_SCALE;
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const fit = Math.min(
    (viewport.width * dpr) / (VIEW_SIZE.width * HD_SCALE),
    (viewport.height * dpr) / (VIEW_SIZE.height * HD_SCALE),
  );
  return fit >= HD_MIN_FIT ? HD_SCALE : ART_SCALE;
}

/** Canvas resolution at a render scale. */
export function renderSizeOf(scale: number): Size {
  return { width: VIEW_SIZE.width * scale, height: VIEW_SIZE.height * scale };
}
