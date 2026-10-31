/**
 * The template the Aseprite extension (tools/aseprite/) builds a drawing's document from: its
 * cells, frames and durations, its palette, tags for the loop and the active frames, and its
 * layers with their first pixels.
 *
 * A fighter's strip draws in the fighter's palette slots (both colorways, then the guides'
 * colors). The layers it exports (the body, the front effects) start from the strip as the game
 * has it (drawn, or the code's); the guides show the ground, the anchor and the boxes of the frame
 * data, frame by frame, from the same functions the preview and the tests use. The title's vinyl
 * and the icons' master (ui-drawn.ts) have a free palette: the one given is only where they start.
 *
 * Everything the drawing is held to is computed here, so the extension only paints and copies
 * pixels.
 */

import { STAGE_LAYERS, STAGE_NAME, type StageLayer } from '../../src/art/stage-layers.ts';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types.ts';
import type { Box, FighterTemplate } from '../../src/core/config.ts';
import { toPx } from '../../src/core/constants.ts';
import { MOVE_IDS } from '../../src/core/move-data.ts';
import { cellBoxOf, type WorldBox } from './cell.ts';
import { strikeOf, type Clips } from './clips.ts';
import {
  platinePixels,
  PORTRAIT,
  PORTRAIT_SIZE,
  portraitRules,
  rulesOf,
  stripOf,
  stripPixels,
  type Drawn,
  type DrawnRules,
  type StripPixels,
} from './drawn.ts';
import type { Fighter } from './fighter.ts';
import { isAirborne, moveHurtboxesAt, POSTURE_CLIPS, type Posture } from './measure.ts';
import type { IndexedImage, Rgba } from './png.ts';
import { solve } from './skeleton.ts';
import { stageRulesOf, stageStart } from './stage-drawn.ts';
import { UI_ARTS, UI_FOLDER, uiRulesOf, uiStart, type UiArtName } from './ui-drawn.ts';

export const TEMPLATE_FORMAT = 'nayosbeat-template';
/**
 * 2: the free palettes (`palette.free`, no `palette.alt`), `folder`, no `ticks`. 3: cells of any
 * size (`width`, `height` in place of `cell`), in the rules too, with their `transparency`.
 */
export const TEMPLATE_VERSION = 3;

const LOOP_TAG = '#4a8cffff';
const ACTIVE_TAG = '#ff3b3bff';

/** The guides' colors, after the fighter's slots in the palette (never exported). */
export const GUIDE_COLORS = {
  ground: '#ffb020ff',
  pushbox: '#4a8cffff',
  hurtbox: '#3bd16fff',
  hitbox: '#ff3b3bff',
} as const;

type GuideColor = keyof typeof GUIDE_COLORS;
const GUIDE_ORDER = Object.keys(GUIDE_COLORS) as GuideColor[];

export interface TemplateLayer {
  readonly name: string;
  /** Where the extension exports it, from art-src/<folder>/; none for a guide. */
  readonly file?: string;
  /** What the exported image is held to (the same checks as `npm run sprites`). */
  readonly rules?: DrawnRules;
  readonly locked: boolean;
  /** 0 to 255. */
  readonly opacity: number;
  /** Its first pixels, cell by cell: runs of [count, slot], row by row over the cell. */
  readonly frames: readonly (readonly number[])[];
}

export interface TemplateTag {
  readonly name: string;
  /** First and last frame, from 0. */
  readonly from: number;
  readonly to: number;
  readonly color: string;
}

export interface Template {
  readonly format: typeof TEMPLATE_FORMAT;
  readonly version: typeof TEMPLATE_VERSION;
  /** Where its files go, in art-src/: the fighter's folder, UI_FOLDER, or the stage's. */
  readonly folder: string;
  /**
   * The strip, the Remix effects (then `strip` is their special's), the portrait, the UI image or
   * the stage layer.
   */
  readonly name: string;
  readonly strip: string;
  /** A cell's size, in pixels: the document's. */
  readonly width: number;
  readonly height: number;
  readonly frames: number;
  /** Seconds each frame shows: a fighter's are its ticks in the game. */
  readonly durations: readonly number[];
  /**
   * `#rrggbbaa`. A fighter's: its slots in order, then the guides' colors, in both colorways. A
   * free one (`free`): where the drawing starts, the export writes the drawing's own.
   */
  readonly palette: {
    readonly main: readonly string[];
    readonly alt?: readonly string[];
    readonly free: boolean;
  };
  readonly tags: readonly TemplateTag[];
  /** Bottom to top. */
  readonly layers: readonly TemplateLayer[];
}

/** Ticks per second of the game. */
const TICKS_PER_SECOND = 60;

/**
 * The template of strip (or Remix effects) `name` of `fighter`, its layers starting from what the
 * game has (`drawn`, see drawn.ts, else the code's).
 */
export function templateOf(
  fighter: Fighter,
  frameData: { readonly template: FighterTemplate; readonly clips: Clips },
  name: string,
  drawn: ReadonlyMap<string, Drawn>,
): Template {
  const strip = stripOf(fighter, name);
  const spec = strip === undefined ? undefined : fighter.sheets[strip];
  if (strip === undefined || !spec) throw new Error(`${fighter.name} has no strip ${name}`);
  const { frames } = spec;
  const { template, clips } = frameData;
  const { ticks, loops } = fighter.timing(strip);
  const slots = fighter.paletteOf('main').length;
  const exported = (layer: string, file: string, kind: 'body' | 'fx', pixels?: StripPixels) => ({
    name: layer,
    file,
    rules: rulesOf(fighter, name, kind),
    locked: false,
    opacity: 255,
    frames: runsOf(pixels, frames),
  });
  const layers: TemplateLayer[] = [];
  if (strip === name) {
    const { body, fx } = stripPixels(fighter, strip, drawn);
    if (fighter.effectsOnly?.(strip)) {
      // A projectile: the strip is its drawing, with no front effects of its own.
      layers.push(exported('dessin', `${name}.png`, 'body', body));
    } else {
      layers.push(exported('corps', `${name}.png`, 'body', body));
      layers.push(exported('effets', `fx/${name}.png`, 'fx', fx));
    }
  } else {
    // A Remix's effects, over the body of its special to draw them on.
    const { body } = stripPixels(fighter, strip, drawn);
    layers.push({ name: 'référence', locked: true, opacity: 96, frames: runsOf(body, frames) });
    layers.push(exported('effets', `fx/${name}.png`, 'fx', platinePixels(fighter, name, drawn).fx));
  }
  layers.push({
    name: 'guides',
    locked: true,
    opacity: 160,
    frames: guidePixels(template, clips, strip, frames, slots).map((cell) => runsOfCell(cell)),
  });
  return {
    format: TEMPLATE_FORMAT,
    version: TEMPLATE_VERSION,
    folder: fighter.name,
    name,
    strip,
    width: CELL_SIZE,
    height: CELL_SIZE,
    frames,
    durations: ticks.map((tick) => tick / TICKS_PER_SECOND),
    palette: {
      main: [...fighter.paletteOf('main').map(toHex), ...Object.values(GUIDE_COLORS)],
      alt: [...fighter.paletteOf('alt').map(toHex), ...Object.values(GUIDE_COLORS)],
      free: false,
    },
    tags: tagsOf(template, clips, strip, loops),
    layers,
  };
}

/** A drawing of one layer, `dessin`: a portrait, a UI image, a stage layer. */
interface ImageTemplate {
  readonly folder: string;
  readonly name: string;
  readonly rules: DrawnRules;
  /** Seconds each frame shows, and whether they loop. */
  readonly seconds: number;
  readonly loops: boolean;
  /** Where its pixels start, in `palette` (`#rrggbbaa`), and its other colorway's palette. */
  readonly start: Uint8Array;
  readonly palette: readonly string[];
  readonly alt?: readonly string[];
  /** Guides over it, in one cell, in GUIDE_COLORS.ground (appended to the palettes). */
  readonly guides?: Uint8Array;
}

function imageTemplateOf(image: ImageTemplate): Template {
  const { folder, name, rules, seconds, loops, start, palette, alt, guides } = image;
  const { width, height, frames } = rules;
  const free = alt === undefined;
  const guide = guides ? [GUIDE_COLORS.ground] : [];
  const pixels = { width: width * frames, height, pixels: start };
  const layers: TemplateLayer[] = [
    {
      name: 'dessin',
      file: `${name}.png`,
      rules,
      locked: false,
      opacity: 255,
      frames: runsOf(pixels, frames, width, height),
    },
  ];
  if (guides) {
    const slot = palette.length;
    const cell = guides.map((on) => (on ? slot : 0));
    layers.push({ name: 'guides', locked: true, opacity: 160, frames: [runsOfCell(cell)] });
  }
  return {
    format: TEMPLATE_FORMAT,
    version: TEMPLATE_VERSION,
    folder,
    name,
    strip: name,
    width,
    height,
    frames,
    durations: Array.from({ length: frames }, () => seconds),
    palette: free
      ? { main: [...palette, ...guide], free }
      : { main: [...palette, ...guide], alt: [...alt, ...guide], free },
    tags: loops ? [{ name: 'boucle', from: 0, to: frames - 1, color: LOOP_TAG }] : [],
    layers,
  };
}

/**
 * The template of a UI image (ui-drawn.ts): starting from what the game has (`drawn`, else the
 * code's drawing), in a free palette, without guides.
 */
export function uiTemplateOf(name: UiArtName, drawn: IndexedImage | undefined): Template {
  const { seconds, loops } = UI_ARTS[name];
  const { pixels, palette } = uiStart(name, drawn);
  return imageTemplateOf({
    folder: UI_FOLDER,
    name,
    rules: uiRulesOf(name),
    seconds,
    loops,
    start: pixels,
    palette: palette.map(toHex),
  });
}

/**
 * The template of a fighter's portrait (drawn.ts): in its palette slots, both colorways, starting
 * from the one drawn, else from the head and shoulders of its guard (the first frame of its idle).
 */
export function portraitTemplateOf(fighter: Fighter, drawn: ReadonlyMap<string, Drawn>): Template {
  return imageTemplateOf({
    folder: fighter.name,
    name: PORTRAIT,
    rules: portraitRules(fighter),
    seconds: 1,
    loops: false,
    start: portraitStart(fighter, drawn),
    palette: fighter.paletteOf('main').map(toHex),
    alt: fighter.paletteOf('alt').map(toHex),
  });
}

/**
 * Sprite pixels across the square of the guard a portrait starts from, enlarged twice: about the
 * framing of the select tiles' squares (56 and 58 px), at twice their detail.
 */
const PORTRAIT_SOURCE = PORTRAIT_SIZE / 2;

/** The head of the guard: a square of its first idle frame around the head, enlarged twice. */
function portraitStart(fighter: Fighter, drawn: ReadonlyMap<string, Drawn>): Uint8Array {
  const own = drawn.get(PORTRAIT)?.body;
  if (own) return own.pixels;
  const idle = stripPixels(fighter, 'idle', drawn).body;
  const pose = fighter.poses('idle')?.[0];
  if (!pose) throw new Error(`${fighter.name} has no idle pose`);
  const { head } = solve(pose, fighter.body);
  const left = Math.round(ANCHOR.x + head.x * ART_SCALE - PORTRAIT_SOURCE / 2);
  const top = Math.round(ANCHOR.y - head.y * ART_SCALE - PORTRAIT_SOURCE * 0.45);
  const zoom = PORTRAIT_SIZE / PORTRAIT_SOURCE;
  const pixels = new Uint8Array(PORTRAIT_SIZE * PORTRAIT_SIZE);
  for (let y = 0; y < PORTRAIT_SIZE; y++) {
    for (let x = 0; x < PORTRAIT_SIZE; x++) {
      const cx = left + Math.floor(x / zoom);
      const cy = top + Math.floor(y / zoom);
      if (cx < 0 || cy < 0 || cx >= CELL_SIZE || cy >= CELL_SIZE) continue;
      pixels[y * PORTRAIT_SIZE + x] = idle.pixels[cy * idle.width + cx] ?? 0;
    }
  }
  return pixels;
}

/**
 * The template of a stage layer (stage-drawn.ts): in a free palette, starting from the one drawn,
 * else from the grey box; the ground line as a guide behind the floor.
 */
export function stageTemplateOf(layer: StageLayer, drawn: IndexedImage | undefined): Template {
  const rules = stageRulesOf(layer);
  const { pixels, palette } = stageStart(layer, drawn);
  const { y: ground } = STAGE_LAYERS.floor;
  const guides =
    layer === 'floor'
      ? undefined
      : new Uint8Array(rules.width * rules.height).fill(
          1,
          ground * rules.width,
          (ground + 1) * rules.width,
        );
  return imageTemplateOf({
    folder: STAGE_NAME,
    name: layer,
    rules,
    seconds: 1,
    loops: false,
    start: pixels,
    palette: palette.map(toHex),
    ...(guides && { guides }),
  });
}

/** The loop of the strip's clip, and each run of the active frames of its strike. */
function tagsOf(
  template: FighterTemplate,
  clips: Clips,
  strip: string,
  loops: boolean,
): TemplateTag[] {
  const tags: TemplateTag[] = [];
  const looping = Object.entries(clips)
    .filter(([, clip]) => clip.sheet === strip && clip.loopFrom !== undefined)
    .sort(([a], [b]) => Number(b === strip) - Number(a === strip))[0]?.[1];
  if (loops && looping?.loopFrom !== undefined) {
    const looped = looping.frames.slice(looping.loopFrom);
    tags.push({
      name: 'boucle',
      from: Math.min(...looped),
      to: Math.max(...looped),
      color: LOOP_TAG,
    });
  }
  const strike = strikeOf(clips, template, strip);
  const active = [...(strike?.frames ?? [])].sort((a, b) => a - b);
  for (const [from, to] of runsOfFrames(active)) {
    tags.push({ name: 'actif', from, to, color: ACTIVE_TAG });
  }
  return tags;
}

/** Consecutive frames as [first, last] pairs. */
function runsOfFrames(frames: readonly number[]): [number, number][] {
  const runs: [number, number][] = [];
  for (const frame of frames) {
    const last = runs.at(-1);
    if (last && frame === last[1] + 1) last[1] = frame;
    else runs.push([frame, frame]);
  }
  return runs;
}

/** What each frame of a strip shows of the frame data: its posture's (or move's) boxes. */
interface FrameBoxes {
  posture?: Posture;
  hurtboxes?: readonly Box[];
}

/**
 * The boxes in force on each frame of a strip, as the clips show them: the posture of the state
 * clips that play it (measure.ts), else the move's at the tick the frame comes on screen.
 */
function boxesOf(
  template: FighterTemplate,
  clips: Clips,
  strip: string,
  frames: number,
): FrameBoxes[] {
  const boxes: FrameBoxes[] = Array.from({ length: frames }, () => ({}));
  const hurtboxesOf: Readonly<Record<Posture, readonly Box[]>> = {
    standing: template.standingHurtboxes,
    crouching: template.crouchingHurtboxes,
    air: template.airHurtboxes,
  };
  for (const posture of ['standing', 'crouching', 'air'] as const) {
    const { body, limbs } = POSTURE_CLIPS[posture];
    for (const id of [...body, ...limbs]) {
      const clip = clips[id];
      if (clip?.sheet !== strip) continue;
      for (const frame of clip.frames) {
        const shown = boxes[frame];
        if (shown && !shown.posture)
          Object.assign(shown, { posture, hurtboxes: hurtboxesOf[posture] });
      }
    }
  }
  for (const id of MOVE_IDS) {
    const clip = clips[id];
    const move = template.moves[id];
    if (!clip || !move || clip.sheet !== strip) continue;
    let tick = 0;
    clip.frames.forEach((frame, index) => {
      const shown = boxes[frame];
      if (shown && !shown.posture) {
        shown.posture = isAirborne(id, move, tick)
          ? 'air'
          : id.startsWith('crouch')
            ? 'crouching'
            : 'standing';
        shown.hurtboxes = moveHurtboxesAt(template, id, move, tick);
      }
      tick += clip.ticks[index] ?? 0;
    });
  }
  return boxes;
}

function pushboxOf(template: FighterTemplate, posture: Posture): WorldBox {
  const size =
    posture === 'standing'
      ? template.standingPushbox
      : posture === 'crouching'
        ? template.crouchingPushbox
        : template.airPushbox;
  const width = toPx(size.width);
  const lift = posture === 'air' ? toPx(template.airPushbox.lift) : 0;
  return { x: -width / 2, y: lift, width, height: toPx(size.height) };
}

/**
 * The guides of every frame, cell by cell (one slot per pixel, the guides' after the fighter's
 * `slots`): the line under the feet and a tick under the anchor, then the pushbox, the hurtboxes
 * and, on the active frames, the hitbox, outlined.
 */
export function guidePixels(
  template: FighterTemplate,
  clips: Clips,
  strip: string,
  frames: number,
  slots: number,
): Uint8Array[] {
  const color = (name: GuideColor): number => slots + GUIDE_ORDER.indexOf(name);
  const strike = strikeOf(clips, template, strip);
  return boxesOf(template, clips, strip, frames).map(({ posture, hurtboxes }, frame) => {
    const cell = new Uint8Array(CELL_SIZE * CELL_SIZE);
    // The soles end on the anchor's row: the line goes just under them.
    cell.fill(color('ground'), (ANCHOR.y + 1) * CELL_SIZE, (ANCHOR.y + 2) * CELL_SIZE);
    for (let row = ANCHOR.y + 2; row <= ANCHOR.y + 5 && row < CELL_SIZE; row++) {
      cell[row * CELL_SIZE + ANCHOR.x] = color('ground');
    }
    if (posture) outline(cell, pushboxOf(template, posture), color('pushbox'));
    for (const box of hurtboxes ?? []) {
      outline(
        cell,
        { x: toPx(box.x), y: toPx(box.y), width: toPx(box.width), height: toPx(box.height) },
        color('hurtbox'),
      );
    }
    if (strike?.frames.includes(frame)) outline(cell, strike.box, color('hitbox'));
    return cell;
  });
}

/** Outlines a world box in a cell, clipped to it. */
function outline(cell: Uint8Array, box: WorldBox, slot: number): void {
  const { left, right, top, bottom } = cellBoxOf(box);
  const put = (x: number, y: number): void => {
    if (x >= 0 && x < CELL_SIZE && y >= 0 && y < CELL_SIZE) cell[y * CELL_SIZE + x] = slot;
  };
  for (let x = left; x <= right; x++) {
    put(x, top);
    put(x, bottom);
  }
  for (let y = top; y <= bottom; y++) {
    put(left, y);
    put(right, y);
  }
}

/** The cells of a strip as runs (`runsOfCell`), `width` × `height` each; empty without pixels. */
function runsOf(
  pixels: StripPixels | undefined,
  frames: number,
  width: number = CELL_SIZE,
  height: number = CELL_SIZE,
): number[][] {
  return Array.from({ length: frames }, (_, frame) => {
    const cell = new Uint8Array(width * height);
    if (pixels) {
      for (let y = 0; y < height; y++) {
        const from = y * pixels.width + frame * width;
        cell.set(pixels.pixels.subarray(from, from + width), y * width);
      }
    }
    return runsOfCell(cell);
  });
}

/** A cell's slots, row by row, as runs: [count, slot, count, slot...]. */
export function runsOfCell(cell: Uint8Array): number[] {
  const runs: number[] = [];
  let start = 0;
  for (let index = 1; index <= cell.length; index++) {
    if (index < cell.length && cell[index] === cell[start]) continue;
    runs.push(index - start, cell[start] ?? 0);
    start = index;
  }
  return runs;
}

function toHex({ r, g, b, a }: Rgba): string {
  return `#${[r, g, b, a].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}
