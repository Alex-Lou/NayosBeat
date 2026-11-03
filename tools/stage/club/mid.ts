/**
 * The middle layer (docs/art/decor-club.md §2.2): the dance floor of L'Entrepôt, from among the
 * crowd. Groups of dancers in silhouettes against the stage's violet, between two steel pillars; on
 * the left, the loading door rolled up on the yard outside, its sodium lamp, the rain there when it
 * rains; on the right, the bar, its bottles in the amber light, the bartender. Flat tones, simple
 * masses where the fighters stand (docs/art/proprete.md). Image pixels (STAGE_SCALE): the floor's
 * back is row BASE.
 *
 * What the bass shakes loops over BASS_CYCLE, the bass hitting at BASS_AT.
 */

import { Canvas, at } from '../kit/canvas.ts';
import type { Rect } from '../kit/stage.ts';
import { CROSSED, drawFigure, HIP, STANDING, type Figure, type Pose } from '../rue/people.ts';
import {
  AMBER,
  FIGURE_RAMPS,
  FLOOR,
  GLASS,
  NIGHT,
  RAIN,
  RIM,
  SODIUM,
  STEEL,
  WOOD,
  YARD,
} from './palette.ts';

/** Row of the dance floor's back, where the crowd stands. */
export const BASE = 432;
const FLOOR_END = 470;
/** The loading door on the yard, the bar, the pillars. */
export const DOOR: Rect = { x: 24, y: 230, width: 170, height: BASE - 230 };
const BAR = { left: 1236, top: 360 } as const;
const PILLARS = [420, 1020] as const;

/** Steps of 1/60 s: one beat at 120 BPM. The bass's cycle: 40 s, the bass for eight beats. */
const BEAT = 30;
export const BASS_CYCLE = 2400;
export const BASS_AT = 1200;
const BASS_BEATS = 8;

/** The beat of the bass at `step` (0 to 7), or undefined outside it. */
export function bassBeat(step: number): number | undefined {
  const into = step - BASS_AT;
  return into >= 0 && into < BASS_BEATS * BEAT ? Math.floor(into / BEAT) : undefined;
}

export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  readonly timeline: readonly (readonly [number, number])[];
  readonly weather?: 'rain';
}

/** A timeline over BASS_CYCLE: the frame at each step, runs of the same frame merged. */
export function timelineOf(frameAt: (step: number) => number): [number, number][] {
  const timeline: [number, number][] = [];
  for (let step = 0; step < BASS_CYCLE; step++) {
    const frame = frameAt(step);
    const last = timeline[timeline.length - 1];
    if (last && last[0] === frame) last[1] += 1;
    else timeline.push([frame, 1]);
  }
  return timeline;
}

// --- The crowd. ---------------------------------------------------------------------------------

/** Arms up, the bass's jump. */
const ARMS_UP: Pose = {
  ...STANDING,
  arms: [
    { joint: [5, 6], end: [8, -14] },
    { joint: [-5, 6], end: [-8, -14] },
  ],
  dip: -3,
};
/** A dancer's step on the beat: leaning, one arm swinging. */
const SWAY: Pose = {
  ...HIP,
  arms: [
    { joint: [4, 12], end: [10, 18] },
    { joint: [-3, 12], end: [-6, 24] },
  ],
  lean: 3,
  dip: 2,
};

/** The dancers, three a group; each group an animation over its own rectangle. */
const GROUPS: readonly (readonly Figure[])[] = [
  [260, 300, 342],
  [520, 566, 612],
  [800, 846, 890],
  [1100, 1146],
].map((xs, group) =>
  xs.map((x, index): Figure => ({
    x,
    y: BASE,
    height: 80 + ((group + index) % 3) * 4,
    shoulders: 28 + ((group * 2 + index) % 3) * 2,
    facing: (group + index) % 2 === 0 ? -1 : 1,
    head: (['hood', 'cap', 'long', 'beanie', 'bun'] as const)[(group * 3 + index) % 5] ?? 'bare',
    coat: (['short', 'puffer', 'long'] as const)[(group + index * 2) % 3] ?? 'short',
    pose: STANDING,
    rim: { side: 0, above: true, ramp: RIM },
  })),
);

/** A group at `frame`: 0 at rest, 1 and 2 swaying on the beat, 3 arms up with the bass. */
function drawGroup(canvas: Canvas, figures: readonly Figure[], frame: number): void {
  figures.forEach((figure, index) => {
    const pose =
      frame === 3 ? ARMS_UP : frame === 0 ? STANDING : (frame + index) % 2 === 0 ? SWAY : HIP;
    drawFigure(canvas, { ...figure, pose }, FIGURE_RAMPS);
  });
}

function groupRect(figures: readonly Figure[]): Rect {
  const xs = figures.map(({ x }) => x);
  const left = Math.min(...xs) - 30;
  const right = Math.max(...xs) + 30;
  return { x: left, y: BASE - 120, width: right - left, height: 122 };
}

/** The crowd steps on the beat, a group off another; with the bass, all jump, every beat. */
function danceAt(step: number, group: number): number {
  const half = step % BEAT < BEAT / 2;
  if (bassBeat(step) !== undefined) return half ? 3 : 0;
  return half ? 1 + ((Math.floor(step / BEAT) + group) % 2) : 0;
}

// --- The door, the bar, the pillars. ------------------------------------------------------------

/** The loading door rolled up on the yard: the night, the wet concrete, the sodium lamp. */
function drawDoor(canvas: Canvas): void {
  const { x, y, width, height } = DOOR;
  canvas.paint(x, y, width, height, (px, py) => {
    if (py < y + 90) return at(NIGHT, py < y + 40 ? 0 : 1);
    if (py < y + 96) return at(NIGHT, 2);
    return at(YARD, py > y + height - 30 ? 2 : 1);
  });
  canvas.fill(x + 120, y + 70, 4, 40, at(STEEL, 2));
  canvas.fill(x + 114, y + 66, 16, 5, at(SODIUM, 1));
  canvas.fill(x + 118, y + 71, 8, 2, at(SODIUM, 2));
  // The frame, the rolled shutter over it.
  canvas.fill(x - 8, y - 24, width + 16, 24, at(STEEL, 2));
  for (let row = y - 22; row < y; row += 5) canvas.hline(x - 6, row, width + 12, at(STEEL, 3));
  canvas.fill(x - 8, y, 8, height, at(STEEL, 3));
  canvas.fill(x + width, y, 8, height, at(STEEL, 1));
}

/** The rain in the doorway (`frame` 1 to 4): streaks leaning with the wind, over the yard. */
function drawDoorRain(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  const { x, y, width, height } = DOOR;
  for (let line = 0; line < width + 40; line += 7) {
    for (let drop = 0; drop < height; drop += 24) {
      const top = y + ((drop + frame * 6 + line * 13) % height);
      for (let row = 0; row < 7; row++) {
        const px = x + line - Math.round(((top + row - y) * 4) / 14);
        if (px >= x && px < x + width && top + row < y + height) {
          canvas.set(px, top + row, at(RAIN, line % 3 === 0 ? 2 : 1));
        }
      }
    }
  }
}

/** The bar: its shelves of bottles in the amber light, its counter, its brass rail. */
function drawBar(canvas: Canvas): void {
  const { left, top } = BAR;
  canvas.fill(left, top - 110, canvas.width - left, 110, at(AMBER, 0));
  for (const shelf of [top - 90, top - 50]) {
    canvas.hline(left, shelf + 30, canvas.width - left, at(WOOD, 3));
    for (let x = left + 8; x < canvas.width - 8; x += 12) {
      const tall = 16 + ((x * 7) % 9);
      canvas.fill(x, shelf + 30 - tall, 6, tall, at(GLASS, (x / 12) % 2 === 0 ? 1 : 3));
      canvas.set(x + 1, shelf + 30 - tall + 2, at(AMBER, 3));
    }
  }
  canvas.fill(left - 10, top, canvas.width - left + 10, BASE - top, at(WOOD, 1));
  canvas.hline(left - 10, top, canvas.width - left + 10, at(AMBER, 2));
  canvas.hline(left - 10, top + 1, canvas.width - left + 10, at(WOOD, 3));
}

/** The bartender behind the counter, frame 1 shaking a drink. */
export const BARTENDER: Figure = {
  x: 1330,
  y: BAR.top + 28,
  height: 82,
  shoulders: 30,
  facing: -1,
  head: 'bun',
  coat: 'short',
  pose: CROSSED,
  rim: { side: 1, above: true, ramp: AMBER },
  face: true,
};
const SHAKING: Pose = {
  ...STANDING,
  arms: [
    { joint: [5, 9], end: [6, -2] },
    { joint: [-4, 9], end: [-2, -2] },
  ],
};

function drawBartender(canvas: Canvas, frame: number): void {
  const pose = frame === 1 ? SHAKING : frame === 2 ? { ...SHAKING, dip: 2 } : CROSSED;
  drawFigure(canvas, { ...BARTENDER, pose }, FIGURE_RAMPS);
}

/** A steel pillar from the ceiling to the floor. */
function drawPillar(canvas: Canvas, x: number): void {
  canvas.fill(x - 9, 0, 18, BASE + 2, at(STEEL, 1));
  canvas.vline(x - 9, 0, BASE + 2, at(STEEL, 3));
  canvas.vline(x + 8, 0, BASE + 2, at(STEEL, 0));
}

// --- The animations. ----------------------------------------------------------------------------

export const MID_ANIMATIONS: readonly Animation[] = [
  ...GROUPS.map((figures, group): Animation => ({
    name: `crowd${group}`,
    rect: groupRect(figures),
    frames: 4,
    timeline: timelineOf((step) => danceAt(step, group)),
  })),
  {
    name: 'bartender',
    rect: {
      x: BARTENDER.x - 30,
      y: BARTENDER.y - 110,
      width: 60,
      height: 112 - (BARTENDER.y - BAR.top),
    },
    frames: 3,
    timeline: timelineOf((step) => {
      // With the bass, a nod on the beat; between, a drink shaken now and then.
      if (bassBeat(step) !== undefined) return step % 30 < 15 ? 2 : 0;
      const phase = step % 900;
      return phase < 120 ? 1 + (Math.floor(phase / 10) % 2) : 0;
    }),
  },
  {
    name: 'doorRain',
    weather: 'rain',
    rect: DOOR,
    frames: 5,
    timeline: [
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
    ],
  },
];

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
  drawDoor(canvas);
  drawDoorRain(canvas, frameOf('doorRain'));
  drawBar(canvas);
  drawBartender(canvas, frameOf('bartender'));
  canvas.fill(BAR.left - 10, BAR.top + 2, width - BAR.left + 10, BASE - BAR.top - 2, at(WOOD, 1));
  canvas.hline(BAR.left - 10, BAR.top, width - BAR.left + 10, at(AMBER, 2));
  PILLARS.forEach((x) => {
    drawPillar(canvas, x);
  });
  GROUPS.forEach((figures, group) => {
    drawGroup(canvas, figures, frameOf(`crowd${group}`));
  });
  canvas.paint(0, BASE, width, FLOOR_END - BASE, (x, y) => at(FLOOR, y < BASE + 3 ? 0 : 1));
  canvas.paint(0, FLOOR_END, width, height - FLOOR_END, () => 0);
  return canvas;
}
