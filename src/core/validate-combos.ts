import type { FighterTemplate } from './config';
import {
  MOVE_IDS,
  PHRASE_MOVE_IDS,
  type CounterEffect,
  type Knockdown,
  type MoveData,
  type MoveId,
} from './move-data';
import { JUGGLE_POINTS_MAX, MAX_BRANCH_DEPTH } from './rules';

/**
 * The checks of the combo grammar (docs/combos-v3.md §1.12, rules 1, 2, 5 to 8): what keeps the
 * strings, the phrase and the juggle finite (the anti-infinite proof, §1.13). Called by
 * `validateTemplate`, each problem prefixed with the fighter's name.
 */

/** The most a CONTRE may add to a blow's hitstun (the Crochet folds with 16). */
const COUNTER_HITSTUN_MAX = 20;

export function comboProblems(template: FighterTemplate): string[] {
  const problems: string[] = [];
  const expect = (condition: boolean, message: string): void => {
    if (!condition) problems.push(message);
  };
  const moves = definedMoves(template);
  // Rule 8: after any normal blocked, a move started from neutral leaves a gap (no blocked
  // string without end), and every blow pushes back.
  const quickest = Math.min(...moves.filter(([, m]) => isAttack(m)).map(([, m]) => m.startup));
  const extenders = new Set<string>();

  for (const [id, move] of moves) {
    const phrased = (PHRASE_MOVE_IDS as readonly MoveId[]).includes(id);
    expect(move.kind !== 'normal' || phrased, `${id}: a normal must have its bit in the phrase`);
    if (move.branches) problems.push(...branchProblems(template, id, move));
    if (move.knockdown) problems.push(...launchProblems(id, move.knockdown));
    if (move.juggleCost !== undefined) {
      expect(isInteger(move.juggleCost, 1), `${id}.juggleCost must be an integer >= 1`);
    }
    if (move.extender) {
      expect(move.kind === 'normal', `${id}: only a normal can be an extender`);
      extenders.add(move.extender);
    }
    if (move.counter) problems.push(...counterProblems(id, move.counter));
    if (move.kind === 'normal') {
      const advantage = move.blockstun + 1 - move.active - move.recovery;
      expect(
        advantage <= quickest - 1,
        `${id} is ${advantage} on block: a blocked string would never end (${quickest - 1} at most)`,
      );
    }
    if (isAttack(move)) expect(move.pushback > 0, `${id}: a blow must push back`);
  }
  expect(extenders.size <= 1, 'one kind of extender per fighter (Rebond or Vrille)');
  problems.push(...branchPaths(template));
  return problems;
}

/** Rule 1: strings lead to normals it has, one move per button and direction. */
function branchProblems(template: FighterTemplate, id: MoveId, move: MoveData): string[] {
  const problems: string[] = [];
  if (move.kind !== 'normal') problems.push(`${id}: only a normal opens strings`);
  const seen = new Set<string>();
  for (const branch of move.branches ?? []) {
    const target = template.moves[branch.move];
    if (target?.kind !== 'normal') problems.push(`${id}: a string leads to a normal it has`);
    for (const dir of branch.dirs ?? ['any']) {
      const key = `${branch.button} ${dir}`;
      if (seen.has(key)) problems.push(`${id}: two strings for ${key}`);
      seen.add(key);
    }
  }
  return problems;
}

/** Rule 7: a CONTRE of its own stuns a little longer at most, and launches like a launcher. */
function counterProblems(id: MoveId, counter: CounterEffect): string[] {
  const problems: string[] = [];
  const { hitstun, pushback, knockdown } = counter;
  if (hitstun !== undefined && !(isInteger(hitstun, 0) && hitstun <= COUNTER_HITSTUN_MAX)) {
    problems.push(`${id}.counter.hitstun must be an integer from 0 to ${COUNTER_HITSTUN_MAX}`);
  }
  if (pushback !== undefined && !isInteger(pushback, 0)) {
    problems.push(`${id}.counter.pushback must be an integer >= 0`);
  }
  if (knockdown) problems.push(...launchProblems(`${id}.counter`, knockdown));
  return problems;
}

/** Rule 5 (and 7 for a CONTRE's): a launch flies at integer speeds, with 1 to 5 points. */
function launchProblems(where: string, launch: Knockdown): string[] {
  const problems: string[] = [];
  if (!(isInteger(launch.vx, 0) && isInteger(launch.vy, 1))) {
    problems.push(`${where}.knockdown must fly at integer speeds, upward`);
  }
  const points = launch.juggle;
  if (points !== undefined && !(isInteger(points, 1) && points <= JUGGLE_POINTS_MAX)) {
    problems.push(`${where}: a launcher gives from 1 to ${JUGGLE_POINTS_MAX} juggle points`);
  }
  return problems;
}

/**
 * Rule 1: the strings never loop, and no path of strings is longer than MAX_BRANCH_DEPTH moves
 * (Direct, Double direct, Cross, Crochet, Crochet au foie is Nayo's longest).
 */
function branchPaths(template: FighterTemplate): string[] {
  return definedMoves(template).flatMap(([id, move]) => {
    if (!move.branches) return [];
    const longest = longestFrom(template, id, []);
    if (longest === null) return [`strings from ${id} loop`];
    return longest > MAX_BRANCH_DEPTH
      ? [`strings from ${id} run ${longest} moves (${MAX_BRANCH_DEPTH} at most)`]
      : [];
  });
}

/** The most moves a path of strings plays from `id` on, or null if it loops (`path` before it). */
function longestFrom(
  template: FighterTemplate,
  id: MoveId,
  path: readonly MoveId[],
): number | null {
  if (path.includes(id)) return null;
  let longest = 1;
  for (const branch of template.moves[id]?.branches ?? []) {
    const after = longestFrom(template, branch.move, [...path, id]);
    if (after === null) return null;
    longest = Math.max(longest, 1 + after);
  }
  return longest;
}

function definedMoves(template: FighterTemplate): [MoveId, MoveData][] {
  return MOVE_IDS.flatMap((id): [MoveId, MoveData][] => {
    const move = template.moves[id];
    return move ? [[id, move]] : [];
  });
}

/** A move that strikes: a normal or a special (a projectile too), not a movement nor a throw. */
function isAttack(move: MoveData): boolean {
  return move.kind === 'normal' || move.kind === 'special';
}

function isInteger(value: number, min: number): boolean {
  return Number.isInteger(value) && value >= min;
}
