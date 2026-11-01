/**
 * The middle layer (docs/art/decor-rue.md §3.2): the street across, from the sidewalk shed on the
 * left corner to the brick pier on the right one. Transparent where the sky shows. Image pixels
 * (STAGE_SCALE): the facades stand on row BASE, the far edge of the sidewalk; what is under the
 * ground line (row 460) is hidden by the floor.
 */

import { Canvas, at, tone } from './canvas.ts';
import {
  drawCagedLamp,
  drawClubNeon,
  drawGhostSign,
  drawIronDoor,
  drawPeeling,
  drawWorkshopWindow,
} from './entrepot.ts';
import {
  castShadow,
  drawLedge,
  drawWall,
  drawWindow,
  type Rect,
  type Sash,
  type Wall,
  type WindowLook,
} from './facade.ts';
import {
  drawBags,
  drawBalcony,
  drawCellarDoors,
  drawDrainpipe,
  drawDumpster,
  drawFireEscape,
  drawHydrant,
  drawPoster,
  drawScaffold,
  drawShutter,
  drawStreetLamp,
} from './fixtures.ts';
import { lightAt, type Light } from './light.ts';
import {
  BRICK_PAINTED,
  BRICK_RED,
  CURTAIN,
  BRICK_TAN,
  CLEAR,
  CONCRETE,
  COOL,
  NEON_VIOLET,
  GLASS,
  LAMP,
  SHUTTER,
  RIM_VIOLET,
  RIM_WARM,
  STEAM,
  STEEL,
  STONE,
  TAG,
  WARM,
} from './palette.ts';
import {
  CROSSED,
  HIP,
  PHONE,
  POCKETS,
  STANDING,
  boundsOf,
  drawFigure,
  type Figure,
  type Pose,
} from './people.ts';
import { noise, streamOf } from './random.ts';
import { drawCat, drawDeadSign, drawGrocery, drawLaundromat } from './shops.ts';
import { drawTag, drawThrowUp } from './signs.ts';

/** Row the facades stand on: the far edge of the sidewalk. */
export const BASE = 400;
/** Last row the layer draws: just past the ground line, under the floor's top edge. */
const SIDEWALK_END = 470;

/** Rows of the window sills of each upper floor, and their windows' tops. */
const FLOORS = [
  { top: 192, sill: 250 },
  { top: 88, sill: 146 },
  { top: -16, sill: 42 },
] as const;
const WINDOW = { width: 36, height: 58 } as const;

const LIGHTS = {
  lampLeft: { x: 412, y: 140, radius: 320, strength: 2.6, squash: 0.95 },
  lampRight: { x: 1031, y: 140, radius: 320, strength: 2.6, squash: 0.95 },
  grocery: { x: 225, y: 372, radius: 170, strength: 1.7, squash: 0.55 },
  laundromat: { x: 1190, y: 372, radius: 180, strength: 1.4, squash: 0.55 },
  club: { x: 792, y: 300, radius: 120, strength: 1.9, squash: 1 },
} as const satisfies Record<string, Light>;

const STREET_LIGHTS: readonly Light[] = Object.values(LIGHTS);

/** An animation of the layer: what it covers, and how it draws each of its frames. */
export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  /** Frame and the steps (1/60 s) it lasts, in order, looping. */
  readonly timeline: readonly (readonly [number, number])[];
  readonly draw: (canvas: Canvas, frame: number) => void;
}

/** One beat at 120 BPM, in steps of 1/60 s: the club's tempo (docs/art/histoire.md). */
export const BEAT = 30;

// --- The building on the left: red brick, the grocery, the fire escape. -----------------------

const RED: Wall = { ramp: BRICK_RED, base: 1, lights: STREET_LIGHTS, seed: 101, bricks: 0.3 };
const RED_RECT: Rect = { x: 0, y: 0, width: 474, height: BASE };
const RED_BAYS = [30, 112, 194, 276, 358] as const;

// --- L'Entrepôt. ------------------------------------------------------------------------------

const PAINTED: Wall = {
  ramp: BRICK_PAINTED,
  base: 1.2,
  lights: STREET_LIGHTS,
  seed: 202,
  bricks: 0.18,
};
const ENTREPOT_RECT: Rect = { x: 474, y: 212, width: 516, height: BASE - 212 };
const IRON_DOOR: Rect = { x: 714, y: 300, width: 52, height: 100 };
const NEON = { x: 740, y: 250 } as const;

// --- The alley. -------------------------------------------------------------------------------

const ALLEY: Rect = { x: 990, y: 236, width: 72, height: BASE - 236 };
const MANHOLE = { x: 1026, y: 424 } as const;

// --- The building on the right: pale brick, balconies, the laundromat. -------------------------

const TAN: Wall = { ramp: BRICK_TAN, base: 1, lights: STREET_LIGHTS, seed: 303, bricks: 0.3 };
const TAN_RECT: Rect = { x: 1062, y: 0, width: 378, height: BASE };
const TAN_BAYS = [1090, 1170, 1250, 1330] as const;

function sashOf(x: number, top: number, look: WindowLook, unit = false, pots = false): Sash {
  return { rect: { x, y: top, ...WINDOW }, look, unit, pots };
}

// --- People. -----------------------------------------------------------------------------------

const QUEUE_FEET = 414;

interface QueueMember {
  readonly figure: Figure;
  /** Which of the four half beats it dips on, or nods on. */
  readonly phase: number;
  readonly move: 'dip' | 'nod';
}

function rimNear(x: number): Figure['rim'] {
  // Near the club's door its violet; further left the street lamp's orange, from the left.
  return x > 640
    ? { side: 1, above: true, ramp: RIM_VIOLET }
    : { side: -1, above: true, ramp: RIM_WARM };
}

function person(
  x: number,
  feet: number,
  height: number,
  shoulders: number,
  facing: -1 | 1,
  head: Figure['head'],
  coat: Figure['coat'],
  pose: Pose,
): Figure {
  return { x, y: feet, height, shoulders, facing, head, coat, pose, rim: rimNear(x) };
}

const QUEUE: readonly QueueMember[] = [
  { figure: person(506, QUEUE_FEET, 80, 21, 1, 'hood', 'short', POCKETS), phase: 0, move: 'dip' },
  { figure: person(532, QUEUE_FEET + 3, 72, 18, 1, 'long', 'long', HIP), phase: 2, move: 'nod' },
  {
    figure: person(552, QUEUE_FEET + 1, 84, 23, -1, 'cap', 'puffer', PHONE),
    phase: 1,
    move: 'dip',
  },
  {
    figure: person(594, QUEUE_FEET + 2, 75, 19, 1, 'bun', 'short', STANDING),
    phase: 3,
    move: 'dip',
  },
  { figure: person(618, QUEUE_FEET, 81, 21, 1, 'beanie', 'long', POCKETS), phase: 0, move: 'nod' },
  { figure: person(656, QUEUE_FEET + 3, 70, 18, -1, 'curls', 'short', HIP), phase: 2, move: 'dip' },
  {
    figure: person(684, QUEUE_FEET + 1, 79, 20, 1, 'bare', 'puffer', CROSSED),
    phase: 1,
    move: 'dip',
  },
];

/** The queue at a half beat `frame` (0 to 3): each dips or nods on its own half beat. */
function queueAt(frame: number): Figure[] {
  return QUEUE.map(({ figure, phase, move }) => {
    const on = (frame + phase) % 4;
    const amount = on === 1 ? 2 : on === 2 ? 1 : 0;
    const pose: Pose =
      move === 'dip' ? { ...figure.pose, dip: amount } : { ...figure.pose, lean: amount * 1.5 };
    return { ...figure, pose };
  });
}

const BOUNCER: Figure = {
  x: 810,
  y: 416,
  height: 90,
  shoulders: 30,
  facing: -1,
  head: 'beanie',
  coat: 'puffer',
  pose: CROSSED,
  rim: { side: -1, above: true, ramp: RIM_WARM },
};

/** The smoker leaning out of a window of the red building: its sill, its hand, its smoke. */
const SMOKER_WINDOW = { x: RED_BAYS[1], top: FLOORS[0].top } as const;

function drawSmoker(canvas: Canvas, frame: number): void {
  const { x, top } = SMOKER_WINDOW;
  const sill = top + WINDOW.height;
  // Its arm: the hand at the mouth on frames 1 and 2, on the sill otherwise.
  const raised = frame === 1 || frame === 2;
  const smoker: Figure = {
    x: x + 18,
    y: sill + 34,
    height: 78,
    shoulders: 20,
    facing: 1,
    head: 'bare',
    coat: 'short',
    pose: {
      ...STANDING,
      lean: 2,
      arms: [
        raised ? { joint: [7, 6], end: [3, -9] } : { joint: [6, 12], end: [12, 16] },
        { joint: [-5, 12], end: [6, 17] },
      ],
    },
    rim: { side: 0, above: true, ramp: RIM_WARM },
  };
  const before = canvas.clip;
  canvas.clip = { left: x + 2, top: top + 2, right: x + WINDOW.width - 2, bottom: sill + 3 };
  drawFigure(canvas, smoker);
  canvas.clip = before;
  // The ember, and smoke rising from it, drifting a little more each frame.
  const ember = raised ? { x: x + 23, y: top + 22 } : { x: x + 31, y: sill - 3 };
  canvas.fill(ember.x, ember.y, 2, 1, at(WARM, 5));
  const puffs = [
    [0, -6],
    [2, -12],
    [1, -19],
  ] as const;
  puffs.forEach(([dx, dy], index) => {
    const drift = (frame + index) % 4;
    canvas.fill(
      ember.x + dx + drift,
      ember.y + dy - drift * 2,
      3 - (index === 2 ? 1 : 0),
      2,
      at(STEAM, 2 - index),
    );
  });
}

/** The pair on the right building's balcony: one talks with a hand, the other nods. */
const BALCONY_PAIR = { x: TAN_BAYS[2] - 8, floor: FLOORS[0].sill + 4, width: 132 } as const;

function drawBalconyPair(canvas: Canvas, frame: number): void {
  const { x, floor } = BALCONY_PAIR;
  const talker: Figure = {
    x: x + 42,
    y: floor,
    height: 78,
    shoulders: 21,
    facing: 1,
    head: 'curls',
    coat: 'short',
    pose: {
      ...STANDING,
      arms: [
        frame === 1 ? { joint: [8, 6], end: [14, -3] } : { joint: [5, 10], end: [10, 4] },
        STANDING.arms[1],
      ],
    },
    rim: { side: -1, above: true, ramp: RIM_WARM },
  };
  const listener: Figure = {
    x: x + 78,
    y: floor,
    height: 82,
    shoulders: 22,
    facing: -1,
    head: 'cap',
    coat: 'short',
    pose: { ...POCKETS, lean: frame === 2 ? 2 : 0 },
    rim: { side: 1, above: true, ramp: RIM_WARM },
  };
  drawFigure(canvas, talker);
  drawFigure(canvas, listener);
}

/** Someone on the fire escape's middle platform, leaning on its rail, nodding on two beats. */
const LEANER = { x: RED_BAYS[3] + 18, floor: FLOORS[1].sill + 4 } as const;

function drawLeaner(canvas: Canvas, frame: number): void {
  drawFigure(canvas, {
    x: LEANER.x,
    y: LEANER.floor,
    height: 76,
    shoulders: 20,
    facing: -1,
    head: 'hood',
    coat: 'short',
    pose: {
      ...STANDING,
      arms: [
        { joint: [7, 8], end: [13, 9] },
        { joint: [-2, 11], end: [8, 11] },
      ],
      lean: frame === 1 ? 4 : 3,
    },
    rim: { side: 1, above: true, ramp: RIM_WARM },
  });
}

/** A silhouette crossing a curtained window, now and then (frames 0: gone, 1 to 3: passing). */
const CURTAIN_WINDOW = { x: TAN_BAYS[3], top: FLOORS[1].top } as const;

function drawCurtainWalker(canvas: Canvas, frame: number): void {
  if (frame === 0) return;
  const { x, top } = CURTAIN_WINDOW;
  const before = canvas.clip;
  canvas.clip = {
    left: x + 3,
    top: top + 2,
    right: x + WINDOW.width - 2,
    bottom: top + WINDOW.height - 2,
  };
  // A shadow on the curtain: flat, one tone, its edges soft-stepped.
  const walker: Figure = {
    x: x + 4 + frame * 9,
    y: top + WINDOW.height + 36,
    height: 80,
    shoulders: 21,
    facing: 1,
    head: 'long',
    coat: 'short',
    pose: STANDING,
    rim: { side: 0, above: false, ramp: RIM_WARM },
    shadow: at(CURTAIN, 0),
  };
  drawFigure(canvas, walker);
  canvas.clip = before;
}

/**
 * The steam from the manhole in front of the alley: ragged puffs rising, swelling, merging and
 * going dim (their tones step down the ramp as they thin), a dithered rim; a seamless loop.
 */
const STEAM_FRAMES = 12;

function drawSteam(canvas: Canvas, frame: number): void {
  const { x, y } = MANHOLE;
  const random = streamOf(7, 'steam');
  const count = 14;
  const puffs = Array.from({ length: count }, (_, index) => ({
    phase: index / count,
    wobble: random.int(-12, 12),
    size: random.int(22, 30),
    seed: random.int(0, 9999),
  }));
  const now = puffs
    .map((puff) => ({ ...puff, t: (puff.phase + frame / STEAM_FRAMES) % 1 }))
    .sort((a, b) => b.t - a.t);
  for (const { t, wobble, size, seed } of now) {
    const cx = x + wobble * t * 1.2 + Math.sin(t * 5 + wobble) * 4;
    const cy = y - 6 - t * 92;
    const radius = (size * (0.5 + t * 0.5)) / 2;
    const fade = t < 0.25 ? 0 : t < 0.55 ? 1 : 2;
    canvas.paint(cx - radius * 1.3, cy - radius * 1.3, radius * 2.6, radius * 2.6, (px, py) => {
      // A ragged edge that travels with the puff.
      const ragged = noise(seed, px - cx, py - cy, 6) - 0.5;
      const d = Math.hypot(px + 0.5 - cx, (py + 0.5 - cy) * 1.15) / radius + ragged * 0.6;
      if (d > 1) return undefined;
      if (d > 0.78) return (px + py) % 2 === 0 ? at(STEAM, Math.max(0, 1 - fade)) : undefined;
      return at(STEAM, 2 + (d < 0.4 && fade === 0 ? 1 : 0) - fade);
    });
  }
}

/** The grocery's cat: its tail. */
const CAT_SPOT = { x: 136, sill: 392 } as const;

/** The animations of the layer, each over its own rectangle. */
export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'queue',
    rect: { x: 486, y: 316, width: 228, height: 104 },
    frames: 4,
    timeline: [
      [0, BEAT / 2],
      [1, BEAT / 2],
      [2, BEAT / 2],
      [3, BEAT / 2],
    ],
    draw: (canvas, frame) => {
      for (const figure of queueAt(frame)) drawFigure(canvas, figure);
    },
  },
  {
    name: 'bouncer',
    rect: boundsOf(BOUNCER),
    frames: 2,
    timeline: [
      [0, BEAT * 7],
      [1, BEAT],
      [0, BEAT * 5],
      [1, BEAT],
    ],
    draw: (canvas, frame) => {
      drawFigure(canvas, { ...BOUNCER, pose: { ...BOUNCER.pose, lean: frame === 1 ? 2 : 0 } });
    },
  },
  {
    name: 'smoker',
    rect: {
      x: SMOKER_WINDOW.x,
      y: SMOKER_WINDOW.top - 30,
      width: WINDOW.width + 8,
      height: WINDOW.height + 34,
    },
    frames: 4,
    timeline: [
      [0, 100],
      [1, 40],
      [2, 50],
      [3, 80],
    ],
    draw: drawSmoker,
  },
  {
    name: 'balcony',
    rect: { x: BALCONY_PAIR.x + 10, y: BALCONY_PAIR.floor - 96, width: 104, height: 98 },
    frames: 3,
    timeline: [
      [0, BEAT * 2],
      [1, BEAT],
      [0, BEAT * 3],
      [2, BEAT * 2],
    ],
    draw: drawBalconyPair,
  },
  {
    name: 'leaner',
    rect: { x: LEANER.x - 40, y: LEANER.floor - 84, width: 80, height: 86 },
    frames: 2,
    timeline: [
      [0, BEAT * 2],
      [1, BEAT * 2],
    ],
    draw: drawLeaner,
  },
  {
    name: 'curtain',
    rect: { x: CURTAIN_WINDOW.x, y: CURTAIN_WINDOW.top, ...WINDOW },
    frames: 4,
    timeline: [
      [0, 600],
      [1, 40],
      [2, 40],
      [3, 40],
    ],
    draw: drawCurtainWalker,
  },
  {
    name: 'cat',
    rect: { x: CAT_SPOT.x, y: CAT_SPOT.sill - 22, width: 26, height: 23 },
    frames: 3,
    timeline: [
      [0, 120],
      [1, 12],
      [2, 12],
      [0, 200],
      [1, 12],
    ],
    draw: (canvas, frame) => {
      drawCat(canvas, CAT_SPOT.x, CAT_SPOT.sill, frame);
    },
  },
  {
    name: 'steam',
    rect: { x: MANHOLE.x - 36, y: MANHOLE.y - 140, width: 72, height: 146 },
    frames: STEAM_FRAMES,
    timeline: Array.from({ length: STEAM_FRAMES }, (_, frame) => [frame, 6] as const),
    draw: drawSteam,
  },
  {
    name: 'neon',
    rect: { x: NEON.x - 26, y: NEON.y - 26, width: 52, height: 62 },
    frames: 4,
    timeline: [
      [0, BEAT],
      [1, BEAT / 2],
      [2, BEAT],
      [1, BEAT / 2],
    ],
    draw: (canvas, frame) => {
      drawClubNeon(canvas, NEON.x, NEON.y, frame / 2);
    },
  },
];

// --- The composition. -------------------------------------------------------------------------

/**
 * A puddle on the sidewalk: darker wet concrete (the sky in it), and under each light above it
 * (its x, its ramp), its reflection broken into short horizontal strokes.
 */
function drawPuddle(
  canvas: Canvas,
  rect: Rect,
  reflections: readonly (readonly [number, readonly number[]])[],
): void {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const inside = (x: number, y: number): boolean =>
    ((x + 0.5 - cx) / (rect.width / 2)) ** 2 + ((y + 0.5 - cy) / (rect.height / 2)) ** 2 <= 1;
  canvas.paint(rect.x, rect.y, rect.width, rect.height, (x, y) => {
    if (!inside(x, y)) return undefined;
    // Its far edge catches the light; the water holds the dark of the sky.
    if (!inside(x, y - 1)) return at(CONCRETE, 4);
    return tone(CONCRETE, 0.3 + ((y - rect.y) / rect.height) * 0.9, x, y);
  });
  for (const [x, ramp] of reflections) {
    for (let y = rect.y + 1; y < rect.y + rect.height; y += 2) {
      const half = 1 + ((y * 7 + x) % 4);
      for (let dx = -half; dx <= half; dx++) {
        if (inside(x + dx, y)) canvas.set(x + dx, y, at(ramp, Math.abs(dx) < 2 ? 2 : 1));
      }
    }
  }
}

function drawSidewalk(canvas: Canvas): void {
  canvas.paint(0, BASE, canvas.width, SIDEWALK_END - BASE, (x, y) => {
    const foot = y - BASE < 3 ? -1 : 0;
    return tone(CONCRETE, 2.85 + lightAt(STREET_LIGHTS, x, y) * 0.7 + foot, x, y);
  });
  drawCellarDoors(canvas, 150, 414, 64);
  // Puddles from the last rain, catching what glows above them.
  drawPuddle(canvas, { x: 684, y: 428, width: 120, height: 14 }, [
    [740, NEON_VIOLET],
    [792, LAMP],
  ]);
  drawPuddle(canvas, { x: 372, y: 438, width: 90, height: 10 }, [[412, LAMP]]);
  drawPuddle(canvas, { x: 1226, y: 434, width: 128, height: 12 }, [
    [1262, COOL],
    [1318, COOL],
  ]);
  // The manhole in front of the alley.
  canvas.paint(MANHOLE.x - 16, MANHOLE.y - 3, 32, 7, (px, py) => {
    const d = Math.hypot((px + 0.5 - MANHOLE.x) / 16, (py + 0.5 - MANHOLE.y) / 3.5);
    if (d > 1) return undefined;
    return d > 0.8 ? at(STEEL, 3) : at(STEEL, (px + py) % 4 === 0 ? 2 : 1);
  });
}

function drawRedBuilding(canvas: Canvas): void {
  const random = streamOf(1, 'red');
  drawWall(canvas, RED_RECT, RED);
  const looks: WindowLook[][] = [
    [
      { kind: 'lit', curtains: true, lamp: 0.3 },
      { kind: 'lit', curtains: false, lamp: 0.6 },
      { kind: 'dark' },
      { kind: 'blinds' },
      { kind: 'dark' },
    ],
    [
      { kind: 'dark' },
      { kind: 'lit', curtains: true, lamp: 0.7 },
      { kind: 'dark' },
      { kind: 'dark' },
      { kind: 'lit', curtains: true, lamp: 0.4 },
    ],
    [
      { kind: 'dark' },
      { kind: 'dark' },
      { kind: 'lit', curtains: false, lamp: 0.5 },
      { kind: 'dark' },
      { kind: 'boarded' },
    ],
  ];
  FLOORS.forEach(({ top }, floor) => {
    RED_BAYS.forEach((x, bay) => {
      const look = looks[floor]?.[bay] ?? { kind: 'dark' };
      drawWindow(
        canvas,
        sashOf(x, top, look, floor === 1 && bay === 0, floor === 0 && bay === 4),
        RED,
        random,
      );
    });
  });
  // Its corner on the Entrepôt's side: stone quoins down to the storefronts.
  for (let y = 0; y < 276; y += 16) {
    const long = Math.floor(y / 16) % 2 === 1;
    drawLedge(canvas, 474 - (long ? 26 : 16), y + 1, long ? 26 : 16, 14, STREET_LIGHTS);
  }
  // The storefronts' cornice.
  drawLedge(canvas, 0, 276, 474, 8, STREET_LIGHTS);
  castShadow(canvas, RED, 0, 284, 474, 4);
  drawGrocery(canvas, { x: 110, y: 284, width: 232, height: 116 }, STREET_LIGHTS, random);
  // The building's entrance: a lit transom over a dark door, two steps.
  canvas.fill(350, 300, 44, 100, at(STONE, 2));
  canvas.fill(356, 306, 32, 12, at(WARM, 3));
  canvas.fill(356, 320, 32, 80, at(GLASS, 1));
  canvas.vline(372, 320, 80, at(STONE, 1));
  canvas.fill(346, 400, 52, 4, at(STONE, 3));
  canvas.fill(342, 404, 60, 4, at(STONE, 2));
  canvas.hline(342, 404, 60, at(STONE, 4));
}

function drawScaffoldCorner(canvas: Canvas): void {
  const random = streamOf(1, 'scaffold');
  const fence = drawScaffold(canvas, 0, 118, 262, 456, STREET_LIGHTS);
  drawPoster(canvas, { x: 10, y: fence.y + 18, width: 30, height: 42 }, random);
  drawPoster(canvas, { x: 44, y: fence.y + 24, width: 28, height: 38 }, random);
  drawPoster(canvas, { x: 72, y: fence.y + 14, width: 26, height: 44 }, random);
  drawTag(canvas, { x: 6, y: fence.y + 88, width: 90, height: 30 }, random);
  drawThrowUp(canvas, { x: 36, y: fence.y + 120, width: 60, height: 26 }, random);
}

function drawEntrepot(canvas: Canvas): void {
  const random = streamOf(1, 'entrepot');
  drawWall(canvas, ENTREPOT_RECT, PAINTED);
  drawPeeling(canvas, ENTREPOT_RECT, PAINTED);
  // The parapet's coping, the sky above it.
  drawLedge(canvas, 470, 206, 524, 8, STREET_LIGHTS);
  castShadow(canvas, PAINTED, 474, 214, 516, 5);
  drawGhostSign(canvas, 492, 238, PAINTED);
  // Workshop windows on the right, two panes glowing with the club.
  const glow = (column: number, row: number): 'dark' | 'violet' | 'boarded' =>
    (column * 3 + row * 5) % 7 === 2 ? 'violet' : (column + row * 3) % 8 === 5 ? 'boarded' : 'dark';
  drawWorkshopWindow(canvas, { x: 820, y: 232, width: 64, height: 50 }, PAINTED, glow);
  drawWorkshopWindow(canvas, { x: 904, y: 232, width: 64, height: 50 }, PAINTED, (c, r) =>
    glow(c + 2, r + 1),
  );
  // The loading bay's shutter, tagged.
  drawShutter(canvas, { x: 494, y: 318, width: 146, height: 82 }, STREET_LIGHTS);
  drawThrowUp(canvas, { x: 506, y: 340, width: 64, height: 26 }, random, TAG.violet);
  drawTag(canvas, { x: 576, y: 340, width: 60, height: 22 }, random);
  drawIronDoor(canvas, IRON_DOOR, PAINTED);
  drawClubNeon(canvas, NEON.x, NEON.y, 0);
  drawCagedLamp(canvas, 792, 292);
  drawPoster(canvas, { x: 850, y: 312, width: 26, height: 36 }, random);
  drawPoster(canvas, { x: 880, y: 316, width: 24, height: 34 }, random);
  drawTag(canvas, { x: 900, y: 352, width: 70, height: 24 }, random);
  drawDrainpipe(canvas, 980, 214, BASE);
}

/**
 * The alley: the Entrepôt's side wall in shadow on the left, a back wall far in under a bare
 * bulb over a back door, the dumpster at its mouth. Above the back wall, the sky (transparent).
 */
function drawAlley(canvas: Canvas): void {
  const back: Rect = { x: ALLEY.x + 12, y: 300, width: ALLEY.width - 12, height: BASE - 300 };
  const bulb = { x: back.x + 30, y: back.y + 22, radius: 60, strength: 2, squash: 1 };
  const wall: Wall = { ramp: BRICK_RED, base: 0.2, lights: [bulb], seed: 404, bricks: 0.5 };
  drawWall(canvas, back, wall);
  canvas.hline(back.x, back.y, back.width, at(STONE, 2));
  // The back door under its bulb.
  canvas.fill(back.x + 22, back.y + 34, 18, BASE - back.y - 34, at(SHUTTER, 1));
  canvas.vline(back.x + 22, back.y + 34, BASE - back.y - 34, at(SHUTTER, 3));
  canvas.fill(back.x + 28, back.y + 18, 4, 4, at(LAMP, 2));
  canvas.set(back.x + 29, back.y + 17, at(STEEL, 2));
  // The Entrepôt's side wall, running back in shadow.
  canvas.paint(ALLEY.x, 212, 12, BASE - 212, (x, y) =>
    tone(BRICK_PAINTED, 0.5 + (x - ALLEY.x) * 0.06 + lightAt([LIGHTS.lampRight], x, y) * 0.3, x, y),
  );
  canvas.vline(ALLEY.x, 212, BASE - 212, at(BRICK_PAINTED, 2));
  // The alley's ground, darker as it runs in.
  canvas.paint(ALLEY.x, BASE - 8, ALLEY.width, 8, (x, y) =>
    tone(CONCRETE, 0.6 + (y - BASE + 8) * 0.2, x, y),
  );
  drawDumpster(canvas, ALLEY.x + 10, BASE + 2);
}

function drawTanBuilding(canvas: Canvas): void {
  const random = streamOf(1, 'tan');
  drawWall(canvas, TAN_RECT, TAN);
  const looks: WindowLook[][] = [
    [
      { kind: 'dark' },
      { kind: 'blinds' },
      { kind: 'lit', curtains: true, lamp: 0.5 },
      { kind: 'lit', curtains: false, lamp: 0.3 },
    ],
    [
      { kind: 'lit', curtains: true, lamp: 0.6 },
      { kind: 'dark' },
      { kind: 'dark' },
      { kind: 'lit', curtains: true, lamp: 0.5 },
    ],
    [
      { kind: 'dark' },
      { kind: 'lit', curtains: false, lamp: 0.4 },
      { kind: 'dark' },
      { kind: 'dark' },
    ],
  ];
  FLOORS.forEach(({ top }, floor) => {
    TAN_BAYS.forEach((x, bay) => {
      const look = looks[floor]?.[bay] ?? { kind: 'dark' };
      drawWindow(canvas, sashOf(x, top, look, floor === 2 && bay === 2, false), TAN, random);
    });
  });
  // Corner quoins on the pier: stone blocks, alternately long and short, lit on their face.
  for (let y = 0; y < BASE; y += 16) {
    const long = Math.floor(y / 16) % 2 === 0;
    drawLedge(canvas, 1440 - (long ? 26 : 16), y + 1, long ? 26 : 16, 14, STREET_LIGHTS);
  }
  drawLedge(canvas, 1062, 276, 378, 8, STREET_LIGHTS);
  castShadow(canvas, TAN, 1062, 284, 378, 4);
  drawLaundromat(canvas, { x: 1070, y: 286, width: 226, height: 114 });
  drawDeadSign(canvas, { x: 1302, y: 288, width: 96, height: 16 });
  drawShutter(canvas, { x: 1304, y: 316, width: 92, height: 84 }, STREET_LIGHTS);
  drawThrowUp(canvas, { x: 1310, y: 334, width: 64, height: 28 }, random);
}

/** The people standing in front of everything else, at frame 0. */
function drawStreetLife(canvas: Canvas, frameOf: (name: string) => number): void {
  for (const animation of MID_ANIMATIONS) animation.draw(canvas, frameOf(animation.name));
}

/** The ironwork people stand behind: drawn again over them. */
function drawIronwork(canvas: Canvas): void {
  drawFireEscape(
    canvas,
    RED_BAYS[2] - 8,
    140,
    FLOORS.map(({ sill }) => sill + 4),
    RED,
  );
  drawBalcony(canvas, BALCONY_PAIR.x, BALCONY_PAIR.floor, BALCONY_PAIR.width, TAN);
  drawBalcony(canvas, TAN_BAYS[0] - 8, FLOORS[1].sill + 4, 132, TAN);
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
  drawRedBuilding(canvas);
  drawEntrepot(canvas);
  drawAlley(canvas);
  drawTanBuilding(canvas);
  drawSidewalk(canvas);
  drawScaffoldCorner(canvas);
  drawStreetLife(canvas, frameOf);
  drawIronwork(canvas);
  drawHydrant(canvas, 1384, 418, -1);
  drawBags(canvas, 1398, 418, 3, streamOf(1, 'bags'));
  drawStreetLamp(canvas, 440, 456, 150, -1);
  drawStreetLamp(canvas, 996, 456, 150, 1);
  // Nothing under the floor's top edge but the sidewalk's last rows.
  canvas.paint(0, SIDEWALK_END, width, height - SIDEWALK_END, () => CLEAR);
  return canvas;
}
