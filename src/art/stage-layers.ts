/**
 * The stage drawn behind the fights, the Warehouse (docs/art/univers.md): three layers that scroll
 * the slower the farther they are (parallax), drawn by hand in Aseprite (docs/art/aseprite.md).
 * Without them, the fights keep the grey box. No engine or bundler import here: the sprite tools
 * read it too.
 */

/** Its folder: art-src/<name>/ (the drawings), src/art/<name>/ (the game's images). */
export const STAGE_NAME = 'entrepot';

export interface StageLayerSpec {
  /** World pixels: the stage is drawn at the world's resolution, half the fighters'. */
  readonly width: number;
  readonly height: number;
  /** World y of its top edge. */
  readonly y: number;
  /** Share of the camera's horizontal moves it follows: the farther, the less. */
  readonly scroll: number;
  /** Whether the stage needs it: without it, the fights keep the grey box. */
  readonly required: boolean;
  /** Every pixel opaque: nothing is behind it. */
  readonly opaque: boolean;
}

/**
 * Back to front. Each is as wide as the camera sees of it from one end of the 960 px stage to the
 * other: 480 + 480 × its scroll. The floor's top edge is the ground line, where the feet stand.
 */
export const STAGE_LAYERS = {
  far: { width: 600, height: 270, y: 0, scroll: 0.25, required: true, opaque: true },
  mid: { width: 720, height: 270, y: 0, scroll: 0.5, required: false, opaque: false },
  floor: { width: 960, height: 40, y: 230, scroll: 1, required: true, opaque: false },
} as const satisfies Record<string, StageLayerSpec>;

export type StageLayer = keyof typeof STAGE_LAYERS;

export const STAGE_LAYER_NAMES = Object.keys(STAGE_LAYERS) as StageLayer[];

/** A layer the game shows: where and how, and its image's URL. */
export interface StageArtLayer extends StageLayerSpec {
  readonly name: StageLayer;
  readonly url: string;
}

export interface StageArt {
  /** Back to front. */
  readonly layers: readonly StageArtLayer[];
  /** Its large colors, the most covering first: the flash veils are set on them (docs/flashs.md §3). */
  readonly colors: readonly number[];
}

/**
 * The stage drawn, from the images found in its folder (`./<layer>.png`, by URL) and its large
 * colors (`npm run sprites` writes both); undefined while a layer it needs is missing: the grey box.
 */
export function stageArtOf(
  files: Readonly<Record<string, string>>,
  colors: readonly number[],
): StageArt | undefined {
  const layers = STAGE_LAYER_NAMES.flatMap((name) => {
    const url = files[`./${name}.png`];
    return url === undefined ? [] : [{ ...STAGE_LAYERS[name], name, url }];
  });
  const drawn = new Set(layers.map(({ name }) => name));
  if (STAGE_LAYER_NAMES.some((name) => STAGE_LAYERS[name].required && !drawn.has(name))) {
    return undefined;
  }
  if (colors.length === 0) throw new Error('The stage drawn has no large colors: npm run sprites');
  return { layers, colors };
}
