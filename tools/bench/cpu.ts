/**
 * The CPU bench: CPU against CPU, without a screen, to measure the balance between fighters
 * (docs/combat-v2.md §6.4). Every match is seeded (1000, 1001, …) and the fighters swap sides from
 * one match to the next: the same call always gives the same numbers. These numbers measure the
 * CPU's plans as much as the fighters' data: read them as a trend, not as a verdict.
 *
 *   npm run bench:cpu                                   every pair of the roster, 200 matches, hard
 *   npm run bench:cpu -- saphir nayo --matches 400
 *   npm run bench:cpu -- saphir riff --levels easy,normal,hard
 */

import { cpuStep, createCpu, type CpuLevel } from '../../src/ai/cpu.ts';
import type { MatchConfig } from '../../src/core/config.ts';
import { matchWinner } from '../../src/core/round.ts';
import { createInitialState } from '../../src/core/state.ts';
import { step } from '../../src/core/step.ts';
import { ROSTER, templateOf, type FighterId } from '../../src/data/roster.ts';
import { TRAINING_STAGE } from '../../src/data/stages.ts';

/** The first seed; the n-th match is seeded `FIRST_SEED + n`, as docs/watt.md §17 measured. */
export const FIRST_SEED = 1000;
/** A match still running after this many ticks (about 11 minutes) is counted a draw. */
export const MAX_TICKS = 40_000;

const LEVELS: readonly CpuLevel[] = ['easy', 'normal', 'hard'];

/** What `first` made of `matches` matches against `second`. */
export interface PairResult {
  readonly first: FighterId;
  readonly second: FighterId;
  readonly level: CpuLevel;
  readonly matches: number;
  readonly wins: number;
  readonly draws: number;
}

/** One match between two CPUs of `level`: the winner's side, or null for a draw. */
function playMatch(config: MatchConfig, level: CpuLevel, seed: number): 0 | 1 | null {
  let state = createInitialState(config);
  let left = createCpu(0, level, seed);
  let right = createCpu(1, level, seed * 7 + 3);
  for (let tick = 0; tick < MAX_TICKS && state.round.phase !== 'matchEnd'; tick++) {
    const a = cpuStep(left, state, config);
    const b = cpuStep(right, state, config);
    left = a.cpu;
    right = b.cpu;
    state = step(state, [a.input, b.input], config);
  }
  return matchWinner(state.round);
}

/** `matches` matches of `first` against `second`, `first` on the left in the even ones. */
export function benchPair(
  first: FighterId,
  second: FighterId,
  level: CpuLevel,
  matches: number,
): PairResult {
  const [a, b] = [templateOf(first), templateOf(second)];
  let wins = 0;
  let draws = 0;
  for (let n = 0; n < matches; n++) {
    const left = n % 2 === 0;
    const config: MatchConfig = { stage: TRAINING_STAGE, fighters: left ? [a, b] : [b, a] };
    const winner = playMatch(config, level, FIRST_SEED + n);
    if (winner === null) draws++;
    else if ((winner === 0) === left) wins++;
  }
  return { first, second, level, matches, wins, draws };
}

/** One line of the table: `Saphir > Nayo  24.0 %`, and its draws if any. */
export function formatResult(result: PairResult): string {
  const share = ((100 * result.wins) / result.matches).toFixed(1);
  const names = `${templateOf(result.first).name} > ${templateOf(result.second).name}`;
  const draws = result.draws > 0 ? `  (${result.draws} nuls)` : '';
  return `${result.level.padEnd(7)} ${names.padEnd(18)} ${share.padStart(5)} %${draws}`;
}

/** The value after `--name` among `args`, if given. */
function option(args: readonly string[], name: string): string | undefined {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
}

/** The fighters named in `args` (none: every pair of the roster), checked against the roster. */
export function pairsOf(args: readonly string[]): [FighterId, FighterId][] {
  const ids = ROSTER.map((entry) => entry.id);
  const named = args.filter((arg, at) => !arg.startsWith('--') && !args[at - 1]?.startsWith('--'));
  for (const name of named) {
    if (!(ids as readonly string[]).includes(name)) {
      throw new Error(`Unknown fighter « ${name} »: pick from ${ids.join(', ')}.`);
    }
  }
  if (named.length === 2) return [[named[0] as FighterId, named[1] as FighterId]];
  if (named.length !== 0) throw new Error('Name two fighters, or none for every pair.');
  return ids.flatMap((first, at) =>
    ids.slice(at + 1).map((second) => [first, second] as [FighterId, FighterId]),
  );
}

/** The levels named by `--levels` (hard by default). */
export function levelsOf(args: readonly string[]): CpuLevel[] {
  const named = (option(args, 'levels') ?? 'hard').split(',');
  for (const level of named) {
    if (!(LEVELS as readonly string[]).includes(level)) {
      throw new Error(`Unknown level « ${level} »: pick from ${LEVELS.join(', ')}.`);
    }
  }
  return named as CpuLevel[];
}

function main(args: readonly string[]): void {
  const matches = Number(option(args, 'matches') ?? 200);
  if (!Number.isInteger(matches) || matches < 1) {
    throw new Error('--matches takes a whole number of matches, 1 or more.');
  }
  const started = Date.now();
  for (const level of levelsOf(args)) {
    for (const [first, second] of pairsOf(args)) {
      console.log(formatResult(benchPair(first, second, level, matches)));
    }
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`${matches} matchs par paire, graines ${FIRST_SEED} et suivantes, ${seconds} s`);
}

if (import.meta.main) main(process.argv.slice(2));
