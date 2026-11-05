import type Phaser from 'phaser';
import { STAGE_MAPS, type StageMap } from '../art/stages';
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

/** The hand-drawn day stages: their bright colors are outside the flash envelope. */
const DAY_STAGES: ReadonlySet<string> = new Set(['sakura', 'foret', 'jungle', 'chinatown']);

/**
 * The large colors of the night stages the fights may show, in every atmosphere they may take
 * (each once, the first stage's base first): the drawn ones', else the grey box's. The flash veils
 * are set on them, and the flash measures taken over the darkest (docs/flashs.md §3), whatever the
 * fight draws. Sakura, Dancing Forest, Jungle and Chinatown are the day stages: their bright
 * colors are outside the envelope, and the effects stay measured over the midnight stages
 * (docs/art/decor-sakura.md §3, docs/art/decor-forest-dance.md §3, docs/art/decor-jungle.md §3,
 * docs/art/decor-chinatown.md §5).
 */
export const FIGHT_STAGE_COLORS: readonly number[] =
  STAGE_MAPS.length > 0
    ? [
        ...new Set(
          STAGE_MAPS.filter(({ name }) => !DAY_STAGES.has(name)).flatMap(({ variants }) =>
            variants.flatMap(({ art }) => art.colors),
          ),
        ),
      ]
    : GREYBOX_COLORS;

/** Where a fight is held, as chosen: a place (by name) and an atmosphere, or either at random. */
export interface StageChoice {
  /** A place's name (StageMap), or 'random'. */
  readonly map: string;
  readonly atmosphere: Atmosphere | 'random';
}

export const RANDOM_STAGE: StageChoice = { map: 'random', atmosphere: 'random' };

/** One of `items` at random (`random`, from 0 to 1). */
function pickOf<T>(items: readonly T[], random: () => number): T | undefined {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

/**
 * The stage a fight shows (docs/art/decor-rue.md §13, §14): `chosen`'s place, else one drawn at
 * random (`random`, from 0 to 1) among those offering `chosen`'s atmosphere, or among all; in
 * `chosen`'s atmosphere if the place has it, else in one it offers drawn at random. None: the grey
 * box. Render only: the core never knows it (D17).
 */
export function stageVariantFor(
  chosen: StageChoice,
  maps: readonly StageMap[] = STAGE_MAPS,
  random: () => number = Math.random,
): StageVariant | undefined {
  const wanted = chosen.atmosphere === 'random' ? undefined : atmosphereName(chosen.atmosphere);
  const offers = (map: StageMap) =>
    map.variants.find(({ atmosphere }) => atmosphereName(atmosphere) === wanted);
  const named = maps.find(({ name }) => name === chosen.map);
  const offering = maps.filter((map) => offers(map) !== undefined);
  const map = named ?? pickOf(offering.length > 0 ? offering : maps, random);
  if (!map) return undefined;
  return offers(map) ?? pickOf(map.variants, random);
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
  return `stage/${variant.stage}/${atmosphereName(variant.atmosphere)}/`;
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
 * the other variants' from it: a fight holds one stage in one atmosphere in video memory, never two
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
  const depths = stageDepths();
  const props = new StagePropsView(propsKeyOf(variant));
  for (const layer of art.layers) {
    scene.add
      .image(0, layer.y, stageKey(variant, layer.name))
      .setOrigin(0, 0)
      .setScale(1 / STAGE_SCALE)
      .setScrollFactor(layer.scroll, 1)
      .setDepth(depths());
    if (art.props) props.add(scene, layer, art.props.props, depths);
  }
  return props;
}

/** Depth a stage image is from the next: far apart enough to stay apart, close enough to stay under the rain. */
const STAGE_DEPTH_STEP = 1e-4;

/**
 * The depths of a stage's images, one each, in the order they are drawn (far, its props, middle,
 * its props, floor): never two the same. Phaser sorts by depth, keeping the order of equal ones as
 * it finds them: had they all the same, an image the live lights raise over their glows and set
 * back (light-show.ts `showEmitters`) would come back over the others — the far layer over the
 * middle one and the floor, hiding them.
 */
export function stageDepths(): () => number {
  let next = 0;
  return () => {
    const depth = DEPTH.stage + next * STAGE_DEPTH_STEP;
    next += 1;
    if (depth >= DEPTH.rain) throw new Error(`The stage has more images than its depths: ${next}`);
    return depth;
  };
}
