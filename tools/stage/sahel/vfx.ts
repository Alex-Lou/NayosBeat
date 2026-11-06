/**
 * Sahel Sunset's living lights and air (docs/art/decor-sahel.md §4): the brazier's fire, its
 * sparks and glow, the smoke of the fire and of the stall's grill, the cones of the street lamps,
 * the moths around them, and the radio that sets the crowd's beat. All drawn pixel by pixel, at
 * the fighters' grain, in flat values with hard edges: a flame is three clean tones, a puff of
 * smoke a lit side and a shadow side, never a blur.
 */

import type { Rgba } from '../../sprites/png.ts';
import { Canvas } from '../kit/canvas.ts';
import type { CodeProp, Rect } from '../kit/stage.ts';
import { enlist, imageIn } from './shared.ts';
import { BEAT, timelineOf } from './crowd.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

function hash(seed: number, a: number, b = 0): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(a + 0x632be5ab, 0xc2b2ae35);
  value = Math.imul(value ^ (b * 0x27d4eb2d), 0x165667b1);
  value ^= value >>> 15;
  return (value >>> 0) / 0x100000000;
}

/** A prop of `frames` frames over `rect` of the middle layer, frame 0 clear and never shown. */
function prop(
  name: string,
  rect: Rect,
  palette: number,
  frames: number,
  timeline: readonly (readonly [number, number])[],
  draw: (canvas: Canvas, frame: number) => void,
): CodeProp {
  return {
    name,
    layer: 'mid',
    rect,
    timeline,
    frames: Array.from({ length: frames + 1 }, (_, frame) => {
      const canvas = new Canvas(rect.width, rect.height);
      if (frame > 0) draw(canvas, frame);
      return imageIn(canvas, palette);
    }),
    overlay: true,
  };
}

/** Frames 1 to `count`, each `steps` long, round and round. */
function loop(count: number, steps: number): [number, number][] {
  return Array.from({ length: count }, (_, i) => [i + 1, steps] as [number, number]);
}

// ── The brazier ─────────────────────────────────────────────────────────────────────────────

/** The red oil drum by the Jeep, burning: its top, in middle-layer pixels. */
const BRAZIER = { x: 405, y: 353 } as const;

const FIRE: readonly Rgba[] = [
  CLEAR,
  { r: 92, g: 22, b: 18, a: 255 },
  { r: 186, g: 52, b: 24, a: 255 },
  { r: 240, g: 118, b: 36, a: 255 },
  { r: 255, g: 196, b: 82, a: 255 },
  { r: 255, g: 246, b: 196, a: 255 },
];
const FIRE_AT = enlist(FIRE);

/** A flame: its outer dark red, then orange, yellow, and a white core, each a clean shape. */
function flame(canvas: Canvas, frame: number): void {
  const cx = 12;
  const base = 25;
  const tongues = [
    { dx: -5, tall: 10 },
    { dx: -1, tall: 18 },
    { dx: 3, tall: 13 },
    { dx: 6, tall: 8 },
  ];
  for (const [ring, shrink] of [
    [1, 0],
    [2, 1],
    [3, 2],
    [4, 4],
    [5, 6],
  ] as const) {
    tongues.forEach(({ dx, tall }, t) => {
      const flicker = Math.round((hash(frame, t, ring) - 0.5) * 6);
      const height = Math.max(0, tall + flicker - shrink * 2);
      const half = Math.max(0, 4 - Math.floor(shrink / 2));
      for (let y = 0; y < height; y++) {
        const narrow = Math.round((half * (height - y)) / Math.max(1, height));
        const sway = Math.round(Math.sin((y / 6 + frame) * 1.3) * (y / 8));
        canvas.fill(cx + dx - narrow + sway, base - y, narrow * 2 + 1, 1, ring);
      }
    });
  }
}

/** Sparks: single pixels flying up from the fire, cooling as they rise. */
function sparks(canvas: Canvas, frame: number): void {
  for (let s = 0; s < 7; s++) {
    const age = (frame + s * 3) % 12;
    const x = 12 + Math.round((hash(s, 1) - 0.5) * 14 + Math.sin(age * 0.8 + s) * 3);
    const y = 18 - age * 3 - Math.round(hash(s, 2) * 4);
    if (y < 0) continue;
    canvas.set(x, y, age < 4 ? 5 : age < 8 ? 4 : 3);
  }
}

const GLOW: readonly Rgba[] = [
  CLEAR,
  { r: 255, g: 150, b: 70, a: 26 },
  { r: 255, g: 170, b: 80, a: 46 },
  { r: 255, g: 200, b: 110, a: 70 },
];
const GLOW_AT = enlist(GLOW);

/** The fire's light on the drum, the Jeep and the ground around it, breathing with the flame. */
function glow(canvas: Canvas, frame: number): void {
  const pulse = [0, 2, 1][frame - 1] ?? 0;
  const cx = canvas.width / 2;
  const cy = 40;
  for (const [ring, rx, ry] of [
    [1, 54 + pulse, 34 + pulse],
    [2, 36 + pulse, 22 + pulse],
    [3, 18 + pulse, 11],
  ] as const) {
    canvas.ellipse(cx - rx, cy - ry, rx * 2, ry * 2, ring);
  }
}

// ── The smoke ───────────────────────────────────────────────────────────────────────────────

const SMOKE: readonly Rgba[] = [
  CLEAR,
  { r: 58, g: 40, b: 50, a: 215 },
  { r: 98, g: 72, b: 82, a: 205 },
  { r: 146, g: 108, b: 106, a: 195 },
  { r: 214, g: 152, b: 112, a: 185 },
];
const SMOKE_AT = enlist(SMOKE);

/**
 * A plume: puffs rising and swelling, drifting with the wind, each a hard-edged disc with a
 * sunlit side (toward the low sun, up-left) and a shadow side, thinning out as it climbs.
 */
function plume(canvas: Canvas, frame: number, frames: number, wind: number): void {
  const puffs = 12;
  const base = canvas.height - 4;
  for (let p = 0; p < puffs; p++) {
    const life = (p + frame / frames) / puffs;
    // Each puff its own size and its own sway, seeded by its rank in the plume.
    const seed = (p - Math.floor((p + frame / frames) / puffs) * puffs + puffs) % puffs;
    const y = Math.round(base - life * (canvas.height - 14));
    const sway = Math.sin(life * 7 + seed * 1.9) * (2 + life * 4);
    const x = Math.round(canvas.width / 2 + wind * life * life * 34 + sway);
    const r = Math.max(2, Math.round((2.5 + life * 10) * (0.75 + hash(seed, 3) * 0.5)));
    const keep = life < 0.68 ? 1 : life < 0.86 ? 0.5 : 0.25;
    canvas.paint(x - r, y - r, r * 2 + 1, r * 2 + 1, (px, py) => {
      const dx = px - x;
      const dy = py - y;
      if (dx * dx + dy * dy > r * r) return undefined;
      if (keep < 1 && ((px + py) % Math.round(1 / keep) !== 0 || (keep < 0.5 && px % 2 === 0))) {
        return undefined;
      }
      // Lit by the low sun up-left, and near the ground by the fire under it.
      const lit = dx + dy < -r * 0.5 || (life < 0.2 && dy > r * 0.3);
      const shade = dx + dy > r * 0.5;
      return lit ? 4 : shade ? 2 : 3;
    });
    if (keep === 1) {
      for (let a = 0; a < 14; a++) {
        const angle = (a / 14) * Math.PI * 0.7 + Math.PI * 0.05;
        canvas.set(x + Math.round(Math.cos(angle) * r), y + Math.round(Math.sin(angle) * r), 1);
      }
    }
  }
}

// ── The lamps ───────────────────────────────────────────────────────────────────────────────

const CONE: readonly Rgba[] = [
  CLEAR,
  { r: 255, g: 190, b: 110, a: 18 },
  { r: 255, g: 210, b: 140, a: 32 },
];
const CONE_AT = enlist(CONE);

/** A street lamp's cone of light down to the road, its core a step brighter. */
function cone(canvas: Canvas, frame: number, dim: boolean): void {
  const top = 2;
  const width = canvas.width;
  for (let y = top; y < canvas.height; y++) {
    const t = (y - top) / (canvas.height - top);
    const half = Math.round(3 + t * (width / 2 - 4));
    const core = Math.round(half * 0.45);
    const cx = Math.floor(width / 2);
    canvas.fill(cx - half, y, half * 2 + 1, 1, 1);
    if (!dim && (y + frame) % 1 === 0) canvas.fill(cx - core, y, core * 2 + 1, 1, 2);
  }
}

const MOTH: readonly Rgba[] = [
  CLEAR,
  { r: 255, g: 236, b: 190, a: 255 },
  { r: 120, g: 82, b: 60, a: 255 },
];
const MOTH_AT = enlist(MOTH);

/** Moths around a lamp: lit specks circling it, their shadow pixel under them. */
function moths(canvas: Canvas, frame: number): void {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  for (let m = 0; m < 5; m++) {
    const angle = (frame / 8) * Math.PI * 2 * (m % 2 === 0 ? 1 : -1) + m * 1.7;
    const r = 6 + m * 3;
    const x = Math.round(cx + Math.cos(angle) * r);
    const y = Math.round(cy + Math.sin(angle) * r * 0.6);
    canvas.set(x, y, 1);
    canvas.set(x, y + 1, 2);
  }
}

// ── The radio ───────────────────────────────────────────────────────────────────────────────

/** The radio on the crate by the bench, the crowd's beat: its bottom left, middle-layer pixels. */
const RADIO = { x: 258, y: 386 } as const;

const RADIO_COLORS: readonly Rgba[] = [
  CLEAR,
  { r: 14, g: 10, b: 16, a: 255 },
  { r: 40, g: 34, b: 44, a: 255 },
  { r: 72, g: 62, b: 74, a: 255 },
  { r: 140, g: 120, b: 120, a: 255 },
  { r: 236, g: 120, b: 52, a: 255 },
  { r: 255, g: 214, b: 120, a: 255 },
];
const RADIO_COLORS_AT = enlist(RADIO_COLORS);

/** A boombox: its body and outline, two speakers that pump on the beat, an antenna, a light. */
function radio(canvas: Canvas, frame: number): void {
  const pump = frame === 2 ? 1 : 0;
  const x = 2;
  const y = canvas.height - 14;
  canvas.fill(x, y, 26, 13, 1);
  canvas.fill(x + 1, y + 1, 24, 11, 2);
  canvas.hline(x + 1, y + 1, 24, 3);
  canvas.fill(x + 9, y + 2, 8, 3, 4);
  canvas.set(x + 22, y + 3, frame === 2 ? 6 : 5);
  for (const sx of [x + 5, x + 20]) {
    const r = 3 + pump;
    canvas.ellipse(sx - r, y + 8 - r, r * 2, r * 2, 1);
    canvas.ellipse(sx - 2, y + 8 - 2, 4, 4, 3);
    canvas.set(sx, y + 8, 4);
  }
  canvas.line(x + 3, y - 1, x + 1, y - 9, 3);
  canvas.fill(x + 10, y - 2, 6, 2, 1);
}

// ── The props ───────────────────────────────────────────────────────────────────────────────

export function vfxProps(): CodeProp[] {
  return [
    prop(
      'brazier-glow',
      { x: BRAZIER.x - 60, y: BRAZIER.y - 40, width: 120, height: 80 },
      GLOW_AT,
      3,
      [
        [1, 7],
        [2, 5],
        [3, 6],
        [2, 4],
        [1, 5],
        [3, 4],
      ],
      glow,
    ),
    prop(
      'brazier-fire',
      { x: BRAZIER.x - 12, y: BRAZIER.y - 26, width: 24, height: 28 },
      FIRE_AT,
      6,
      loop(6, 5),
      (canvas, frame) => {
        flame(canvas, frame);
        sparks(canvas, frame);
      },
    ),
    prop(
      'brazier-smoke',
      { x: BRAZIER.x - 48, y: BRAZIER.y - 146, width: 96, height: 126 },
      SMOKE_AT,
      8,
      loop(8, 9),
      (canvas, frame) => {
        plume(canvas, frame, 8, 1);
      },
    ),
    prop(
      'grill-smoke',
      { x: 1236, y: 116, width: 96, height: 124 },
      SMOKE_AT,
      8,
      loop(8, 10),
      (canvas, frame) => {
        plume(canvas, frame, 8, -1);
      },
    ),
    prop(
      'cone-street',
      { x: 690, y: 196, width: 56, height: 200 },
      CONE_AT,
      2,
      [
        [1, 600],
        [2, 4],
        [1, 6],
        [2, 3],
        [1, 400],
      ],
      (canvas, frame) => {
        cone(canvas, frame, frame === 2);
      },
    ),
    prop(
      'cone-lane',
      { x: 830, y: 264, width: 34, height: 120 },
      CONE_AT,
      2,
      [
        [1, 900],
        [2, 5],
        [1, 3],
        [2, 8],
        [1, 300],
      ],
      (canvas, frame) => {
        cone(canvas, frame, frame === 2);
      },
    ),
    prop('moths', { x: 1257, y: 8, width: 40, height: 34 }, MOTH_AT, 8, loop(8, 4), moths),
    prop(
      'radio',
      { x: RADIO.x, y: RADIO.y - 26, width: 30, height: 26 },
      RADIO_COLORS_AT,
      2,
      timelineOf((step) => (step % BEAT < 6 ? 2 : 1)),
      radio,
    ),
  ];
}
