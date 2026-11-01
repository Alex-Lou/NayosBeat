/**
 * The fighters the sprite tools know, in one list (docs/art/perso-3.md §6.1, PR 0): what draws
 * each one (its poses, tools/sprites/<name>/), and the game it is drawn for (its moves,
 * src/data/fighters/, and its clips, src/art/<name>/clips.ts). The generator, the templates, the
 * previews, the anatomy report, the hurtbox measure and the tools' tests all read it: a fighter
 * added here is drawn, measured and tested, one left out is none of these. The first is the
 * default one of the tools that work on one fighter (its previews at the root).
 */

import { NAYO_CLIPS } from '../../src/art/nayo/clips.ts';
import { RIFF_CLIPS } from '../../src/art/riff/clips.ts';
import { SAPHIR_CLIPS } from '../../src/art/saphir/clips.ts';
import type { Cell } from '../../src/art/types.ts';
import type { FighterTemplate } from '../../src/core/config.ts';
import { NAYO as NAYO_TEMPLATE } from '../../src/data/fighters/nayo.ts';
import { RIFF as RIFF_TEMPLATE } from '../../src/data/fighters/riff.ts';
import { SAPHIR as SAPHIR_TEMPLATE } from '../../src/data/fighters/saphir.ts';
import type { Clips } from './clips.ts';
import type { Fighter } from './fighter.ts';
import { NAYO } from './nayo/index.ts';
import { RIFF } from './riff/index.ts';
import { SAPHIR } from './saphir/index.ts';

export interface ToolFighter {
  /** Its generator: body, poses, palettes, strips (its `name` is its folder and its id). */
  readonly fighter: Fighter;
  /** Its moves: the boxes its strips are measured against. */
  readonly template: FighterTemplate;
  /** Which frames of its strips show when, tick by tick. */
  readonly clips: Clips;
}

export const TOOL_FIGHTERS: readonly ToolFighter[] = [
  { fighter: NAYO, template: NAYO_TEMPLATE, clips: NAYO_CLIPS },
  { fighter: RIFF, template: RIFF_TEMPLATE, clips: RIFF_CLIPS },
  { fighter: SAPHIR, template: SAPHIR_TEMPLATE, clips: SAPHIR_CLIPS },
];

/** Every fighter's generator, in the list's order. */
export const FIGHTERS: readonly Fighter[] = TOOL_FIGHTERS.map(({ fighter }) => fighter);

/** The fighter named `name` (its folder), if the tools know it. */
export function toolFighterNamed(name: string): ToolFighter | undefined {
  return TOOL_FIGHTERS.find(({ fighter }) => fighter.name === name);
}

/**
 * A fighter's cropped cells as `npm run sprites` wrote them (src/art/<name>/cells.ts,
 * `<NAME>_CELLS`), read when asked: a fighter is in the list before its first strips exist.
 */
export async function cellsOf(name: string): Promise<Readonly<Record<string, Cell>>> {
  const module = (await import(`../../src/art/${name}/cells.ts`)) as Readonly<
    Record<string, Readonly<Record<string, Cell>> | undefined>
  >;
  const cells = module[`${name.toUpperCase()}_CELLS`];
  if (!cells) throw new Error(`src/art/${name}/cells.ts has no ${name.toUpperCase()}_CELLS`);
  return cells;
}
