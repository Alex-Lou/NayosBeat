import type { MatchConfig } from '../../src/core/config';
import { DIRECTIONS, type InputBits } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { startsMove } from './combo-helpers';

/**
 * A beam search for the longest combo the rules allow (docs/combos-v3.md §1.13): from a combo
 * already started, every command is tried as a player keeps a combo going (pressed again every
 * other tick until its move comes out, then played until it connects), and a branch lives on
 * while the opponent stays in the combo. The widest branches by hits are kept at each depth.
 * Player 1 attacks; the opponent does nothing.
 */

/** A command tried at each step of the search, by its notation. */
export type Command = readonly [notation: string, input: InputBits];

/** A combo the search found: its blows (the starter's included), their damage, its notation. */
export interface Found {
  readonly hits: number;
  readonly damage: number;
  readonly path: readonly string[];
}

interface Node extends Found {
  readonly state: GameState;
}

/** Ticks given to a command to come out, then to connect. */
const PRESS_TICKS = 40;
const CONNECT_TICKS = 80;

/** Whether the opponent is still in the combo: reeling or juggled, hit at least once. */
function inCombo(state: GameState): boolean {
  const { action, comboCount } = state.fighters[1];
  return (action === 'hitstun' || action === 'airHit') && comboCount > 0;
}

/** Player 1's damage dealt on this tick. */
function dealt(state: GameState): number {
  let damage = 0;
  for (const contact of state.contacts) if (contact.by === 0) damage += contact.damage;
  return damage;
}

/**
 * Plays `input` from `node`: the node after its move connected (null if it never came out, or
 * the combo dropped), and the last blow of a combo that ended on it, if it was one more.
 */
function expand(
  node: Node,
  [notation, input]: Command,
  config: MatchConfig,
): { next: Node | null; ending: Found | null } {
  let { state, damage } = node;
  let started = false;
  for (let tick = 0; tick < PRESS_TICKS && !started; tick++) {
    const before = state.fighters[0];
    state = step(state, [tick % 2 === 0 ? input : input & DIRECTIONS, 0], config);
    damage += dealt(state);
    if (!inCombo(state)) return { next: null, ending: null };
    started = startsMove(before, state.fighters[0]);
  }
  if (!started) return { next: null, ending: null };
  for (let tick = 0; tick < CONNECT_TICKS; tick++) {
    const attacker = state.fighters[0];
    if (attacker.moveConnected && state.hitstop === 0) break;
    if (attacker.action !== 'attack') break;
    state = step(state, [0, 0], config);
    damage += dealt(state);
  }
  const path = [...node.path, notation];
  const hits = state.fighters[1].comboCount;
  if (inCombo(state))
    return { next: hits > node.hits ? { state, hits, damage, path } : null, ending: null };
  // The last blow may have floored the opponent: it counts, but the branch ends there.
  return { next: null, ending: hits === node.hits + 1 ? { hits, damage, path } : null };
}

/** The longest combo (and the most damaging) found from `start`, `width` branches a depth. */
export function searchCombos(
  start: GameState,
  starter: string,
  commands: readonly Command[],
  config: MatchConfig,
  width: number,
): { longest: Found; heaviest: Found } {
  const hits = start.fighters[1].comboCount;
  const root: Node = { state: start, hits, damage: 0, path: [starter] };
  let longest: Found = root;
  let heaviest: Found = root;
  const keep = (found: Found): void => {
    if (found.hits > longest.hits) longest = found;
    if (found.damage > heaviest.damage) heaviest = found;
  };
  let beam: Node[] = [root];
  while (beam.length > 0) {
    const next: Node[] = [];
    for (const node of beam) {
      for (const command of commands) {
        const { next: grown, ending } = expand(node, command, config);
        if (grown) next.push(grown);
        if (ending) keep(ending);
      }
    }
    // The most hits first; equal ones keep the order the commands were tried in (a stable
    // sort): the lights, which make the longest combos, before the heavies.
    next.sort((a, b) => b.hits - a.hits);
    // Branches that end the same way are one: the rest of the path barely matters.
    const seen = new Set<string>();
    beam = [];
    for (const node of next) {
      const key = `${node.path.slice(-3).join(' ')} ${node.hits}`;
      if (seen.has(key)) continue;
      seen.add(key);
      beam.push(node);
      keep(node);
      if (beam.length >= width) break;
    }
  }
  return { longest, heaviest };
}
