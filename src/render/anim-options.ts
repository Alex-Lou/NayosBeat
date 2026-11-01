/**
 * How the fighters are animated (docs/art/animation-plan.md §2, V0). `legacy`: as before the
 * animation plan, to compare the two on the same blow (« Animation : d'avant » in training,
 * `?anim=avant` in the address). Each work of the plan reads it and shows, with it, what the game
 * showed before that work: the round poses on their old clocks and the victim frozen still
 * through the impact freeze, a body knocked out in the air landing silent (V1); then the key
 * frames alone, the one death, today's reactions, today's rest.
 */
export interface AnimOptions {
  readonly legacy: boolean;
}

/** The animation as it is now: what every fight plays unless asked otherwise. */
export const ANIM_OPTIONS: AnimOptions = { legacy: false };

/** The animation of before. */
export const LEGACY_ANIM: AnimOptions = { legacy: true };
