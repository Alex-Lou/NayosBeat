/**
 * The hash of a game state (FNV-1a, 32 bits, over its canonical form): what the golden replays pin
 * (tools/replays/replay.ts), and what both devices of an online match compare to know they still
 * play the same fight (docs/multijoueur.md §9.3). Moved here unchanged from the replays' tool, so
 * the game can use it too: the replays' hashes are the proof that nothing changed.
 */

import type { FighterState, GameState } from '../core/state';

/**
 * Every field the hash covers, in a fixed order. Values are hashed without their names, so
 * renaming a field (and its entry here) keeps the hashes; a test checks that no field of the
 * state is left out.
 */
export const FIGHTER_FIELDS = [
  'x',
  'y',
  'vx',
  'vy',
  'facing',
  'action',
  'actionFrame',
  'crouching',
  'health',
  'move',
  'moveConnected',
  'stunFrames',
  'input',
  'bufferedCommand',
  'bufferFrames',
  'bufferedInput',
  'bufferedMotion',
  'bufferedFacing',
  'directionHistory',
  'tapDirection',
  'tapFrames',
  'tapReleased',
  'throwImmuneFrames',
  'comboCount',
  'juggle',
  'phrase',
  'phraseTwice',
  'boost',
  'flags',
  'reaction',
  'reactionHeavy',
  'stunTotal',
] as const satisfies readonly (keyof FighterState)[];

/**
 * Fields added since the hash was first pinned (docs/watt-arsenal.md §7): hashed, with their
 * name, only when they differ from 0, so a fight that never uses them keeps its hash, and the
 * golden replays keep proving nothing else changed.
 */
export const LATER_FIGHTER_FIELDS = ['tension'] as const satisfies readonly (keyof FighterState)[];

/**
 * The game's fields, in a fixed order, `contacts` included: health and stun do not tell where a
 * hit landed, and the impact point moves with any hitbox or hurtbox.
 */
export const GAME_FIELDS = [
  'frame',
  'cameraX',
  'hitstop',
  'round',
  'fighters',
  'projectiles',
  'contacts',
  'hold',
] as const satisfies readonly (keyof GameState)[];

/** FNV-1a, 32 bits: small, stable, and the same in every JavaScript engine. */
export const FNV_OFFSET = 0x811c9dc5;

/** A small stable hash (FNV-1a, 32 bits, hexadecimal) of one state's canonical form. */
export function stateHash(state: GameState): string {
  return hex(fnv(FNV_OFFSET, canonicalText(state)));
}

/** Carries the FNV-1a `hash` on over `text`, so several texts hash as one stream. */
export function fnv(hash: number, text: string): number {
  let next = hash;
  for (let i = 0; i < text.length; i++) {
    next = Math.imul(next ^ text.charCodeAt(i), 0x01000193);
  }
  return next;
}

export function hex(hash: number): string {
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function canonicalText(state: GameState): string {
  return JSON.stringify(canonical(state));
}

function canonical(state: GameState): unknown {
  return GAME_FIELDS.map((field) =>
    field === 'fighters'
      ? state.fighters.map((fighter) => [
          ...FIGHTER_FIELDS.map((name) => fighter[name]),
          ...LATER_FIGHTER_FIELDS.flatMap((name) =>
            fighter[name] === 0 ? [] : [name, fighter[name]],
          ),
        ])
      : sortedKeys(state[field]),
  );
}

/** Plain data with its object keys in alphabetical order: independent of how it was built. */
function sortedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedKeys);
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1));
  return Object.fromEntries(entries.map(([key, inner]) => [key, sortedKeys(inner)]));
}
