import { ANIM_OPTIONS, LEGACY_ANIM, type AnimOptions } from '../render/anim-options';

/**
 * How a fight is watched, to judge its animation (docs/art/animation-plan.md §2, V0): slowed
 * down, and the animation of now or of before (AnimOptions). Chosen in training (its menu and its
 * pause), or in the address for any mode (`?vitesse=2`, `?anim=avant`); never kept.
 */
export interface Viewing {
  /** Display frames of 1/60 s per game tick: 1, the game's own speed; 2, half; 4, a quarter. */
  readonly slowdown: Slowdown;
  readonly anim: AnimOptions;
}

/** The slowdowns, in the order the option cycles. */
const SLOWDOWNS = [1, 2, 4] as const;
export type Slowdown = (typeof SLOWDOWNS)[number];

/** What the menus say of each slowdown (« Vitesse ») and of each animation (« Animation »). */
export const SLOWDOWN_LABELS: Readonly<Record<Slowdown, string>> = {
  1: 'normale',
  2: '½',
  4: '¼',
};
export const ANIM_LABELS = { now: 'nouvelle', before: "d'avant" } as const;

export const DEFAULT_VIEWING: Viewing = { slowdown: 1, anim: ANIM_OPTIONS };

/** The slowdown after `slowdown`, as the option cycles. */
export function nextSlowdown(slowdown: Slowdown): Slowdown {
  return SLOWDOWNS[(SLOWDOWNS.indexOf(slowdown) + 1) % SLOWDOWNS.length] ?? 1;
}

/** What the menus say of the animation `anim`. */
export function animLabel(anim: AnimOptions): string {
  return anim.legacy ? ANIM_LABELS.before : ANIM_LABELS.now;
}

/**
 * The viewing the address asks for (`search`, as `location.search`): `vitesse`, the slowdown (2
 * for half speed, 4 for a quarter, 1 the game's own); `anim=avant`, the animation of before
 * (`anim=nouvelle`, the one of now). What it does not ask, or asks wrong, stays the default.
 */
export function viewingFromUrl(search: string): Viewing {
  const params = new URLSearchParams(search);
  const slowdown = SLOWDOWNS.find((each) => String(each) === params.get('vitesse'));
  const anim = params.get('anim');
  return {
    slowdown: slowdown ?? DEFAULT_VIEWING.slowdown,
    anim:
      anim === 'avant' ? LEGACY_ANIM : anim === 'nouvelle' ? ANIM_OPTIONS : DEFAULT_VIEWING.anim,
  };
}
