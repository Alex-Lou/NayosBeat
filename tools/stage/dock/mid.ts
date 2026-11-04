/**
 * The middle layer (docs/art/decor-dock.md §2.2): the yard behind L'Entrepôt, in clean pixel art
 * and 3D perspective (docs/art/proprete.md). Every animation the club's bass shakes loops over
 * BASS_CYCLE, the bass hitting at BASS_AT.
 */

import type { StageDrift } from '../../../src/art/stage-layers.ts';
import { Canvas, Mask, at, dithered } from '../kit/canvas.ts';
import { spell, spellHan } from '../kit/font.ts';
import { lightAt, spill, type Light, type Spill } from '../kit/light.ts';
import { noise, streamOf } from '../kit/random.ts';
import type { Rect } from '../kit/stage.ts';
import { CROSSED, drawFigure, type Figure, type Outfit, type Pose } from '../rue/people.ts';
import { drawTag, drawThrowUp } from '../rue/signs.ts';
import {
  concreteAt,
  drawBags,
  drawCagedLamp,
  drawCat,
  drawDumpster,
  drawExitSign,
  drawFence,
  drawLiftGate,
  drawPallets,
  drawPlate,
  drawShutter,
  drawStageDoor,
  drawStreak,
  drawWallPack,
  LOOSE,
} from './fixtures.ts';
import { CLUB_FRAMES, drawClub } from './club.ts';
import { wetAt } from './floor.ts';
import {
  drawBin,
  drawCables,
  drawCone,
  drawCrates,
  drawDrainPlates,
  drawDrums,
  drawFlightCases,
  drawLitter,
  drawPalletJack,
  drawSawhorse,
  drawSedan,
  drawSleeper,
  drawSpoolAndKegs,
  drawVan,
} from './yard.ts';
import {
  ASPHALT,
  BRICK,
  BRICK_VIOLET,
  CLOTH,
  CONCRETE,
  CONCRETE_VIOLET,
  EMBER,
  FIGURE_RAMPS,
  GLASS,
  GLASS_WARM,
  HAIR,
  HAZARD,
  PAPER,
  RIM_WARM,
  RUBBER,
  RUST,
  SODIUM,
  SPRAY_RAMPS,
  STEAM,
  STEEL,
  TAG,
  WET,
  WET_ASPHALT,
} from './palette.ts';

export const BASE = 410;
const DOCK_DECK = 344;
const DOCK_TOP = 352;
const FLOOR_END = 470;
const ROOF = 120;
const WALL = { left: 232, right: 1236 } as const;
const ANNEX = { left: 1236, roof: 214 } as const;
const DOCK_LEFT = 296;
const PIERS = [
  [232, 258],
  [520, 546],
  [724, 776],
  [954, 1006],
  [1184, 1236],
] as const;
const CANOPY = { left: 536, right: 1200, y: 204, height: 18 } as const;
const BAY = { top: 240, width: 150 } as const;
const BAYS = [
  { x: 560, label: '1' },
  { x: 790, label: '2' },
  { x: 1020, label: '3' },
] as const;
const OPEN_BOTTOM = BAY.top + 16;
const OPENING: Rect = {
  x: BAYS[2].x,
  y: OPEN_BOTTOM,
  width: BAY.width,
  height: DOCK_DECK - OPEN_BOTTOM,
};
const VAN_FOOT = 456;
const SEDAN_FOOT = 458;
const SLEEPER = { x: 70, foot: 454 } as const;
const RATTLING = LOOSE + 14;
const DOOR: Rect = { x: 384, y: 250, width: 44, height: DOCK_DECK - 250 };
const WINDOW = { y: 136, width: 56, height: 60 } as const;
const WINDOWS = [290, 418, 590, 762, 934, 1106] as const;
const DANCING = [2, 3, 4] as const;
const LIFT: Rect = { x: 1282, y: 260, width: 84, height: DOCK_DECK - 260 };
const GATE = { left: 56, right: 232, top: 296 } as const;
const DUMPSTER = { x: 140, width: 84, foot: BASE + 4 } as const;
const CAT_X = 176;
const LID = DUMPSTER.foot - 51;
const PUDDLE = { x: 818, y: 436, width: 96, height: 16 } as const;
const PUDDLE_BAY3 = { x: 1044, y: 436, width: 102, height: 16 } as const;
const DRAIN_STEAM = { x: 906, y: 428 } as const;
const DRUMS_X = 724;
const NEWSPAPER = { x: 1410, y: 444, width: 22, height: 14 } as const;
const APRON = { drain: BASE + 16, asphalt: BASE + 20 } as const;
const VENT = { x: 1396, top: 168 } as const;

const PACKS = BAYS.map(({ x }) => x + BAY.width / 2);
const LIGHTS: readonly Light[] = [
  ...PACKS.flatMap((x): Light[] => [
    { x, y: 300, radius: 150, strength: 1.6, squash: 1.3 },
    { x, y: 440, radius: 130, strength: 1, squash: 0.35 },
  ]),
  { x: DOOR.x + 68, y: 262, radius: 120, strength: 1.4, squash: 1 },
  { x: DOOR.x + 60, y: 430, radius: 110, strength: 0.8, squash: 0.35 },
];

const VIOLET_SPILLS: readonly Spill[] = [
  {
    light: {
      x: BAYS[2].x + BAY.width / 2,
      y: DOCK_TOP + 24,
      radius: 130,
      strength: 1,
      squash: 0.55,
    },
    twins: [
      [BRICK, BRICK_VIOLET],
      [CONCRETE, CONCRETE_VIOLET],
      [WET, CONCRETE_VIOLET],
    ],
  },
  ...WINDOWS.map((wx): Spill => ({
    light: {
      x: wx + WINDOW.width / 2,
      y: WINDOW.y + WINDOW.height + 10,
      radius: 44,
      strength: 1,
      squash: 0.5,
    },
    twins: [[BRICK, BRICK_VIOLET]],
  })),
];

const BEAT = 30;
export const BASS_CYCLE = 2400;
export const BASS_AT = 1200;
const BASS_BEATS = 8;

export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  readonly timeline: readonly (readonly [number, number])[];
  readonly drift?: StageDrift;
}

function bassBeat(step: number): number | undefined {
  const into = step - BASS_AT;
  return into >= 0 && into < BASS_BEATS * BEAT ? Math.floor(into / BEAT) : undefined;
}

function timelineOf(frameAt: (step: number) => number): [number, number][] {
  const timeline: [number, number][] = [];
  for (let step = 0; step < BASS_CYCLE; step++) {
    const frame = frameAt(step);
    const last = timeline[timeline.length - 1];
    if (last && last[0] === frame) last[1] += 1;
    else timeline.push([frame, 1]);
  }
  return timeline;
}

function hdTone(ramp: readonly number[], level: number, x: number, y: number): number {
  const top = ramp.length - 1;
  const clamped = Math.min(Math.max(level, 0), top);
  const base = Math.floor(clamped);
  const fraction = clamped - base;
  const step = dithered(fraction, x >> 1, y) ? 1 : 0;
  return ramp[Math.min(base + step, top)] ?? 0;
}

function pierAt(x: number): 'face' | 'edge' | 'shade' | 'cast' | undefined {
  for (const [left, right] of PIERS) {
    if (x >= right && x < right + 5) return 'cast';
    if (x < left || x >= right) continue;
    return x < left + 2 ? 'edge' : x >= right - 3 ? 'shade' : 'face';
  }
  return undefined;
}

function brickStepAt(x: number, y: number, base: number): number {
  const course = Math.floor(y / 6);
  const joint = y % 6 === 5 || (x + (course % 2) * 8) % 16 === 0;
  const soot = (noise(71, x >> 2, y >> 1, 14) - 0.5) * 0.9 - Math.max(0, (196 - y) / 110);
  const lowBounce = Math.max(0, (y - 300) / 110) * 0.6;
  const lit = lightAt(LIGHTS, x, y) * 0.95;
  return base + soot + lowBounce + lit - (joint ? 0.9 : 0);
}

function drawWall(canvas: Canvas): void {
  canvas.paint(WALL.left, ROOF, WALL.right - WALL.left, BASE - ROOF, (x, y) => {
    if (y >= DOCK_DECK && x >= DOCK_LEFT) return undefined;
    if (y < ROOF + 3) return at(BRICK, 0);
    const pier = pierAt(x);
    const delta =
      pier === 'edge'
        ? 1.5
        : pier === 'face'
          ? 0.6
          : pier === 'shade' || pier === 'cast'
            ? -0.8
            : 0;
    return hdTone(BRICK, brickStepAt(x, y, 2 + delta), x, y);
  });
  canvas.fill(WALL.left - 4, ROOF - 8, WALL.right - WALL.left + 8, 8, at(CONCRETE, 3));
  canvas.hline(WALL.left - 4, ROOF - 8, WALL.right - WALL.left + 8, at(CONCRETE, 5));
  canvas.hline(WALL.left - 4, ROOF - 2, WALL.right - WALL.left + 8, at(CONCRETE, 1));
  canvas.hline(WALL.left - 4, ROOF - 1, WALL.right - WALL.left + 8, at(CONCRETE, 0));
}

function drawRoof(canvas: Canvas): void {
  const hut: Rect = { x: 262, y: 74, width: 78, height: ROOF - 8 - 74 };
  canvas.polygon(
    [
      [hut.x - 8, hut.y + 4],
      [hut.x, hut.y],
      [hut.x, hut.y + hut.height],
      [hut.x - 8, hut.y + hut.height],
    ],
    at(BRICK, 1),
  );
  canvas.paint(hut.x, hut.y, hut.width, hut.height, (x, y) =>
    hdTone(BRICK, brickStepAt(x, y, 1.8) + (x < hut.x + 2 ? 1 : 0), x, y),
  );
  canvas.fill(hut.x - 10, hut.y - 4, hut.width + 14, 4, at(CONCRETE, 3));
  canvas.hline(hut.x - 10, hut.y - 4, hut.width + 14, at(CONCRETE, 5));
  canvas.fill(hut.x + 46, hut.y + 10, 18, hut.height - 10, at(STEEL, 1));
  canvas.vline(hut.x + 46, hut.y + 10, hut.height - 10, at(STEEL, 3));
  const unit: Rect = { x: 640, y: 88, width: 84, height: ROOF - 8 - 88 };
  canvas.polygon(
    [
      [unit.x - 6, unit.y + 3],
      [unit.x, unit.y],
      [unit.x, unit.y + unit.height],
      [unit.x - 6, unit.y + unit.height],
    ],
    at(STEEL, 1),
  );
  canvas.paint(unit.x, unit.y, unit.width, unit.height, (x, y) => {
    const louver = (y - unit.y) % 4 === 3 && x > unit.x + 6 && x < unit.x + 50;
    return at(STEEL, louver ? 0 : x === unit.x ? 4 : 2);
  });
  canvas.hline(unit.x, unit.y, unit.width, at(STEEL, 4));
  canvas.fill(unit.x + 56, unit.y - 6, 22, 6, at(STEEL, 3));
  canvas.hline(unit.x + 56, unit.y - 6, 22, at(STEEL, 4));
  canvas.vline(1150, 40, ROOF - 48, at(STEEL, 2));
  for (const [y, half] of [
    [48, 14],
    [60, 10],
    [70, 7],
  ] as const) {
    canvas.hline(1150 - half, y, half * 2 + 1, at(STEEL, 2));
  }
}

function drawWindow(canvas: Canvas, x: number, index: number, frame: number): void {
  const { y, width, height } = WINDOW;
  canvas.paint(x - 4, y - 8, width + 8, 6, (px) => at(BRICK, (px - x) % 4 === 0 ? 2 : 3));
  canvas.hline(x - 4, y - 8, width + 8, at(BRICK, 4));
  canvas.fill(x - 3, y - 2, width + 6, height + 4, at(STEEL, 0));
  canvas.fill(x - 2, y - 1, width + 4, height + 2, at(STEEL, 1));
  const dancing = (DANCING as readonly number[]).includes(index);
  canvas.paint(x, y, width, height, (px, py) => {
    const col = Math.floor((px - x) / 19);
    const row = Math.floor((py - y) / 15);
    const pane = col + row * 3;
    if (!dancing && pane === (index * 5 + 1) % 12) return at(STEEL, 0);
    if (!dancing && pane === (index * 7 + 3) % 12) {
      return at(GLASS_WARM, row >= 2 ? 2 : 1);
    }
    const center = col === 1 && row >= 1 && row <= 2;
    const step = row >= 2 ? 2 : center ? 2 : 1;
    return at(GLASS, step);
  });
  for (const [gx, gy] of [
    [x + 4, y + 4],
    [x + 23, y + 19],
    [x + 42, y + 34],
  ] as const) {
    if (dancing || (index + gx) % 2 === 0) {
      canvas.fill(gx, gy, 5, 3, at(GLASS, 3));
    }
  }
  if (dancing) drawDancers(canvas, x, index, frame);
  for (let column = 1; column < 3; column++) {
    canvas.vline(x + column * 19 - 1, y, height, at(STEEL, 1));
    canvas.vline(x + column * 19, y, height, at(STEEL, 2));
  }
  for (let row = 1; row < 4; row++) {
    canvas.hline(x, y + row * 15 - 1, width, at(STEEL, 1));
  }
  canvas.fill(x - 5, y + height + 1, width + 10, 4, at(CONCRETE, 3));
  canvas.hline(x - 5, y + height + 1, width + 10, at(CONCRETE, 5));
  canvas.fill(x - 4, y + height + 5, width + 8, 2, at(BRICK, 0));
}

function drawDancers(canvas: Canvas, x: number, index: number, frame: number): void {
  const bottom = WINDOW.y + WINDOW.height;
  const shadow = new Mask(canvas.width, canvas.height);
  [9, 28, 46].forEach((dx, dancer) => {
    const dip =
      frame === 3
        ? -6
        : frame === 1 && dancer % 2 === 0
          ? 3
          : frame === 2 && dancer % 2 === 1
            ? 3
            : 0;
    const head = WINDOW.y + 18 + ((dancer * 5 + index * 3) % 7) + dip;
    const cx = x + dx + ((dancer + index) % 3) - 1;
    shadow.ellipse(cx - 6, head, 12, 13);
    shadow.rect(cx - 3, head + 10, 6, 6);
    shadow.polygon([
      [cx - 14, bottom],
      [cx - 12, head + 20],
      [cx - 6, head + 14],
      [cx + 6, head + 14],
      [cx + 12, head + 20],
      [cx + 14, bottom],
    ]);
    const raised = frame === 3 || (frame === 2 && dancer === 1) || (frame === 1 && dancer === 0);
    if (raised) {
      shadow.limb(cx - 9, head + 18, cx - 13, head - 10, 2);
      shadow.limb(cx + 9, head + 18, cx + 13, head - 10, 2);
    }
  });
  canvas.paint(x, WINDOW.y, WINDOW.width, WINDOW.height, (px, py) => {
    if (!shadow.has(px, py)) return undefined;
    const edge = !shadow.has(px - 1, py) || !shadow.has(px + 1, py) || !shadow.has(px, py - 1);
    return at(GLASS, edge ? 1 : 0);
  });
}

function drawCanopy(canvas: Canvas): void {
  const { left, right, y, height } = CANOPY;
  canvas.polygon(
    [
      [left + 8, y - 6],
      [right - 8, y - 6],
      [right, y],
      [left, y],
    ],
    at(STEEL, 1),
  );
  canvas.hline(left + 8, y - 6, right - left - 16, at(STEEL, 3));
  for (const x of [left + 30, (left + right) / 2, right - 40]) {
    canvas.line(x + 2, y, x + 22, y - 52, at(BRICK, 0));
    canvas.line(x, y, x + 20, y - 52, at(STEEL, 3));
    canvas.fill(x + 17, y - 56, 7, 5, at(STEEL, 2));
    canvas.hline(x + 17, y - 56, 7, at(STEEL, 4));
  }
  canvas.paint(left, y, right - left, height, (x, py) => {
    const row = py - y;
    if (row === 0) return at(STEEL, 5);
    if (row === 1) return at(STEEL, 3);
    if (row >= height - 2) return at(STEEL, 0);
    if ((x - left) % 66 === 0) return at(STEEL, 1);
    if ((x - left) % 66 === 1) return at(STEEL, 3);
    return at(STEEL, 2);
  });
  const text = 'LOADING DOCK';
  const width = spell(text, 2, 1, () => undefined);
  const x0 = Math.round((left + right - width) / 2);
  spell(text, 2, 1, (px, py) => {
    canvas.set(x0 + px + 1, y + 4 + py, at(STEEL, 0));
    canvas.set(x0 + px, y + 3 + py, at(TAG.cream, py < 6 ? 1 : 0));
  });
  canvas.polygon(
    [
      [left, y + height],
      [right, y + height],
      [right - 6, y + height + 5],
      [left + 6, y + height + 5],
    ],
    at(STEEL, 0),
  );
  for (let rx = left + 40; rx < right - 20; rx += 66) {
    canvas.line(rx, y + height, rx + 4, y + height + 5, at(STEEL, 1), 2);
  }
  for (const x of PACKS) drawWallPack(canvas, x, y + height + 3);
}

function drawDockFace(canvas: Canvas): void {
  const deckW = canvas.width - DOCK_LEFT;
  canvas.paint(DOCK_LEFT, DOCK_DECK, deckW, DOCK_TOP - DOCK_DECK, (x, y) => {
    if (y === DOCK_DECK) return at(CONCRETE, 1);
    const dy = y - DOCK_DECK;
    const perspX = x - Math.round(((x - 720) * dy) / 90);
    const joint = perspX % 64 === 0;
    const step = concreteAt(x, DOCK_TOP, 3.4, LIGHTS) - (joint ? 1.2 : 0);
    return hdTone(CONCRETE, step, x, y);
  });
  canvas.paint(DOCK_LEFT, DOCK_TOP, deckW, BASE - DOCK_TOP, (x, y) => {
    const row = y - DOCK_TOP;
    if (row === 0) return at(STEEL, 5);
    if (row === 1) return at(STEEL, 3);
    if (row < 8) {
      const stripe = Math.floor((x + row * 2) / 10) % 2 === 0;
      return stripe ? at(HAZARD, row < 4 ? 1 : 0) : at(STEEL, 1);
    }
    if (row < 11) return at(CONCRETE, 0);
    const step = concreteAt(x, y, 2.5 - (row - 11) * 0.015, LIGHTS);
    return hdTone(CONCRETE, step, x, y);
  });
  for (let x = DOCK_LEFT + 20; x < canvas.width; x += 64) {
    drawStreak(canvas, x, DOCK_TOP + 9, 16);
  }
  for (const { x } of BAYS) {
    for (const bx of [x + 8, x + BAY.width - 32]) {
      canvas.fill(bx - 3, DOCK_TOP + 12, 3, 33, at(RUBBER, 0));
      canvas.fill(bx, DOCK_TOP + 10, 24, 34, at(RUBBER, 1));
      canvas.hline(bx, DOCK_TOP + 10, 24, at(RUBBER, 2));
      canvas.vline(bx, DOCK_TOP + 10, 34, at(RUBBER, 2));
      canvas.vline(bx + 23, DOCK_TOP + 10, 34, at(RUBBER, 0));
      canvas.fill(bx + 2, DOCK_TOP + 44, 23, 2, at(CONCRETE, 0));
      for (const by of [DOCK_TOP + 15, DOCK_TOP + 38]) {
        canvas.fill(bx + 10, by, 3, 3, at(RUBBER, 0));
        canvas.set(bx + 11, by + 1, at(STEEL, 4));
      }
    }
  }
  canvas.hline(DOCK_LEFT, BASE - 1, deckW, at(CONCRETE, 0));
}

function drawStairs(canvas: Canvas): void {
  const steps = 4;
  const stepW = 15;
  const deckDepth = DOCK_TOP - DOCK_DECK;
  const frontRise = (BASE - DOCK_TOP) / steps;
  const startX = DOCK_LEFT - steps * stepW;
  for (let step = 0; step < steps; step++) {
    const left = startX + step * stepW;
    const frontTop = Math.round(BASE - (step + 1) * frontRise);
    const backTop = frontTop - deckDepth;
    canvas.polygon(
      [
        [left, frontTop],
        [left + 4, backTop],
        [DOCK_LEFT, backTop],
        [DOCK_LEFT, frontTop],
      ],
      at(CONCRETE, 4),
    );
    canvas.hline(left + 4, backTop, DOCK_LEFT - left - 4, at(CONCRETE, 2));
    canvas.hline(left, frontTop, DOCK_LEFT - left, at(CONCRETE, 5));
    canvas.fill(left, frontTop + 1, DOCK_LEFT - left, BASE - frontTop - 1, at(CONCRETE, 2));
    canvas.hline(left, frontTop + 1, DOCK_LEFT - left, at(CONCRETE, 0));
    canvas.vline(left, frontTop, BASE - frontTop, at(CONCRETE, 3));
  }
  const post = (x: number, foot: number) => {
    canvas.fill(x, foot - 34, 3, 34, at(HAZARD, 1));
    canvas.vline(x, foot - 34, 34, at(HAZARD, 2));
  };
  for (const [px, py] of [
    [startX + 4, BASE - deckDepth],
    [startX + stepW * 2 + 4, Math.round(BASE - 2 * frontRise) - deckDepth],
    [DOCK_LEFT - 3, DOCK_DECK],
  ] as const) {
    post(px, py);
  }
  canvas.line(startX + 4, BASE - deckDepth - 34, DOCK_LEFT - 3, DOCK_DECK - 34, at(HAZARD, 2), 2);
  canvas.line(startX + 4, BASE - deckDepth - 20, DOCK_LEFT - 3, DOCK_DECK - 20, at(HAZARD, 1), 2);
  for (const [px, py] of [
    [startX, BASE],
    [startX + stepW * 2, Math.round(BASE - 2 * frontRise)],
    [DOCK_LEFT - 3, DOCK_TOP],
  ] as const) {
    post(px, py);
  }
  canvas.line(startX, BASE - 34, DOCK_LEFT - 3, DOCK_TOP - 34, at(HAZARD, 2), 2);
  canvas.line(startX, BASE - 32, DOCK_LEFT - 3, DOCK_TOP - 32, at(HAZARD, 0), 1);
  canvas.line(startX, BASE - 19, DOCK_LEFT - 3, DOCK_TOP - 19, at(HAZARD, 1), 2);
}

function drawAnnex(canvas: Canvas): void {
  canvas.paint(
    ANNEX.left,
    ANNEX.roof,
    canvas.width - ANNEX.left,
    DOCK_DECK - ANNEX.roof,
    (x, y) => {
      if (y < ANNEX.roof + 3) return at(CONCRETE, 0);
      const course = Math.floor((y - ANNEX.roof) / 8);
      const joint = (y - ANNEX.roof) % 8 === 7 || (x + (course % 2) * 8) % 16 === 0;
      const step = concreteAt(x, y, 2, LIGHTS) - (joint ? 0.9 : 0);
      return hdTone(CONCRETE, step, x, y);
    },
  );
  canvas.fill(ANNEX.left - 2, ANNEX.roof - 6, canvas.width - ANNEX.left + 2, 6, at(CONCRETE, 4));
  canvas.hline(ANNEX.left - 2, ANNEX.roof - 6, canvas.width - ANNEX.left + 2, at(CONCRETE, 6));
  canvas.hline(ANNEX.left - 2, ANNEX.roof - 1, canvas.width - ANNEX.left + 2, at(CONCRETE, 1));
  drawLiftGate(canvas, LIFT);
  const text = 'FREIGHT';
  const width = spell(text, 2, 1, () => undefined);
  spell(text, 2, 1, (px, py) => {
    const x = LIFT.x + Math.round((LIFT.width - width) / 2) + px;
    const y = LIFT.y - 26 + py;
    canvas.set(x + 1, y + 1, at(CONCRETE, 0));
    canvas.set(x, y, at(TAG.cream, 0));
  });
  canvas.fill(VENT.x, VENT.top, 10, ANNEX.roof - 6 - VENT.top, at(STEEL, 2));
  canvas.vline(VENT.x, VENT.top, ANNEX.roof - 6 - VENT.top, at(STEEL, 4));
  canvas.vline(VENT.x + 9, VENT.top, ANNEX.roof - 6 - VENT.top, at(STEEL, 0));
  canvas.fill(VENT.x - 4, VENT.top - 5, 18, 5, at(STEEL, 3));
  canvas.hline(VENT.x - 4, VENT.top - 5, 18, at(STEEL, 5));
}

function drawSteam(canvas: Canvas, frame: number): void {
  const cloud = new Mask(canvas.width, canvas.height);
  for (let puff = 0; puff < 6; puff++) {
    const rise = ((puff * 9 + frame * 3) % 54) + 3;
    const cx = Math.round(VENT.x + 5 - rise * 0.22 + Math.sin((rise + puff) / 5) * 2);
    const cy = Math.round(VENT.top - 6 - rise);
    const rx = Math.round(5 + rise / 7);
    const ry = Math.max(4, Math.round(rx * 0.72));
    cloud.ellipse(cx - rx, cy - ry, rx * 2, ry * 2);
  }
  canvas.paint(VENT.x - 18, VENT.top - 72, 40, 66, (px, py) => {
    if (!cloud.has(px, py)) return undefined;
    const rise = VENT.top - 6 - py;
    const lit = !cloud.has(px, py - 1) || !cloud.has(px - 1, py);
    const step = rise > 38 ? 0 : rise > 18 ? (lit ? 2 : 1) : lit ? 3 : 2;
    return at(STEAM, step);
  });
}

function drawAlley(canvas: Canvas): void {
  canvas.paint(0, 0, GATE.left, BASE, (x, y) => {
    const step = brickStepAt(x, y, 1.2) + (x >= GATE.left - 3 ? 1 : 0);
    return hdTone(BRICK, step, x, y);
  });
  canvas.fill(35, 0, 6, BASE, at(STEEL, 1));
  canvas.vline(35, 0, BASE, at(STEEL, 3));
  canvas.vline(40, 0, BASE, at(STEEL, 0));
  for (let y = 24; y < BASE; y += 48) {
    canvas.fill(33, y, 10, 3, at(STEEL, 2));
    canvas.hline(33, y, 10, at(STEEL, 4));
  }
  drawFence(canvas, GATE.left, GATE.right, GATE.top, BASE);
  drawPlate(canvas, { x: 70, y: 324, width: 58, height: 26 }, ['NO', 'PARKING']);
}

function drawYard(canvas: Canvas): void {
  canvas.paint(0, BASE, canvas.width, FLOOR_END - BASE, (x, y) => {
    const wet = wetAt(83, x, y * 2);
    if (y < APRON.drain) {
      const dy = y - BASE;
      const perspX = x - Math.round(((x - 720) * dy) / 48);
      const joint = perspX % 128 === 0 && y > BASE + 2;
      const shade = y < BASE + 3 ? -1 : 0;
      const ramp = y > BASE + 3 && wet ? WET : CONCRETE;
      const step = concreteAt(x, y, 2.2, LIGHTS) + shade - (joint ? 1.1 : 0);
      return hdTone(ramp, step, x, y);
    }
    if (y < APRON.asphalt) {
      if (y === APRON.drain) return at(STEEL, 3);
      if (y === APRON.asphalt - 1) return at(STEEL, 2);
      return at(STEEL, x % 8 < 5 ? 0 : 2);
    }
    const lit = lightAt(LIGHTS, x, y) * 0.9;
    const grain = (noise(88, x >> 2, y >> 1, 10) - 0.5) * 0.5;
    const ramp = wet ? WET_ASPHALT : ASPHALT;
    return hdTone(ramp, 1.3 + grain + lit, x, y);
  });
  canvas.hline(DOCK_LEFT, BASE, canvas.width - DOCK_LEFT, at(CONCRETE, 0));
}

function drawSpills(canvas: Canvas): void {
  for (const s of VIOLET_SPILLS) spill(canvas, s);
}

function drawPuddle(canvas: Canvas, frame: number): void {
  const { x, y, width, height } = PUDDLE;
  const water = new Mask(canvas.width, canvas.height);
  water.ellipse(x, y, width, height);
  water.ellipse(x + 20, y - 3, width * 0.5, height * 0.6);
  const streak = PACKS[1] ?? x;
  const drop = { x: x + width * 0.42, y: y + height * 0.5 };
  canvas.paint(x, y - 4, width, height + 4, (px, py) => {
    if (!water.has(px, py)) return undefined;
    if (!water.has(px, py - 1)) return at(CONCRETE, 5);
    if (!water.has(px, py + 1)) return at(CONCRETE, 3);
    if (frame > 0) {
      const r = Math.hypot((px + 0.5 - drop.x) / 2.6, py + 0.5 - drop.y);
      const ring = 1.6 + frame * 2.4;
      if (Math.abs(r - ring) < 0.6) return at(CONCRETE, 5);
    }
    const near = (py - y) / height;
    if (Math.abs(px - streak) <= 1 && near < 0.8 && py % 2 === 0) return at(SODIUM, 1);
    return at(CONCRETE, near > 0.5 ? 2 : 1);
  });
}

function drawPuddle3(canvas: Canvas, frame: number): void {
  const { x, y, width, height } = PUDDLE_BAY3;
  const water = new Mask(canvas.width, canvas.height);
  water.ellipse(x, y, width, height);
  water.ellipse(x + 14, y - 3, width * 0.6, height * 0.65);
  const cx = x + width * 0.5;
  const cy = y + height * 0.5;
  canvas.paint(x, y - 4, width, height + 4, (px, py) => {
    if (!water.has(px, py)) return undefined;
    if (!water.has(px, py - 1)) return at(CONCRETE_VIOLET, 5);
    if (!water.has(px, py + 1)) return at(CONCRETE_VIOLET, 3);
    if (frame > 0) {
      const r = Math.hypot((px + 0.5 - cx) / 2.8, py + 0.5 - cy);
      const ring = 1.6 + frame * 2.5;
      if (Math.abs(r - ring) < 0.6) return at(GLASS, 3);
    }
    if (py % 3 === 0 && Math.abs(px - cx) < 28 - (py - y) * 1.1) {
      return at(GLASS, 2);
    }
    const near = (py - y) / height;
    return at(CONCRETE_VIOLET, near > 0.5 ? 2 : 1);
  });
}

function drawDrainSteam(canvas: Canvas, frame: number): void {
  const cloud = new Mask(canvas.width, canvas.height);
  for (let i = 0; i < 6; i++) {
    const rise = ((i * 5 + frame * 3) % 28) + 2;
    const cx = Math.round(DRAIN_STEAM.x + Math.sin((rise + i) / 3.5) * 2.5 - rise * 0.1);
    const cy = Math.round(DRAIN_STEAM.y - rise);
    const rx = Math.round(3 + rise / 7);
    const ry = Math.max(3, Math.round(rx * 0.85));
    cloud.ellipse(cx - rx, cy - ry, rx * 2, ry * 2);
  }
  canvas.paint(DRAIN_STEAM.x - 10, DRAIN_STEAM.y - 34, 22, 36, (px, py) => {
    if (!cloud.has(px, py)) return undefined;
    const rise = DRAIN_STEAM.y - py;
    const lit = !cloud.has(px, py - 1) || !cloud.has(px - 1, py);
    const step = rise > 22 ? 0 : rise > 10 ? (lit ? 2 : 1) : lit ? 2 : 1;
    return at(STEAM, step);
  });
}

function drawNewspaper(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  const { x, y } = NEWSPAPER;
  const shapes: readonly (readonly [number, number])[][] = [
    [
      [x + 2, y + 10],
      [x + 18, y + 6],
      [x + 20, y + 12],
      [x + 4, y + 13],
    ],
    [
      [x + 6, y + 2],
      [x + 16, y + 4],
      [x + 14, y + 13],
      [x + 4, y + 11],
    ],
    [
      [x + 1, y + 6],
      [x + 12, y + 1],
      [x + 21, y + 8],
      [x + 9, y + 12],
    ],
  ];
  const sheet = new Mask(canvas.width, canvas.height);
  sheet.polygon(shapes[frame - 1] ?? []);
  canvas.paint(x, y, 22, 14, (px, py) => {
    if (!sheet.has(px, py)) return undefined;
    if (!sheet.has(px, py - 1)) return at(PAPER, 3);
    return at(PAPER, py === y + 6 ? 0 : 1);
  });
}

const RUST_FALL = {
  x: BAYS[0].x,
  y: CANOPY.y + CANOPY.height + 4,
  width: BAYS[1].x + BAY.width - BAYS[0].x,
  height: 80,
} as const;

function drawRustFall(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  for (let speck = 0; speck < 28; speck++) {
    const sx = RUST_FALL.x + 4 + ((speck * 53) % (RUST_FALL.width - 8));
    const sy = RUST_FALL.y + ((speck * 29 + frame * 24) % (RUST_FALL.height - 2));
    canvas.set(sx, sy, speck % 3 === 0 ? at(CONCRETE, 5) : at(RUST, 3));
    if (speck % 4 === 1) canvas.set(sx, sy - 1, at(RUST, 2));
  }
}

const LAMP = { x: DOOR.x + DOOR.width + 22, y: DOOR.y - 6 } as const;

function drawMoths(canvas: Canvas, frame: number): void {
  for (const [radius, speed, phase] of [
    [7, 1, 0],
    [10, -1, 2],
    [5, 2, 1],
  ] as const) {
    const angle = ((frame * speed + phase) / 4) * Math.PI * 2;
    const mx = Math.round(LAMP.x + Math.cos(angle) * radius);
    const my = Math.round(LAMP.y + 4 + Math.sin(angle) * radius * 0.6);
    canvas.set(mx, my, at(PAPER, 3));
  }
}

function drawFlyers(canvas: Canvas): void {
  for (const [x, y, width, height] of [
    [523, 282, 20, 28],
    [526, 314, 18, 24],
  ] as const) {
    canvas.fill(x, y, width, height, at(PAPER, 1));
    canvas.hline(x, y, width, at(PAPER, 2));
    canvas.hline(x + 3, y + 5, width - 6, at(PAPER, 0));
    canvas.hline(x + 3, y + 10, width - 8, at(PAPER, 0));
    for (let d = 0; d < 5; d++) {
      canvas.hline(x + width - 5 + d, y + height - 5 + d, 5 - d, at(BRICK, 2));
    }
  }
}

function drawBackDoorPlate(canvas: Canvas): void {
  const x = DOOR.x + DOOR.width + 12;
  const y = DOOR.y + 38;
  canvas.fill(x, y, 24, 14, at(STEEL, 1));
  canvas.hline(x, y, 24, at(STEEL, 3));
  spellHan('后门', 1, 1, (px, py) => {
    canvas.set(x + 2 + px, y + 3 + py, at(TAG.cream, 1));
  });
}

const HOLDING: Pose = {
  arms: [
    { joint: [2, 13], end: [8, 20] },
    { joint: [-1, 13], end: [-1, 26] },
  ],
  legs: [
    { joint: [2, 19], end: [4, 0] },
    { joint: [-1, 19], end: [-4, 0] },
  ],
  lean: 0,
  dip: 0,
};
const DRAG: Pose = {
  ...HOLDING,
  arms: [
    { joint: [6, 9], end: [5, -4] },
    { joint: [-1, 13], end: [-1, 26] },
  ],
};

interface Bouncer {
  readonly figure: Figure;
  readonly rest: Pose;
  readonly smokes: boolean;
}

const BOUNCER_OUTFITS: readonly [Outfit, Outfit] = [
  {
    top: CLOTH.leather,
    legs: CLOTH.denim,
    shoes: CLOTH.black,
    hair: CLOTH.black,
  },
  {
    top: CLOTH.black,
    legs: CLOTH.grey,
    shoes: CLOTH.black,
    hair: HAIR.brown,
  },
];

const BOUNCERS: readonly Bouncer[] = [
  {
    figure: {
      x: 346,
      y: DOCK_TOP - 2,
      height: 88,
      shoulders: 32,
      facing: 1,
      head: 'beanie',
      coat: 'puffer',
      pose: HOLDING,
      rim: { side: 1, above: true, ramp: RIM_WARM },
      outfit: BOUNCER_OUTFITS[0],
    },
    rest: HOLDING,
    smokes: true,
  },
  {
    figure: {
      x: 488,
      y: DOCK_TOP - 2,
      height: 90,
      shoulders: 34,
      facing: -1,
      head: 'bare',
      coat: 'puffer',
      pose: CROSSED,
      rim: { side: -1, above: true, ramp: RIM_WARM },
      face: true,
      outfit: BOUNCER_OUTFITS[1],
    },
    rest: CROSSED,
    smokes: false,
  },
];

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

function drawBouncer(canvas: Canvas, { figure, rest, smokes }: Bouncer, frame: number): void {
  const pose: Pose =
    frame === 1 && smokes ? DRAG : frame === 2 ? { ...rest, lean: 3, dip: 1 } : rest;
  const shown = { ...figure, pose };
  canvas.ellipse(figure.x - 12, figure.y - 2, 24, 4, at(CONCRETE, 0));
  drawFigure(canvas, shown, FIGURE_RAMPS);
  if (!smokes) return;
  const [hx, hy] = handOf(shown, 0);
  const tip = hx + figure.facing * 3;
  canvas.set(tip, hy - 1, at(EMBER, frame === 1 ? 1 : 0));
  canvas.set(tip - figure.facing, hy - 1, at(PAPER, 2));
  if (frame === 1) {
    for (const [dx, dy] of [
      [2, -4],
      [3, -6],
      [1, -8],
      [3, -10],
    ] as const) {
      canvas.set(tip + dx * figure.facing, hy + dy, at(STEAM, 1));
    }
  }
}

function bouncerRect({ figure }: Bouncer): Rect {
  const width = figure.shoulders + 34;
  return {
    x: figure.x - Math.round(width / 2),
    y: figure.y - figure.height - 14,
    width,
    height: figure.height + 16,
  };
}

function danceAt(step: number, offset: number): number {
  const half = step % BEAT < BEAT / 2;
  if (bassBeat(step) !== undefined) return half ? 3 : 0;
  return half ? ((Math.floor(step / BEAT) + offset) % 2 === 0 ? 1 : 2) : 0;
}

export const MID_ANIMATIONS: readonly Animation[] = [
  ...DANCING.map((index, order): Animation => {
    const x = WINDOWS[index];
    return {
      name: `crowd${order}`,
      rect: { x, y: WINDOW.y + 12, width: WINDOW.width, height: WINDOW.height - 12 },
      frames: 4,
      timeline: timelineOf((step) => danceAt(step, order)),
    };
  }),
  {
    name: 'club',
    rect: OPENING,
    frames: CLUB_FRAMES,
    timeline: timelineOf((step) => {
      if (step % BEAT >= BEAT / 2) return 0;
      if (bassBeat(step) !== undefined) return 3;
      return [1, 2, 1, 4][Math.floor(step / BEAT) % 4] ?? 0;
    }),
  },
  {
    name: 'sleeper',
    rect: { x: SLEEPER.x - 34, y: SLEEPER.foot - 44, width: 112, height: 44 },
    frames: 3,
    timeline: timelineOf((step) => {
      const beat = bassBeat(step);
      if (beat !== undefined && beat < 5) return 2;
      return step % 800 < 180 ? 1 : 0;
    }),
  },
  ...([0, 1] as const).map((index): Animation => ({
    name: `shutter${index}`,
    rect: { x: BAYS[index].x, y: DOCK_TOP - RATTLING, width: BAY.width, height: RATTLING },
    frames: 3,
    timeline: timelineOf((step) => {
      const beat = bassBeat(step - index * 4);
      if (beat === undefined || beat > 3) return 0;
      return Math.floor((step - index * 4 - BASS_AT) / 8) % 2 === 0 ? 1 : 2;
    }),
  })),
  {
    name: 'ripple',
    rect: { x: PUDDLE.x, y: PUDDLE.y - 4, width: PUDDLE.width, height: PUDDLE.height + 4 },
    frames: 4,
    timeline: timelineOf((step) => {
      if (bassBeat(step) === undefined) return 0;
      const into = (step - BASS_AT) % BEAT;
      return into < 8 ? 1 : into < 16 ? 2 : into < 24 ? 3 : 0;
    }),
  },
  {
    name: 'puddle3',
    rect: {
      x: PUDDLE_BAY3.x,
      y: PUDDLE_BAY3.y - 4,
      width: PUDDLE_BAY3.width,
      height: PUDDLE_BAY3.height + 4,
    },
    frames: 4,
    timeline: timelineOf((step) => {
      if (bassBeat(step) === undefined) return 0;
      const into = (step - BASS_AT) % BEAT;
      return into < 8 ? 1 : into < 16 ? 2 : into < 24 ? 3 : 0;
    }),
  },
  {
    name: 'can',
    rect: { x: DRUMS_X + 52, y: BASE + 30, width: 12, height: 14 },
    frames: 3,
    timeline: timelineOf((step) => {
      const beat = bassBeat(step);
      if (beat === undefined || beat > 3) return 0;
      return Math.floor((step - BASS_AT) / 8) % 2 === 0 ? 1 : 2;
    }),
  },
  {
    name: 'drainSteam',
    rect: { x: DRAIN_STEAM.x - 10, y: DRAIN_STEAM.y - 34, width: 22, height: 36 },
    frames: 4,
    timeline: [
      [0, 10],
      [1, 10],
      [2, 10],
      [3, 10],
    ],
  },
  {
    name: 'newspaper',
    rect: NEWSPAPER,
    frames: 4,
    timeline: Array.from({ length: BASS_CYCLE / 10 }, (_, step): [number, number] => [
      1 + (step % 3),
      10,
    ]),
    drift: { from: 40, to: -1440, start: 300, steps: 900 },
  },
  {
    name: 'rust',
    rect: RUST_FALL,
    frames: 4,
    timeline: timelineOf((step) => {
      const beat = bassBeat(step);
      if (beat === undefined || beat > 2) return 0;
      return 1 + (Math.floor((step - BASS_AT) / 10) % 3);
    }),
  },
  ...BOUNCERS.map((bouncer, index): Animation => ({
    name: `bouncer${index}`,
    rect: bouncerRect(bouncer),
    frames: 3,
    timeline: timelineOf((step) => {
      const beat = bassBeat(step);
      if (beat !== undefined) return step % BEAT < BEAT / 2 ? 2 : 0;
      const period = index === 0 ? 600 : 800;
      return bouncer.smokes && (step + index * 240) % period < 90 ? 1 : 0;
    }),
  })),
  {
    name: 'cat',
    rect: { x: CAT_X - 8, y: LID - 26, width: 32, height: 26 },
    frames: 3,
    timeline: timelineOf((step) => {
      const beat = bassBeat(step);
      if (beat !== undefined && beat < 5) return 2;
      return step % 300 < 40 ? 1 : 0;
    }),
  },
  {
    name: 'moths',
    rect: { x: LAMP.x - 12, y: LAMP.y - 4, width: 25, height: 17 },
    frames: 4,
    timeline: [
      [0, 5],
      [1, 5],
      [2, 5],
      [3, 5],
    ],
  },
  {
    name: 'vent',
    rect: { x: VENT.x - 18, y: VENT.top - 72, width: 40, height: 66 },
    frames: 4,
    timeline: [
      [0, 12],
      [1, 12],
      [2, 12],
      [3, 12],
    ],
  },
];

function drawBay(canvas: Canvas, index: number, rattle = 0): void {
  const bay = BAYS[index];
  if (!bay) return;
  const rect: Rect = { x: bay.x, y: BAY.top, width: BAY.width, height: DOCK_DECK - BAY.top };
  const bottom = index === 2 ? OPEN_BOTTOM : DOCK_DECK;
  drawShutter(canvas, rect, bottom, bay.label, LIGHTS, 300 + index * 7, rattle);
}

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
  const random = streamOf(5, 'tags');
  drawRoof(canvas);
  drawWall(canvas);
  WINDOWS.forEach((x, index) => {
    const dancing = DANCING.indexOf(index as (typeof DANCING)[number]);
    drawWindow(canvas, x, index, dancing < 0 ? 0 : frameOf(`crowd${dancing}`));
  });
  drawAnnex(canvas);
  drawAlley(canvas);
  drawYard(canvas);
  drawDrainPlates(canvas, PACKS, APRON.drain);
  drawDockFace(canvas);
  drawSpills(canvas);
  drawStairs(canvas);
  drawClub(canvas, OPENING, frameOf('club'));
  for (const index of [0, 1] as const) {
    const frame = frameOf(`shutter${index}`);
    drawBay(canvas, index, frame === 1 ? 1 : frame === 2 ? -1 : 0);
  }
  drawBay(canvas, 2);
  drawCanopy(canvas);
  drawStageDoor(canvas, DOOR, LIGHTS);
  drawExitSign(canvas, DOOR.x + 6, DOOR.y - 17);
  drawCagedLamp(canvas, LAMP.x, LAMP.y);
  drawMoths(canvas, frameOf('moths'));
  drawBackDoorPlate(canvas);
  drawFlyers(canvas);
  drawThrowUp(
    canvas,
    { x: 306, y: DOCK_TOP + 12, width: 88, height: 28 },
    random,
    SPRAY_RAMPS,
    TAG.ochre,
  );
  drawTag(canvas, { x: 420, y: DOCK_TOP + 16, width: 70, height: 24 }, random, SPRAY_RAMPS);
  drawThrowUp(
    canvas,
    { x: 726, y: DOCK_TOP + 14, width: 56, height: 24 },
    random,
    SPRAY_RAMPS,
    TAG.violet,
  );
  drawTag(canvas, { x: 1190, y: DOCK_TOP + 16, width: 70, height: 24 }, random, SPRAY_RAMPS);
  drawThrowUp(canvas, { x: 1372, y: 288, width: 60, height: 26 }, random, SPRAY_RAMPS, TAG.rose);
  BOUNCERS.forEach((bouncer, index) => {
    drawBouncer(canvas, bouncer, frameOf(`bouncer${index}`));
  });
  drawSawhorse(canvas, 10, BASE + 44);
  drawLitter(canvas, 448, BASE + 10, streamOf(5, 'litter'));
  drawBin(canvas, 452, BASE + 8, false);
  drawBin(canvas, 484, BASE + 10, true);
  drawPalletJack(canvas, 518, BASE + 40);
  drawCrates(canvas, BAYS[0].x + BAY.width - 26, DOCK_TOP - 2);
  drawVan(canvas, BAYS[0].x + BAY.width / 2, VAN_FOOT, LIGHTS);
  drawCone(canvas, 696, BASE + 46);
  drawDrums(canvas, DRUMS_X, BASE + 40, frameOf('can'));
  drawCables(canvas, BAYS[2].x, DOCK_TOP, BASE + 38);
  drawFlightCases(canvas, 944, BASE + 42);
  drawSpoolAndKegs(canvas, 1194, BASE + 42);
  drawSedan(canvas, 240, SEDAN_FOOT, LIGHTS);
  drawPallets(canvas, 1300, BASE + 8, 5);
  drawDumpster(canvas, DUMPSTER.x, DUMPSTER.foot, DUMPSTER.width);
  drawCat(canvas, CAT_X, LID, frameOf('cat'));
  drawBags(canvas, 92, BASE + 6, 4, streamOf(5, 'bags'));
  drawSleeper(canvas, SLEEPER.x, SLEEPER.foot, frameOf('sleeper'));
  drawPuddle(canvas, frameOf('ripple'));
  drawPuddle3(canvas, frameOf('puddle3'));
  drawDrainSteam(canvas, frameOf('drainSteam'));
  drawNewspaper(canvas, frameOf('newspaper'));
  drawRustFall(canvas, frameOf('rust'));
  drawSteam(canvas, frameOf('vent'));
  canvas.paint(0, FLOOR_END, width, height - FLOOR_END, () => 0);
  return canvas;
}
