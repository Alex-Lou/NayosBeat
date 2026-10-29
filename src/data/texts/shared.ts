/**
 * What every fighter's help page is made of (docs/combat-v2.md §17), and the ways of doing a
 * move they share. Written as players read them on every device: L, H and S are the light,
 * heavy and special buttons (J, K, L on a keyboard), "avant" is toward the opponent.
 */

import type { CoreMoveId, OptionalMoveId } from '../../core/move-data';

export interface MoveText {
  /** How to do it. */
  readonly input: string;
  /** What it does and what it is for. */
  readonly text: string;
}

export interface FighterTexts {
  /** Who the fighter is, in a line. */
  readonly title: string;
  /** Every move the fighter has: the core ones, and its optional ones. */
  readonly moves: Readonly<Record<CoreMoveId, MoveText>> &
    Readonly<Partial<Record<OptionalMoveId, MoveText>>>;
  /**
   * Its combos to learn first (docs/combos-v3.md §3.1, §4), easiest first: how to play them,
   * and what they are for. Only those that need no gauge.
   */
  readonly combos: readonly MoveText[];
}

export const SPECIAL = 'S, ou ↓↘→ + un coup';
export const FINISHER = 'L, L, L';
export const FORWARD_LIGHT = 'Avant + L';
export const FORWARD_HEAVY = 'Avant + H';
export const BACK_HEAVY = 'Arrière + H';
export const ANTI_AIR = 'Bas + S, ou →↓↘ + un coup';
export const GRAB = 'PRISE, ou L + H';
export const PUMMEL = 'En tenant, L';
export const THROW_FORWARD = 'En tenant, H, S ou PRISE';
export const THROW_BACK = 'En tenant, ← + H, S ou PRISE';
export const DASH = 'DASH, ou 2 fois avant';
export const BACKDASH = 'Arrière + DASH, ou 2 fois arrière';
/** The strings (docs/combos-v3.md §1.4). */
export const CHAIN = 'L, L';
export const CHAIN_HEAVY = 'H, H';
export const CHAIN_HIGH = 'L, L, puis avant + H';
export const CHAIN_LAUNCH = 'L, L, puis arrière + H';
