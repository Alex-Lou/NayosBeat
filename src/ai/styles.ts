import type { MoveId } from '../core/move-data';

/** How a poke is pressed: its button, alone, forward or down with it. */
export type PokePress = 'light' | 'heavy' | 'special' | 'forwardLight' | 'downLight' | 'downHeavy';

/** A blow a fighter pokes with at its range, when it reaches (D33), and how often. */
export interface Poke {
  readonly move: MoveId;
  readonly press: PokePress;
  readonly chance: number;
}

/**
 * A fighter's game plan by distance (docs/combat-v2.md §6.4): the range it plays, between the
 * centres, in px, and the pokes it throws there whenever one reaches the opponent's body (never
 * one that would whiff, D33). In that range with no poke out, it `waits` there (a step back now
 * and then, the whiffs it draws punished as every opening is: cpu.ts `punish`), or presses in.
 * Closer, it steps back out to it, `retreat` of the time, unless its back is to a wall; farther,
 * or closer the rest of the time, the CPU's common plan plays (cpu.ts `offense`). A fighter
 * without a style plays the common plan everywhere: Nayo's, a zoner's.
 */
export interface FightStyle {
  readonly range: { readonly min: number; readonly max: number };
  readonly pokes: readonly Poke[];
  readonly retreat: number;
  readonly waits: boolean;
}

/** Keyed by the fighter's name, as its plans are (plans.ts `PLANS`). */
export const STYLES: Readonly<Record<string, FightStyle>> = {
  // Saphir (docs/saphir.md §3): « un pas, une touche, dehors ». She wants 60 to 100 px: the
  // Syncope from the farthest, the Chassé, the Pas glissé, the Pointe; then she steps back out.
  Saphir: {
    range: { min: 64, max: 100 },
    retreat: 0.6,
    waits: true,
    pokes: [
      { move: 'special', press: 'special', chance: 0.18 },
      { move: 'standHeavy', press: 'heavy', chance: 0.25 },
      { move: 'forwardLight', press: 'forwardLight', chance: 0.2 },
      { move: 'crouchHeavy', press: 'downHeavy', chance: 0.1 },
      { move: 'standLight', press: 'light', chance: 0.25 },
    ],
  },
};

export function styleOf(name: string): FightStyle | null {
  return STYLES[name] ?? null;
}
