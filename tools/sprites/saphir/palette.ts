/**
 * Saphir's colors (docs/saphir.md §8), in three: sapphire, ivory, black. A full-head Janus mask
 * in sapphire lacquer, a black ponytail out of its crown; a short ivory jacket with a high
 * collar edged in sapphire, a sapphire sash, wide black dance trousers with a sapphire piping
 * down the seam, black gloves, two-tone savate shoes. Her energy is sapphire too (#3a6cf0),
 * brighter than the mask, measured against the cast's hues and in simulated colorblindness.
 *
 * Second colorway (mirror match): the outfit inverted, a black jacket over ivory trousers, her
 * energy lilac (#c0a0ff). The mask, the hair and the shoes stay. Same layout as Nayo's and
 * Riff's palettes: drawn once, saved twice.
 */

import { definePalette, type DetailColor, type MaterialTones } from '../palette.ts';
import type { Tint } from '../raster.ts';
import type { Tone } from '../skeleton.ts';
import { STREET_SIGN } from '../street-light.ts';
import type { EffectStyle } from '../vfx.ts';

export { farOf, matteOf, noGloss, type Colorway } from '../palette.ts';

/** The back light's tones (as Riff's): the club's violet sign, paler on a light material. */
const RIM = STREET_SIGN.color;
const RIM_ON_LIGHT = STREET_SIGN.onLight;

/**
 * Materials in slot order; each one owns 7 consecutive palette slots, the last its rim: the tone
 * an edge takes facing the sign behind her (index.ts, SAPHIR_LIGHTING).
 */
const MATERIALS = {
  /** Warm brown skin: only at the neck, between the collar and the mask. */
  skin: {
    main: ['#2e1610', '#5a2e1e', '#7a4228', '#9a5a38', '#b8744a', '#c98a5c', '#c890a8'],
  },
  /** The black ponytail, a cool blue light. */
  hair: {
    main: ['#040406', '#0c0c12', '#16161f', '#22222e', '#30303f', '#464660', RIM],
  },
  /** The mask: sapphire, lacquered. The same on both colorways: it is her name. */
  mask: {
    main: ['#060c2a', '#0e1a52', '#1a3088', '#2a4cb8', '#4a74e0', '#9ab8ff', '#a08cf8'],
  },
  /**
   * The jacket's cloth, ivory; black on the second colorway. The two colorways part by its
   * value first.
   */
  cloth: {
    main: ['#2e2a26', '#5e5850', '#a49c90', '#d8d2c6', '#ece8de', '#faf8f2', RIM_ON_LIGHT],
    alt: ['#030305', '#09090c', '#121216', '#1c1c22', '#2a2a32', '#3c3c48', RIM],
  },
  /**
   * The trousers and the jacket's lines (closure, cuffs), black; ivory on the second colorway,
   * the outfit inverted.
   */
  band: {
    main: ['#030305', '#09090c', '#121216', '#1c1c22', '#2a2a32', '#3c3c48', RIM],
    alt: ['#2e2a26', '#5e5850', '#a49c90', '#d8d2c6', '#ece8de', '#faf8f2', RIM_ON_LIGHT],
  },
  /** Black leather: the gloves, and the shoes' toe cap and heel. */
  shoe: {
    main: ['#030304', '#0a0a0d', '#141418', '#202026', '#30303a', '#7a7a8a', RIM],
  },
  /** The two-tone shoes' white leather, between the cap and the heel. */
  spat: {
    main: ['#4a4640', '#8a847a', '#b8b2a6', '#dcd6ca', '#eeeae0', '#ffffff', RIM_ON_LIGHT],
  },
  /** Thin leather soles. */
  sole: {
    main: ['#020203', '#08080a', '#0f0f12', '#18181c', '#24242a', '#24242a', '#24242a'],
  },
} as const satisfies Record<string, MaterialTones>;

export type MaterialName = keyof typeof MATERIALS;

/**
 * Single slots: the mask's paint, then the effects. The effect names are the shared ones (`sound`
 * is the energy color, `strike` the impact color, see ../vfx.ts); their colors are her hit style
 * (src/render/hit-styles.ts, at the PR that lights her up).
 */
const DETAILS = {
  /** The eye slit's dark, and the paint's lines. */
  ink: { main: '#05060e' },
  /** The paint on the mask: the back face's eye and smile, the tears. */
  eyeWhite: { main: '#eef0f6' },
  /** The painted eye's pupil. */
  irisDeep: { main: '#05060e' },
  /**
   * The glint deep in both eye slits at rest, her presence (src/render/presence.ts): a color of
   * its own, which the game picks out and lets shine; lilac on the second colorway.
   */
  maskGlow: { main: '#5c8cff', alt: '#cbb2ff' },
  /** Energy (steps, trails, specials): sapphire, brighter than the mask; lilac on the second. */
  soundDeep: { main: '#142a6e', alt: '#4a3080' },
  sound: { main: '#3a6cf0', alt: '#c0a0ff' },
  soundLight: { main: '#9cb8ff', alt: '#e0d0ff' },
  soundCore: { main: '#eef3ff', alt: '#f6f0ff' },
  soundGlow: { main: '#3a6cf058', alt: '#c0a0ff58' },
  /** Strikes (impacts, cross sparks): cream, her ivory struck; the same on both colorways. */
  strikeDeep: { main: '#6a5e44' },
  strike: { main: '#f0e2bc' },
  strikeLight: { main: '#faf2dc' },
  strikeCore: { main: '#ffffff' },
  strikeGlow: { main: '#f0e2bc58' },
  /** The dark smoky heart of a heavy hit spark. */
  strikeSmoke: { main: '#302a24' },
  /** Motion trails of the limbs, in the energy color, translucent (alpha last). */
  trail: { main: '#3a6cf0b4', alt: '#c0a0ffb4' },
  trailFaint: { main: '#3a6cf05c', alt: '#c0a0ff5c' },
  /** Dust kicked up from the floor. */
  dustLight: { main: '#584a54' },
  sandDeep: { main: '#7a6440' },
  sand: { main: '#b89a64' },
  sandLight: { main: '#e8d6a8' },
} as const satisfies Record<string, DetailColor>;

export type DetailName = keyof typeof DETAILS;

/**
 * The colors of the light her own effects shed on her (as Nayo's, nayo/palette.ts): her energy's
 * (sapphire, lilac on the second colorway), her strikes' (cream), the Boost's (gold where it
 * grazes, incandescent white where it hits square). Grazed, then squarely lit.
 */
const EFFECT_LIGHTS = {
  sound: { kiss: { main: '#2a5ad8', alt: '#a080e8' }, lit: { main: '#7ca4ff', alt: '#dccaff' } },
  strike: { kiss: { main: '#d8c89c' }, lit: { main: '#faf2dc' } },
  platine: { kiss: { main: '#ffb21e' }, lit: { main: '#f2f6ff' } },
} as const satisfies Record<Tone, Record<TintLevel, DetailColor>>;

type TintLevel = 'kiss' | 'lit';
type TintName = `${MaterialName}_${Tone}_${TintLevel}`;

/** How a material takes a light: its hue at about the surface's value, brighter where square. */
const TINT = {
  kiss: { tone: 3, gain: 1.5, amount: 0.7 },
  lit: { tone: 4, gain: 1.8, amount: 0.9 },
} as const satisfies Record<TintLevel, { tone: number; gain: number; amount: number }>;

/** How much brighter than the surface each light makes it; a warm light needs more. */
const LIFT = {
  sound: { kiss: 0.1, lit: 0.32 },
  strike: { kiss: 0.26, lit: 0.4 },
  platine: { kiss: 0.34, lit: 0.5 },
} as const satisfies Record<Tone, Record<TintLevel, number>>;

function tinted(surface: string, light: string, level: TintLevel, lift: number): string {
  const { gain, amount } = TINT[level];
  const s = rgbOf(surface);
  const l = rgbOf(light);
  const target = Math.min(1, luminance(s) * gain + lift);
  const own = Math.max(luminance(l), 1e-3);
  // The light's hue at the target value: darker, it is scaled down; brighter than the light
  // itself, it pales toward white.
  const hued =
    target <= own
      ? l.map((c) => c * (target / own))
      : l.map((c) => c + (1 - c) * ((target - own) / (1 - own || 1)));
  return hexOf(s.map((c, i) => c + ((hued[i] ?? 0) - c) * amount));
}

function rgbOf(hex: string): number[] {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => c / 255);
}

function luminance([r = 0, g = 0, b = 0]: readonly number[]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexOf(rgb: readonly number[]): string {
  return `#${rgb
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Every material's tones under every light, in both colorways (one slot each). */
const TINTS = Object.fromEntries(
  (Object.keys(MATERIALS) as MaterialName[]).flatMap((name) =>
    (Object.keys(EFFECT_LIGHTS) as Tone[]).flatMap((tone) =>
      (['kiss', 'lit'] as const).map((level) => {
        const material: MaterialTones = MATERIALS[name];
        const light: DetailColor = EFFECT_LIGHTS[tone][level];
        const of = (colorway: 'main' | 'alt'): string => {
          const ramp = colorway === 'alt' ? (material.alt ?? material.main) : material.main;
          const color = colorway === 'alt' ? (light.alt ?? light.main) : light.main;
          return tinted(ramp[TINT[level].tone], color, level, LIFT[tone][level]);
        };
        return [`${name}_${tone}_${level}`, { main: of('main'), alt: of('alt') }];
      }),
    ),
  ),
) as Record<TintName, DetailColor>;

const PALETTE = definePalette(MATERIALS, { ...DETAILS, ...TINTS });

/** The slots of each material's tones under each light, by its outline slot (raster.ts). */
export const EFFECT_TINTS: Readonly<Record<Tone, Readonly<Record<number, Tint>>>> =
  Object.fromEntries(
    (Object.keys(EFFECT_LIGHTS) as Tone[]).map((tone) => [
      tone,
      Object.fromEntries(
        (Object.keys(MATERIALS) as MaterialName[]).map((name) => [
          PALETTE.material[name].outline,
          {
            kiss: PALETTE.detail[`${name}_${tone}_kiss`],
            lit: PALETTE.detail[`${name}_${tone}_lit`],
          },
        ]),
      ),
    ]),
  ) as Record<Tone, Record<number, Tint>>;

/** Palette slots of every material (slot 0 is transparent). */
export const MATERIAL = PALETTE.material;
/** Palette slot of every detail color. */
export const DETAIL = PALETTE.detail;
export const paletteOf = PALETTE.paletteOf;

/** Saphir's effects: sapphire energy, cream strikes, cut-gem (diamond) sparkles, grey-gold dust. */
export const EFFECTS: EffectStyle = { slots: DETAIL, sparkle: 'diamond' };
