import type Phaser from 'phaser';
import { STAGE_ART } from '../art/rue';
import { STAGE_SCALE, type StageArt, type StageLayer } from '../art/stage-layers';
import { DEPTH } from './depth';
import { GREYBOX_COLORS } from './greybox-stage';
import { relativeLuminance } from './luminance';
import { PROPS_KEY, StagePropsView } from './stage-props';

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

/** Loads the stage's layers and its props' sheet that are not already in the texture cache. */
export function loadStage(scene: Phaser.Scene, art: StageArt): void {
  for (const { name, url } of art.layers) {
    if (!scene.textures.exists(stageKey(name))) scene.load.image(stageKey(name), url);
  }
  if (art.props && !scene.textures.exists(PROPS_KEY)) scene.load.image(PROPS_KEY, art.props.url);
}

/**
 * Draws the stage behind everything, once: each layer follows its share of the camera's
 * horizontal moves (the farther, the slower: parallax) and all of its vertical ones, so the floor
 * keeps the ground line under the fighters at any close-up. Its images are STAGE_SCALE times finer
 * than the world, as the fighters'. The camera's background is the stage's most covering color,
 * for the sliver a shake may show past an edge. Returns its props, laid over their layers, to play
 * and to free with the fight.
 */
export function drawStage(scene: Phaser.Scene, art: StageArt): StagePropsView {
  const [background] = art.colors;
  if (background !== undefined) scene.cameras.main.setBackgroundColor(background);
  const props = new StagePropsView();
  for (const layer of art.layers) {
    scene.add
      .image(0, layer.y, stageKey(layer.name))
      .setOrigin(0, 0)
      .setScale(1 / STAGE_SCALE)
      .setScrollFactor(layer.scroll, 1)
      .setDepth(DEPTH.stage);
    if (art.props) props.add(scene, layer, art.props.props);
  }
  return props;
}
