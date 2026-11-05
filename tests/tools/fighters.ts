import { FELINE as FELINE_ART } from '../../src/art/feline';
import { KODA as KODA_ART } from '../../src/art/koda';
import { NAYO as NAYO_ART } from '../../src/art/nayo';
import { RIFF as RIFF_ART } from '../../src/art/riff';
import { SAPHIR as SAPHIR_ART } from '../../src/art/saphir';
import { WATT as WATT_ART } from '../../src/art/watt';
import type { FighterArt } from '../../src/art/types';
import type { FighterTemplate } from '../../src/core/config';
import type { MoveId } from '../../src/core/move-data';
import { FELINE as FELINE_TEMPLATE } from '../../src/data/fighters/feline';
import { KODA as KODA_TEMPLATE } from '../../src/data/fighters/koda';
import { NAYO as NAYO_TEMPLATE } from '../../src/data/fighters/nayo';
import { RIFF as RIFF_TEMPLATE } from '../../src/data/fighters/riff';
import { SAPHIR as SAPHIR_TEMPLATE } from '../../src/data/fighters/saphir';
import { WATT as WATT_TEMPLATE } from '../../src/data/fighters/watt';
import type { Fighter } from '../../tools/sprites/fighter';
import { FELINE } from '../../tools/sprites/feline/index';
import { KODA } from '../../tools/sprites/koda/index';
import { NAYO } from '../../tools/sprites/nayo/index';
import type { PixelCanvas } from '../../tools/sprites/raster';
import { RIFF } from '../../tools/sprites/riff/index';
import { SAPHIR } from '../../tools/sprites/saphir/index';
import { WATT } from '../../tools/sprites/watt/index';
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
export const DRAWN_SAPHIR: DrawnFighter = {
  name: 'Saphir',
  template: SAPHIR_TEMPLATE,
  art: SAPHIR_ART,
  generator: SAPHIR,
};
export const DRAWN_KODA: DrawnFighter = {
  name: 'Koda',
  template: KODA_TEMPLATE,
  art: KODA_ART,
  generator: KODA,
};
export const DRAWN_FELINE: DrawnFighter = {
  name: 'Feline',
  template: FELINE_TEMPLATE,
  art: FELINE_ART,
  generator: FELINE,
};
export const DRAWN_FIGHTERS: readonly DrawnFighter[] = [
  DRAWN_NAYO,
  DRAWN_RIFF,
  DRAWN_SAPHIR,
  DRAWN_KODA,
  DRAWN_FELINE,
];
/**
 * Watt, drawn (porte 3) but not yet among DRAWN_FIGHTERS: his hurtboxes are still the mock-up's
 * until the owner settles what measuring them on his drawing changes (docs/watt.md §17). His
 * holds are checked against the cast's all the same (hold-pairs.test.ts).
 */
export const DRAWN_WATT: DrawnFighter = {
  name: 'Watt',
  template: WATT_TEMPLATE,
  art: WATT_ART,
  generator: WATT,
};

/** The name of a move's reach check, the same in every strip test (`-t <move>` picks it). */
export function reachCheck(id: MoveId): string {
  return `${id}: the active frames reach the hitbox, no farther`;
}

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
