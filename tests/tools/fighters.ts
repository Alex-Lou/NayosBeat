import { NAYO as NAYO_ART } from '../../src/art/nayo';
import { RIFF as RIFF_ART } from '../../src/art/riff';
import type { FighterArt } from '../../src/art/types';
import type { FighterTemplate } from '../../src/core/config';
import { NAYO as NAYO_TEMPLATE } from '../../src/data/fighters/nayo';
import { RIFF as RIFF_TEMPLATE } from '../../src/data/fighters/riff';
import type { Fighter } from '../../tools/sprites/fighter';
import { NAYO } from '../../tools/sprites/nayo/index';
import type { PixelCanvas } from '../../tools/sprites/raster';
import { RIFF } from '../../tools/sprites/riff/index';
import { drawStrip, drawStripEffects } from '../../tools/sprites/sheet';

/**
 * A fighter as the art tests see it: its gameplay (the boxes, the moves), its art as the game
 * plays it (the clips, the cropped cells), and its generator, which draws its strips in memory
 * (the same pixels as the generated PNGs).
 */
export interface DrawnFighter {
  readonly name: string;
  readonly template: FighterTemplate;
  readonly art: FighterArt;
  readonly generator: Fighter;
}

export const DRAWN_NAYO: DrawnFighter = {
  name: 'Nayo',
  template: NAYO_TEMPLATE,
  art: NAYO_ART,
  generator: NAYO,
};
export const DRAWN_RIFF: DrawnFighter = {
  name: 'Riff',
  template: RIFF_TEMPLATE,
  art: RIFF_ART,
  generator: RIFF,
};
export const DRAWN_FIGHTERS: readonly DrawnFighter[] = [DRAWN_NAYO, DRAWN_RIFF];

const strips = new Map<string, PixelCanvas>();
const effects = new Map<string, PixelCanvas | undefined>();

/** One of the fighter's strips, drawn once per test file. */
export function stripOf(fighter: DrawnFighter, sheet: string): PixelCanvas {
  const key = `${fighter.name}/${sheet}`;
  const known = strips.get(key);
  if (known) return known;
  const canvas = drawStrip(fighter.generator, sheet);
  strips.set(key, canvas);
  return canvas;
}

/** The front effects of one of the fighter's strips, if it has some. */
export function effectsOf(fighter: DrawnFighter, sheet: string): PixelCanvas | undefined {
  const key = `${fighter.name}/${sheet}`;
  if (effects.has(key)) return effects.get(key);
  const canvas = drawStripEffects(fighter.generator, sheet);
  effects.set(key, canvas);
  return canvas;
}
