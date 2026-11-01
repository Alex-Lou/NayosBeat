import { over } from './luminance';

/**
 * How the fighters' near-black outfits stand out from the night sky (docs/polish/AUDIT-ET-PLAN.md
 * P8, §6 Q1): `outline`, a 1 px light contour around each body (sprite-fighter-view.ts, option
 * A); `backlight`, light bands behind them on the grey box (greybox-stage.ts, option B); `none`,
 * as before. An art direction choice not yet made: both are kept, to be compared in play.
 */
export type SilhouetteLook = 'outline' | 'backlight' | 'none';

/** What the address names each look (`?silhouette=a|b|aucune`). */
const URL_NAMES: ReadonlyMap<string, SilhouetteLook> = new Map([
  ['a', 'outline'],
  ['b', 'backlight'],
  ['aucune', 'none'],
]);

/** The look shown when the address asks for none: the plan's recommendation, option A. */
export const DEFAULT_SILHOUETTE: SilhouetteLook = 'outline';

/**
 * The look the address asks for (`search`, as `location.search`): `?silhouette=a`, the contour;
 * `b`, the backlight; `aucune`, neither. Read once, when the game starts (main.ts). What it does
 * not ask, or asks wrong, stays the default.
 */
export function silhouetteFromUrl(search: string): SilhouetteLook {
  return URL_NAMES.get(new URLSearchParams(search).get('silhouette') ?? '') ?? DEFAULT_SILHOUETTE;
}

/**
 * The contour's base: 2.61:1 on the sky (#1b1b2f), 2.71:1 on the outfits' dark tone (#19191e),
 * 1.85:1 on their light one (#36363f), WCAG contrast.
 */
export const CONTOUR_BASE = 0x5a5a88;
/** How much of the fighter's energy the contour takes: who is who, at a glance. */
export const CONTOUR_TINT = 0.3;

/**
 * A fighter's contour color: the base tinted 30 % toward its energy. Lighter than the base for
 * every colorway, it only raises the contrasts (Riff's, the least: 2.96:1 on the sky, 2.10:1 on
 * the light tone; Nayo's, the most: 4.23:1 and 3.00:1).
 */
export function contourOf(energy: number): number {
  return over(energy, CONTOUR_BASE, CONTOUR_TINT);
}
