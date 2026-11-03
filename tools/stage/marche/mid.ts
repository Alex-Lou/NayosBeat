/**
 * The middle layer (docs/art/decor-night-market.md §2.2): the market's alley. Two stalls, left and
 * right, their striped awnings and counters; strings of lanterns across the top; a scooter at the
 * back; the wok and its steam; the lane open in the middle. Flat tones, simple masses where the
 * fighters stand (docs/art/proprete.md). Image pixels (STAGE_SCALE).
 *
 * What moves loops over CYCLE; the wok flares at FLARE_AT.
 */

import { Canvas, at } from '../kit/canvas.ts';
import { spellHan } from '../kit/font.ts';
import type { Rect } from '../kit/stage.ts';
import { drawFigure, STANDING, type Figure } from '../rue/people.ts';
import {
  AWNING_CREAM,
  AWNING_RED,
  CRATE,
  FIGURE_RAMPS,
  FLARE,
  GOODS,
  LANTERN,
  LANTERN_FRAME,
  RIM,
  SCOOTER,
  SIGN,
  STEAM,
  STONE,
  WIRE,
  WOOD,
} from './palette.ts';

/** Row where the stalls' feet rest, and the fighters' ground. */
export const BASE = 432;
const GROUND = 460;

/** Steps of 1/60 s: the cycle of 40 s, the wok's flare at FLARE_AT. */
export const CYCLE = 2400;
export const FLARE_AT = 1200;

const LEFT = { left: 56, right: 470, roof: 172, counter: 384 } as const;
const RIGHT = { left: 970, right: 1384, roof: 160, counter: 376 } as const;
const WOK = { x: 1186, y: 368 } as const;
const LANTERNS = [
  { x: 136, y: 232, name: 'tasselL' },
  { x: 1302, y: 226, name: 'tasselR' },
] as const;
const SIGN_RIGHT = { x: 1108, y: 246 } as const;
const SCOOTER_AT = { x: 620, y: BASE - 2 } as const;

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

/** The steam's frame: nothing, then the plume rising and thinning, every 160 steps. */
function steamAt(step: number): number {
  const into = step % 160;
  return into < 40 ? 0 : into < 80 ? 1 : into < 120 ? 2 : 3;
}

/** The flare's frame: nothing, but the 60 steps of the high moment. */
function flareAt(step: number): number {
  const into = (((step - FLARE_AT) % CYCLE) + CYCLE) % CYCLE;
  if (into < 15) return 1;
  if (into < 40) return 2;
  if (into < 60) return 3;
  return 0;
}

/** The tassels' frame: the cord swings one way then the other, `phase` apart. */
function tasselAt(step: number, phase: number): number {
  return Math.floor((step + phase) / 60) % 3;
}

// --- The stalls. --------------------------------------------------------------------------------

/** A striped awning from left to right, its lower edge scalloped; `frame` 0 its rest. */
function drawAwning(
  canvas: Canvas,
  { left, right, roof }: { left: number; right: number; roof: number },
): void {
  canvas.paint(left, roof, right - left, 56, (x, y) => {
    const point = Math.abs(((x - left) % 16) - 8);
    if (y >= roof + 52 - point) return undefined;
    const stripe = Math.floor((x - left) / 16) % 2;
    const light = y < roof + 4 ? 2 : y > roof + 44 - point ? 0 : 1;
    return at(stripe === 0 ? AWNING_RED : AWNING_CREAM, light);
  });
  canvas.hline(left, roof, right - left, at(AWNING_RED, 2));
  canvas.fill(left - 2, roof, 4, 54, at(WOOD, 3));
  canvas.fill(right - 2, roof, 4, 54, at(WOOD, 3));
}

/** The stall's back panel and its posts. */
function drawBackPanel(
  canvas: Canvas,
  { left, right, roof, counter }: { left: number; right: number; roof: number; counter: number },
): void {
  canvas.fill(left, roof + 52, right - left, counter - roof - 52, at(WOOD, 1));
  for (let x = left + 12; x < right - 6; x += 24) {
    canvas.vline(x, roof + 54, counter - roof - 56, at(WOOD, 0));
  }
  canvas.hline(left, roof + 52, right - left, at(WOOD, 3));
  for (const post of [left + 8, right - 16]) {
    canvas.fill(post, roof + 50, 8, counter - roof - 50, at(WOOD, 2));
  }
}

/** The stall's counter and its front planks, in front of whoever stands behind it. */
function drawCounterFront(
  canvas: Canvas,
  { left, right, counter }: { left: number; right: number; counter: number },
): void {
  canvas.fill(left, counter, right - left, BASE - counter, at(WOOD, 2));
  canvas.hline(left, counter, right - left, at(WOOD, 3));
  canvas.hline(left, counter + 3, right - left, at(WOOD, 0));
  for (let x = left + 18; x < right - 8; x += 20) {
    canvas.vline(x, counter + 5, BASE - counter - 5, at(WOOD, 1));
  }
}

/** Hanging cloth on the left stall's back panel: three garments on a rod, each in its color. */
function drawCloth(canvas: Canvas, { left, roof }: { left: number; roof: number }): void {
  const ramps = [AWNING_RED, AWNING_CREAM, GOODS] as const;
  for (const [index, ramp] of ramps.entries()) {
    const x = left + 40 + index * 56;
    const top = roof + 78 + (index % 2) * 8;
    const height = 58 + (index % 2) * 16;
    canvas.hline(x - 6, top - 6, 46, at(WOOD, 3));
    canvas.fill(x, top, 34, height, at(ramp, 1));
    canvas.fill(x + 4, top - 4, 26, 6, at(ramp, 2));
    canvas.vline(x, top, height, at(ramp, 2));
    canvas.vline(x + 12, top + 6, height - 10, at(ramp, 0));
  }
}

/** The goods on a stall's counter, drawn in flat boxes and rounds. */
function drawGoods(
  canvas: Canvas,
  { left, right, counter }: { left: number; right: number; counter: number },
): void {
  for (let index = 0; index < 5; index++) {
    const x = left + 26 + index * 34;
    if (x > right - 40) break;
    canvas.fill(x, counter - 16 - (index % 2) * 4, 22, 16 + (index % 2) * 4, at(GOODS, 2));
    canvas.hline(x, counter - 16 - (index % 2) * 4, 22, at(GOODS, 3));
    canvas.fill(x + 3, counter - 10 - (index % 2) * 4, 6, 4, at(GOODS, 0));
  }
}

/** A hanging sign: its board, its hook, and its Chinese word lit by the lanterns. */
function drawSign(canvas: Canvas, x: number, y: number, text: string, scale: number): void {
  const textWidth = spellHan(text, scale, 1, () => undefined);
  const width = textWidth + 8;
  const height = 9 * scale + 8;
  canvas.vline(x + Math.floor(width / 2), y - 10, 10, at(WIRE, 0));
  canvas.fill(x, y, width, height, at(SIGN, 1));
  canvas.hline(x, y, width, at(SIGN, 2));
  canvas.hline(x, y + height - 1, width, at(SIGN, 0));
  spellHan(text, scale, 1, (px, py) => {
    canvas.set(x + 4 + px, y + 4 + py, at(LANTERN, 3));
  });
}

/** A vendor behind the counter, a silhouette rimmed by the lanterns. */
const VENDOR: Figure = {
  x: 1250,
  y: BASE - 2,
  height: 84,
  shoulders: 26,
  facing: -1,
  head: 'cap',
  coat: 'short',
  pose: STANDING,
  rim: { side: -1, above: true, ramp: RIM },
};

/** The scooter parked at the back: two wheels, a low body, a handlebar, a dull red panel. */
function drawScooter(canvas: Canvas, x: number, y: number): void {
  canvas.ellipse(x - 26, y - 20, 20, 20, at(SCOOTER, 0));
  canvas.ellipse(x + 30, y - 20, 20, 20, at(SCOOTER, 0));
  canvas.ellipse(x - 24, y - 18, 12, 12, at(SCOOTER, 2));
  canvas.ellipse(x + 32, y - 18, 12, 12, at(SCOOTER, 2));
  canvas.fill(x - 22, y - 40, 56, 14, at(SCOOTER, 1));
  canvas.fill(x + 10, y - 52, 26, 14, at(SCOOTER, 3));
  canvas.line(x + 30, y - 50, x + 42, y - 72, at(SCOOTER, 2), 2);
  canvas.fill(x + 36, y - 76, 14, 4, at(SCOOTER, 1));
  canvas.fill(x - 34, y - 54, 12, 10, at(SCOOTER, 1));
}

/** A paper lantern: its cord, its glow, the frame, its heart; `tassel` swings the hem. */
function drawLantern(canvas: Canvas, x: number, y: number, tassel: number): void {
  canvas.vline(x, y - 24, 24, at(WIRE, 0));
  canvas.fill(x - 12, y - 2, 24, 3, at(LANTERN_FRAME, 1));
  canvas.ellipse(x - 13, y, 26, 30, at(LANTERN, 2));
  canvas.ellipse(x - 9, y + 2, 18, 24, at(LANTERN, 3));
  canvas.ellipse(x - 5, y + 4, 10, 16, at(LANTERN, 4));
  for (let dx = -10; dx <= 10; dx += 5) canvas.vline(x + dx, y + 1, 28, at(LANTERN, 1));
  canvas.fill(x - 12, y + 28, 24, 3, at(LANTERN_FRAME, 0));
  const swing = tassel - 1;
  canvas.vline(x + swing, y + 31, 8, at(LANTERN_FRAME, 0));
  canvas.fill(x - 2 + swing, y + 39, 5, 5, at(LANTERN_FRAME, 1));
}

/** The steam over the wok: wisps rising, `frame` 1 to 3, thinning as they go. */
function drawSteam(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  const top = 58 - frame * 12;
  for (let i = 0; i < 4; i++) {
    const x = WOK.x - 18 + i * 12;
    const rise = top + i * 6;
    const height = 40 + frame * 10 - i * 4;
    canvas.ellipse(
      x - 4,
      WOK.y - 8 - height - rise,
      8 + frame * 2,
      height,
      at(STEAM, Math.min(3, frame)),
    );
  }
}

/** The wok's flame at the high moment: a burst, a tall plume, its last embers. */
function drawFlare(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  const height = [0, 40, 96, 150][frame] ?? 0;
  const width = [0, 36, 22, 10][frame] ?? 0;
  canvas.paint(WOK.x - width / 2, WOK.y - height, width, height, (x, y) => {
    const t = (WOK.y - y) / height;
    const spread = width * (1 - t * 0.6);
    if (Math.abs(x + 0.5 - WOK.x) > spread / 2) return undefined;
    return at(FLARE, t > 0.66 ? 0 : t > 0.33 ? 1 : 2);
  });
  canvas.ellipse(WOK.x - 20, WOK.y - 12, 40, 14, at(FLARE, 2));
}

/** A string of small lanterns across the alley. */
function drawLanternString(canvas: Canvas): void {
  const from = { x: 0, y: 92 };
  const to = { x: canvas.width, y: 108 };
  const sag = 26;
  for (let x = from.x; x <= to.x; x++) {
    const t = (x - from.x) / (to.x - from.x);
    const y = Math.round(from.y + (to.y - from.y) * t + sag * Math.sin(t * Math.PI));
    canvas.set(x, y, at(WIRE, 1));
  }
  for (let x = 78; x < canvas.width; x += 132) {
    const t = (x - from.x) / (to.x - from.x);
    const y = Math.round(from.y + (to.y - from.y) * t + sag * Math.sin(t * Math.PI));
    canvas.vline(x, y, 4, at(WIRE, 0));
    canvas.fill(x - 4, y + 4, 9, 8, at(LANTERN, 2));
    canvas.fill(x - 2, y + 5, 5, 5, at(LANTERN, 4));
    canvas.hline(x - 4, y + 4, 9, at(LANTERN_FRAME, 1));
    canvas.hline(x - 4, y + 11, 9, at(LANTERN_FRAME, 0));
  }
}

// --- The animations. ----------------------------------------------------------------------------

export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'steam',
    rect: { x: WOK.x - 64, y: WOK.y - 190, width: 128, height: 190 },
    frames: 4,
    timeline: timelineOf(steamAt),
  },
  {
    name: 'flare',
    rect: { x: WOK.x - 64, y: WOK.y - 200, width: 128, height: 200 },
    frames: 4,
    timeline: timelineOf(flareAt),
  },
  ...LANTERNS.map(({ x, y, name }, index): Animation => ({
    name,
    rect: { x: x - 16, y: y + 26, width: 32, height: 26 },
    frames: 3,
    timeline: timelineOf((step) => tasselAt(step, index * 30)),
  })),
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
  // The lane's stone, and the shade under the stalls.
  canvas.fill(0, BASE, width, height - BASE, at(STONE, 2));
  canvas.fill(0, BASE, width, 6, at(STONE, 1));
  drawScooter(canvas, SCOOTER_AT.x, SCOOTER_AT.y);
  // The left stall: cloth.
  drawAwning(canvas, LEFT);
  drawBackPanel(canvas, LEFT);
  drawCloth(canvas, LEFT);
  drawCounterFront(canvas, LEFT);
  drawGoods(canvas, LEFT);
  drawSign(canvas, LEFT.left + 200, LEFT.roof + 58, '衣', 2);
  // The right stall: the wok, the vendor behind it.
  drawAwning(canvas, RIGHT);
  drawBackPanel(canvas, RIGHT);
  drawFigure(canvas, VENDOR, FIGURE_RAMPS);
  drawCounterFront(canvas, RIGHT);
  canvas.fill(WOK.x - 20, WOK.y - 10, 40, 10, at(STONE, 0));
  canvas.ellipse(WOK.x - 18, WOK.y - 14, 36, 12, at(STONE, 1));
  for (let index = 0; index < 4; index++) {
    const x = RIGHT.left + 22 + index * 40;
    canvas.fill(x, RIGHT.counter - 18, 24, 18, at(CRATE, 2));
    canvas.hline(x, RIGHT.counter - 18, 24, at(CRATE, 1));
  }
  drawLanternString(canvas);
  for (const { x, y, name } of LANTERNS) drawLantern(canvas, x, y, frameOf(name));
  drawSign(canvas, SIGN_RIGHT.x, SIGN_RIGHT.y, '大吉', 2);
  drawSteam(canvas, frameOf('steam'));
  drawFlare(canvas, frameOf('flare'));
  // The lane's front lip, over the stalls' feet.
  canvas.fill(0, GROUND, width, height - GROUND, at(STONE, 0));
  return canvas;
}
