/**
 * The stage drawn behind the fights, the street in front of the Warehouse (docs/art/decor-rue.md):
 * three layers that scroll the slower the farther they are (parallax), drawn by the code
 * (tools/stage/rue/), each of which may be drawn by hand in Aseprite instead (docs/art/aseprite.md).
 * Without them, the fights keep the grey box. No engine or bundler import here: the sprite tools
 * read it too.
 */

import { ART_SCALE } from './types';

/** Its folder: art-src/<name>/ (the drawings), src/art/<name>/ (the game's images). */
export const STAGE_NAME = 'rue';

/**
 * Image pixels per world pixel: the stage is drawn as finely as the fighters (ART_SCALE), so the
 * screen shows one grain of pixel (docs/art/decor-rue.md §2).
 */
export const STAGE_SCALE = ART_SCALE;

export interface StageLayerSpec {
  /** World pixels; its image is STAGE_SCALE times larger each way. */
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

/** A frame of a prop: where it goes on its layer, where it is in the props' sheet (image pixels). */
export interface StagePropFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly sheetX: number;
  readonly sheetY: number;
}

/**
 * A small animation laid on a layer (docs/art/decor-rue.md §6): each frame cut to what changes
 * from the still layer (null: nothing changes, the layer shows it), played in a loop, each entry
 * of its timeline a frame for so many steps of 1/60 s. Played by the view, never by the core
 * (D17), frame by frame with nothing in between (D23).
 */
export interface StageProp {
  readonly name: string;
  readonly layer: StageLayer;
  readonly frames: readonly (StagePropFrame | null)[];
  readonly timeline: readonly (readonly [frame: number, steps: number])[];
}

/** The props of a stage and the sheet their frames are packed in. */
export interface StageProps {
  readonly url: string;
  readonly props: readonly StageProp[];
}

export interface StageArt {
  /** Back to front. */
  readonly layers: readonly StageArtLayer[];
  /** Its large colors, the most covering first: the flash veils are set on them (docs/flashs.md §3). */
  readonly colors: readonly number[];
  /** Its animations, if it has any. */
  readonly props: StageProps | undefined;
}

/** Throws unless every frame a prop's timeline names exists and lasts at least one step. */
function checkProp(prop: StageProp): void {
  if (prop.timeline.length === 0) throw new Error(`Stage prop ${prop.name}: an empty timeline`);
  for (const [frame, steps] of prop.timeline) {
    if (!Number.isInteger(frame) || frame < 0 || frame >= prop.frames.length) {
      throw new Error(`Stage prop ${prop.name}: no frame ${frame} (${prop.frames.length} frames)`);
    }
    if (!Number.isInteger(steps) || steps < 1) {
      throw new Error(`Stage prop ${prop.name}: frame ${frame} lasts ${steps} steps (1 at least)`);
    }
  }
}

/**
 * The stage drawn, from the images found in its folder (`./<layer>.png`, `./props.png`, by URL),
 * its large colors and its props (`npm run sprites` writes them all); undefined while a layer it
 * needs is missing: the grey box.
 */
export function stageArtOf(
  files: Readonly<Record<string, string>>,
  colors: readonly number[],
  props: readonly StageProp[] = [],
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
  const shown = props.filter(({ layer }) => drawn.has(layer));
  shown.forEach(checkProp);
  const sheet = files['./props.png'];
  if (shown.length > 0 && sheet === undefined) {
    throw new Error('The stage has props but no props.png: npm run sprites');
  }
  return {
    layers,
    colors,
    props: shown.length > 0 && sheet !== undefined ? { url: sheet, props: shown } : undefined,
  };
}
