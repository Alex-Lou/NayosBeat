import { addAlphaFor, added, brightestBackdrop, relativeLuminance } from './luminance';

/**
 * The moves' live lights (docs/art/nayo-vivante.md §2), pure: the numbers light-show.ts draws
 * with. Each source of light (a hand, a disc in flight, a fist on the floor, a heavy blow's flare)
 * lights twice:
 * - the street, by an added glow (Phaser's PointLight: color × intensity × smoothstep(1 − d / r),
 *   added): it raises a dark wall almost as much as a lighter one, and is bounded on the stage's
 *   large colors (`glowAlpha`); the stage's pixels that would rise by 0.1 under it anyway (a lit
 *   window, a lamp: `emits`) are drawn again over it, as they are;
 * - the fighters, by Phaser's per-pixel lights (`setLighting`), which multiply what they draw by
 *   1 + color × intensity × attenuation × diffuse (DefineLights.glsl): a body turns to the light's
 *   color. Its bright pixels rise by 0.1 and more: the light asks the flash budget for them as it
 *   comes on (FIGHTER_LIGHT_AREAS), and lights the street alone if refused, or calm.
 *
 * Never a flash on the street (docs/flashs.md §5): whatever its speed or its size, a glow changes
 * none of the stage's large colors by LIVE_DELTA (CALM_LIVE_DELTA calm), the glows that overlap
 * shared out (`glowScale`), under a super's dim counted from the dimmed stage.
 */

/** How strong the effects of the lights and filters are: the adaptive quality's lever. */
export type LightTier = 'full' | 'lean' | 'off';

/** The street changes by this much at most under the glows (calm: CALM_LIVE_DELTA). */
export const LIVE_DELTA = 0.09;
export const CALM_LIVE_DELTA = 0.05;

/**
 * Under a super's freeze, the stage is multiplied by this (a tint), the fighters left as they are:
 * the super's glow then relights the street around its fist. The dim alone changes the stage's
 * large colors by less than VEIL_DELTA (measured by the test), as the dark veil it replaces.
 */
export const SUPER_DIM = 0.4;
/** The dim's display frames: down, held, back (as the super's dark veil, veils.ts). */
export const DIM_TIMING = { attack: 4, hold: 18, release: 14 } as const;

/** Where a live light comes from: a move held, a disc in flight, a heavy blow's flare. */
export type LightSource = 'move' | 'disc' | 'flare';

/** How far a source's light reaches, world px (a move's own may be wider: MoveLight.radius). */
export const LIGHT_SHAPE: Readonly<Record<LightSource, { readonly radius: number }>> = {
  move: { radius: 120 },
  disc: { radius: 110 },
  flare: { radius: 90 },
};

/** A light on the fighters stands this high over the picture, for its radius: a broad wash. */
export const Z_RATIO = 0.28;

/**
 * The most a light lifts a fighter's channel at its heart (×1.9 at full color), the lights that
 * overlap shared out: what FIGHTER_LIGHT_AREAS is measured under.
 */
export const FIGHTER_LIFT = 0.9;

/** A color's channels, 0 to 1. */
export function channels(color: number): readonly [number, number, number] {
  return [((color >> 16) & 0xff) / 255, ((color >> 8) & 0xff) / 255, (color & 0xff) / 255];
}

/** A 0 to 1 channel back to 0 to 255, clamped. */
function byte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value * 255)));
}

/**
 * `color` as a lit object draws it under lights of `lift` per channel (each light's color ×
 * intensity × falloff, added up), as Phaser's shader does with an ambient of white: each sRGB
 * channel multiplied, clipped at white.
 */
export function litColor(color: number, lift: readonly [number, number, number]): number {
  const [red, green, blue] = channels(color);
  return (
    (byte(red * (1 + lift[0])) << 16) |
    (byte(green * (1 + lift[1])) << 8) |
    byte(blue * (1 + lift[2]))
  );
}

/** `color` multiplied by `level` (a dim's tint), as WebGL draws it. */
export function dimmed(color: number, level: number): number {
  const [red, green, blue] = channels(color);
  return (byte(red * level) << 16) | (byte(green * level) << 8) | byte(blue * level);
}

/**
 * How much of a light on the fighters reaches a point `dx`, `dy` world px from it (0 to 1), on a
 * flat normal: Phaser's attenuation (1 − distance² / radius², its height `z` counted in the
 * distance) times the diffuse factor (the cosine to the normal, toward the camera).
 */
export function falloff(dx: number, dy: number, radius: number, z: number): number {
  const flat = dx * dx + dy * dy;
  const attenuation = Math.min(1, Math.max(0, 1 - (flat + z * z) / (radius * radius)));
  return attenuation * (z / Math.sqrt(flat + z * z));
}

/** The most of a light on the fighters any point gets: right under it. */
export function peakFalloff(radius: number, z: number): number {
  return falloff(0, 0, radius, z);
}

/** A glow's share at `distance` world px from its heart, out of `radius`: PointLight.frag's. */
export function glowAt(distance: number, radius: number): number {
  const t = Math.min(1, Math.max(0, 1 - distance / radius));
  return t * t * (3 - 2 * t);
}

/**
 * The opacity at its heart of a glow of `color` added over the stage under `level` (its dim; 1,
 * none) that raises none of its large colors by `delta` or more (the brightest backdrop, each
 * channel at its highest, is what an added light raises the most: luminance.ts).
 */
export function glowAlpha(
  color: number,
  stage: readonly number[],
  delta: number,
  level = 1,
): number {
  return addAlphaFor(
    color,
    stage.map((backdrop) => dimmed(backdrop, level)),
    delta,
  );
}

/**
 * The stage's level `age` display frames into a super's dim (Infinity: none): down to SUPER_DIM
 * over its attack, held, back over its release, smoothly. Calm, the same: a dim is no flash. The
 * show holds `age` at the hold's start while the super's own light shines (light-show.ts).
 */
export function dimLevel(age: number): number {
  const { attack, hold, release } = DIM_TIMING;
  if (age < 0 || age >= attack + hold + release) return 1;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  let depth = 1;
  if (age < attack) depth = smooth((age + 1) / attack);
  else if (age >= attack + hold) depth = 1 - smooth((age - attack - hold + 1) / release);
  return 1 - (1 - SUPER_DIM) * depth;
}

/** A glow drawn on the street: world px, its color, its opacity at its heart. */
export interface Glow {
  x: number;
  y: number;
  radius: number;
  color: number;
  alpha: number;
}

/**
 * The share (0 to 1) every one of `count` glows is drawn at, so that where they overlap, their
 * hearts added up still raise no large color of the stage (under `level`) by `delta`. Bound: any
 * point lies in glows that all overlap one of them, i; their hearts added up are no more than what
 * overlaps i (light-rig.ts bounds its pools so).
 */
export function glowScale(
  glows: readonly Glow[],
  count: number,
  stage: readonly number[],
  delta: number,
  level = 1,
): number {
  const backdrop = brightestBackdrop(stage.map((color) => dimmed(color, level)));
  const fits = (scale: number): boolean => {
    for (let i = 0; i < count; i++) {
      const glow = glows[i];
      if (!glow) continue;
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let j = 0; j < count; j++) {
        const other = glows[j];
        if (!other) continue;
        if (Math.hypot(other.x - glow.x, other.y - glow.y) >= other.radius + glow.radius) continue;
        const [r, g, b] = channels(other.color);
        red += r * other.alpha * scale;
        green += g * other.alpha * scale;
        blue += b * other.alpha * scale;
      }
      const sum = (byte(red) << 16) | (byte(green) << 8) | byte(blue);
      if (relativeLuminance(added(sum, backdrop, 1)) - relativeLuminance(backdrop) >= delta) {
        return false;
      }
    }
    return true;
  };
  if (fits(1)) return 1;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return low;
}

/** The levels a dim goes through, judged one by one (every level between, by the test). */
const DIM_STEPS = Array.from({ length: 13 }, (_, i) => 1 - ((1 - SUPER_DIM) * i) / 12);

/**
 * The strongest glows a fight may show, each color at its heart's opacity at each level of a dim
 * (normal: calm is fainter): what `emits` judges a pixel of the stage against.
 */
export function strongestGlows(
  colors: readonly number[],
  stage: readonly number[],
): readonly { readonly color: number; readonly alpha: number; readonly level: number }[] {
  return colors.flatMap((color) =>
    DIM_STEPS.map((level) => ({
      color,
      alpha: glowAlpha(color, stage, LIVE_DELTA, level),
      level,
    })),
  );
}

/** A hair under 0.1: what rounding to the byte may add stays under it. */
const EMITS_DELTA = 0.095;

/**
 * Whether a pixel of the stage of `color` lights itself (a window, a lamp, a sign): one of the
 * `strongest` glows would raise it by 0.1 or more. Such pixels are drawn again over the glows, as
 * they are: no glow ever lights a stretch of the stage at ΔL ≥ 0.1, small or large.
 */
export function emits(color: number, strongest: ReturnType<typeof strongestGlows>): boolean {
  return strongest.some(({ color: light, alpha, level }) => {
    const base = dimmed(color, level);
    return relativeLuminance(added(light, base, alpha)) - relativeLuminance(base) >= EMITS_DELTA;
  });
}

/**
 * What a live light lights at ΔL ≥ 0.1 on a fighter as it comes on, world px² (docs/flashs.md
 * §5): the brightest frame of each colorway under FIGHTER_LIFT on every channel, as if the whole
 * body stood at its heart. Measured on the real strips by tests/render/live-lights.test.ts, kept
 * above every measure. A light asks the flash budget for the fighters it would light as it comes
 * on; refused, or the flashes calm, it lights the street alone.
 */
export const FIGHTER_LIGHT_AREAS: Readonly<Record<string, number>> = {
  'nayo/main': 400,
  'nayo/alt': 1130,
  'riff/main': 525,
  'riff/alt': 715,
  'saphir/main': 480,
  'saphir/alt': 850,
  'watt/main': 230,
  'watt/alt': 820,
};

/** What a fighter of `name` in `colorway` lights at ΔL ≥ 0.1 under a live light, world px². */
export function fighterLightArea(name: string, colorway: string): number {
  const area = FIGHTER_LIGHT_AREAS[`${name}/${colorway}`];
  if (area === undefined) {
    throw new Error(
      `No live light area for ${name}/${colorway}: measure it (tests/render/live-lights.test.ts)`,
    );
  }
  return area;
}
