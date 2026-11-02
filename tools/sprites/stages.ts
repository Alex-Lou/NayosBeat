/**
 * `npm run stages`: writes every stage (tools/stage/maps.ts) in src/art/<stage>/, and nothing
 * else: no fighter is drawn again. The street's layers drawn by hand (art-src/rue/) are checked
 * first, and take the place of the code's.
 */

import { CODE_MAPS } from '../stage/maps.ts';
import { reportingDrawingProblems } from './drawn.ts';
import { loadStageDrawn, writeStages } from './stage-drawn.ts';

async function main(): Promise<void> {
  await writeStages(CODE_MAPS, await loadStageDrawn());
}

await reportingDrawingProblems(main);
