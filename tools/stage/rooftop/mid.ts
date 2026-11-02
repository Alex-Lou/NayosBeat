/**
 * The middle layer (docs/art/decor-rooftop.md §2.2): the roof behind the fighters. On the left the
 * stair hut, its sodium lamp over the door, two of the crowd sheltering under it; the giant sign
 * ネオン seen from behind on its truss, its violet light spilling into the rain; the water tank on
 * its stilts, the air conditioners, the antenna mast and its red light, the vertical sign 大吉
 * glowing yellow; on the right, laundry on a line. The back parapet runs behind them all, the city
 * past it (the far layer). Transparent where the far layer shows. Image pixels (STAGE_SCALE): the
 * roof's back is row BASE; what is under the ground line (row 460) is hidden by the floor.
 *
 * What the blimp shakes loops over BLIMP_CYCLE, with it (far.ts).
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { lightAt, type Light } from '../kit/light.ts';
import { noise, streamOf } from '../kit/random.ts';
import type { Rect } from '../kit/stage.ts';
import { drawFigure, HIP, type Figure, type Pose } from '../rue/people.ts';
import { drawTag } from '../rue/signs.ts';
import { BLIMP_CYCLE, PASS, PASS_AT } from './far.ts';
import { wetAt } from './floor.ts';
import {
  AVIATION,
  CLOTH,
  CONCRETE,
  EMBER,
  FIGURE_RAMPS,
  MEMBRANE,
  NEON_GREEN,
  NEON_VIOLET,
  NEON_YELLOW,
  PALE,
  REFLECT_VIOLET,
  REFLECT_YELLOW,
  RIM_WARM,
  RUST,
  SODIUM,
  SPRAY_RAMPS,
  STEAM,
  STEEL,
  TANK,
  UMBRELLA,
  WET,
} from './palette.ts';
import { drawSignBack, signLetters } from './signs.ts';

/** Row of the roof's back, at the parapet's foot. */
export const BASE = 404;
/** The back parapet's coping. */
const PARAPET = 386;
/** Last row the layer draws: just past the ground line, under the floor's top edge. */
const FLOOR_END = 470;
/** Where what stands on the roof has its feet, a little in front of the parapet. */
const FEET = 428;
const HUT = { left: 56, right: 252, roof: 262 } as const;
const DOOR: Rect = { x: 148, y: 330, width: 42, height: FEET - 330 };
const LAMP = { x: 169, y: 318 } as const;
/** The giant sign ネオン: its letters' top left, a font pixel's size, and its truss. */
/**
 * The fight's closest framing shows the world from y 71 down (src/render/camera-framing.ts), its HUD
 * over the first thirty: the signs come down far enough to read under it, over the fighters' heads.
 */
const NEON = { x: 318, y: 128, scale: 12 } as const;
const TRUSS = { left: 312, right: 716, top: 254 } as const;
const TANK_AT = { cx: 800, top: 196, body: 104, width: 108 } as const;
const UNITS = [
  { x: 878, width: 70 },
  { x: 956, width: 70 },
] as const;
const UNIT = { top: 362, height: FEET - 362 } as const;
const MAST = { x: 1056, top: 236 } as const;
/** The vertical sign 大吉, on its spine. */
const LUCK = { x: 1096, y: 116, scale: 9, spine: 1136 } as const;
const LINE = { left: 1236, right: 1400, y: 318 } as const;
const DRONE = { x: 700, y: 296 } as const;

/** The hut's lamp; the signs' light on the roof. */
const LIGHTS: readonly Light[] = [
  { x: LAMP.x, y: LAMP.y + 8, radius: 120, strength: 1.8, squash: 1 },
  { x: LAMP.x, y: 430, radius: 110, strength: 0.9, squash: 0.35 },
  { x: 516, y: 250, radius: 260, strength: 1.1, squash: 0.7 },
  { x: LUCK.spine, y: 230, radius: 170, strength: 0.9, squash: 0.9 },
];

/** An animation of the layer: what it covers, and how it draws each of its frames. */
export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  /** Frame and the steps (1/60 s) it lasts, in order, looping. */
  readonly timeline: readonly (readonly [number, number])[];
}

/** A timeline over BLIMP_CYCLE: the frame at each step, runs of the same frame merged. */
function timelineOf(frameAt: (step: number) => number): [number, number][] {
  const timeline: [number, number][] = [];
  for (let step = 0; step < BLIMP_CYCLE; step++) {
    const frame = frameAt(step);
    const last = timeline[timeline.length - 1];
    if (last && last[0] === frame) last[1] += 1;
    else timeline.push([frame, 1]);
  }
  return timeline;
}

/** Whether the blimp is over the roof at `step`: the middle of its pass, its hum the loudest. */
export function overhead(step: number): boolean {
  return step >= PASS_AT + PASS * 0.3 && step < PASS_AT + PASS * 0.7;
}

// --- The roof. ----------------------------------------------------------------------------------

/** The back parapet, its coping lit; past it, the city (transparent above). */
function drawParapet(canvas: Canvas): void {
  canvas.paint(0, PARAPET, canvas.width, BASE - PARAPET, (x, y) => {
    if (y === PARAPET) return at(CONCRETE, 5);
    if (y < PARAPET + 4) return tone(CONCRETE, 3.4 + lightAt(LIGHTS, x, y) * 0.6, x, y);
    const joint = x % 96 === 0 ? -1 : 0;
    const stain = noise(31, x, y, 6) > 0.7 ? -0.6 : 0;
    return tone(CONCRETE, 1.4 + joint + stain + lightAt(LIGHTS, x, y) * 0.8, x, y);
  });
}

/** A sign seen in the puddles: its letters, its columns, its letters' foot, its light. */
interface Reflected {
  readonly letters: Mask;
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  /** Sign rows a puddle row covers: the reflection stretched toward the viewer. */
  readonly stretch: number;
  readonly ramp: readonly number[];
}

/**
 * The roof's membrane from the parapet to the ground line: slate sheets, their seams, lit by the
 * lamp and the signs; its puddles in WET, the signs' streaks in them (REFLECT_*), which only the
 * rain shows (palette.ts).
 */
function drawMembrane(canvas: Canvas, signs: readonly Reflected[]): void {
  canvas.paint(0, BASE, canvas.width, FLOOR_END - BASE, (x, y) => {
    const near = (y - BASE) / (FLOOR_END - BASE);
    const seam = x % 128 === 0 ? -0.8 : x % 128 === 1 ? 0.6 : 0;
    const level =
      1.2 + near * 0.6 + seam + lightAt(LIGHTS, x, y) * 0.9 + (noise(37, x, y, 18) - 0.5) * 0.4;
    // Under the signs, the roof sags: the rain pools there the most.
    const sign = signs.find(({ left, right }) => x >= left && x < right);
    const pooled = sign !== undefined && noise(45, x, y * 2, 40) > 0.36;
    if (!wetAt(41, x, y) && !pooled) return tone(MEMBRANE, level, x, y);
    // A puddle: the sign upside down in it, stretched and broken by the ripples; elsewhere water.
    if (sign && (y + Math.floor(noise(44, x, y, 6) * 3)) % 3 !== 0) {
      const ripple = Math.round(Math.sin(y * 1.7) * 2);
      const mirrored = Math.round(sign.bottom - (y - BASE) * sign.stretch);
      const lit = [-3, 0, 3].some((dy) => sign.letters.has(x + ripple, mirrored + dy));
      // At the membrane's own tone: dry, nothing shows (palette.ts); the rain lights each step.
      if (lit) return tone(sign.ramp, level, x, y);
    }
    return tone(WET, level, x, y);
  });
  // The parapet's shadow along the back.
  canvas.paint(0, BASE, canvas.width, 3, (x, y) => tone(MEMBRANE, 0.4 + (y - BASE) * 0.3, x, y));
}

// --- The stair hut. -----------------------------------------------------------------------------

function drawHut(canvas: Canvas): void {
  const { left, right, roof } = HUT;
  canvas.paint(left, roof, right - left, FEET - roof, (x, y) => {
    const course = (y - roof) % 24 === 23 ? -0.7 : 0;
    const side = x - left < 4 ? -0.5 : right - x <= 4 ? 0.6 : 0;
    const stain = noise(47, x, y * 0.3, 10) > 0.72 ? -0.5 : 0;
    return tone(CONCRETE, 1.6 + course + side + stain + lightAt(LIGHTS, x, y), x, y);
  });
  // Its flat roof's lip, a vent pipe, the cables to the sign.
  canvas.fill(left - 4, roof - 6, right - left + 8, 6, at(CONCRETE, 3));
  canvas.hline(left - 4, roof - 6, right - left + 8, at(CONCRETE, 5));
  canvas.fill(84, roof - 34, 10, 28, at(STEEL, 2));
  canvas.fill(81, roof - 38, 16, 5, at(STEEL, 3));
  canvas.vline(85, roof - 34, 28, at(STEEL, 4));
  canvas.line(right - 10, roof + 8, TRUSS.left + 6, TRUSS.top + 30, at(STEEL, 0));
  canvas.line(right - 10, roof + 14, TRUSS.left + 6, TRUSS.top + 40, at(STEEL, 0));
  // The steel door, the lamp's light on it; its kick plate, its handle.
  canvas.paint(DOOR.x, DOOR.y, DOOR.width, DOOR.height, (x, y) => {
    const frame = x === DOOR.x || x === DOOR.x + DOOR.width - 1 || y === DOOR.y;
    const plate = y > DOOR.y + DOOR.height - 16;
    return tone(STEEL, (frame ? 3.6 : plate ? 2.4 : 1.4) + lightAt(LIGHTS, x, y) * 0.8, x, y);
  });
  canvas.fill(DOOR.x + DOOR.width - 9, DOOR.y + 44, 4, 3, at(STEEL, 5));
  // The lamp: its cage, its lens; its glow on the wall.
  canvas.fill(LAMP.x - 7, LAMP.y - 3, 14, 3, at(STEEL, 3));
  canvas.fill(LAMP.x - 5, LAMP.y, 10, 5, at(SODIUM, 3));
  canvas.fill(LAMP.x - 3, LAMP.y + 1, 6, 3, at(SODIUM, 4));
  // A small green arrow of tube by the door, over the smoker's head: the way down.
  const ax = DOOR.x - 32;
  const ay = DOOR.y - 34;
  const arrow = new Mask(canvas.width, canvas.height);
  arrow.rect(ax - 2, ay, 4, 20);
  arrow.limb(ax - 8, ay + 14, ax, ay + 22, 1.5);
  arrow.limb(ax + 8, ay + 14, ax, ay + 22, 1.5);
  for (let y = ay - 4; y < ay + 28; y++) {
    for (let x = ax - 14; x < ax + 14; x++) {
      if (arrow.has(x, y)) canvas.set(x, y, at(NEON_GREEN, 3));
      else if (
        (x + y) % 2 === 0 &&
        (arrow.has(x - 2, y) || arrow.has(x + 2, y) || arrow.has(x, y - 2))
      ) {
        canvas.set(x, y, at(NEON_GREEN, 1));
      }
    }
  }
}

/** The hut's steam vent: a plume torn by the wind, four frames. */
function drawSteam(canvas: Canvas, frame: number): void {
  const x0 = 89;
  const top = HUT.roof - 40;
  for (let y = top - 2; y > top - 64; y--) {
    const rise = top - y;
    const cx = x0 - rise * 0.7 - Math.sin((rise + frame * 5) / 7) * 3;
    const half = 3 + rise * 0.2;
    for (let px = Math.round(cx - half); px < cx + half; px++) {
      const puff = noise(53 + frame, px, y + frame * 4, 7) - rise / 90;
      if (puff < 0.42) continue;
      canvas.set(px, y, tone(STEAM, 0.2 + puff * 1.2 - rise / 50, px, y));
    }
  }
}

// --- The crowd under the lamp. ------------------------------------------------------------------

/** The cigarette at the hip, the forearm forward; a drag, the hand at the mouth. */
const HOLDING: Pose = {
  ...HIP,
  arms: [
    { joint: [2, 13], end: [8, 20] },
    { joint: [-1, 13], end: [-1, 26] },
  ],
};
const DRAG: Pose = {
  ...HOLDING,
  arms: [
    { joint: [6, 9], end: [5, -4] },
    { joint: [-1, 13], end: [-1, 26] },
  ],
};
/** The umbrella's hand up at the chest. */
const UMBRELLA_HELD: Pose = {
  ...HIP,
  arms: [
    { joint: [4, 11], end: [5, 2] },
    { joint: [-2, 13], end: [-1, 24] },
  ],
};

const SMOKER: Figure = {
  x: 118,
  y: FEET,
  height: 84,
  shoulders: 30,
  facing: 1,
  head: 'hood',
  coat: 'short',
  pose: HOLDING,
  rim: { side: 1, above: true, ramp: RIM_WARM },
};
const SHELTERED: Figure = {
  x: 226,
  y: FEET,
  height: 80,
  shoulders: 28,
  facing: -1,
  head: 'long',
  coat: 'long',
  pose: UMBRELLA_HELD,
  rim: { side: -1, above: false, ramp: RIM_WARM },
  face: true,
};

/** Where a hand of `figure` is (people.ts's geometry): for the cigarette's end. */
function handOf(figure: Figure, arm: 0 | 1): [number, number] {
  const { height: tall, shoulders, facing, coat, pose } = figure;
  const k = tall / 80;
  const bulk = coat === 'puffer' ? 1.5 : 0;
  const upper = Math.max(1.8, 2.4 * k) + bulk * 0.6;
  const sx = (arm === 0 ? 1 : -1) * (shoulders / 2 - upper) + pose.lean * 0.7;
  const sy = figure.y - Math.round(tall * 0.81) + pose.dip + 4;
  const end = pose.arms[arm].end;
  return [Math.round(figure.x + (sx + end[0] * k) * facing), Math.round(sy + end[1] * k)];
}

/** The smoker, frame 1 taking a drag. */
function drawSmoker(canvas: Canvas, frame: number): void {
  const shown = { ...SMOKER, pose: frame === 1 ? DRAG : HOLDING };
  drawFigure(canvas, shown, FIGURE_RAMPS);
  const [hx, hy] = handOf(shown, 0);
  const tip = hx + 3;
  canvas.set(tip, hy - 1, at(EMBER, frame === 1 ? 1 : 0));
  canvas.set(tip - 1, hy - 1, at(PALE, 0));
  if (frame !== 1) return;
  for (const [dx, dy] of [
    [2, -4],
    [3, -6],
    [1, -8],
    [3, -10],
  ] as const) {
    canvas.set(tip + dx, hy + dy, at(STEAM, 1));
  }
}

/** The one under the umbrella: its dark canopy, its rim lit by the lamp, its shaft in the hand. */
function drawSheltered(canvas: Canvas): void {
  drawFigure(canvas, SHELTERED, FIGURE_RAMPS);
  const [hx, hy] = handOf(SHELTERED, 0);
  const rows = 20;
  const top = SHELTERED.y - SHELTERED.height - rows + 2;
  canvas.line(hx, hy, hx + 2, top + 10, at(STEEL, 3));
  const cx = hx + 2;
  for (let row = 0; row < rows; row++) {
    const half = Math.round(30 * Math.sqrt(row / (rows - 1)));
    for (let x = cx - half; x < cx + half; x++) {
      // Its top lit by the lamp on the lamp's side; its ribs; its scalloped hem.
      const rib = (x - cx + 60) % 15 === 0 && row > 2;
      const lit = row <= 2 + Math.max(0, (cx - x) / 10) && x < cx + 6;
      canvas.set(x, top + row, lit ? at(RIM_WARM, row === 0 ? 1 : 0) : at(UMBRELLA, rib ? 2 : 1));
    }
  }
  for (let x = cx - 30; x <= cx + 30; x++) {
    canvas.set(x, top + rows - 1 + ((x - cx + 60) % 15 < 8 ? 1 : 0), at(UMBRELLA, 0));
  }
  canvas.vline(cx, top - 3, 3, at(STEEL, 4));
}

// --- The giant sign ネオン and its truss. -------------------------------------------------------

/** The truss: two chords, posts and diagonals, a catwalk at the letters' foot with its railing. */
function drawTruss(canvas: Canvas): void {
  const { left, right, top } = TRUSS;
  const glow = (x: number, y: number) => lightAt(LIGHTS, x, y);
  const beam = (x0: number, y0: number, x1: number, y1: number) => {
    canvas.line(x0, y0, x1, y1, at(STEEL, 1), 3);
    canvas.line(x0, y0 - 1, x1, y1 - 1, at(STEEL, 3));
  };
  const posts = [left, left + 101, left + 202, left + 303, right - 6];
  for (const x of posts) {
    canvas.paint(x, top, 6, FEET - top, (px, py) =>
      tone(STEEL, (px === x + 5 ? 3 : 1.4) + glow(px, py) * 0.6, px, py),
    );
  }
  posts.slice(0, -1).forEach((x, index) => {
    const next = posts[index + 1] ?? right;
    beam(x + 3, top + 8, next + 3, FEET - 40);
    beam(next + 3, top + 8, x + 3, FEET - 40);
  });
  for (const y of [top + 6, FEET - 40]) {
    canvas.fill(left, y - 3, right - left, 6, at(STEEL, 2));
    canvas.hline(left, y - 3, right - left, at(STEEL, 4));
  }
  // The catwalk: its grating catches the violet from above, its railing.
  canvas.fill(left - 10, top - 4, right - left + 20, 5, at(STEEL, 2));
  canvas.hline(left - 10, top - 4, right - left + 20, at(NEON_VIOLET, 2));
  canvas.hline(left - 10, top - 14, right - left + 20, at(STEEL, 3));
  for (let x = left - 10; x < right + 10; x += 34) canvas.vline(x, top - 14, 10, at(STEEL, 3));
  // A ladder up to it, by the left post.
  canvas.vline(left - 18, top - 4, FEET - top + 4, at(STEEL, 3));
  canvas.vline(left - 8, top - 4, FEET - top + 4, at(STEEL, 3));
  for (let y = top + 4; y < FEET; y += 9) canvas.hline(left - 18, y, 11, at(STEEL, 2));
  // Rust where the rain runs down the posts.
  for (const x of posts) {
    for (let y = FEET - 30; y < FEET; y++) {
      if (noise(59, x, y, 4) > 0.55) canvas.set(x + 1, y, at(RUST, 1));
    }
  }
}

/** The sign's raceway: the steel box behind its letters that holds them and their wiring. */
function drawRaceway(canvas: Canvas): void {
  const y = NEON.y + NEON.scale * 4;
  canvas.fill(TRUSS.left - 2, y, TRUSS.right - TRUSS.left + 4, 14, at(STEEL, 1));
  canvas.hline(TRUSS.left - 2, y, TRUSS.right - TRUSS.left + 4, at(STEEL, 3));
  for (const x of [TRUSS.left + 40, TRUSS.left + 200, TRUSS.left + 360]) {
    canvas.vline(x, y + 14, TRUSS.top - y - 18, at(STEEL, 1));
  }
}

// --- The water tank, the air conditioners. -----------------------------------------------------

function drawTank(canvas: Canvas): void {
  const { cx, top, body, width } = TANK_AT;
  const left = cx - width / 2;
  const foot = top + body;
  for (const lx of [left + 8, left + width - 14, cx - 3]) {
    canvas.fill(lx, foot, 6, FEET - foot, at(STEEL, 1));
    canvas.vline(lx + 5, foot, FEET - foot, at(STEEL, 3));
  }
  canvas.line(left + 10, foot + 6, left + width - 12, FEET - 8, at(STEEL, 1), 2);
  canvas.line(left + width - 12, foot + 6, left + 10, FEET - 8, at(STEEL, 1), 2);
  canvas.paint(left, top, width, body, (x, y) => {
    const u = (x + 0.5 - cx) / (width / 2);
    const hoop = (y - top) % 26 === 25 ? -0.8 : (y - top) % 26 === 0 ? 0.5 : 0;
    const round = 1.4 + u * 1.6 - u * u * 0.8;
    const drip = noise(61, x, y * 0.2, 4) > 0.78 ? -0.6 : 0;
    return tone(TANK, round + hoop + drip + lightAt(LIGHTS, x, y) * 0.5, x, y);
  });
  // The violet of the sign along its left edge, the conical roof, its hatch.
  canvas.vline(left, top + 4, body - 8, at(NEON_VIOLET, 1));
  for (let row = 0; row < 18; row++) {
    const half = (width / 2 + 3) * (row / 17);
    canvas.hline(Math.round(cx - half), top - 18 + row, Math.round(half * 2), at(TANK, 2));
  }
  canvas.hline(Math.round(cx - width / 2 - 3), top - 1, width + 6, at(TANK, 4));
  canvas.fill(cx - 6, top - 22, 12, 5, at(STEEL, 3));
  // Rust bleeding from the hoops.
  for (let x = left + 4; x < left + width - 4; x += 3) {
    if (noise(67, x, 0, 5) < 0.6) continue;
    canvas.vline(x, top + 26 + (x % 2) * 26, 6 + (x % 7), at(RUST, 0));
  }
}

/** An air conditioner: its louvered box, the fan behind its grille at `turn` (0 to 2). */
function drawUnit(canvas: Canvas, x: number, width: number, turn: number): void {
  const { top, height } = UNIT;
  canvas.paint(x, top, width, height, (px, py) => {
    const louver = py > top + 6 && (py - top) % 5 === 0 ? -0.6 : 0;
    const side = px - x > width - 5 ? -0.6 : 0;
    return tone(CONCRETE, 2.6 + louver + side, px, py);
  });
  canvas.hline(x, top, width, at(CONCRETE, 6));
  canvas.fill(x + 2, FEET - 3, width - 4, 3, at(STEEL, 0));
  // The fan's grille on top, seen at a slant: a dark ellipse, its blades turning.
  const cx = x + width / 2;
  const cy = top - 4;
  canvas.paint(cx - 22, cy - 5, 44, 10, (px, py) => {
    const u = (px + 0.5 - cx) / 22;
    const v = (py + 0.5 - cy) / 5;
    if (u * u + v * v > 1) return undefined;
    const angle = Math.atan2(v, u) + (turn * Math.PI) / 4.5;
    const blade = Math.cos(angle * 3) > 0.35;
    const rim = u * u + v * v > 0.72;
    return at(STEEL, rim ? 4 : blade ? 2 : 0);
  });
}

// --- The antenna mast, the vertical sign 大吉. ---------------------------------------------------

/**
 * The mast: a thin lattice, its dishes, its whips at the top quivering (`quiver`, -1 to 1) as the
 * blimp hums over, its red light on or off.
 */
function drawMast(canvas: Canvas, quiver: number, lit: boolean): void {
  const { x, top } = MAST;
  canvas.vline(x - 3, top + 40, FEET - top - 40, at(STEEL, 2));
  canvas.vline(x + 3, top + 40, FEET - top - 40, at(STEEL, 3));
  for (let y = top + 44; y < FEET; y += 12) {
    canvas.line(x - 3, y, x + 3, y + 6, at(STEEL, 1));
    canvas.line(x + 3, y + 6, x - 3, y + 12, at(STEEL, 1));
  }
  // Guy wires to the roof.
  canvas.line(x, top + 60, x - 70, FEET - 2, at(STEEL, 0));
  canvas.line(x, top + 60, x + 60, FEET - 2, at(STEEL, 0));
  // Dishes, turned to the sky.
  for (const [dx, y, size] of [
    [-16, top + 80, 14],
    [14, top + 140, 18],
  ] as const) {
    canvas.paint(x + dx - size / 2, y - size / 2, size, size, (px, py) => {
      const u = (px + 0.5 - (x + dx)) / (size / 2);
      const v = (py + 0.5 - y) / (size / 2);
      if (u * u + v * v > 1 || u * 0.6 + v > 0.5) return undefined;
      return at(STEEL, u * u + v * v > 0.7 ? 4 : 2);
    });
  }
  // The whips: three thin rods from the top, bending with `quiver`.
  for (const [dx, height] of [
    [-2, 40],
    [0, 52],
    [2, 34],
  ] as const) {
    const base = top + 40;
    for (let rise = 0; rise < height; rise++) {
      const bend = Math.round(quiver * (rise / height) ** 2 * 2);
      canvas.set(x + dx + bend, base - rise, at(STEEL, 3));
    }
  }
  canvas.fill(x - 2, top - 16, 4, 4, at(AVIATION, lit ? 1 : 0));
  if (lit) {
    for (const [dx, dy] of [
      [-3, -1],
      [3, -1],
      [0, -4],
      [0, 2],
    ] as const) {
      canvas.fill(x - 1 + dx, top - 15 + dy, 2, 2, at(AVIATION, 0));
    }
  }
}

/** The spine of the vertical sign and its brackets, down to the roof. */
function drawSpine(canvas: Canvas): void {
  const { spine } = LUCK;
  canvas.fill(spine - 4, 96, 8, FEET - 96, at(STEEL, 1));
  canvas.vline(spine + 3, 96, FEET - 96, at(STEEL, 3));
  for (const y of [132, 212, 292]) {
    canvas.fill(spine - 34, y, 68, 4, at(STEEL, 2));
    canvas.hline(spine - 34, y, 68, at(STEEL, 4));
  }
  canvas.line(spine, FEET - 60, spine - 40, FEET - 2, at(STEEL, 1), 2);
  canvas.line(spine, FEET - 60, spine + 40, FEET - 2, at(STEEL, 1), 2);
}

// --- The laundry, the drone. --------------------------------------------------------------------

/** The line between two poles, three shirts and a towel swinging with the wind (`sway`, 0 to 2). */
function drawLaundry(canvas: Canvas, sway: number): void {
  const { left, right, y } = LINE;
  for (const x of [left, right - 3]) {
    canvas.fill(x, y - 6, 3, FEET - y + 6, at(STEEL, 2));
    canvas.vline(x + 2, y - 6, FEET - y + 6, at(STEEL, 3));
  }
  const sag = (x: number) => y + Math.round(Math.sin(((x - left) / (right - left)) * Math.PI) * 6);
  for (let x: number = left; x < right; x++) canvas.set(x, sag(x), at(STEEL, 3));
  const items = [
    { x: left + 10, width: 24, height: 26, ramp: CLOTH.red },
    { x: left + 42, width: 26, height: 28, ramp: CLOTH.cream },
    { x: left + 76, width: 22, height: 34, ramp: CLOTH.blue },
  ];
  items.forEach(({ x, width, height, ramp }, index) => {
    const swing = [0, 2, 1][(sway + index) % 3] ?? 0;
    const top = sag(x + width / 2) + 1;
    canvas.paint(x - 2, top, width + 6, height, (px, py) => {
      const down = (py - top) / height;
      const shift = Math.round(swing * down);
      const local = px - x - shift;
      if (local < 0 || local >= width) return undefined;
      // A shirt: its sleeves out at the top.
      if (index < 2 && down > 0.35 && (local < 4 || local >= width - 4)) return undefined;
      const fold = (local + Math.round(down * 3)) % 7 === 0 ? 0 : 1;
      return at(ramp, fold);
    });
    canvas.fill(x + 2, top - 1, 2, 2, at(PALE, 0));
    canvas.fill(x + width - 4, top - 1, 2, 2, at(PALE, 0));
  });
}

/** A delivery drone hovering, bobbing (`bob`, 0 to 2), its light blinking with it. */
function drawDrone(canvas: Canvas, bob: number): void {
  const x = DRONE.x;
  const y = DRONE.y + (bob % 3);
  canvas.fill(x - 9, y, 18, 6, at(STEEL, 2));
  canvas.hline(x - 9, y, 18, at(STEEL, 4));
  canvas.fill(x - 4, y + 6, 8, 7, at(CONCRETE, 3));
  canvas.hline(x - 4, y + 6, 8, at(CONCRETE, 5));
  for (const dx of [-14, 10]) {
    canvas.hline(x + dx - 4, y - 2, 12, at(STEEL, bob === 1 ? 1 : 3));
    canvas.vline(x + dx + 2, y - 1, 2, at(STEEL, 2));
  }
  canvas.fill(x - 1, y + 2, 2, 2, at(NEON_GREEN, bob === 0 ? 3 : 1));
}

// --- The animations. ----------------------------------------------------------------------------

/** The animations of the layer, each over its own rectangle. */
export const MID_ANIMATIONS: readonly Animation[] = [
  {
    // The mast's whips quiver while the blimp hums overhead; its red light blinks, slow (each
    // state 60 steps: never a flash, docs/flashs.md).
    name: 'mast',
    rect: { x: MAST.x - 8, y: MAST.top - 22, width: 17, height: 64 },
    frames: 6,
    timeline: timelineOf((step) => {
      const lit = Math.floor(step / 60) % 2 === 0 ? 0 : 3;
      const quiver = overhead(step) ? ([1, 2, 1, 0][Math.floor(step / 4) % 4] ?? 0) : 0;
      return lit + quiver;
    }),
  },
  {
    name: 'smoker',
    rect: { x: SMOKER.x - 26, y: FEET - SMOKER.height - 8, width: 56, height: SMOKER.height + 8 },
    frames: 2,
    timeline: timelineOf((step) => (step % 540 < 100 ? 1 : 0)),
  },
  {
    name: 'steam',
    rect: { x: 30, y: HUT.roof - 106, width: 70, height: 66 },
    frames: 4,
    timeline: [
      [0, 14],
      [1, 14],
      [2, 14],
      [3, 14],
    ],
  },
  ...UNITS.map(({ x, width }, index): Animation => ({
    name: `fan${index}`,
    rect: { x: x + width / 2 - 22, y: UNIT.top - 9, width: 44, height: 10 },
    frames: 3,
    timeline: [
      [0, 6 + index],
      [1, 6 + index],
      [2, 6 + index],
    ],
  })),
  {
    name: 'laundry',
    rect: { x: LINE.left + 6, y: LINE.y - 1, width: 100, height: 48 },
    frames: 3,
    timeline: [
      [0, 50],
      [1, 40],
      [2, 50],
      [1, 40],
    ],
  },
  {
    name: 'drone',
    rect: { x: DRONE.x - 18, y: DRONE.y - 3, width: 36, height: 19 },
    frames: 3,
    timeline: [
      [0, 24],
      [1, 24],
      [2, 24],
      [1, 24],
    ],
  },
];

/** The mast's frame `frame` (MID_ANIMATIONS 'mast'): its light, its whips' bend. */
function mastOf(frame: number): { lit: boolean; quiver: number } {
  return { lit: frame < 3, quiver: [0, 1, -1][frame % 3] ?? 0 };
}

/**
 * The middle layer, `width` × `height` image pixels; `frameOf` gives each animation's frame
 * (0 for the still layer the game shows under them); drawn only inside `clip` when given (an
 * animation's rectangle, redrawn for each of its frames).
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
  drawParapet(canvas);
  const neon = signLetters(canvas, 'ネオン', NEON.x, NEON.y, NEON.scale, false);
  const luck = signLetters(canvas, '大吉', LUCK.x, LUCK.y, LUCK.scale, true);
  drawMembrane(canvas, [
    {
      letters: neon,
      left: NEON.x,
      right: TRUSS.right - 20,
      bottom: 236,
      stretch: 1.7,
      ramp: REFLECT_VIOLET,
    },
    {
      letters: luck,
      left: LUCK.x - 6,
      right: LUCK.x + 88,
      bottom: 287,
      stretch: 2.6,
      ramp: REFLECT_YELLOW,
    },
  ]);
  drawTruss(canvas);
  drawRaceway(canvas);
  drawSignBack(canvas, 'ネオン', NEON.x, NEON.y, NEON.scale, NEON_VIOLET);
  drawSpine(canvas);
  drawSignBack(canvas, '大吉', LUCK.x, LUCK.y, LUCK.scale, NEON_YELLOW, true);
  drawTank(canvas);
  UNITS.forEach(({ x, width: unit }, index) => {
    drawUnit(canvas, x, unit, frameOf(`fan${index}`));
  });
  const mast = mastOf(frameOf('mast'));
  drawMast(canvas, mast.quiver, mast.lit);
  drawLaundry(canvas, frameOf('laundry'));
  drawHut(canvas);
  drawSteam(canvas, frameOf('steam'));
  const random = streamOf(13, 'tags');
  drawTag(canvas, { x: 62, y: 352, width: 74, height: 26 }, random, SPRAY_RAMPS);
  drawTag(canvas, { x: 196, y: 286, width: 50, height: 22 }, random, SPRAY_RAMPS);
  drawTag(canvas, { x: 960, y: 392, width: 50, height: 18 }, random, SPRAY_RAMPS);
  drawSheltered(canvas);
  drawSmoker(canvas, frameOf('smoker'));
  drawDrone(canvas, frameOf('drone'));
  canvas.paint(0, FLOOR_END, width, height - FLOOR_END, () => 0);
  return canvas;
}
