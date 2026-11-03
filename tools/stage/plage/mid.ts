/**
 * The middle layer (docs/art/decor-plage.md §2.2): the beach. The near sea and its waves breaking
 * on the wet sand, open in the middle, where no one stands in front; on the left, two striped
 * parasols, their loungers, two bathers; on the right, the beach bar under its thatch, its string
 * of bulbs, the bartender, a customer; two palms. Room to breathe: few people. Flat tones, simple
 * masses where the fighters stand (docs/art/proprete.md). Image pixels (STAGE_SCALE): the sand's
 * back is BASE.
 *
 * What moves loops over CYCLE; the big wave breaks at BIG_WAVE_AT.
 */

import { Canvas, Mask, at } from '../kit/canvas.ts';
import { spell } from '../kit/font.ts';
import type { Rect } from '../kit/stage.ts';
import { CROSSED, drawFigure, STANDING, type Figure, type Pose } from '../rue/people.ts';
import {
  FIGURE_RAMPS,
  FOAM,
  LAMP,
  PALM,
  PERSON,
  RIM,
  SAND,
  SEA,
  SKIN,
  STRAW,
  STRIPE,
  TOWEL,
  WET,
  WOOD,
} from './palette.ts';

/** Row of the sand's back, where the beach meets the floor. */
export const BASE = 432;
const SAND_END = 470;
/** The near sea, the wet sand the waves wash, the line where they rest. */
const SEA_TOP = 380;
const SHORE = 410;
/** The parasols, the bar, the palms. */
const PARASOLS = [170, 330] as const;
const BAR = { left: 1190, roof: 300, counter: 392 } as const;
const PALMS = [
  { x: 64, lean: 1 },
  { x: 1120, lean: -1 },
] as const;

/** Steps of 1/60 s: the cycle of 40 s, a wave every 80 steps, the big one at BIG_WAVE_AT. */
export const CYCLE = 2400;
const WAVE = 80;
export const BIG_WAVE_AT = 1200;

export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  readonly timeline: readonly (readonly [number, number])[];
}

/** A timeline over CYCLE: the frame at each step, runs of the same frame merged. */
export function timelineOf(frameAt: (step: number) => number): [number, number][] {
  const timeline: [number, number][] = [];
  for (let step = 0; step < CYCLE; step++) {
    const frame = frameAt(step);
    const last = timeline[timeline.length - 1];
    if (last && last[0] === frame) last[1] += 1;
    else timeline.push([frame, 1]);
  }
  return timeline;
}

// --- The sea. -----------------------------------------------------------------------------------

/** Where the waves are animated: the open middle of the beach, no one in front. */
export const WAVES: readonly Rect[] = [
  { x: 440, y: SEA_TOP, width: 400, height: BASE - SEA_TOP },
  { x: 840, y: SEA_TOP, width: 300, height: BASE - SEA_TOP },
];

/**
 * The wave at `frame`, over the columns `left` to `right`: 0 at rest (the foam on its line), 1 to 3
 * a wave rolling in, breaking and washing up the sand; 4 and 5 the big one, its crest higher, its
 * foam running further.
 */
function drawShore(canvas: Canvas, left: number, right: number, frame: number): void {
  const big = frame >= 4;
  const reach = [0, 4, 9, 5, 8, 16][frame] ?? 0;
  const crest = [0, 392, 402, 0, 388, 398][frame] ?? 0;
  canvas.paint(left, SEA_TOP, right - left, BASE - SEA_TOP, (x, y) => {
    const ripple = Math.round(Math.sin(x / 23 + frame) * 1.5);
    const edge = SHORE + reach + ripple;
    if (y < SHORE - 14) return at(SEA, y < SEA_TOP + 10 ? 2 : 1);
    if (y < edge - 2) return at(SEA, 0);
    if (y < edge) return at(FOAM, frame === 0 ? 0 : big ? 2 : 1);
    if (y < edge + 3 && frame === 3) return at(WET, 2);
    return at(WET, y < BASE - 8 ? 1 : 0);
  });
  if (crest > 0) {
    // The wave's crest, breaking: a line of foam across, a step lighter where it curls.
    canvas.paint(left, crest, right - left, big ? 4 : 3, (x, y) => {
      const curl = Math.round(Math.sin(x / 31) * 1.5);
      return y - crest === 1 + curl || y - crest === 2 + curl ? at(FOAM, big ? 2 : 1) : undefined;
    });
  }
}

function waveAt(step: number): number {
  const into = step % WAVE;
  const big = Math.floor(step / WAVE) === BIG_WAVE_AT / WAVE;
  if (into < 20) return big ? 4 : 1;
  if (into < 40) return big ? 5 : 2;
  if (into < 60) return big ? 5 : 3;
  return 0;
}

// --- The parasols, the bathers. -----------------------------------------------------------------

/** A striped parasol at x: its pole, its canopy in stripes, its scalloped edge. */
function drawParasol(canvas: Canvas, x: number): void {
  const top = BASE - 128;
  canvas.line(x, BASE - 2, x + 6, top + 10, at(WOOD, 2), 2);
  const canopy = new Mask(canvas.width, canvas.height);
  canopy.ellipse(x - 58, top, 128, 52);
  canvas.paint(x - 58, top, 128, 30, (px, py) => {
    if (!canopy.has(px, py)) return undefined;
    const scallop = Math.abs(((px - x + 58) % 16) - 8) < 4 ? 1 : 0;
    if (py >= top + 24 + scallop) return undefined;
    const stripe = Math.floor((px - x + 58) / 16) % 2 === 0;
    const under = py >= top + 22;
    return at(STRIPE, (stripe ? 1 : 3) - (under ? 1 : 0));
  });
  canvas.fill(x + 4, top - 4, 4, 6, at(WOOD, 3));
}

/** A lounger: its frame, its back raised toward `facing`. */
function drawLounger(canvas: Canvas, x: number, facing: 1 | -1): void {
  const y = BASE - 12;
  canvas.fill(x - 34, y, 60, 3, at(WOOD, 3));
  canvas.line(x + facing * 26, y, x + facing * 40, y - 20, at(WOOD, 3), 3);
  for (const leg of [x - 30, x + 20]) canvas.fill(leg, y + 3, 2, 9, at(WOOD, 1));
}

/** A bather lying on the lounger at x, head on its raised back; `frame` 1 a knee raised. */
function drawLying(canvas: Canvas, x: number, frame: number): void {
  const y = BASE - 15;
  const body = new Mask(canvas.width, canvas.height);
  body.limb(x - 30, y, x - 4, y - 1, 3);
  if (frame === 1) {
    body.limb(x - 4, y - 1, x - 16, y - 12, 3);
    body.limb(x - 16, y - 12, x - 28, y, 3);
  }
  body.limb(x - 4, y - 1, x + 22, y - 6, 5);
  body.ellipse(x + 24, y - 20, 12, 12);
  canvas.paint(x - 36, y - 24, 70, 30, (px, py) => {
    if (!body.has(px, py)) return undefined;
    if (!body.has(px, py - 1)) return at(RIM, 0);
    return at(SKIN, py > y - 4 ? 0 : 1);
  });
  canvas.fill(x + 2, y - 5, 16, 5, at(TOWEL, 1));
}

/** A bather sitting on a towel at x, knees up, reading; `frame` 1 the arm up to the face. */
function drawSitting(canvas: Canvas, x: number, frame: number): void {
  const y = BASE - 6;
  canvas.fill(x - 26, y + 1, 52, 4, at(TOWEL, 2));
  const body = new Mask(canvas.width, canvas.height);
  body.limb(x - 4, y, x - 6, y - 30, 6);
  body.limb(x - 4, y, x + 14, y - 14, 4);
  body.limb(x + 14, y - 14, x + 22, y, 3);
  body.ellipse(x - 13, y - 50, 14, 15);
  body.limb(x - 4, y - 26, frame === 1 ? x - 2 : x + 8, frame === 1 ? y - 42 : y - 18, 2);
  canvas.paint(x - 24, y - 54, 52, 56, (px, py) => {
    if (!body.has(px, py)) return undefined;
    if (!body.has(px - 1, py)) return at(RIM, 1);
    return at(PERSON, py < y - 30 ? 3 : 2);
  });
  canvas.fill(x + 6, y - 22, 8, 6, at(TOWEL, 0));
}

// --- The bar, the palms. ------------------------------------------------------------------------

/** The bartender behind the counter, frame 1 and 2 shaking a drink. */
export const BARTENDER: Figure = {
  x: 1330,
  y: BAR.counter + 28,
  height: 80,
  shoulders: 30,
  facing: -1,
  head: 'curls',
  coat: 'short',
  pose: CROSSED,
  rim: { side: -1, above: true, ramp: RIM },
  face: true,
};
const SHAKING: Pose = {
  ...STANDING,
  arms: [
    { joint: [5, 9], end: [6, -2] },
    { joint: [-4, 9], end: [-2, -2] },
  ],
};
const CUSTOMER: Figure = {
  x: 1232,
  y: BASE,
  height: 82,
  shoulders: 28,
  facing: 1,
  head: 'bare',
  coat: 'short',
  pose: { ...STANDING, arms: [{ joint: [5, 11], end: [12, 15] }, STANDING.arms[1]] },
  rim: { side: -1, above: true, ramp: RIM },
};

/** The beach bar: its posts, its thatch and its fringe, its sign, its bulbs, its counter. */
function drawBar(canvas: Canvas, frame: number): void {
  const { left, roof, counter } = BAR;
  const right = canvas.width;
  for (const post of [left + 6, right - 20]) canvas.fill(post, roof, 8, BASE - roof, at(WOOD, 1));
  canvas.fill(left + 20, counter - 70, right - left - 40, 4, at(WOOD, 2));
  for (let x = left + 26; x < right - 26; x += 14) {
    canvas.fill(x, counter - 86 + ((x * 7) % 6), 6, 16 - ((x * 7) % 6), at(LAMP, 0));
  }
  drawFigure(
    canvas,
    { ...BARTENDER, pose: frame === 0 ? CROSSED : { ...SHAKING, dip: frame === 2 ? 2 : 0 } },
    FIGURE_RAMPS,
  );
  canvas.fill(left, counter, right - left, BASE - counter, at(WOOD, 2));
  canvas.hline(left, counter, right - left, at(WOOD, 3));
  for (let x = left + 22; x < right; x += 22)
    canvas.vline(x, counter + 2, BASE - counter - 2, at(WOOD, 1));
  // The thatch: a flat mass, its fringe in points, lit gold along its edge.
  canvas.paint(left - 16, roof - 24, right - left + 16, 40, (x, y) => {
    const point = Math.abs(((x - left) % 12) - 6);
    if (y > roof + 10 - point) return undefined;
    if (y < roof - 24 + Math.max(0, (left + 30 - x) / 2)) return undefined;
    return at(STRAW, y < roof - 20 ? 2 : y > roof + 4 - point ? 0 : 1);
  });
  for (let x = left + 4; x < right; x += 16) {
    canvas.fill(x - 1, roof + 13, 4, 4, at(LAMP, 0));
    canvas.fill(x, roof + 14, 2, 2, at(LAMP, 2));
  }
  const sign = spell('BEACH BAR', 2, 1, () => undefined);
  const signX = Math.round((left + right) / 2 - sign / 2);
  canvas.fill(signX - 8, roof - 50, sign + 16, 24, at(WOOD, 0));
  canvas.hline(signX - 8, roof - 50, sign + 16, at(WOOD, 3));
  spell('BEACH BAR', 2, 1, (x, y) => {
    canvas.set(signX + x, roof - 45 + y, at(LAMP, 1));
  });
}

/** A palm at x leaning `lean`: its trunk in rings, its crown of fronds; `sway` 1 the wind in them. */
function drawPalm(canvas: Canvas, x: number, lean: 1 | -1, sway: number): void {
  const top = { x: x + lean * 70, y: 150 };
  const trunk = new Mask(canvas.width, canvas.height);
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const cx = x + (top.x - x) * t ** 1.6;
    const cy = BASE + (top.y - BASE) * t;
    trunk.ellipse(cx - 7 + t * 2, cy - 4, 14 - t * 4, 8);
  }
  canvas.paint(
    Math.min(x, top.x) - 10,
    top.y - 4,
    Math.abs(top.x - x) + 20,
    BASE - top.y + 4,
    (px, py) => {
      if (!trunk.has(px, py)) return undefined;
      if (!trunk.has(px + lean, py)) return at(PALM, 3);
      return at(PALM, (py - top.y) % 16 < 2 ? 0 : 1);
    },
  );
  const fronds = new Mask(canvas.width, canvas.height);
  for (const [dx, dy] of [
    [-64, 22],
    [-50, 40],
    [60, 24],
    [48, 42],
    [-24, -20],
    [30, -18],
    [4, 46],
  ] as const) {
    const end = { x: top.x + dx + sway * 3, y: top.y + dy + sway * (dx > 0 ? 2 : -2) };
    const bend = { x: top.x + dx * 0.55, y: top.y + Math.min(dy, 0) - 10 };
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const px = (1 - t) ** 2 * top.x + 2 * (1 - t) * t * bend.x + t ** 2 * end.x;
      const py = (1 - t) ** 2 * top.y + 2 * (1 - t) * t * bend.y + t ** 2 * end.y;
      fronds.ellipse(px - 7 + t * 4, py - 4, 14 - t * 8, 8 - t * 4);
      // The leaflets, hanging from the frond, shorter toward its tip.
      if (i % 2 === 0 && i > 2) {
        const hang = 14 - t * 8;
        fronds.limb(px, py, px + (dx > 0 ? 4 : -4), py + hang, 1.2);
        fronds.limb(px, py, px - (dx > 0 ? 3 : -3), py + hang * 0.7, 1.2);
      }
    }
  }
  canvas.paint(top.x - 80, top.y - 50, 160, 120, (px, py) => {
    if (!fronds.has(px, py)) return undefined;
    return at(PALM, fronds.has(px, py - 1) ? 2 : 3);
  });
}

// --- The animations. ----------------------------------------------------------------------------

function palmRect(x: number, lean: 1 | -1): Rect {
  return { x: x + lean * 70 - 80, y: 100, width: 160, height: 120 };
}

export const MID_ANIMATIONS: readonly Animation[] = [
  ...WAVES.map((rect, index): Animation => ({
    name: `wave${index}`,
    rect,
    frames: 6,
    timeline: timelineOf(waveAt),
  })),
  ...PALMS.map(({ x, lean }, index): Animation => ({
    name: `palm${index}`,
    rect: palmRect(x, lean),
    frames: 2,
    // The fronds sway slowly in the sea breeze: a beat every 1.5 s, each palm its own.
    timeline: timelineOf((step) => (Math.floor((step + index * 45) / 90) % 2 === 0 ? 0 : 1)),
  })),
  {
    name: 'bartender',
    rect: {
      x: BARTENDER.x - 30,
      y: BARTENDER.y - 110,
      width: 60,
      height: 112 - (BARTENDER.y - BAR.counter),
    },
    frames: 3,
    timeline: timelineOf((step) => {
      const phase = step % 900;
      return phase < 120 ? 1 + (Math.floor(phase / 10) % 2) : 0;
    }),
  },
  {
    name: 'reader',
    rect: { x: PARASOLS[1] - 30, y: BASE - 62, width: 60, height: 62 },
    frames: 2,
    timeline: timelineOf((step) => (step % 600 < 90 ? 1 : 0)),
  },
  {
    name: 'sunbather',
    rect: { x: PARASOLS[0] - 40, y: BASE - 42, width: 72, height: 34 },
    frames: 2,
    timeline: timelineOf((step) => ((step + 300) % 1200 < 400 ? 1 : 0)),
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
  drawShore(canvas, 0, width, 0);
  WAVES.forEach((rect, index) => {
    drawShore(canvas, rect.x, rect.x + rect.width, frameOf(`wave${index}`));
  });
  drawLounger(canvas, PARASOLS[0] - 4, 1);
  PARASOLS.forEach((x) => {
    drawParasol(canvas, x);
  });
  drawLying(canvas, PARASOLS[0], frameOf('sunbather'));
  drawSitting(canvas, PARASOLS[1], frameOf('reader'));
  drawBar(canvas, frameOf('bartender'));
  drawFigure(canvas, CUSTOMER, FIGURE_RAMPS);
  PALMS.forEach(({ x, lean }, index) => {
    drawPalm(canvas, x, lean, frameOf(`palm${index}`));
  });
  canvas.paint(0, BASE, width, SAND_END - BASE, (_, y) => at(SAND, y < BASE + 3 ? 2 : 3));
  canvas.paint(0, SAND_END, width, height - SAND_END, () => 0);
  return canvas;
}
