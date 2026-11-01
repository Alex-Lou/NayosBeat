export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * Below this ratio of the available space, an integer scale wastes too much screen
 * (e.g. 1366x768 laptops) and a fractional scale is used instead.
 */
const MIN_INTEGER_FILL_RATIO = 0.85;

/** Absorbs float noise such as 3.9999999 so that it floors to 4. */
const EPSILON = 1e-6;

/**
 * Returns the zoom (in CSS pixels) to display a `base`-sized canvas inside `viewport`.
 *
 * Prefers an integer scale in *device* pixels so every source pixel maps to the same number of
 * physical pixels (pixel-perfect, including on high-DPI phones). Falls back to the largest
 * fractional scale when the integer one would leave too much empty space.
 */
export function computeZoom(viewport: Size, base: Size, devicePixelRatio: number): number {
  const fit = Math.min(viewport.width / base.width, viewport.height / base.height);
  if (!(fit > 0)) return 1;

  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const deviceFit = fit * dpr;
  const integerScale = Math.floor(deviceFit + EPSILON);

  if (integerScale >= 1 && integerScale / deviceFit >= MIN_INTEGER_FILL_RATIO) {
    return integerScale / dpr;
  }
  return fit;
}

/** The menus' layout: drawn for a phone's screen, on the pixel font's grid of 8. */
const UI_BASE: Size = { width: 640, height: 360 };

/**
 * How many times the menus grow on `viewport` (docs/polish/AUDIT-ET-PLAN.md, P22): 1 on a phone,
 * 2 in 1280×720, 3 in 1920×1080. A whole number, so the pixel font stays on its grid.
 */
export function uiScaleFor(viewport: Size): number {
  const fit = Math.min(viewport.width / UI_BASE.width, viewport.height / UI_BASE.height);
  return Math.max(1, Math.floor(fit + EPSILON));
}
