import type { KoFinish } from './fight-events';
import { alphaForDelta } from './luminance';

/**
 * The veils over the fight (docs/flashs.md §1.2, §2): the super's dark and its platine halo, the KO's
 * vignette and éclat. Each takes its alpha from its color and the stage's, never more than a
 * set change of luminance: a cyan veil and a magenta one strike alike.
 */

/** The super's dark: the HUD band's violet black. */
export const DIM_COLOR = 0x0c0614;
/** The super's halo: the Boost's platine, the same whoever lets it go. */
export const HALO_COLOR = 0xf2f6ff;
/** The dark never hides the stage more than this. */
const DIM_MAX = 0.55;
/**
 * The most a veil changes the stage's luminance (WCAG relative luminance): under 0.1, no flash.
 * The éclat at its heart and the halo do flash, on a small area for the halo.
 */
export const VEIL_DELTA = 0.08;
export const ECLAT_DELTA = 0.22;
export const HALO_DELTA = 0.2;
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
function alphaOver(color: number, stage: readonly number[], delta: number): number {
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
 * combo's end, a vignette in the winner's energy on the screen's edges; for an Ultime, the
 * éclat, the one flash of the KO, bursting from the impact behind the fighters.
 */
export function koVeil(
  finish: KoFinish,
  energy: number,
  stage: readonly number[],
): VeilLook | null {
  if (finish === 'plain') return null;
  if (finish === 'combo') {
    const alpha = alphaOver(energy, stage, VEIL_DELTA);
    return { kind: 'vignette', color: energy, alpha, attack: 3, hold: 8, release: 30 };
  }
  const alpha = alphaOver(energy, stage, ECLAT_DELTA);
  return { kind: 'eclat', color: energy, alpha, attack: 3, hold: 4, release: 26 };
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
