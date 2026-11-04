/**
 * The middle layer (docs/art/decor-dojo.md §2.2): the hall. The pillars left and right, the
 * lanterns between them, the scroll over the tokonoma, the training dummy in its corner; the wave
 * of light that passes from lantern to lantern (the moment). Flat tones, simple masses where the
 * fighters stand (docs/art/proprete.md). Image pixels (STAGE_SCALE).
 *
 * What moves loops over CYCLE; the wave of light passes at SWELL_AT.
 */

import { Canvas, at } from '../kit/canvas.ts';
import type { Rect } from '../kit/stage.ts';
import {
  DUMMY,
  LANTERN,
  LIGHT_POOL,
  PAPER_LIT,
  RAIN,
  ROPE,
  SCROLL,
  SHADOW,
  WOOD_DARK,
  WOOD_LIGHT,
} from './palette.ts';

/** Row where the pillars rest, and the fighters' ground. */
export const BASE = 432;
const GROUND = 460;

/** Steps of 1/60 s: the cycle of 40 s, the wave of light at SWELL_AT. */
export const CYCLE = 2400;
export const SWELL_AT = 1200;

const PILLARS = [96, 1344] as const;
const LANTERNS = [
  { x: 400, y: 300 },
  { x: 720, y: 284 },
  { x: 1040, y: 300 },
] as const;
const SCROLL_AT = { x: 530, y: 240 } as const;
const DUMMY_AT = { x: 240, y: BASE - 6 } as const;

export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  readonly timeline: readonly (readonly [number, number])[];
  /** It is there only in this weather (the rain on the screens). */
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

/** The wave of light: it passes from lantern to lantern around SWELL_AT, each state held long. */
function swellAt(step: number): number {
  const into = (((step - SWELL_AT) % CYCLE) + CYCLE) % CYCLE;
  if (into < 40) return 0;
  if (into < 80) return 1;
  if (into < 120) return 2;
  if (into < 160) return 3;
  return 0;
}

/** The scroll's sway, and the tassel's. */
function scrollAt(step: number): number {
  return step % 240 < 40 ? 1 : 0;
}

function tasselAt(step: number): number {
  return Math.floor(step / 60) % 3;
}

/** The rain on the screens: three moments of the streaks. */
function rainAt(step: number): number {
  return Math.floor(step / 40) % 4;
}

/** A pillar: its column, its base, its shadow. */
function drawPillar(canvas: Canvas, x: number): void {
  canvas.fill(x - 14, 60, 28, BASE - 60, at(WOOD_DARK, 1));
  canvas.vline(x - 12, 60, BASE - 60, at(WOOD_DARK, 3));
  canvas.vline(x + 11, 60, BASE - 60, at(WOOD_DARK, 0));
  canvas.fill(x - 20, 60, 40, 8, at(WOOD_DARK, 2));
  canvas.fill(x - 24, BASE - 10, 48, 10, at(WOOD_DARK, 2));
  canvas.hline(x - 24, BASE - 10, 48, at(WOOD_DARK, 3));
}

/** A paper lantern: its cord, its frame, its paper, its heart; `halo` lights the air around it. */
function drawLantern(canvas: Canvas, x: number, y: number, halo: number): void {
  canvas.vline(x, y - 46, 46, at(ROPE, 1));
  if (halo > 0) canvas.ellipse(x - 26, y - 22, 52, 44, at(PAPER_LIT, 0));
  if (halo > 1) canvas.ellipse(x - 18, y - 15, 36, 30, at(PAPER_LIT, 1));
  canvas.fill(x - 12, y - 2, 24, 3, at(WOOD_DARK, 2));
  canvas.ellipse(x - 13, y, 26, 30, at(LANTERN, 2));
  canvas.ellipse(x - 9, y + 2, 18, 24, at(LANTERN, 3));
  canvas.ellipse(x - 5, y + 4, 10, 16, at(LANTERN, 4));
  for (let dx = -10; dx <= 10; dx += 5) canvas.vline(x + dx, y + 1, 28, at(LANTERN, 1));
  canvas.fill(x - 12, y + 28, 24, 3, at(WOOD_DARK, 0));
}

/** The scroll over the tokonoma: its rope, its roller, its paper, a pale mountain; its tassel
 * sways with `frame`. */
function drawScroll(canvas: Canvas, frame: number): void {
  const { x, y } = SCROLL_AT;
  canvas.vline(x, y - 30, 30, at(ROPE, 0));
  canvas.fill(x - 34, y, 68, 90, at(SCROLL, 1));
  canvas.hline(x - 34, y, 68, at(WOOD_DARK, 2));
  canvas.hline(x - 34, y + 89, 68, at(WOOD_DARK, 1));
  // The mountain: a pale triangle in a circle.
  canvas.fill(x - 22, y + 34, 44, 12, at(SCROLL, 1));
  canvas.ellipse(x - 12, y + 20, 24, 18, at(PAPER_LIT, 0));
  canvas.paint(x - 16, y + 22, 32, 14, (px, py) => {
    const edge = Math.abs((px - (x - 16)) / 32 - 0.5) * 2;
    if (py > y + 32 - edge * 9) return undefined;
    return at(SCROLL, 0);
  });
  // The tassel, swinging under the roller.
  const swing = frame === 1 ? 2 : 0;
  canvas.vline(x + swing, y + 90, 8, at(ROPE, 1));
  canvas.fill(x - 2 + swing, y + 98, 5, 4, at(ROPE, 0));
}

/** The training dummy: a post on a stand, padded. */
function drawDummy(canvas: Canvas): void {
  const { x, y } = DUMMY_AT;
  canvas.ellipse(x - 20, y - 6, 44, 10, at(SHADOW, 0));
  canvas.fill(x - 24, y - 12, 48, 12, at(WOOD_DARK, 2));
  canvas.fill(x - 6, y - 96, 12, 84, at(DUMMY, 1));
  canvas.vline(x - 5, y - 96, 84, at(DUMMY, 0));
  canvas.ellipse(x - 10, y - 108, 20, 24, at(DUMMY, 1));
  canvas.ellipse(x - 14, y - 74, 28, 26, at(DUMMY, 1));
  canvas.fill(x - 16, y - 46, 32, 14, at(DUMMY, 0));
}

/** The rain streaks on the screens, by weather only. */
function drawRainStreaks(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  for (let screen = 0; screen < 7; screen++) {
    const x = 80 + screen * 180;
    for (let streak = 0; streak < 4; streak++) {
      const dx = streak * 30 + frame * 8;
      canvas.line(x + 20 + dx, 110, x + 10 + dx, 150 + frame * 20, at(RAIN, 1), 2);
      canvas.line(x + 90 + dx, 120, x + 82 + dx, 160 + frame * 20, at(RAIN, 0), 2);
    }
  }
}

// --- The animations. ----------------------------------------------------------------------------

export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'swell',
    rect: { x: 360, y: 220, width: 720, height: 120 },
    frames: 4,
    timeline: timelineOf(swellAt),
  },
  {
    name: 'scroll',
    rect: { x: SCROLL_AT.x - 40, y: SCROLL_AT.y - 34, width: 82, height: 140 },
    frames: 2,
    timeline: timelineOf(scrollAt),
  },
  {
    name: 'tassel',
    rect: { x: LANTERNS[1].x - 14, y: LANTERNS[1].y + 28, width: 28, height: 20 },
    frames: 3,
    timeline: timelineOf(tasselAt),
  },
  {
    name: 'rain',
    rect: { x: 60, y: 100, width: 1080, height: 190 },
    frames: 4,
    timeline: timelineOf(rainAt),
    weather: 'rain',
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
  // The polished floor, the light the lanterns lay, the shade of the pillars.
  canvas.fill(0, BASE, width, height - BASE, at(WOOD_LIGHT, 1));
  canvas.fill(0, BASE, width, 6, at(WOOD_LIGHT, 2));
  for (let x = 0; x < width; x += 128) canvas.vline(x, BASE, height - BASE, at(WOOD_LIGHT, 0));
  for (const { x } of LANTERNS) {
    canvas.ellipse(x - 52, BASE + 2, 104, 20, at(LIGHT_POOL, 1));
    canvas.ellipse(x - 30, BASE + 6, 60, 12, at(LIGHT_POOL, 2));
  }
  for (const x of PILLARS) {
    canvas.fill(x - 24, BASE, 48, 5, at(SHADOW, 0));
  }
  // A worn mark on the floor, where the steps fell.
  canvas.ellipse(720, BASE + 14, 90, 8, at(LIGHT_POOL, 2));
  for (const x of PILLARS) drawPillar(canvas, x);
  drawScroll(canvas, frameOf('scroll'));
  drawDummy(canvas);
  // The lanterns, the wave of light through them.
  const swell = frameOf('swell');
  LANTERNS.forEach(({ x, y }, index) => {
    drawLantern(canvas, x, y, swell === 0 ? 0 : swell === index + 1 ? 2 : 0);
  });
  drawRainStreaks(canvas, frameOf('rain'));
  canvas.fill(0, GROUND, width, height - GROUND, at(WOOD_LIGHT, 0));
  return canvas;
}
