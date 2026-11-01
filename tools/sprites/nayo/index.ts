/** Nayo for the shared sprite pipeline (see ../fighter.ts). */

import { NAYO_CLIPS } from '../../../src/art/nayo/clips.ts';
import { NAYO_SHEETS } from '../../../src/art/nayo/sheets.ts';
import { NAYO as NAYO_TEMPLATE } from '../../../src/data/fighters/nayo.ts';
import { namedEffects, timingOf } from '../clips.ts';
import type { Fighter } from '../fighter.ts';
import { smoothFighter } from '../inbetweens.ts';
import { BODY, type Pose } from '../skeleton.ts';
import { drawNayo } from './look.ts';
import { EFFECTS, paletteOf } from './palette.ts';
import { NAYO_POSES, NAYO_PROJECTILE, NAYO_PROJECTILE_BOOST } from './poses/index.ts';
import { NAYO_SMOOTHING } from './smoothing.ts';

const SHEETS: Readonly<Record<string, { frames: number }>> = NAYO_SHEETS;
const keys = (sheet: string): readonly Pose[] | undefined =>
  (NAYO_POSES as Readonly<Record<string, readonly Pose[]>>)[sheet];

/** His strips planned once: the keys, then the in-betweens of the strips his table smooths. */
const SMOOTHED = smoothFighter({
  name: 'nayo',
  sheets: NAYO_SHEETS,
  keys,
  body: BODY,
  clips: NAYO_CLIPS,
  template: NAYO_TEMPLATE,
  table: NAYO_SMOOTHING,
});

export const NAYO: Fighter = {
  name: 'nayo',
  sheets: SMOOTHED.sheets,
  body: BODY,
  keys,
  poses: (sheet) => {
    const poses = keys(sheet);
    const plan = SMOOTHED.plans.get(sheet);
    return poses && plan ? [...poses, ...plan.inbetweens.map(({ pose }) => pose)] : poses;
  },
  inbetweens: (sheet) => SMOOTHED.plans.get(sheet)?.inbetweens ?? [],
  played: SMOOTHED.played,
  // The Vinyle in flight, and the platine one.
  effectsOnly: (sheet) =>
    sheet === 'projectile'
      ? NAYO_PROJECTILE
      : sheet === 'projectileBoost'
        ? NAYO_PROJECTILE_BOOST
        : undefined,
  // Ticks per key, from the clips that play each strip.
  timing: (sheet) => timingOf(NAYO_CLIPS, sheet, SHEETS[sheet]?.frames ?? 0),
  draw: drawNayo,
  fx: EFFECTS,
  platine: namedEffects(NAYO_CLIPS),
  paletteOf,
};
