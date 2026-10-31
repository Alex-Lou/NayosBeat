import type Phaser from 'phaser';
import { STAGE_ART } from '../art/entrepot';
import type { StageArt, StageLayer } from '../art/stage-layers';
import { DEPTH } from './depth';
import { GREYBOX_COLORS } from './greybox-stage';
import { relativeLuminance } from './luminance';

/**
 * The large colors of the stage the fights show: the drawn one's, else the grey box's. The flash
 * veils are set on them, and the flash measures taken over the darkest (docs/flashs.md §3).
 */
export const FIGHT_STAGE_COLORS: readonly number[] = STAGE_ART?.colors ?? GREYBOX_COLORS;

/** The darkest of `colors` (WCAG relative luminance): what a flash lights the most. */
export function darkestOf(colors: readonly number[]): number {
  const [first, ...rest] = colors;
  if (first === undefined) throw new Error('No color');
  return rest.reduce(
    (darkest, color) => (relativeLuminance(color) < relativeLuminance(darkest) ? color : darkest),
    first,
  );
}

function stageKey(layer: StageLayer): string {
  return `stage/${layer}`;
}

/** Loads the stage's layers that are not already in the texture cache. */
export function loadStage(scene: Phaser.Scene, art: StageArt): void {
  for (const { name, url } of art.layers) {
    if (!scene.textures.exists(stageKey(name))) scene.load.image(stageKey(name), url);
  }
}

/**
 * Draws the stage behind everything, once: each layer follows its share of the camera's
 * horizontal moves (the farther, the slower: parallax) and all of its vertical ones, so the floor
 * keeps the ground line under the fighters at any close-up. The camera's background is the
 * stage's most covering color, for the sliver a shake may show past an edge.
 */
export function drawStage(scene: Phaser.Scene, art: StageArt): void {
  const [background] = art.colors;
  if (background !== undefined) scene.cameras.main.setBackgroundColor(background);
  for (const { name, y, scroll } of art.layers) {
    scene.add
      .image(0, y, stageKey(name))
      .setOrigin(0, 0)
      .setScrollFactor(scroll, 1)
      .setDepth(DEPTH.stage);
  }
}
