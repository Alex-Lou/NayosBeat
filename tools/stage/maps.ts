/**
 * Every stage the code draws, in the order the game offers them (src/art/stages.ts): each in its
 * folder here, installed in src/art/<its name>/ by `npm run stages` (tools/sprites/stages.ts).
 */

import type { CodeMap } from './kit/stage.ts';
import { BAL } from './bal/index.ts';
import { CLUB } from './club/index.ts';
import { DOCK } from './dock/index.ts';
import { DOJO } from './dojo/index.ts';
import { DUNES } from './dunes/index.ts';
import { FORET } from './foret/index.ts';
import { GYM } from './gym/index.ts';
import { LUCIOLES } from './lucioles/index.ts';
import { MARCHE } from './marche/index.ts';
import { NEON } from './neon/index.ts';
import { PLAGE } from './plage/index.ts';
import { ROOFTOP } from './rooftop/index.ts';
import { RUE } from './rue/index.ts';
import { SAKURA } from './sakura/index.ts';
import { TEMPLE } from './temple/index.ts';

export const CODE_MAPS: readonly CodeMap[] = [
  RUE,
  GYM,
  DOCK,
  ROOFTOP,
  TEMPLE,
  CLUB,
  BAL,
  PLAGE,
  MARCHE,
  NEON,
  FORET,
  DUNES,
  LUCIOLES,
  DOJO,
  SAKURA,
];
