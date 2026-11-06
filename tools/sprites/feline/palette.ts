/**
 * Feline's colors (issue #155 comment 6660565057: Pack_01..Pack_05):
 * - Voluminous silver-white feline mane, cat ears and S-curved tail (`hair`), with coral-pink inner
 *   ears (`shirt`); shadow-panther violet-black on the second colorway;
 * - Black techwear crop-top (`jacket`) over a bare midriff (`skin`), baggy black cargo trousers
 *   (`pants`) with a silver hip chain (`metal`), fingerless gauntlets (`leather`) and combat boots
 *   (`boot`);
 * - Glowing cyan triangle emblem (`▼`) on the shoulder pad and cyan strap/boot LEDs (`neon*`);
 * - Silver-white astral portal and blade effects (`sound*` & `strike*`, Pack_05_VFX_Blanc_Argente).
 */

import { definePalette, type DetailColor, type MaterialTones } from '../palette.ts';
import type { Tint } from '../raster.ts';
import type { Tone } from '../skeleton.ts';
import { STREET_SIGN } from '../street-light.ts';
import type { EffectStyle } from '../vfx.ts';

export { farOf, matteOf, noGloss, type Colorway } from '../palette.ts';

const RIM = STREET_SIGN.color;
const RIM_ON_LIGHT = STREET_SIGN.onLight;

type Ramp = readonly [string, string, string, string, string, string];

function lit(ramp: Ramp, rim: string = RIM): MaterialTones {
  return { main: [...ramp, rim] };
}

const MATERIALS = {
  /** Pale, luminous porcelain skin with soft peach-rose shading (face, bare midriff, shoulders, forearms). */
  skin: lit(['#221824', '#564454', '#9c8696', '#e6d6de', '#f6ecf0', '#fffafb'], '#f0dce6'),
  /** Pure snow-white feline mane, ears & tail with soft cool-silver shading; shadow-panther on alt. */
  hair: {
    main: ['#16141f', '#3a3650', '#6e6a8e', '#b2aecc', '#e6e4f4', '#ffffff', RIM_ON_LIGHT],
    alt: ['#080610', '#1c1430', '#382a58', '#644e94', '#9880cc', '#d4c4f8', RIM],
  },
  /** Techwear crop-top and shoulder pad: matte carbon-black; pearl-ivory on alt. */
  jacket: {
    main: ['#06080e', '#101420', '#1c2232', '#2a3246', '#3e4860', '#647290', RIM],
    alt: ['#201a28', '#443852', '#78688a', '#b4a4c6', '#dcd0ea', '#faf4ff', RIM_ON_LIGHT],
  },
  /** Coral-pink inner cat ears and collar lining. */
  shirt: {
    main: ['#381420', '#6e283c', '#a84860', '#dc728a', '#f4a2b6', '#ffd4e0', RIM_ON_LIGHT],
    alt: ['#2c1028', '#582050', '#8c3880', '#c05cb0', '#e68cd8', '#ffc4f4', RIM_ON_LIGHT],
  },
  /** Fingerless combat gauntlets, thigh straps and ear-base ribbon: dark tactical leather. */
  leather: lit(['#080810', '#141422', '#222236', '#32324c', '#484868', '#787898']),
  /** Baggy techwear cargo trousers: dark slate-black; deep plum-charcoal on alt. */
  pants: {
    main: ['#06080e', '#0e121c', '#181e2c', '#242c3e', '#343e54', '#4c5874', RIM],
    alt: ['#14101c', '#261e34', '#3a2e4e', '#52426c', '#6c588c', '#8e78b0', RIM],
  },
  /** Cargo pocket flaps and strap seams. */
  pocket: {
    main: ['#05060a', '#0b0e16', '#131824', '#1c2232', '#283044', '#283044', '#283044'],
    alt: ['#100c16', '#1e182a', '#2e2440', '#403258', '#544272', '#544272', '#544272'],
  },
  /** High-laced tactical boots with cyan LED trim. */
  boot: {
    main: ['#06080e', '#101420', '#1a2030', '#262e42', '#38425a', '#687694', RIM],
    alt: ['#140e1c', '#281c36', '#3e2c52', '#584072', '#745694', '#a484c4', RIM],
  },
  /** Thick lugged boot soles. */
  sole: {
    main: ['#050508', '#0c0c12', '#14141e', '#1e1e2c', '#2a2a3c', '#2a2a3c', '#2a2a3c'],
  },
  /** Silver hip chain, buckles and dimensional rings. */
  metal: {
    main: ['#161824', '#303648', '#545e74', '#8894ac', '#ccd6e8', '#ffffff', RIM_ON_LIGHT],
    alt: ['#1c1624', '#3a3048', '#645478', '#9886ae', '#dcd0ec', '#ffffff', RIM_ON_LIGHT],
  },
  /** Dark housing of the cyan shoulder triangle emblem. */
  plastic: lit(['#080c14', '#121a28', '#1e2a3e', '#2c3c56', '#405474', '#748cae']),
} as const satisfies Record<string, MaterialTones>;

export type MaterialName = keyof typeof MATERIALS;

const DETAILS = {
  ink: { main: '#08060c' },
  eyeWhite: { main: '#f4f8fc' },
  iris: { main: '#c87810', alt: '#d02878' },
  irisLight: { main: '#ffe048', alt: '#ff88c8' },
  lip: { main: '#b85868' },
  lipLight: { main: '#e88898' },
  teeth: { main: '#f4f0f6' },
  mouth: { main: '#38101c' },
  /** Cyan neon triangle on her shoulder pad & boot/cargo LEDs; rose-magenta on alt. */
  neonDeep: { main: '#085868', alt: '#681448' },
  neon: { main: '#14b8d0', alt: '#cc2888' },
  neonLight: { main: '#28f0e8', alt: '#ff68c4' },
  neonCore: { main: '#88fff8', alt: '#ffb8e6' },
  /** Silver-white astral portal & dimensional blade energy (Pack_05_VFX_Blanc_Argente_Fidele). */
  soundDeep: { main: '#384870', alt: '#582878' },
  sound: { main: '#98b4e8', alt: '#c878ff' },
  soundLight: { main: '#dce8ff', alt: '#f0ccff' },
  soundCore: { main: '#ffffff', alt: '#ffffff' },
  soundGlow: { main: '#98b4e858', alt: '#c878ff58' },
  /** Strikes (star flashes, dimensional slashes): incandescent silver-cyan; rose-silver on alt. */
  strikeDeep: { main: '#285078', alt: '#682058' },
  strike: { main: '#78d0ff', alt: '#ff78d0' },
  strikeLight: { main: '#d8f4ff', alt: '#ffd4f2' },
  strikeCore: { main: '#ffffff', alt: '#ffffff' },
  strikeGlow: { main: '#78d0ff58', alt: '#ff78d058' },
  /** Motion trails of the limbs, in silver-astral light, translucent. */
  trail: { main: '#b8d4ffb4', alt: '#d888ffb4' },
  trailFaint: { main: '#b8d4ff5c', alt: '#d888ff5c' },
  dustDeep: { main: '#2c2840' },
  dust: { main: '#4a4566' },
  dustLight: { main: '#77719a' },
  sandDeep: { main: '#8c7860' },
  sand: { main: '#bfab8e' },
  sandLight: { main: '#e6d8c2' },
  strikeSmoke: { main: '#302c42' },
  neonHalo: { main: '#183c48', alt: '#48203c' },
} as const satisfies Record<string, DetailColor>;

export type DetailName = keyof typeof DETAILS;

const EFFECT_LIGHTS = {
  sound: { kiss: { main: '#6888c8', alt: '#a858e0' }, lit: { main: '#dce8ff', alt: '#f0ccff' } },
  strike: { kiss: { main: '#48a8e0', alt: '#e058b0' }, lit: { main: '#d8f4ff', alt: '#ffd4f2' } },
  platine: { kiss: { main: '#ffb21e' }, lit: { main: '#f2f6ff' } },
} as const satisfies Record<Tone, Record<TintLevel, DetailColor>>;

type TintLevel = 'kiss' | 'lit';
type TintName = `${MaterialName}_${Tone}_${TintLevel}`;

const TINT = {
  kiss: { tone: 3, gain: 1.5, amount: 0.7 },
  lit: { tone: 4, gain: 1.8, amount: 0.9 },
} as const satisfies Record<TintLevel, { tone: number; gain: number; amount: number }>;

const LIFT = {
  sound: { kiss: 0.14, lit: 0.36 },
  strike: { kiss: 0.28, lit: 0.44 },
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

/** Feline's effects: silver-white dimensional portals, cyan-white slashes, 4-point star sparkles. */
export const EFFECTS: EffectStyle = { slots: DETAIL, sparkle: 'diamond' };
