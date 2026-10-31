import type { KoFinish } from './fight-events';
import type { FlashMode } from './flash-budget';
import { alphaForDelta, FLASH_DELTA, luminanceDelta } from './luminance';

/**
 * The veils over the fight (docs/flashs.md §1.2, §2): the super's dark and its platine halo, the KO's
 * vignette and éclat. Each takes its alpha from its color and the stage's, never more than a
 * set change of luminance: a cyan veil and a magenta one strike alike.
 */

/** The super's dark: the HUD band's violet black. */
export const DIM_COLOR = 0x0c0614;
/** The super's halo: the Boost's platine, the same whoever lets it go. */
export const HALO_COLOR = 0xf2f6ff;
/** The dark never hides the stage more than this; an ink vignette or éclat, these. */
const DIM_MAX = 0.55;
const INK_MAX = { vignette: 0.5, eclat: 0.6 } as const;
/**
 * The most a veil changes the stage's luminance (WCAG relative luminance): under 0.1, no flash;
 * calm (the flashes reduced or off), less. The éclat at its heart and the halo do flash: the
 * budget counts them (docs/flashs.md §4).
 */
export const VEIL_DELTA = 0.08;
export const CALM_DELTA = 0.05;
export const ECLAT_DELTA = 0.22;
export const HALO_DELTA = 0.2;
/**
 * The dark look of a fighter's front effects (docs/flashs.md §4), multiplied over their colors:
 * none of their pixels is then lighter than it, ΔL ≤ VEIL_DELTA over the stage (tested).
 */
export const FX_DARK = 0x4c5266;
/**
 * Diameters, world pixels. The éclat bursts from the impact, its glow past both fighters, fading
 * to nothing (never a tint of the whole screen: at its closest, the camera shows 330 px); the
 * halo stays about the fighter's height, its flash (ΔL ≥ 0.1) on less than 1 200 px².
 */
export const GLOW_SIZE = { eclat: 480, halo: 128 } as const;

export type VeilKind = 'dim' | 'halo' | 'vignette' | 'eclat';

export interface VeilLook {
  readonly kind: VeilKind;
  readonly color: number;
  /** Peak opacity: the dark's, the vignette's in the screen's corners, a glow's at its heart. */
  readonly alpha: number;
  /** Display frames to rise, to hold, to fade. */
  readonly attack: number;
  readonly hold: number;
  readonly release: number;
}

/** The highest alpha of `color` that changes none of the stage's large colors by more than `delta`. */
export function alphaOver(color: number, stage: readonly number[], delta: number): number {
  return Math.min(...stage.map((backdrop) => alphaForDelta(color, backdrop, delta)));
}

/**
 * The super's freeze (`stage`: the stage's large colors): the stage goes dark under both
 * fighters, held as long as the freeze (20 ticks), back with the first blow.
 */
export function superDim(stage: readonly number[]): VeilLook {
  const alpha = Math.min(DIM_MAX, alphaOver(DIM_COLOR, stage, VEIL_DELTA));
  return { kind: 'dim', color: DIM_COLOR, alpha, attack: 4, hold: 18, release: 14 };
}

/** The super's freeze: a platine halo behind the one who lets it go. */
export function superHalo(stage: readonly number[]): VeilLook {
  const alpha = alphaOver(HALO_COLOR, stage, HALO_DELTA);
  return { kind: 'halo', color: HALO_COLOR, alpha, attack: 3, hold: 10, release: 18 };
}

/**
 * The KO's veil, by how it landed (docs/combos-v3.md §1.8.6): none for a blow on its own; for a
 * combo's end, a vignette in the winner's energy on the screen's edges; for an Ultime (and the
 * Finisher, until its scene moves it to the landing), the éclat, the one flash of the KO,
 * bursting from the impact behind the fighters. By the player's
 * « Effets de flash » (docs/flashs.md §4): reduced, softer, the éclat no longer a flash; off, or
 * the éclat refused by the budget (`lit` false), in ink: they darken.
 */
export function koVeil(
  finish: KoFinish,
  energy: number,
  stage: readonly number[],
  mode: FlashMode = 'normal',
  lit = true,
): VeilLook | null {
  if (finish === 'plain') return null;
  const kind = finish === 'combo' ? 'vignette' : 'eclat';
  const ink = mode === 'off' || (kind === 'eclat' && mode === 'normal' && !lit);
  const delta = mode === 'normal' ? (kind === 'eclat' ? ECLAT_DELTA : VEIL_DELTA) : CALM_DELTA;
  const color = ink ? DIM_COLOR : energy;
  const alpha = ink
    ? Math.min(INK_MAX[kind], alphaOver(DIM_COLOR, stage, VEIL_DELTA))
    : alphaOver(energy, stage, kind === 'eclat' && mode === 'reduced' ? VEIL_DELTA : delta);
  return kind === 'vignette'
    ? { kind, color, alpha, attack: 3, hold: 8, release: 30 }
    : { kind, color, alpha, attack: 3, hold: 4, release: 26 };
}

/**
 * World px² of a glow (the halo, the éclat) that flash at its peak over the stage: those it
 * changes by FLASH_DELTA or more (0 for a vignette or the dark, which cover no such area).
 */
export function glowFlashArea(look: VeilLook, stage: readonly number[]): number {
  if (look.kind !== 'halo' && look.kind !== 'eclat') return 0;
  const flashes = (r: number): boolean =>
    stage.some(
      (backdrop) =>
        luminanceDelta(look.color, backdrop, look.alpha * glowProfile(r)) >= FLASH_DELTA,
    );
  if (!flashes(0)) return 0;
  // The profile falls from the heart outward: the flash is a disc.
  let inside = 0;
  let outside = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (inside + outside) / 2;
    if (flashes(mid)) inside = mid;
    else outside = mid;
  }
  return Math.PI * ((inside * GLOW_SIZE[look.kind]) / 2) ** 2;
}

/** A veil's opacity `age` display frames after it started: eased up, held, eased down. */
export function veilAlpha(look: VeilLook, age: number): number {
  const { attack, hold, release, alpha } = look;
  if (age < 0) return 0;
  if (age < attack) {
    const t = (age + 1) / attack;
    return alpha * (1 - (1 - t) ** 2);
  }
  if (age < attack + hold) return alpha;
  const t = (age - attack - hold + 1) / release;
  return t >= 1 ? 0 : alpha * (1 - t * t * (3 - 2 * t));
}

/** Display frames a veil lasts. */
export function veilLife(look: VeilLook): number {
  return look.attack + look.hold + look.release;
}

/**
 * A glow's opacity at `r` (0: its heart, 1: its edge), its heart's 1: bright at the heart, it
 * fades to nothing (a burst, not a tint of the whole screen).
 */
export function glowProfile(r: number): number {
  if (r >= 1) return 0;
  const t = Math.max(0, r);
  return (1 - t * t * (3 - 2 * t)) ** 2.5;
}

/**
 * The vignette's opacity at (u, v), -1 to 1 across the screen: clear on the middle, about half
 * on the edges' middles, whole in the corners.
 */
export function vignetteProfile(u: number, v: number): number {
  const d = Math.hypot(u, v) / Math.SQRT2;
  const t = Math.min(1, Math.max(0, (d - 0.45) / 0.55));
  return t * t * (3 - 2 * t);
}
