/**
 * Films of a fight, to see the animation plan's changes (docs/art/animation-plan.md §2, V0): a
 * golden replay (tests/core/replays) or a CPU match on fixed seeds, played with `step`, and on
 * every tick what each fighter shows, `showFighter` called as the game calls it; once with the
 * animation of before (`legacy`), once with the one of now. The same checkout films the before and
 * the after. compare.ts puts two films side by side in a page.
 *
 *   npm run anim:film -- ko.json                 # tools/anim/out/ko-avant.json, ko-apres.json
 *   npm run anim:film -- cpu:7 --from 600 --to 1500
 *
 * Options: `--then N`, N more ticks with nothing pressed after a replay's inputs; `--from`,
 * `--to`, the ticks kept; `--out DIR`, where the films go.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpuStep, createCpu, type CpuLevel } from '../../src/ai/cpu.ts';
import type { Colorway } from '../../src/art/index.ts';
import { NAYO_CELLS } from '../../src/art/nayo/cells.ts';
import { NAYO_CLIPS, NAYO_PROJECTILES } from '../../src/art/nayo/clips.ts';
import { NAYO_PLAYED } from '../../src/art/nayo/played.ts';
import { NAYO_SHEETS } from '../../src/art/nayo/sheets.ts';
import { RIFF_CELLS } from '../../src/art/riff/cells.ts';
import { RIFF_CLIPS } from '../../src/art/riff/clips.ts';
import { RIFF_PLAYED } from '../../src/art/riff/played.ts';
import { RIFF_SHEETS } from '../../src/art/riff/sheets.ts';
import {
  clipOf,
  effectsOf,
  playedClips,
  playedStrips,
  type ClipId,
  type FighterArt,
} from '../../src/art/types.ts';
import type { MatchConfig } from '../../src/core/config.ts';
import { toPx } from '../../src/core/constants.ts';
import { createInitialState, type GameState, type RoundPhase } from '../../src/core/state.ts';
import { step } from '../../src/core/step.ts';
import { templateOf, type FighterId } from '../../src/data/roster.ts';
import { TRAINING_STAGE } from '../../src/data/stages.ts';
import { ANIM_OPTIONS, LEGACY_ANIM } from '../../src/render/anim-options.ts';
import {
  clipFrameAt,
  frontFighter,
  showFighter,
  type ShowContext,
  type Shown,
} from '../../src/render/animation.ts';
import {
  detectEvents,
  landingOf,
  landsHeavy,
  type FightEvent,
  type KoFinish,
} from '../../src/render/fight-events.ts';
import { FightMemory } from '../../src/render/fight-memory.ts';
import { hitShakeOf } from '../../src/render/hit-shake.ts';
import { hitStyleOf } from '../../src/render/hit-styles.ts';
import { parseInput, replayConfig, type Replay } from '../replays/replay.ts';

/** A fight played: its fighters, its first state and the state after each of its ticks. */
export interface Take {
  readonly name: string;
  readonly fighters: readonly [FighterId, FighterId];
  readonly config: MatchConfig;
  readonly start: GameState;
  readonly states: readonly GameState[];
}

/** One fighter on one tick, world pixels: the drawing of its feet at `x` + `shake`, `y` up. */
export interface FilmFighter {
  readonly clip: ClipId;
  readonly tick: number;
  readonly sheet: string;
  readonly frame: number;
  /** Its front effects' strip (drawn if it has one). */
  readonly effects: string;
  readonly x: number;
  readonly y: number;
  readonly flip: boolean;
  /** The tremble of a body struck (hit-shake.ts). */
  readonly shake: number;
}

/** A blow that landed or was blocked on the tick, where it touched (world pixels, y up). */
export interface FilmBlow {
  readonly x: number;
  readonly y: number;
  readonly by: 0 | 1;
  readonly heavy: boolean;
  readonly blocked: boolean;
}

export interface FilmProjectile {
  readonly owner: 0 | 1;
  readonly sheet: string;
  readonly frame: number;
  readonly x: number;
  readonly flip: boolean;
}

export interface FilmTick {
  readonly frame: number;
  readonly phase: RoundPhase;
  readonly hitstop: number;
  /** The camera's center, world pixels. */
  readonly cameraX: number;
  /** The fighter drawn over the other. */
  readonly front: 0 | 1;
  readonly fighters: readonly [FilmFighter, FilmFighter];
  readonly projectiles: readonly FilmProjectile[];
  readonly blows: readonly FilmBlow[];
  /** A body landed with a thud (its sound and the jolt of the screen: landingOf). */
  readonly thud: boolean;
}

export interface Film {
  readonly name: string;
  readonly legacy: boolean;
  readonly fighters: readonly [FighterId, FighterId];
  /** In a mirror match, player 2 wears the second colorway. */
  readonly colorways: readonly [Colorway, Colorway];
  /** Each fighter's energy (its sparks' color). */
  readonly energies: readonly [number, number];
  /** Where each tick starts, in the take (the first one kept). */
  readonly from: number;
  readonly ticks: readonly FilmTick[];
}

/**
 * The art of a fighter as the game plays it (src/art/<fighter>/index.ts), without its images (the
 * bundler's alone): the keys and their in-betweens, the keys alone for the animation of before.
 */
const ARTS: Readonly<Record<FighterId, FighterArt>> = {
  nayo: {
    key: 'nayo',
    sheets: playedStrips(NAYO_SHEETS, NAYO_PLAYED),
    clips: playedClips(NAYO_CLIPS, NAYO_PLAYED, NAYO_SHEETS),
    keyClips: NAYO_CLIPS,
    projectiles: NAYO_PROJECTILES,
    cells: NAYO_CELLS,
    urls: {},
  },
  riff: {
    key: 'riff',
    sheets: playedStrips(RIFF_SHEETS, RIFF_PLAYED),
    clips: playedClips(RIFF_CLIPS, RIFF_PLAYED, RIFF_SHEETS),
    keyClips: RIFF_CLIPS,
    cells: RIFF_CELLS,
    urls: {},
  },
};

/** A golden replay played whole, then `then` ticks with nothing pressed. */
export function replayTake(name: string, replay: Replay, then = 0): Take {
  const config = replayConfig(replay);
  const start = createInitialState(config);
  const states: GameState[] = [];
  let state = start;
  const runs = [...replay.inputs, [then, '', ''] as const];
  for (const [ticks, player1, player2] of runs) {
    const inputs = [parseInput(player1), parseInput(player2)] as const;
    for (let i = 0; i < ticks; i++) {
      state = step(state, inputs, config);
      states.push(state);
    }
  }
  return { name, fighters: replay.fighters, config, start, states };
}

/** Ticks a CPU match plays at most. */
const CPU_TICKS = 20_000;

/**
 * Two CPUs on `seed` and `seed + 1`, round 1 to its end: until the second round starts, its
 * round end played whole.
 */
export function cpuTake(
  seed: number,
  fighters: readonly [FighterId, FighterId] = ['nayo', 'riff'],
  level: CpuLevel = 'hard',
): Take {
  const config: MatchConfig = {
    stage: TRAINING_STAGE,
    fighters: [templateOf(fighters[0]), templateOf(fighters[1])],
  };
  const start = createInitialState(config);
  const states: GameState[] = [];
  let state = start;
  let a = createCpu(0, level, seed);
  let b = createCpu(1, level, seed + 1);
  while (state.round.number === 1 && state.round.phase !== 'matchEnd') {
    if (states.length >= CPU_TICKS) break;
    const first = cpuStep(a, state, config);
    const second = cpuStep(b, state, config);
    a = first.cpu;
    b = second.cpu;
    state = step(state, [first.input, second.input], config);
    states.push(state);
  }
  return { name: `cpu-${seed}`, fighters, config, start, states };
}

/**
 * The film of `take`, the animation of before (`legacy`) or of now, ticks `from` to `to`
 * (excluded) kept. The views' memory and the feedback's are played from the first tick, as the
 * fight scene plays them.
 */
export function shoot(take: Take, legacy: boolean, from = 0, to = take.states.length): Film {
  const { config, fighters } = take;
  const arts = [ARTS[fighters[0]], ARTS[fighters[1]]] as const;
  const mirror = fighters[0] === fighters[1];
  const colorways = ['main', mirror ? 'alt' : 'main'] as const;
  const memory = new FightMemory();
  const context: ShowContext = { options: legacy ? LEGACY_ANIM : ANIM_OPTIONS, memory };
  const events: FightEvent[] = [];
  const shown: Shown = { clip: 'idle', tick: 0, x: 0 };
  const ticks: FilmTick[] = [];
  let previous = take.start;
  let front: 0 | 1 = 0;
  let finish: KoFinish | null = null;
  take.states.forEach((state, at) => {
    detectEvents(previous, state, config, events);
    memory.note(state, events);
    previous = state;
    const blows: FilmBlow[] = [];
    let thud = false;
    for (const event of events) {
      if (event.type === 'ko') finish = event.finish;
      if (event.type === 'phase' && event.phase === 'intro') finish = null;
      if (event.type === 'fall') thud ||= landingOf(event, finish, legacy).thud;
      if (event.type === 'hit' || event.type === 'ko' || event.type === 'block') {
        const blocked = event.type === 'block';
        const heavy = !blocked && landsHeavy(event);
        blows.push({ x: toPx(event.x), y: toPx(event.y), by: event.by, heavy, blocked });
      }
    }
    const [a, b] = state.fighters;
    front = frontFighter(front, a, b);
    if (at < from || at >= to) return;
    const fighterOn = (player: 0 | 1): FilmFighter => {
      const art = arts[player];
      showFighter(state, player, config, art, shown, context);
      const clip = clipOf(art, shown.clip);
      return {
        clip: shown.clip,
        tick: shown.tick,
        sheet: clip.sheet,
        frame: clip.frames[clipFrameAt(clip, shown.tick)] ?? 0,
        effects: effectsOf(clip),
        x: toPx(shown.x),
        y: toPx(state.fighters[player].y),
        flip: state.fighters[player].facing < 0,
        shake: hitShakeOf(state, player, context, 'normal'),
      };
    };
    const projectiles: FilmProjectile[] = [];
    for (const projectile of state.projectiles) {
      const clip = arts[projectile.owner].projectiles?.[projectile.move];
      if (!clip) continue;
      const frame = clip.frames[clipFrameAt(clip, state.frame)] ?? 0;
      const { owner, x, facing } = projectile;
      projectiles.push({ owner, sheet: clip.sheet, frame, x: toPx(x), flip: facing < 0 });
    }
    ticks.push({
      frame: state.frame,
      phase: state.round.phase,
      hitstop: state.hitstop,
      cameraX: toPx(state.cameraX),
      front,
      fighters: [fighterOn(0), fighterOn(1)],
      projectiles,
      blows,
      thud,
    });
  });
  return {
    name: take.name,
    legacy,
    fighters,
    colorways,
    energies: [
      hitStyleOf(fighters[0], colorways[0]).energy,
      hitStyleOf(fighters[1], colorways[1]).energy,
    ],
    from,
    ticks,
  };
}

/** The repository's root: the scripts run from there, their paths are read from there. */
const ROOT = new URL('../../', import.meta.url);

/** A path given on the command line: absolute, or from the repository's root. */
export function fileUrl(path: string): URL {
  return path.startsWith('/') ? new URL(`file://${path}`) : new URL(path, ROOT);
}

/** The value after `--name` among `args`, if given. */
export function option(args: readonly string[], name: string): string | undefined {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
}

async function main(args: readonly string[]): Promise<void> {
  const source = args[0];
  if (!source || source.startsWith('--')) {
    throw new Error('Usage: npm run anim:film -- <replay.json | cpu:SEED> [--from N] [--to N]');
  }
  let take: Take;
  if (source.startsWith('cpu:')) {
    take = cpuTake(Number(source.slice(4)));
  } else {
    const path = source.includes('/') ? source : `tests/core/replays/${source}`;
    const replay = JSON.parse(await readFile(fileUrl(path), 'utf8')) as Replay;
    const name = path.slice(path.lastIndexOf('/') + 1).replace(/\.json$/, '');
    take = replayTake(name, replay, Number(option(args, 'then') ?? 0));
  }
  const from = Number(option(args, 'from') ?? 0);
  const to = Number(option(args, 'to') ?? take.states.length);
  const out = fileUrl(`${option(args, 'out') ?? 'tools/anim/out'}/`);
  await mkdir(out, { recursive: true });
  for (const legacy of [true, false]) {
    const film = shoot(take, legacy, from, to);
    const file = new URL(`${take.name}-${legacy ? 'avant' : 'apres'}.json`, out);
    await writeFile(file, JSON.stringify(film));
    console.log(`${file.pathname}: ${film.ticks.length} ticks`);
  }
}

if (import.meta.main) await main(process.argv.slice(2));
