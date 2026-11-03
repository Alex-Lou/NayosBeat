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
import { drawFigure, POCKETS, STANDING, type Figure, type Head, type Pose } from '../rue/people.ts';
import {
  AWNING_CREAM,
  AWNING_RED,
  CRATE,
  FABRIC_GREEN,
  FABRIC_TEAL,
  FIGURE_RAMPS,
  FLARE,
  GOLD_DULL,
  GOODS,
  LANTERN,
  LANTERN_FRAME,
  LANTERN_PALE,
  LIGHT_POOL,
  PAPER,
  RIM,
  SCOOTER,
  SHADOW,
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
/** The distant cart in the lane's opening, and the crowd at its edges. */
const CART = { x: 700, y: BASE - 4 } as const;
const CROWD: readonly { x: number; facing: 1 | -1; head: Head }[] = [
  { x: 506, facing: 1, head: 'cap' },
  { x: 946, facing: -1, head: 'beanie' },
];
/** The cat on the right counter. */
const CAT = { x: 1046, y: RIGHT.counter } as const;

export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  readonly timeline: readonly (readonly [number, number])[];
  /** It is there only in this weather (the drip under the awning, in the rain). */
  readonly weather?: 'rain';
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
  return into < 32 ? 0 : into < 64 ? 1 : into < 96 ? 2 : into < 128 ? 3 : 4;
}

/** The cook's frame: it stirs just before the flare, tosses at it, then rests. */
function cookAt(step: number): number {
  const into = (((step - FLARE_AT) % CYCLE) + CYCLE) % CYCLE;
  if (into < 24) return 2;
  if (into > CYCLE - 30) return 1;
  return 0;
}

/** The cat's tail: a slow flick every 240 steps. */
function catAt(step: number): number {
  return step % 240 < 24 ? 1 : 0;
}

/** A figure of the crowd: it breathes down and up, each on its own phase. */
function crowdAt(step: number, phase: number): number {
  return Math.floor((step + phase) / 90) % 2;
}

/** The hanging cloth's sway: one way, then the other, slowly. */
function clothAt(step: number): number {
  return Math.floor(step / 120) % 2;
}

/** The drip's frame: three moments of a drop's fall, then nothing. */
function dripAt(step: number): number {
  const into = step % 240;
  return into < 8 ? 1 : into < 16 ? 2 : into < 24 ? 3 : 0;
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
function drawCloth(
  canvas: Canvas,
  { left, roof }: { left: number; roof: number },
  frame: number,
): void {
  const ramps = [AWNING_RED, AWNING_CREAM, FABRIC_GREEN, FABRIC_TEAL] as const;
  for (const [index, ramp] of ramps.entries()) {
    const x = left + 40 + index * 52;
    const top = roof + 78 + (index % 2) * 8;
    const sway = frame === 1 ? (index % 2 === 0 ? 2 : -2) : 0;
    const height = 58 + (index % 2) * 16 + sway;
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

/** The cook, reaching over the wok; `STIRRING` and `TOSSING` are its two working poses. */
const VENDOR: Figure = {
  x: 1215,
  y: BASE - 2,
  height: 84,
  shoulders: 26,
  facing: -1,
  head: 'cap',
  coat: 'short',
  pose: STANDING,
  rim: { side: -1, above: true, ramp: RIM },
};
const STIRRING: Pose = {
  ...STANDING,
  arms: [
    { joint: [-6, 10], end: [-18, 6] },
    { joint: [2, 10], end: [4, 18] },
  ],
};
const TOSSING: Pose = {
  ...STANDING,
  arms: [
    { joint: [-6, 8], end: [-18, -6] },
    { joint: [2, 8], end: [6, -2] },
  ],
  lean: -2,
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

/** The lane's stone: joints, the shade the stalls lay, and the warm pools of the lanterns. */
function drawGround(canvas: Canvas, width: number): void {
  canvas.fill(0, BASE, width, canvas.height - BASE, at(STONE, 2));
  canvas.fill(0, BASE, width, 6, at(STONE, 1));
  for (let x = 0; x < width; x += 128) canvas.vline(x, BASE, canvas.height - BASE, at(STONE, 1));
  canvas.fill(LEFT.left, BASE, LEFT.right - LEFT.left, 5, at(SHADOW, 0));
  canvas.fill(RIGHT.left, BASE, RIGHT.right - RIGHT.left, 5, at(SHADOW, 0));
  canvas.fill(SCOOTER_AT.x - 40, BASE, 80, 4, at(SHADOW, 0));
  canvas.fill(CART.x - 46, BASE, 92, 4, at(SHADOW, 0));
  for (const x of [136, 1302, CART.x]) {
    canvas.ellipse(x - 64, BASE + 2, 128, 24, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 42, BASE + 6, 84, 18, at(LIGHT_POOL, 2));
    canvas.ellipse(x - 22, BASE + 10, 44, 11, at(LIGHT_POOL, 3));
  }
}

/** The warm pool a lantern lays on the panel behind it. */
function drawGlow(canvas: Canvas, x: number, y: number): void {
  canvas.ellipse(x - 38, y - 38, 76, 76, at(LIGHT_POOL, 1));
  canvas.ellipse(x - 26, y - 26, 52, 52, at(LIGHT_POOL, 2));
  canvas.ellipse(x - 14, y - 14, 28, 28, at(LIGHT_POOL, 3));
}

/** A small lantern on a wire: its cord, its paper, its heart. */
function drawSmallLantern(canvas: Canvas, x: number, y: number, ramp: readonly number[]): void {
  canvas.vline(x, y - 4, 4, at(WIRE, 0));
  canvas.fill(x - 4, y, 9, 8, at(ramp, 2));
  canvas.fill(x - 2, y + 1, 5, 5, at(ramp, 4));
  canvas.hline(x - 4, y, 9, at(LANTERN_FRAME, 1));
  canvas.hline(x - 4, y + 7, 9, at(LANTERN_FRAME, 0));
}

/** The distant cart in the lane's opening: a small counter, its awning, its pale lantern, a cook. */
function drawCart(canvas: Canvas): void {
  const { x, y } = CART;
  canvas.fill(x - 42, y - 34, 84, 34, at(WOOD, 1));
  canvas.hline(x - 42, y - 34, 84, at(WOOD, 3));
  canvas.vline(x - 42, y - 34, 34, at(WOOD, 2));
  canvas.fill(x - 40, y - 72, 4, 40, at(WOOD, 1));
  canvas.fill(x + 36, y - 72, 4, 40, at(WOOD, 1));
  canvas.paint(x - 48, y - 78, 96, 16, (px) => {
    const stripe = Math.floor((px - (x - 48)) / 12) % 2;
    return at(stripe === 0 ? AWNING_RED : AWNING_CREAM, 1);
  });
  canvas.hline(x - 48, y - 78, 96, at(AWNING_RED, 2));
  drawSmallLantern(canvas, x - 30, y - 62, LANTERN_PALE);
  drawFigure(
    canvas,
    {
      x,
      y: y - 18,
      height: 58,
      shoulders: 20,
      facing: 1,
      head: 'bun',
      coat: 'short',
      pose: STANDING,
      rim: { side: 1, above: true, ramp: RIM },
    },
    FIGURE_RAMPS,
  );
  canvas.ellipse(x - 18, y - 36, 36, 8, at(LIGHT_POOL, 2));
}

/** A figure of the crowd at the lane's edge, breathing; frame 1 sinks by a pixel. */
function drawCrowd(canvas: Canvas, x: number, facing: 1 | -1, head: Head, frame: number): void {
  drawFigure(
    canvas,
    {
      x,
      y: BASE - 2,
      height: 66,
      shoulders: 21,
      facing,
      head,
      coat: 'short',
      pose: { ...POCKETS, dip: frame },
      rim: { side: facing, above: true, ramp: RIM },
    },
    FIGURE_RAMPS,
  );
}

/** A noren of three strips under an awning, its hems lifting on one side (`frame` 1). */
function drawNoren(
  canvas: Canvas,
  x: number,
  y: number,
  width: number,
  ramp: readonly number[],
  character: string,
): void {
  canvas.hline(x - 4, y, width + 8, at(WOOD, 3));
  const strip = Math.floor(width / 3);
  for (let index = 0; index < 3; index++) {
    const left = x + index * strip;
    const bottom = y + 34;
    canvas.fill(left + 1, y, strip - 2, bottom - y, at(ramp, 1));
    canvas.hline(left + 1, y, strip - 2, at(ramp, 2));
    canvas.vline(left + 1, y, bottom - y, at(ramp, 0));
    if (index === 1) {
      spellHan(character, 1, 0, (px, py) => {
        canvas.set(left + Math.floor(strip / 2) - 4 + px, y + 10 + py, at(PAPER, 2));
      });
    }
  }
}

/** The cook's hanging pans and his tea urn, under the right awning. */
function drawUtensils(canvas: Canvas): void {
  const x = RIGHT.right - 62;
  const y = RIGHT.roof + 62;
  for (let index = 0; index < 3; index++) {
    const left = x + index * 14;
    canvas.vline(left, y, 10, at(WIRE, 0));
    canvas.ellipse(left - 4, y + 10, 12, 9, at(STONE, 1));
    canvas.hline(left - 4, y + 10, 12, at(GOLD_DULL, 1));
  }
  const urn = RIGHT.right - 110;
  canvas.fill(urn, RIGHT.counter - 30, 24, 30, at(STONE, 1));
  canvas.hline(urn, RIGHT.counter - 30, 24, at(GOLD_DULL, 2));
  canvas.fill(urn + 4, RIGHT.counter - 36, 16, 6, at(STONE, 2));
  canvas.fill(urn + 20, RIGHT.counter - 22, 6, 4, at(STONE, 1));
}

/** The cat on the counter: its body, its head, its ears, its eyes, its tail (`frame` 1 flicks). */
function drawCat(canvas: Canvas, frame: number): void {
  const { x, y } = CAT;
  canvas.ellipse(x - 12, y - 20, 24, 20, at(PAPER, 1));
  canvas.ellipse(x - 8, y - 31, 16, 14, at(PAPER, 2));
  canvas.line(x - 7, y - 35, x - 5, y - 42, at(PAPER, 1), 2);
  canvas.line(x + 1, y - 35, x + 3, y - 42, at(PAPER, 1), 2);
  canvas.set(x - 3, y - 27, at(SCOOTER, 0));
  canvas.set(x + 2, y - 27, at(SCOOTER, 0));
  canvas.set(x - 1, y - 24, at(SCOOTER, 0));
  const tail = frame === 1 ? 6 : 0;
  canvas.line(x + 11, y - 14, x + 20 + tail, y - 22 - tail, at(PAPER, 0), 2);
}

/** The drip under the right awning, in the rain: three moments of its fall, and its ripple. */
function drawDrip(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  const x = RIGHT.right - 36;
  const top = RIGHT.roof + 60;
  for (let index = 0; index < 3; index++) {
    const y = top + frame * 58 + index * 22;
    if (y > BASE) continue;
    canvas.vline(x + index * 5, y, 5, at(STONE, 3));
    canvas.set(x + index * 5, y + 6, at(STONE, 1));
  }
  canvas.ellipse(x - 10, BASE - 3, 30, 4, at(STONE, 3));
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

/** The steam over the wok: wisps rising, `frame` 1 to 4, thinning as they go. */
function drawSteam(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  const top = 64 - frame * 11;
  for (let i = 0; i < 4; i++) {
    const x = WOK.x - 20 + i * 13;
    const rise = top + i * 6;
    const height = 34 + frame * 11 - i * 4;
    const sway = Math.round(Math.sin(i * 1.7 + frame) * 3);
    canvas.ellipse(
      x - 4 + sway,
      WOK.y - 8 - height - rise,
      8 + frame * 3,
      height,
      at(STEAM, Math.min(3, frame)),
    );
  }
}

/** The wok's flame at the high moment: a burst, a tall plume, its last embers, sparks. */
function drawFlare(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  const height = [0, 42, 100, 156][frame] ?? 0;
  const width = [0, 40, 26, 12][frame] ?? 0;
  canvas.paint(WOK.x - width, WOK.y - height, width * 2, height, (x, y) => {
    const t = (WOK.y - y) / height;
    const sway = Math.sin(t * 9 + frame * 1.7) * (1 - t) * 4;
    const half = (width * (1 - t * 0.55)) / 2;
    if (Math.abs(x + 0.5 - WOK.x - sway) > half) return undefined;
    const core = Math.abs(x + 0.5 - WOK.x - sway) < half * 0.45 && t < 0.55;
    return at(FLARE, core ? 3 : t < 0.3 ? 2 : t < 0.62 ? 1 : 0);
  });
  canvas.ellipse(WOK.x - 20, WOK.y - 12, 40, 14, at(FLARE, 2));
  for (let spark = 0; spark < 7; spark++) {
    const x = WOK.x + Math.round(Math.sin(spark * 2.1 + frame) * (26 + spark * 3));
    const y = WOK.y - 34 - spark * 15 - frame * 5;
    if (y < 0) continue;
    canvas.fill(x, y, 2, 2, at(FLARE, 3));
  }
}

/** A string of small lanterns across the alley, `ramp` their paper, `step` their spacing. */
function drawLanternString(
  canvas: Canvas,
  from: { x: number; y: number },
  to: { x: number; y: number },
  sag: number,
  step: number,
  ramp: readonly number[],
  offset = 0,
): void {
  for (let x = from.x; x <= to.x; x++) {
    const t = (x - from.x) / (to.x - from.x);
    const y = Math.round(from.y + (to.y - from.y) * t + sag * Math.sin(t * Math.PI));
    canvas.set(x, y, at(WIRE, 1));
  }
  for (let x = offset; x < canvas.width; x += step) {
    const t = (x - from.x) / (to.x - from.x);
    const y = Math.round(from.y + (to.y - from.y) * t + sag * Math.sin(t * Math.PI));
    canvas.vline(x, y, 4, at(WIRE, 0));
    drawSmallLantern(canvas, x, y + 4, ramp);
  }
}

// --- The animations. ----------------------------------------------------------------------------

export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'steam',
    rect: { x: WOK.x - 64, y: WOK.y - 190, width: 128, height: 190 },
    frames: 5,
    timeline: timelineOf(steamAt),
  },
  {
    name: 'flare',
    rect: { x: WOK.x - 64, y: WOK.y - 200, width: 128, height: 200 },
    frames: 4,
    timeline: timelineOf(flareAt),
  },
  {
    name: 'cook',
    rect: { x: VENDOR.x - 58, y: VENDOR.y - 98, width: 116, height: 66 },
    frames: 3,
    timeline: timelineOf(cookAt),
  },
  {
    name: 'cat',
    rect: { x: CAT.x - 18, y: CAT.y - 44, width: 48, height: 46 },
    frames: 2,
    timeline: timelineOf(catAt),
  },
  ...CROWD.map(({ x }, index): Animation => ({
    name: `crowd${index}`,
    rect: { x: x - 28, y: BASE - 72, width: 56, height: 72 },
    frames: 2,
    timeline: timelineOf((step) => crowdAt(step, index * 45)),
  })),
  {
    name: 'cloth',
    rect: { x: LEFT.left + 28, y: LEFT.roof + 58, width: 214, height: 162 },
    frames: 2,
    timeline: timelineOf(clothAt),
  },
  {
    name: 'drip',
    rect: { x: RIGHT.right - 64, y: RIGHT.roof + 54, width: 44, height: BASE - RIGHT.roof - 54 },
    frames: 4,
    timeline: timelineOf(dripAt),
    weather: 'rain',
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
  // The lane's stone, the cart far back, the crowd at its edges.
  drawGround(canvas, width);
  drawCart(canvas);
  CROWD.forEach(({ x, facing, head }, index) => {
    drawCrowd(canvas, x, facing, head, frameOf(`crowd${index}`));
  });
  drawScooter(canvas, SCOOTER_AT.x, SCOOTER_AT.y);
  // The left stall: cloth.
  drawAwning(canvas, LEFT);
  drawBackPanel(canvas, LEFT);
  drawGlow(canvas, 136, 232);
  drawCloth(canvas, LEFT, frameOf('cloth'));
  drawCounterFront(canvas, LEFT);
  drawGoods(canvas, LEFT);
  drawNoren(canvas, LEFT.left + 244, LEFT.roof + 54, 54, AWNING_CREAM, '衣');
  drawSign(canvas, LEFT.left + 200, LEFT.roof + 58, '衣', 2);
  // The right stall: the wok, the cook behind it.
  drawAwning(canvas, RIGHT);
  drawBackPanel(canvas, RIGHT);
  drawGlow(canvas, 1302, 226);
  const cook = frameOf('cook');
  drawFigure(
    canvas,
    { ...VENDOR, pose: cook === 1 ? STIRRING : cook === 2 ? TOSSING : STANDING },
    FIGURE_RAMPS,
  );
  drawCounterFront(canvas, RIGHT);
  canvas.fill(WOK.x - 20, WOK.y - 10, 40, 10, at(STONE, 0));
  canvas.ellipse(WOK.x - 18, WOK.y - 14, 36, 12, at(STONE, 1));
  for (let index = 0; index < 4; index++) {
    const x = RIGHT.left + 22 + index * 40;
    canvas.fill(x, RIGHT.counter - 18, 24, 18, at(CRATE, 2));
    canvas.hline(x, RIGHT.counter - 18, 24, at(CRATE, 1));
  }
  drawUtensils(canvas);
  drawCat(canvas, frameOf('cat'));
  drawNoren(canvas, RIGHT.left + 34, RIGHT.roof + 54, 54, AWNING_RED, '大');
  drawLanternString(canvas, { x: 0, y: 92 }, { x: width, y: 108 }, 26, 132, LANTERN);
  drawLanternString(canvas, { x: 0, y: 152 }, { x: width, y: 166 }, 18, 184, LANTERN_PALE, 40);
  for (const { x, y, name } of LANTERNS) drawLantern(canvas, x, y, frameOf(name));
  drawSign(canvas, SIGN_RIGHT.x, SIGN_RIGHT.y, '大吉', 2);
  drawSteam(canvas, frameOf('steam'));
  drawFlare(canvas, frameOf('flare'));
  drawDrip(canvas, frameOf('drip'));
  // The lane's front lip, over the stalls' feet.
  canvas.fill(0, GROUND, width, height - GROUND, at(STONE, 0));
  return canvas;
}
