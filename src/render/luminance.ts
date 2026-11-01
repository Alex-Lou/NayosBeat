/**
 * The measures of a flash (docs/flashs.md §1): WCAG 2.x relative luminance, and how a color
 * drawn over another changes it.
 */

/** A change of luminance from which a large enough area flashes (WCAG 2.3.1). */
export const FLASH_DELTA = 0.1;

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
 * `color` brought toward `toward` (`toward` drawn over it, as little as needed) until, drawn over
 * any of `stage`, it changes its luminance by less than `delta`: a color that shows its hue and
 * lights nothing.
 */
export function toneUnder(
  color: number,
  toward: number,
  stage: readonly number[],
  delta: number,
): number {
  const lights = (tone: number) =>
    stage.some((background) => luminanceDelta(tone, background, 1) >= delta);
  if (!lights(color)) return color;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (lights(over(toward, color, mid))) low = mid;
    else high = mid;
  }
  return over(toward, color, high);
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

/**
 * How many of RGBA `pixels` (an ImageData's) change the luminance of one of the stage's large
 * colors by FLASH_DELTA or more, drawn over it: what a frame of front effects lights. Each color
 * and opacity is judged once.
 */
export function litPixels(pixels: Uint8ClampedArray, stage: readonly number[]): number {
  return freshPixels(undefined, pixels, stage);
}

/**
 * How many of RGBA `pixels` light over the stage (as `litPixels`) and change by FLASH_DELTA or
 * more what `before` (the frame shown before, the same size) drew at the same place: what a new
 * frame lights anew. Each pair of colors and opacities is judged once.
 */
export function freshPixels(
  before: Uint8ClampedArray | undefined,
  pixels: Uint8ClampedArray,
  stage: readonly number[],
): number {
  // What each pixel drawn over each one drawn before does, judged once.
  const known = new Map<number, Map<number, boolean>>();
  const previous = before?.length === pixels.length ? before : undefined;
  let lit = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const now = pixelAt(pixels, i);
    if (now === 0) continue;
    const then = previous ? pixelAt(previous, i) : 0;
    if (then === now) continue;
    let over = known.get(now);
    if (!over) known.set(now, (over = new Map<number, boolean>()));
    let flashes = over.get(then);
    if (flashes === undefined) {
      flashes = stage.some((backdrop) => {
        const shown = luminanceOver(now, backdrop);
        return (
          Math.abs(shown - relativeLuminance(backdrop)) >= FLASH_DELTA &&
          Math.abs(shown - luminanceOver(then, backdrop)) >= FLASH_DELTA
        );
      });
      over.set(then, flashes);
    }
    if (flashes) lit++;
  }
  return lit;
}

/** The pixel at `i` as 0xRRGGBBAA (0: transparent). */
function pixelAt(pixels: Uint8ClampedArray, i: number): number {
  const alpha = pixels[i + 3] ?? 0;
  if (alpha === 0) return 0;
  return (
    (((pixels[i] ?? 0) << 16) | ((pixels[i + 1] ?? 0) << 8) | (pixels[i + 2] ?? 0)) * 256 + alpha
  );
}

/** The luminance of a 0xRRGGBBAA pixel drawn over `backdrop` (0: none, the backdrop's own). */
function luminanceOver(pixel: number, backdrop: number): number {
  const alpha = pixel % 256;
  return relativeLuminance(over(Math.floor(pixel / 256), backdrop, alpha / 255));
}
