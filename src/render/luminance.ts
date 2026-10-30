/**
 * The measures of a flash (docs/flashs.md §1): WCAG 2.x relative luminance, and how a color
 * drawn over another changes it.
 */

/** 0 to 1 sRGB value of a channel, linearized (the WCAG definition). */
function linear(color: number, shift: number): number {
  const value = ((color >> shift) & 0xff) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a 0xRRGGBB color, 0 (black) to 1 (white). */
export function relativeLuminance(color: number): number {
  return 0.2126 * linear(color, 16) + 0.7152 * linear(color, 8) + 0.0722 * linear(color, 0);
}

/** `color` drawn at `alpha` over `background`, blended on the sRGB values as WebGL does. */
export function over(color: number, background: number, alpha: number): number {
  const channel = (shift: number): number => {
    const base = (background >> shift) & 0xff;
    return Math.round(base + (((color >> shift) & 0xff) - base) * alpha) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

/** How much `color` at `alpha` over `background` changes its luminance (either way). */
export function luminanceDelta(color: number, background: number, alpha: number): number {
  return Math.abs(
    relativeLuminance(over(color, background, alpha)) - relativeLuminance(background),
  );
}

/** The highest alpha at which `color` over `background` changes its luminance by `delta` at most. */
export function alphaForDelta(color: number, background: number, delta: number): number {
  let low = 0;
  let high = 1;
  if (luminanceDelta(color, background, high) <= delta) return high;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (luminanceDelta(color, background, mid) <= delta) low = mid;
    else high = mid;
  }
  return low;
}

/**
 * R / (R + G + B) on the linearized channels: from SATURATED_RED on, a color is the saturated
 * red whose flashes count whatever their luminance (WCAG 2.3.1).
 */
export function redRatio(color: number): number {
  const red = linear(color, 16);
  const sum = red + linear(color, 8) + linear(color, 0);
  return sum === 0 ? 0 : red / sum;
}
export const SATURATED_RED = 0.8;
