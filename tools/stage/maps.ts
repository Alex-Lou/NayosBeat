/**
 * Every stage the code draws, in the order the game offers them (src/art/stages.ts): each in its
 * folder here, installed in src/art/<its name>/ by `npm run stages` (tools/sprites/stages.ts).
 */

import type { CodeMap } from './kit/stage.ts';
import { RUE } from './rue/index.ts';

export const CODE_MAPS: readonly CodeMap[] = [RUE];
