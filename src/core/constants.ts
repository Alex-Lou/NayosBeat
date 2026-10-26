/** Simulation ticks per second. All frame data is expressed in ticks at this rate. */
export const TICK_RATE = 60;

/** Positions and speeds are integers in sub-pixels: no floats in game logic. */
export const SUBPIXELS_PER_PIXEL = 100;

/** Visible stage width. The screen edges act as walls, so this is a gameplay rule. */
export const CAMERA_WIDTH_PX = 480;

/** Converts authored pixel values to integer sub-pixels. */
export function px(pixels: number): number {
  return Math.round(pixels * SUBPIXELS_PER_PIXEL);
}

/** Converts sub-pixels back to (possibly fractional) pixels, for display. */
export function toPx(subpixels: number): number {
  return subpixels / SUBPIXELS_PER_PIXEL;
}
