import type { HoldProfile } from './hold-tactics';

/** How well the CPU plays (docs/combat-v2.md §13.1). */
export type CpuLevel = 'easy' | 'normal' | 'hard';

/** What the CPU does at a level: how quickly it reacts, how often it takes each option. */
export interface Profile extends HoldProfile {
  /** Chance to block an attack it sees coming. */
  readonly block: number;
  readonly antiAir: number;
  /** Chance to follow a move that connected up with one of its plans (plans.ts). */
  readonly combo: number;
  readonly throw: number;
  /** How often it closes the distance rather than waiting. */
  readonly aggression: number;
  /** Chance to dash in rather than walk, from mid range. */
  readonly dash: number;
  /** Chance to backdash out of close pressure once a block ends. */
  readonly backdash: number;
  /**
   * Chance to throw a Remix instead of a plain special in neutral, when the gauge pays for it
   * (docs/combos-v3.md §6.4): hard keeps most of its bars for its combos and its super.
   */
  readonly remix: number;
  /**
   * Chance to punish a move it sees still recovering in its reach (docs/polish/AUDIT-ET-PLAN.md,
   * P18).
   */
  readonly punish: number;
}

/**
 * Ticks added at random to `reactionFrames`, drawn anew each time the opponent starts a move:
 * from 0 to this many. A human does not react in the same time twice (docs/polish/
 * AUDIT-ET-PLAN.md, P18).
 */
export const REACTION_JITTER = 6;

export const PROFILES: Readonly<Record<CpuLevel, Profile>> = {
  easy: {
    reactionFrames: 24,
    block: 0.25,
    antiAir: 0.1,
    combo: 0.15,
    throw: 0.05,
    aggression: 0.35,
    dash: 0.1,
    backdash: 0.05,
    remix: 0,
    punish: 0.15,
    tech: 0.1,
    struggle: 2,
    pummels: 0,
  },
  normal: {
    // 16 ticks, 265 ms: a human reacting to what they expect (docs/polish/AUDIT-ET-PLAN.md
    // §2.2, Infil).
    reactionFrames: 16,
    block: 0.55,
    antiAir: 0.4,
    combo: 0.5,
    throw: 0.12,
    aggression: 0.5,
    dash: 0.25,
    backdash: 0.15,
    remix: 0.25,
    punish: 0.5,
    tech: 0.3,
    struggle: 5,
    pummels: 1,
  },
  hard: {
    // A very good human, never faster (12 to 19 ticks, docs/polish/AUDIT-ET-PLAN.md §2.2): an
    // overhead of 16 to 19 ticks stays reactable, not blocked before it is seen.
    reactionFrames: 12,
    block: 0.85,
    antiAir: 0.75,
    combo: 0.85,
    throw: 0.2,
    aggression: 0.65,
    dash: 0.4,
    backdash: 0.25,
    remix: 0.1,
    punish: 0.85,
    tech: 0.5,
    struggle: 8,
    pummels: Infinity,
  },
};
