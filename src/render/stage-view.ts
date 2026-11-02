import type Phaser from 'phaser';
import { STAGE_VARIANTS } from '../art/rue';
import {
  atmosphereName,
  STAGE_SCALE,
  type Atmosphere,
  type StageLayer,
  type StageVariant,
} from '../art/stage-layers';
import { DEPTH } from './depth';
import { GREYBOX_COLORS } from './greybox-stage';
import { relativeLuminance } from './luminance';
import { StagePropsView } from './stage-props';

/**
 * The large colors of the stage the fights show, in every atmosphere it may take (each once, the
 * base's first): the drawn one's, else the grey box's. The flash veils are set on them, and the
 * flash measures taken over the darkest (docs/flashs.md §3), whatever the fight draws.
 */
export const FIGHT_STAGE_COLORS: readonly number[] =
  STAGE_VARIANTS.length > 0
    ? [...new Set(STAGE_VARIANTS.flatMap(({ art }) => art.colors))]
    : GREYBOX_COLORS;

/**
 * The stage a fight shows (docs/art/decor-rue.md §13): in `chosen`'s atmosphere if the stage has
 * it, else drawn at random (`random`, from 0 to 1) among those it offers; none, the grey box.
 * Render only: the core never knows it (D17).
 */
export function stageVariantFor(
  chosen: Atmosphere | 'random',
  variants: readonly StageVariant[] = STAGE_VARIANTS,
  random: () => number = Math.random,
): StageVariant | undefined {
  if (chosen !== 'random') {
    const wanted = atmosphereName(chosen);
    const found = variants.find(({ atmosphere }) => atmosphereName(atmosphere) === wanted);
    if (found) return found;
  }
  return variants[Math.floor(random() * variants.length)] ?? variants[0];
}

/** The darkest of `colors` (WCAG relative luminance): what a flash lights the most. */
export function darkestOf(colors: readonly number[]): number {
  const [first, ...rest] = colors;
  if (first === undefined) throw new Error('No color');
  return rest.reduce(
    (darkest, color) => (relativeLuminance(color) < relativeLuminance(darkest) ? color : darkest),
    first,
  );
}

/** The texture cache's keys of a stage variant: every one under this prefix. */
function prefixOf(variant: StageVariant): string {
  return `stage/${atmosphereName(variant.atmosphere)}/`;
}

function stageKey(variant: StageVariant, layer: StageLayer): string {
  return `${prefixOf(variant)}${layer}`;
}

/**
 * The stage's images among a scene's `objects` (what drawStage added): its layers and its props,
 * which the moves' live lights glow over and a super dims (light-show.ts).
 */
export function stageImagesOf(objects: readonly Phaser.GameObjects.GameObject[]): {
  readonly layers: Phaser.GameObjects.Image[];
  readonly props: Phaser.GameObjects.Image[];
} {
  const all = objects.filter(
    (object): object is Phaser.GameObjects.Image =>
      'texture' in object && (object as Phaser.GameObjects.Image).texture.key.startsWith('stage/'),
  );
  const isProps = ({ texture }: Phaser.GameObjects.Image) => texture.key.endsWith('/props');
  return { layers: all.filter((image) => !isProps(image)), props: all.filter(isProps) };
}

/** Its props' sheet in the texture cache: their frames are added to it by name, once. */
export function propsKeyOf(variant: StageVariant): string {
  return `${prefixOf(variant)}props`;
}

/**
 * Loads `variant`'s layers and props' sheet that are not already in the texture cache, and drops
 * the other variants' from it: a fight holds one atmosphere in video memory, never two
 * (docs/art/decor-rue.md §2). Call it before the fight's stage is drawn, the last one's gone.
 */
export function loadStage(scene: Phaser.Scene, variant: StageVariant): void {
  const prefix = prefixOf(variant);
  for (const key of scene.textures.getTextureKeys()) {
    if (key.startsWith('stage/') && !key.startsWith(prefix)) scene.textures.remove(key);
  }
  const { art } = variant;
  for (const { name, url } of art.layers) {
    const key = stageKey(variant, name);
    if (!scene.textures.exists(key)) scene.load.image(key, url);
  }
  const props = propsKeyOf(variant);
  if (art.props && !scene.textures.exists(props)) scene.load.image(props, art.props.url);
}

/**
 * Draws the stage behind everything, once: each layer follows its share of the camera's
 * horizontal moves (the farther, the slower: parallax) and all of its vertical ones, so the floor
 * keeps the ground line under the fighters at any close-up. Its images are STAGE_SCALE times finer
 * than the world, as the fighters'. The camera's background is the stage's most covering color,
 * for the sliver a shake may show past an edge. Returns its props, laid over their layers, to play
 * and to free with the fight.
 */
export function drawStage(scene: Phaser.Scene, variant: StageVariant): StagePropsView {
  const { art } = variant;
  const [background] = art.colors;
  if (background !== undefined) scene.cameras.main.setBackgroundColor(background);
  const props = new StagePropsView(propsKeyOf(variant));
  for (const layer of art.layers) {
    scene.add
      .image(0, layer.y, stageKey(variant, layer.name))
      .setOrigin(0, 0)
      .setScale(1 / STAGE_SCALE)
      .setScrollFactor(layer.scroll, 1)
      .setDepth(DEPTH.stage);
    if (art.props) props.add(scene, layer, art.props.props);
  }
  return props;
}
