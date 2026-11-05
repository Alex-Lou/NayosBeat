/**
 * Koda's colors: transformed from the LPC reference (issue #174: spiky green hair, blue-gray frock
 * coat open over a bare chest, silver plate pauldrons and bracers, black formal trousers, bare
 * martial feet) into NayosBeat's 5-tone volume shading, street back-light and baked effect
 * lighting. Every material takes the same seven palette slots in both colorways, so the strips are
 * drawn once and saved twice.
 */

import { definePalette, type DetailColor, type MaterialTones } from '../palette.ts';
import type { Tint } from '../raster.ts';
import type { Tone } from '../skeleton.ts';
import { STREET_SIGN } from '../street-light.ts';
import type { EffectStyle } from '../vfx.ts';

export { farOf, matteOf, noGloss, type Colorway } from '../palette.ts';

const RIM = STREET_SIGN.color;
const RIM_ON_LIGHT = STREET_SIGN.onLight;

/** A ramp without its rim: outline, deep, shadow, base, light, gloss. */
type Ramp = readonly [string, string, string, string, string, string];

/** A material of the same colors in both colorways, its rim the sign's. */
function lit(ramp: Ramp, rim: string = RIM): MaterialTones {
  return { main: [...ramp, rim] };
}

/** Materials in slot order; each one owns 7 consecutive palette slots. */
const MATERIALS = {
  /** Cool pale ivory/alabaster anime complexion (contrasting with his dark storm-teal coat). */
  skin: lit(['#281620', '#643e4c', '#a26e7a', '#d8a8a8', '#f2ceca', '#fff0ee'], '#e8b4c4'),
  /** Spiky emerald-green hair (120 spiked__green_.png); platinum-silver on the second colorway. */
  hair: {
    main: ['#04140a', '#0a2e16', '#125428', '#1c863c', '#30c058', '#7ef098', RIM],
    alt: ['#181424', '#38304c', '#645880', '#9a8eb6', '#d4cae8', '#fff6ee', RIM_ON_LIGHT],
  },
  /** Open frock coat (055 frock_coat__bluegray_.png): storm-teal blue-gray; deep plum on alt. */
  jacket: {
    main: ['#081014', '#102428', '#1c3c40', '#2e5858', '#48787c', '#7ca8ac', RIM],
    alt: ['#140812', '#2a1226', '#461e3e', '#682e58', '#8e4478', '#c078a8', RIM],
  },
  /** Coat lining and inner waist wrap: dark slate-teal. */
  shirt: {
    main: ['#080c10', '#121a20', '#1c2830', '#263640', '#344854', '#344854', '#344854'],
    alt: ['#0c0810', '#181020', '#241830', '#322240', '#422e52', '#422e52', '#422e52'],
  },
  /** Belt and martial wrist/ankle wraps: dark leather. */
  leather: lit(['#0c0910', '#19121f', '#261b2d', '#34253b', '#4c3648', '#a07c6c']),
  /** Formal trousers (020 formal_pants__black_.png): dark forest-black; midnight-indigo on alt. */
  pants: {
    main: ['#070c08', '#101c12', '#192c1c', '#243e28', '#34563a', '#34563a', RIM],
    alt: ['#0a0a14', '#161628', '#22223c', '#303052', '#42426c', '#42426c', RIM],
  },
  /** Coat lapel facing and trouser crease seams, a step darker. */
  pocket: {
    main: ['#070c08', '#0d160e', '#142216', '#1c301f', '#28422c', '#28422c', '#28422c'],
    alt: ['#0a0a14', '#121222', '#1b1b32', '#262644', '#343458', '#343458', '#343458'],
  },
  /** Martial ankle/instep bands above bare toes and heels. */
  boot: {
    main: ['#081014', '#122228', '#1e363e', '#2c4c56', '#3e6672', '#709aa6', RIM],
    alt: ['#140812', '#281224', '#401e3a', '#5a2c52', '#783c6e', '#a8689c', RIM],
  },
  /** Thin dark sole wrap under the foot. */
  sole: {
    main: ['#08080c', '#101018', '#181822', '#222230', '#2e2e3e', '#2e2e3e', '#2e2e3e'],
  },
  /** Silver plate pauldrons, forearm bracers and coat buttons (060 armour__silver_.png). */
  metal: {
    main: ['#181822', '#323640', '#545c68', '#849098', '#c8d6d8', '#ffffff', RIM_ON_LIGHT],
    alt: ['#1c1822', '#3a3244', '#625670', '#9688a6', '#d8cce2', '#fff8ff', RIM_ON_LIGHT],
  },
  /** Dark steel inner rim of the pauldrons and resonator housing. */
  plastic: lit(['#0a0c12', '#141822', '#202634', '#2e3648', '#445066', '#8090a8']),
} as const satisfies Record<string, MaterialTones>;

export type MaterialName = keyof typeof MATERIALS;

/** Single slots: face details, resonator accents and effects, swapped with the colorway. */
const DETAILS = {
  ink: { main: '#0a0608' },
  eyeWhite: { main: '#f2f7f8' },
  iris: { main: '#b87408', alt: '#c83878' },
  irisLight: { main: '#ffe048', alt: '#ff90c8' },
  lip: { main: '#a8502e' },
  lipLight: { main: '#d88058' },
  teeth: { main: '#e8dcd0' },
  mouth: { main: '#3a0c08' },
  /** Resonator slits on the silver pauldrons and bracers, deep to core. */
  neonDeep: { main: '#086048', alt: '#621478' },
  neon: { main: '#10b080', alt: '#b032d8' },
  neonLight: { main: '#28f0b4', alt: '#e670ff' },
  /** The lit resonator core (Lighting.glow). */
  neonCore: { main: '#5cd8b4', alt: '#dc88f8' },
  /** Acoustic energy (the Diapason wave, trails, rings): jade-turquoise; amethyst on alt. */
  soundDeep: { main: '#08684e', alt: '#681682' },
  sound: { main: '#18d8a0', alt: '#d858ff' },
  soundLight: { main: '#64f8c8', alt: '#ec9eff' },
  soundCore: { main: '#e4fff6', alt: '#fcf0ff' },
  soundGlow: { main: '#18d8a058', alt: '#d858ff58' },
  /** Strikes (impacts, flashes): warm amber-gold sparks on both colorways. */
  strikeDeep: { main: '#8a2a06' },
  strike: { main: '#f07818' },
  strikeLight: { main: '#ffc040' },
  strikeCore: { main: '#fff6d0' },
  strikeGlow: { main: '#ffb03058' },
  /** Motion trails of the limbs, in the acoustic energy color, translucent. */
  trail: { main: '#18d8a0b4', alt: '#d858ffb4' },
  trailFaint: { main: '#18d8a05c', alt: '#d858ff5c' },
  /** Dust kicked up from the floor. */
  dustDeep: { main: '#2c2840' },
  dust: { main: '#4a4566' },
  dustLight: { main: '#77719a' },
  sandDeep: { main: '#8c7860' },
  sand: { main: '#bfab8e' },
  sandLight: { main: '#e6d8c2' },
  strikeSmoke: { main: '#3a3246' },
  /** Faint glow of the resonator slits on the metal and cloth around them (Lighting.glow). */
  neonHalo: { main: '#1c463c', alt: '#4a2858' },
} as const satisfies Record<string, DetailColor>;

export type DetailName = keyof typeof DETAILS;

const EFFECT_LIGHTS = {
  sound: { kiss: { main: '#10b080', alt: '#b032d8' }, lit: { main: '#64f8c8', alt: '#ec9eff' } },
  strike: { kiss: { main: '#f07818' }, lit: { main: '#ffc040' } },
  platine: { kiss: { main: '#ffb21e' }, lit: { main: '#f2f6ff' } },
} as const satisfies Record<Tone, Record<TintLevel, DetailColor>>;

type TintLevel = 'kiss' | 'lit';
type TintName = `${MaterialName}_${Tone}_${TintLevel}`;

const TINT = {
  kiss: { tone: 3, gain: 1.5, amount: 0.7 },
  lit: { tone: 4, gain: 1.8, amount: 0.9 },
} as const satisfies Record<TintLevel, { tone: number; gain: number; amount: number }>;

const LIFT = {
  sound: { kiss: 0.1, lit: 0.32 },
  strike: { kiss: 0.3, lit: 0.45 },
  platine: { kiss: 0.34, lit: 0.5 },
} as const satisfies Record<Tone, Record<TintLevel, number>>;

function tinted(surface: string, light: string, level: TintLevel, lift: number): string {
  const { gain, amount } = TINT[level];
  const s = rgbOf(surface);
  const l = rgbOf(light);
  const target = Math.min(1, luminance(s) * gain + lift);
  const own = Math.max(luminance(l), 1e-3);
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

export const MATERIAL = PALETTE.material;
export const DETAIL = PALETTE.detail;
export const paletteOf = PALETTE.paletteOf;

/** Koda's effects: jade-turquoise acoustic waves (amethyst on alt), gold strikes, diamond sparks. */
export const EFFECTS: EffectStyle = { slots: DETAIL, sparkle: 'diamond' };
