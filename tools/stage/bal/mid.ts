/**
 * The middle layer (docs/art/decor-bal.md §2.2): the edge of the dance floor. On the left, the
 * grand staircase down into the room, its gold banister and its newel's lamp; two ivory columns;
 * couples dancing the swing in silhouettes between them; on the right, the velvet banquette, the
 * tables in their cloths and their little lamps, a guest watching. Flat tones, simple masses where
 * the fighters stand (docs/art/proprete.md). Image pixels (STAGE_SCALE): the floor's back is BASE.
 *
 * What the band's chorus moves loops over CHORUS_CYCLE, the chorus starting at CHORUS_AT.
 */

import { Canvas, Mask, at } from '../kit/canvas.ts';
import type { Rect } from '../kit/stage.ts';
import { drawFigure, STANDING, type Figure, type Pose } from '../rue/people.ts';
import {
  CLOTH,
  DRESS_RAMPS,
  FIGURE_RAMPS,
  GOLD,
  LAMP,
  PARQUET,
  RIM,
  VELVET,
  WALL,
} from './palette.ts';

/** Row of the dance floor's back, where the couples dance. */
export const BASE = 432;
const FLOOR_END = 470;
const STAIRS = { top: 252, step: 18, tread: 24, steps: 10 } as const;
const COLUMNS = [330, 1130] as const;
const BANQUETTE = { left: 1180, top: 360 } as const;
const TABLES = [1250, 1380] as const;

/** Steps of 1/60 s: one beat at 150 BPM. The chorus's cycle: 40 s, the chorus for eight beats. */
const BEAT = 24;
export const CHORUS_CYCLE = 2400;
export const CHORUS_AT = 1200;
const CHORUS_BEATS = 8;

/** The beat of the chorus at `step` (0 to 7), or undefined outside it. */
export function chorusBeat(step: number): number | undefined {
  const into = step - CHORUS_AT;
  return into >= 0 && into < CHORUS_BEATS * BEAT ? Math.floor(into / BEAT) : undefined;
}

/** Whether `step` is in the first half of its beat. */
export function onBeat(step: number): boolean {
  return step % BEAT < BEAT / 2;
}

/** The beat `step` is in, counted from the cycle's start. */
export function beatOf(step: number): number {
  return Math.floor(step / BEAT);
}

export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  readonly timeline: readonly (readonly [number, number])[];
}

/** A timeline over CHORUS_CYCLE: the frame at each step, runs of the same frame merged. */
export function timelineOf(frameAt: (step: number) => number): [number, number][] {
  const timeline: [number, number][] = [];
  for (let step = 0; step < CHORUS_CYCLE; step++) {
    const frame = frameAt(step);
    const last = timeline[timeline.length - 1];
    if (last && last[0] === frame) last[1] += 1;
    else timeline.push([frame, 1]);
  }
  return timeline;
}

// --- The couples. -------------------------------------------------------------------------------

const RIMMED = { side: 0, above: true, ramp: RIM } as const;

/** Hand in hand, the lead's arm out to the follow's. */
const CLOSED: Pose = {
  ...STANDING,
  arms: [
    { joint: [5, 10], end: [14, 15] },
    { joint: [-2, 12], end: [-2, 24] },
  ],
};
/** A step on the beat: a dip, a lean. */
const ROCK: Pose = { ...CLOSED, lean: 2, dip: 2 };
/** The kick: one leg out, the body back. */
const KICK: Pose = {
  ...CLOSED,
  legs: [
    { joint: [5, 17], end: [12, 5] },
    { joint: [0, 19], end: [-2, 0] },
  ],
  lean: -2,
};
/** The swing-out of the chorus: the follow spun out at arm's length, the joined hands high. */
const OUT: Pose = {
  ...STANDING,
  arms: [
    { joint: [6, 7], end: [15, -6] },
    { joint: [-4, 11], end: [-10, 18] },
  ],
  lean: -3,
};

/** Where each couple dances: the middle between the two. */
const COUPLES = [520, 760, 1000] as const;
const CLOSE = 16;
const SPUN = 30;

function coupleOf(middle: number, index: number): { lead: Figure; follow: Figure } {
  return {
    lead: {
      x: middle - CLOSE,
      y: BASE,
      height: 82,
      shoulders: 30,
      facing: 1,
      head: 'bare',
      coat: 'short',
      pose: CLOSED,
      rim: RIMMED,
    },
    follow: {
      x: middle + CLOSE,
      y: BASE,
      height: 76,
      shoulders: 24,
      facing: -1,
      head: index % 2 === 0 ? 'bun' : 'curls',
      coat: 'long',
      pose: CLOSED,
      rim: RIMMED,
    },
  };
}

/** A couple at `frame`: 0 in hand, 1 rocking on the beat, 2 kicking, 3 the swing-out. */
function drawCouple(canvas: Canvas, middle: number, index: number, frame: number): void {
  const { lead, follow } = coupleOf(middle, index);
  const pose = frame === 1 ? ROCK : frame === 2 ? KICK : frame === 3 ? OUT : CLOSED;
  const out = frame === 3 ? SPUN - CLOSE : 0;
  drawFigure(canvas, { ...lead, pose }, FIGURE_RAMPS);
  drawFigure(canvas, { ...follow, x: follow.x + out, pose }, DRESS_RAMPS);
}

function coupleRect(middle: number): Rect {
  return { x: middle - CLOSE - 34, y: BASE - 120, width: CLOSE + SPUN + 68, height: 122 };
}

/** The couples swing on the beat, one off another; with the chorus, all swing out. */
function danceAt(step: number, couple: number): number {
  const chorus = chorusBeat(step);
  if (chorus !== undefined) return chorus % 2 === 0 ? 3 : onBeat(step) ? 1 : 2;
  return onBeat(step) ? 1 + ((beatOf(step) + couple) % 2) : 0;
}

// --- The staircase, the columns, the tables. ----------------------------------------------------

/** The top of the stairs' profile at `x`: each step a tread lower. */
function stepTopAt(x: number): number {
  return STAIRS.top + Math.min(Math.floor(x / STAIRS.tread), STAIRS.steps - 1) * STAIRS.step;
}

/** The grand staircase down into the room: its side, its carpet, its banister, its newel lamp. */
function drawStairs(canvas: Canvas): void {
  const end = STAIRS.tread * STAIRS.steps;
  canvas.paint(0, STAIRS.top, end, BASE - STAIRS.top, (x, y) => {
    const top = stepTopAt(x);
    if (y < top) return undefined;
    if (y < top + 4) return at(VELVET, y === top ? 4 : 3);
    return at(WALL, x % STAIRS.tread === 0 ? 1 : 2);
  });
  const rail = (x: number): number => stepTopAt(x) - 38;
  for (let x = 6; x < end; x += 12) canvas.vline(x, rail(x), 38, at(GOLD, 1));
  canvas.line(0, STAIRS.top - 38, end, BASE - 38 - STAIRS.step, at(GOLD, 2), 2);
  canvas.fill(end, BASE - 58, 8, 58, at(GOLD, 1));
  canvas.vline(end, BASE - 58, 58, at(GOLD, 3));
  canvas.ellipse(end - 2, BASE - 72, 12, 12, at(LAMP, 1));
  canvas.fill(end + 2, BASE - 68, 4, 4, at(LAMP, 3));
}

/** An ivory column: its shaft, its gold capital and base. */
function drawColumn(canvas: Canvas, x: number): void {
  canvas.fill(x - 15, 0, 30, BASE, at(WALL, 3));
  canvas.fill(x - 15, 0, 2, BASE, at(WALL, 4));
  canvas.vline(x + 14, 0, BASE, at(WALL, 1));
  for (const flute of [x - 6, x + 5]) canvas.vline(flute, 74, BASE - 90, at(WALL, 2));
  canvas.fill(x - 20, 60, 40, 14, at(GOLD, 1));
  canvas.hline(x - 20, 60, 40, at(GOLD, 3));
  canvas.fill(x - 20, BASE - 16, 40, 16, at(GOLD, 1));
  canvas.hline(x - 20, BASE - 16, 40, at(GOLD, 3));
}

/** The guest seated at the far table, watching the floor: the cloth hides the legs. */
const GUEST: Figure = {
  x: TABLES[1] + 6,
  y: BASE - 8,
  height: 76,
  shoulders: 24,
  facing: -1,
  head: 'curls',
  coat: 'long',
  pose: STANDING,
  rim: RIMMED,
};

/** The banquette, the tables in their cloths, their lamps (fixed: no light comes or goes). */
function drawTables(canvas: Canvas): void {
  const { left, top } = BANQUETTE;
  canvas.fill(left, top, canvas.width - left, BASE - top, at(VELVET, 3));
  canvas.hline(left, top, canvas.width - left, at(GOLD, 2));
  for (const piping of [top + 14, top + 30]) {
    canvas.hline(left, piping, canvas.width - left, at(VELVET, 2));
  }
  drawFigure(canvas, GUEST, DRESS_RAMPS);
  for (const x of TABLES) {
    canvas.fill(x - 32, 397, 64, BASE - 397, at(CLOTH, 1));
    for (let fold = x - 24; fold < x + 32; fold += 16) {
      canvas.vline(fold, 400, BASE - 400, at(CLOTH, 0));
    }
    canvas.ellipse(x - 34, 392, 68, 10, at(CLOTH, 2));
    canvas.fill(x - 1, 378, 2, 16, at(GOLD, 1));
    const shade = new Mask(canvas.width, canvas.height);
    shade.polygon([
      [x - 7, 366],
      [x + 7, 366],
      [x + 11, 379],
      [x - 11, 379],
    ]);
    canvas.paint(x - 11, 366, 22, 13, (px, py) => (shade.has(px, py) ? at(LAMP, 1) : undefined));
    canvas.hline(x - 10, 378, 20, at(LAMP, 2));
  }
}

// --- The animations. ----------------------------------------------------------------------------

export const MID_ANIMATIONS: readonly Animation[] = COUPLES.map((middle, couple): Animation => ({
  name: `couple${couple}`,
  rect: coupleRect(middle),
  frames: 4,
  timeline: timelineOf((step) => danceAt(step, couple)),
}));

/**
 * The middle layer, `width` × `height` image pixels; `frameOf` gives each animation's frame (0 for
 * the still layer); drawn only inside `clip` when given.
 */
export function drawMid(
  width: number,
  height: number,
  frameOf: (name: string) => number = () => 0,
  clip?: Rect,
): Canvas {
  const canvas = new Canvas(width, height);
  if (clip) {
    canvas.clip = {
      left: Math.max(0, clip.x),
      top: Math.max(0, clip.y),
      right: Math.min(width, clip.x + clip.width),
      bottom: Math.min(height, clip.y + clip.height),
    };
  }
  drawStairs(canvas);
  COLUMNS.forEach((x) => {
    drawColumn(canvas, x);
  });
  drawTables(canvas);
  COUPLES.forEach((middle, couple) => {
    drawCouple(canvas, middle, couple, frameOf(`couple${couple}`));
  });
  canvas.paint(0, BASE, width, FLOOR_END - BASE, (_, y) => at(PARQUET, y < BASE + 3 ? 0 : 2));
  canvas.paint(0, FLOOR_END, width, height - FLOOR_END, () => 0);
  return canvas;
}
