/**
 * The Remixes' own strips (docs/art/nayo-essence.md §5): the Boost spends the gauge, and its
 * specials are no longer their plain versions with white effects laid over them. Each Remix plays
 * its special's poses at its special's timing (the frame data is the same, D18), but drawn in its
 * own light: its effects in the Boost's platine, which light him gold where they graze and white
 * where they hit square, and more of them (`extra`): the record charged harder, the column wider.
 */

import type { Effect, Glow, Pose, Tone } from '../../skeleton.ts';

/**
 * An effect in the Boost's platine (docs/combos-v3.md §1.8.7, as sheet.ts's `toPlatine`): the
 * floor's dust and the guard's arc stay as they are.
 */
export function platine(effect: Effect): Effect {
  return effect.kind === 'dust' || effect.kind === 'shield'
    ? effect
    : { ...effect, tone: 'platine' satisfies Tone };
}

/** What a Remix adds to a frame of its special: effects and lights, in platine. */
export interface RemixFrame {
  readonly effects?: readonly Effect[];
  readonly glows?: readonly Glow[];
}

/**
 * The poses of a special as its Remix plays them: every effect in platine, every light white,
 * and what each frame adds (`extra`, by frame).
 */
export function remixOf(
  poses: readonly Pose[],
  extra: Readonly<Record<number, RemixFrame>> = {},
): readonly Pose[] {
  return poses.map((pose, frame) => {
    const more = extra[frame];
    const effects = [...(pose.effects ?? []), ...(more?.effects ?? [])].map(platine);
    const glows = [...(pose.glows ?? []), ...(more?.glows ?? [])].map((glow): Glow => ({
      ...glow,
      tone: 'platine',
    }));
    return {
      ...pose,
      ...(effects.length > 0 ? { effects } : {}),
      ...(glows.length > 0 ? { glows } : {}),
    };
  });
}
