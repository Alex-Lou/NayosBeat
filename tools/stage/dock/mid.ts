/**
 * The middle layer (docs/art/decor-dock.md §2.2): the yard behind L'Entrepôt. The club's back wall,
 * its high windows lit violet where the dancers' shadows jump; a steel canopy, LOADING DOCK, over
 * three bays, the third half open on the club; the stage door, its chain, the two bouncers smoking;
 * the freight lift's annex on the right; on the left the alley, fenced, the dumpster and its cat.
 * Transparent where the far layer shows (over the roof, down the alley). Image pixels
 * (STAGE_SCALE): the dock's foot is row BASE, the back of the yard; what is under the ground line
 * (row 460) is hidden by the floor.
 *
 * Every animation the club's bass shakes loops over BASS_CYCLE, the bass hitting at BASS_AT.
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { spell, spellHan } from '../kit/font.ts';
import { lightAt, type Light } from '../kit/light.ts';
import { noise, streamOf } from '../kit/random.ts';
import type { Rect } from '../kit/stage.ts';
import { CROSSED, drawFigure, type Figure, type Pose } from '../rue/people.ts';
import { drawTag } from '../rue/signs.ts';
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
import { drawBin, drawCrates, drawLitter, drawSedan, drawSleeper, drawVan } from './yard.ts';
import {
  ASPHALT,
  BRICK,
  CONCRETE,
  EMBER,
  FIGURE_RAMPS,
  GLASS,
  GLASS_WARM,
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

/** Row of the dock's foot: the back of the yard. */
export const BASE = 410;
/** Row of the dock's floor. */
const DOCK_TOP = 352;
/** Last row the layer draws: just past the ground line, under the floor's top edge. */
const FLOOR_END = 470;
/** The top of the club's back wall, its parapet. */
const ROOF = 120;
/** The club's back wall, then the freight lift's annex to the right edge. */
const WALL = { left: 232, right: 1236 } as const;
const ANNEX = { left: 1236, roof: 214 } as const;
/** Where the dock's platform starts: the stairs come up to it from the left. */
const DOCK_LEFT = 296;
/** The brick piers between the bays. */
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
/** Bay 3's shutter is rolled all the way up, on the club (club.ts): the opening's top row. */
const OPEN_BOTTOM = BAY.top + 16;
const OPENING: Rect = {
  x: BAYS[2].x,
  y: OPEN_BOTTOM,
  width: BAY.width,
  height: DOCK_TOP - OPEN_BOTTOM,
};
/** The yard's life (yard.ts): the van backed against bay 1, the sedan by the stairs, the sleeper. */
const VAN_FOOT = 456;
const SEDAN_FOOT = 458;
const SLEEPER = { x: 70, foot: 454 } as const;
/** The rows a shutter's rattle redraws, up from the dock's floor: its loose slats, its handle. */
const RATTLING = LOOSE + 6;
const DOOR: Rect = { x: 384, y: 254, width: 44, height: 98 };
const WINDOW = { y: 136, width: 56, height: 60 } as const;
const WINDOWS = [290, 418, 590, 762, 934, 1106] as const;
/** The windows the dancers' shadows show in. */
const DANCING = [2, 3, 4] as const;
const LIFT: Rect = { x: 1282, y: 264, width: 84, height: 88 };
const GATE = { left: 56, right: 232, top: 296 } as const;
const DUMPSTER = { x: 140, width: 84, foot: BASE + 4 } as const;
const CAT_X = 176;
/** The lid the cat sits on. */
const LID = DUMPSTER.foot - 51;
const PUDDLE = { x: 818, y: 436, width: 96, height: 16 } as const;
/** The yard behind the fighters: the concrete apron at the dock's foot, the drain, the asphalt. */
const APRON = { drain: BASE + 16, asphalt: BASE + 20 } as const;
const VENT = { x: 1396, top: 168 } as const;

/** The sodium wall packs, one over each bay; the caged lamp by the door. */
const PACKS = BAYS.map(({ x }) => x + BAY.width / 2);
const LIGHTS: readonly Light[] = [
  ...PACKS.flatMap((x): Light[] => [
    { x, y: 300, radius: 150, strength: 1.6, squash: 1.3 },
    { x, y: 440, radius: 130, strength: 1, squash: 0.35 },
  ]),
  { x: DOOR.x + 68, y: 262, radius: 120, strength: 1.4, squash: 1 },
  { x: DOOR.x + 60, y: 430, radius: 110, strength: 0.8, squash: 0.35 },
];

/** Steps of 1/60 s: one beat at 120 BPM, the club's tempo (docs/art/histoire.md). */
const BEAT = 30;
/**
 * The bass's cycle: every animation it shakes loops over this many steps (40 s, so a match sees it
 * once at least), the bass hitting at BASS_AT for BASS_BEATS beats.
 */
export const BASS_CYCLE = 2400;
export const BASS_AT = 1200;
const BASS_BEATS = 8;

/** An animation of the layer: what it covers, and how it draws each of its frames. */
export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  /** Frame and the steps (1/60 s) it lasts, in order, looping. */
  readonly timeline: readonly (readonly [number, number])[];
}

/** The beat of the bass at `step` of its cycle (0 to BASS_BEATS - 1), or undefined outside it. */
function bassBeat(step: number): number | undefined {
  const into = step - BASS_AT;
  return into >= 0 && into < BASS_BEATS * BEAT ? Math.floor(into / BEAT) : undefined;
}

/** A timeline over BASS_CYCLE: the frame at each step, runs of the same frame merged. */
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

// --- The club's back wall. ----------------------------------------------------------------------

/** Brick at x, y: courses of 6, joints staggered, soot from the club's vents darker up high. */
function brickAt(x: number, y: number, base: number): number {
  const course = Math.floor(y / 6);
  const joint = y % 6 === 5 || (x + (course % 2) * 7) % 14 === 0;
  const soot = (noise(71, x, y, 44) - 0.5) * 1.3 - Math.max(0, (200 - y) / 110);
  return base + soot + lightAt(LIGHTS, x, y) * 0.9 + (joint ? -0.8 : 0);
}

function pierAt(x: number): 'face' | 'edge' | 'shade' | undefined {
  for (const [left, right] of PIERS) {
    if (x < left || x >= right) continue;
    return x < left + 2 ? 'edge' : x >= right - 3 ? 'shade' : 'face';
  }
  return undefined;
}

function drawWall(canvas: Canvas): void {
  canvas.paint(WALL.left, ROOF, WALL.right - WALL.left, BASE - ROOF, (x, y) => {
    if (y >= DOCK_TOP && x >= DOCK_LEFT) return undefined;
    const pier = pierAt(x);
    const step = pier === 'face' ? 0.5 : pier === 'edge' ? 1.4 : pier === 'shade' ? -0.7 : 0;
    return tone(BRICK, brickAt(x, y, 2.1 + step), x, y);
  });
  // The parapet's coping, and the roof's edge.
  canvas.paint(WALL.left - 4, ROOF - 8, WALL.right - WALL.left + 8, 8, (x, y) =>
    tone(CONCRETE, y === ROOF - 8 ? 4 : 2.2 + (noise(5, x, y, 9) - 0.5), x, y),
  );
}

/** The roof over the parapet: the stair hut, a humming air unit, an antenna. */
function drawRoof(canvas: Canvas): void {
  const hut: Rect = { x: 262, y: 74, width: 78, height: ROOF - 8 - 74 };
  canvas.paint(hut.x, hut.y, hut.width, hut.height, (x, y) =>
    tone(BRICK, brickAt(x, y, 1.4) + (x < hut.x + 3 ? 1 : 0), x, y),
  );
  canvas.fill(hut.x - 3, hut.y - 4, hut.width + 6, 4, at(CONCRETE, 3));
  canvas.fill(hut.x + 46, hut.y + 10, 18, hut.height - 10, at(STEEL, 1));
  canvas.vline(hut.x + 46, hut.y + 10, hut.height - 10, at(STEEL, 3));
  // The air unit: a steel box, louvers, its fan's grille on top.
  const unit: Rect = { x: 640, y: 88, width: 84, height: ROOF - 8 - 88 };
  canvas.paint(unit.x, unit.y, unit.width, unit.height, (x, y) => {
    const louver = (y - unit.y) % 4 === 3 && x > unit.x + 6 && x < unit.x + 50;
    return at(STEEL, louver ? 0 : x === unit.x ? 4 : 2);
  });
  canvas.fill(unit.x + 56, unit.y - 6, 22, 6, at(STEEL, 3));
  canvas.hline(unit.x + 56, unit.y - 6, 22, at(STEEL, 4));
  // The antenna, its cross-bars.
  canvas.vline(1150, 40, ROOF - 48, at(STEEL, 2));
  for (const [y, half] of [
    [48, 14],
    [60, 10],
    [70, 7],
  ] as const) {
    canvas.hline(1150 - half, y, half * 2 + 1, at(STEEL, 2));
  }
}

/**
 * A high window of the club: its brick soldier course, a steel frame, frosted panes lit violet
 * from inside (a few warm), one broken; the dancers' shadows behind the glass (`dancers`).
 */
function drawWindow(canvas: Canvas, x: number, index: number, frame: number): void {
  const { y, width, height } = WINDOW;
  canvas.paint(x - 4, y - 8, width + 8, 8, (px, py) =>
    tone(BRICK, 2.4 + ((px - x) % 5 === 0 ? -0.9 : 0) - (py - y + 8) * 0.05, px, py),
  );
  canvas.fill(x - 2, y - 2, width + 4, height + 4, at(STEEL, 1));
  const dancing = (DANCING as readonly number[]).includes(index);
  canvas.paint(x, y, width, height, (px, py) => {
    const pane = Math.floor((px - x) / 19) + Math.floor((py - y) / 15) * 3;
    // The quiet windows: a pane broken, a pane warm from the club's orange lights.
    if (!dancing && pane === (index * 5 + 1) % 12) return at(STEEL, 0);
    if (!dancing && pane === (index * 7 + 3) % 12)
      return tone(GLASS_WARM, 1.4 + (py - y) / height, px, py);
    // The mass stays under the flashes' band (docs/flashs.md §3); the brightest a few touches.
    // The club's lights behind the frosted glass: soft blots, a touch brighter.
    if (noise(index + 95, px, py, 7) > 0.72) return at(GLASS, 3);
    const glow = 1.5 + ((py - y) / height) * 0.9 + (noise(index + 90, px, py, 10) - 0.5) * 0.6;
    return tone(GLASS, Math.min(glow, 2.3), px, py);
  });
  if (dancing) drawDancers(canvas, x, index, frame);
  // The muntins, in front of the glass and the shadows.
  for (let column = 1; column < 3; column++)
    canvas.vline(x + column * 19 - 1, y, height, at(STEEL, 1));
  for (let row = 1; row < 4; row++) canvas.hline(x, y + row * 15 - 1, width, at(STEEL, 1));
  canvas.fill(x - 4, y + height + 2, width + 8, 4, at(CONCRETE, 3));
  canvas.hline(x - 4, y + height + 2, width + 8, at(CONCRETE, 5));
}

/**
 * The dancers' shadows on the frosted glass: heads and shoulders, frame 0 at rest, 1 and 2 half of
 * them dipping on the beat, 3 everyone up with the bass, arms in the air.
 */
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
    // A head, the neck, shoulders sloping out to the window's foot: a crowd seen from behind.
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
    // Arms in the air: everyone's with the bass, one on the beat.
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

/** The canopy over the bays: its fascia painted LOADING DOCK, its tie rods up to the wall. */
function drawCanopy(canvas: Canvas): void {
  const { left, right, y, height } = CANOPY;
  for (const x of [left + 30, (left + right) / 2, right - 40]) {
    canvas.line(x, y, x + 20, y - 52, at(STEEL, 3));
    canvas.fill(x + 17, y - 56, 7, 5, at(STEEL, 2));
  }
  canvas.paint(left, y, right - left, height, (x, py) => {
    const row = py - y;
    if (row === 0) return at(STEEL, 4);
    if (row >= height - 2) return at(STEEL, 0);
    return tone(STEEL, 2.2 + (noise(17, x, py, 20) - 0.5) * 0.8, x, py);
  });
  const text = 'LOADING DOCK';
  const width = spell(text, 2, 1, () => undefined);
  const x0 = Math.round((left + right - width) / 2);
  spell(text, 2, 1, (px, py) => {
    const x = x0 + px;
    const ty = y + 3 + py;
    if (noise(41, x, ty, 4) < 0.22) return;
    canvas.set(x, ty, at(TAG.cream, noise(43, x, ty, 12) > 0.5 ? 1 : 0));
  });
  // Its underside, in shadow, and the lamps under it.
  canvas.fill(left, y + height, right - left, 3, at(STEEL, 0));
  for (const x of PACKS) drawWallPack(canvas, x, y + height + 3);
}

/**
 * The dock's face under the bays: concrete, the steel edge painted in hazard stripes, the rubber
 * bumpers, rust bleeding from the bolts.
 */
function drawDockFace(canvas: Canvas): void {
  canvas.paint(DOCK_LEFT, DOCK_TOP, canvas.width - DOCK_LEFT, BASE - DOCK_TOP, (x, y) => {
    const row = y - DOCK_TOP;
    if (row < 2) return at(STEEL, row === 0 ? 5 : 3);
    if (row < 8) {
      // Hazard stripes, worn dull: wide enough not to shimmer when the screen shakes.
      const stripe = Math.floor((x + row) / 10) % 2 === 0;
      const worn = noise(51, x, y, 6) < 0.3;
      return stripe && !worn ? at(HAZARD, row < 3 ? 1 : 0) : at(STEEL, 2);
    }
    if (row < 11) return at(CONCRETE, 0);
    return tone(CONCRETE, concreteAt(x, y, 2.6, LIGHTS) - (row - 11) * 0.02, x, y);
  });
  for (let x = DOCK_LEFT + 20; x < canvas.width; x += 48) drawStreak(canvas, x, DOCK_TOP + 8, 18);
  // The bumpers, a pair at each bay.
  for (const { x } of BAYS) {
    for (const bx of [x + 8, x + BAY.width - 32]) {
      canvas.fill(bx, DOCK_TOP + 10, 24, 34, at(RUBBER, 1));
      canvas.hline(bx, DOCK_TOP + 10, 24, at(RUBBER, 2));
      canvas.vline(bx + 23, DOCK_TOP + 10, 34, at(RUBBER, 0));
      for (const by of [DOCK_TOP + 15, DOCK_TOP + 38]) canvas.set(bx + 11, by, at(STEEL, 4));
    }
  }
  // The shadow at the dock's foot.
  canvas.hline(DOCK_LEFT, BASE - 1, canvas.width - DOCK_LEFT, at(CONCRETE, 0));
}

/** The concrete stairs up to the dock from the yard, its yellow pipe railing. */
function drawStairs(canvas: Canvas): void {
  const steps = 4;
  const rise = (BASE - DOCK_TOP) / steps;
  for (let step = 0; step < steps; step++) {
    const left = DOCK_LEFT - 60 + step * 15;
    const top = Math.round(BASE - (step + 1) * rise);
    canvas.paint(left, top, DOCK_LEFT - left, BASE - top, (x, y) =>
      tone(CONCRETE, concreteAt(x, y, y === top ? 4.4 : 2.4, LIGHTS), x, y),
    );
  }
  const post = (x: number, foot: number) => {
    canvas.fill(x, foot - 34, 3, 34, at(HAZARD, 1));
    canvas.vline(x, foot - 34, 34, at(HAZARD, 2));
  };
  post(DOCK_LEFT - 58, BASE);
  post(DOCK_LEFT - 30, BASE - 2 * rise);
  post(DOCK_LEFT - 2, DOCK_TOP);
  canvas.line(DOCK_LEFT - 58, BASE - 34, DOCK_LEFT - 2, DOCK_TOP - 34, at(HAZARD, 2), 2);
}

/** The annex of the freight lift: concrete blocks, FREIGHT stenciled over the lift's gate. */
function drawAnnex(canvas: Canvas): void {
  canvas.paint(ANNEX.left, ANNEX.roof, canvas.width - ANNEX.left, DOCK_TOP - ANNEX.roof, (x, y) => {
    const course = Math.floor((y - ANNEX.roof) / 8);
    const joint = (y - ANNEX.roof) % 8 === 7 || (x + (course % 2) * 8) % 16 === 0;
    return tone(CONCRETE, concreteAt(x, y, 2.1, LIGHTS) + (joint ? -0.9 : 0), x, y);
  });
  canvas.fill(ANNEX.left - 2, ANNEX.roof - 6, canvas.width - ANNEX.left + 2, 6, at(CONCRETE, 4));
  canvas.hline(ANNEX.left - 2, ANNEX.roof - 6, canvas.width - ANNEX.left + 2, at(CONCRETE, 6));
  drawLiftGate(canvas, LIFT);
  const text = 'FREIGHT';
  const width = spell(text, 2, 1, () => undefined);
  spell(text, 2, 1, (px, py) => {
    const x = LIFT.x + Math.round((LIFT.width - width) / 2) + px;
    const y = LIFT.y - 30 + py;
    if (noise(44, x, y, 4) > 0.25) canvas.set(x, y, at(TAG.cream, 0));
  });
  // The vent stack on its roof.
  canvas.fill(VENT.x, VENT.top, 10, ANNEX.roof - 6 - VENT.top, at(STEEL, 2));
  canvas.vline(VENT.x, VENT.top, ANNEX.roof - 6 - VENT.top, at(STEEL, 4));
  canvas.fill(VENT.x - 4, VENT.top - 5, 18, 5, at(STEEL, 3));
}

/** Steam out of the annex's vent stack, rising and torn (frames 0 to 3). */
function drawSteam(canvas: Canvas, frame: number): void {
  for (let puff = 0; puff < 4; puff++) {
    const rise = ((puff * 14 + frame * 4) % 56) + 4;
    const cx = VENT.x + 5 - rise * 0.25 + Math.sin((rise + puff) / 6) * 2;
    const size = 5 + rise / 8;
    const fade = rise / 56;
    canvas.paint(cx - size, VENT.top - 6 - rise - size / 2, size * 2, size, (px, py) => {
      const d = Math.hypot(px + 0.5 - cx, (py + 0.5 - (VENT.top - 6 - rise)) * 1.6) / size;
      if (d > 1 || noise(puff + 70, px, py, 3) < 0.3 + fade * 0.4) return undefined;
      return tone(STEAM, 2 - fade * 1.8 - d, px, py);
    });
  }
}

// --- The left end: the neighbor's corner, the alley, its gate. -----------------------------------

function drawAlley(canvas: Canvas): void {
  // The neighbor's corner, dark brick, its drainpipe.
  canvas.paint(0, 0, GATE.left, BASE, (x, y) =>
    tone(BRICK, brickAt(x, y, 1.1) + (x >= GATE.left - 3 ? 1 : 0), x, y),
  );
  canvas.fill(36, 0, 5, BASE, at(STEEL, 1));
  canvas.vline(36, 0, BASE, at(STEEL, 3));
  drawFence(canvas, GATE.left, GATE.right, GATE.top, BASE);
  drawPlate(canvas, { x: 70, y: 324, width: 58, height: 26 }, ['NO', 'PARKING']);
}

// --- The yard. -------------------------------------------------------------------------------------

/**
 * The back of the yard between the dock and the ground line: concrete in the lamps' pools, the
 * club's violet spilling out of bay 3, the shade at the dock's foot.
 */
function drawYard(canvas: Canvas): void {
  const spill = BAYS[2].x + BAY.width / 2;
  canvas.paint(0, BASE, canvas.width, FLOOR_END - BASE, (x, y) => {
    // The club's violet, a pool on the concrete out of bay 3: denser near the dock.
    const d = Math.hypot((x - spill) / 104, (y - BASE) / 34);
    const checker = (x + y) % 2 === 0;
    if (y > BASE + 1 && d < 1) {
      if (d < 0.45 && checker) return at(GLASS, 1);
      if (d < 0.75 && checker && (x >> 1) % 2 === y % 2) return at(GLASS, 1);
      if (checker && x % 4 === 0 && y % 2 === 0) return at(GLASS, 0);
    }
    const wet = wetAt(83, x, y * 2);
    // The concrete apron at the dock's foot, its joints every slab.
    if (y < APRON.drain) {
      const joint = x % 128 === 0 && y > BASE + 2;
      const shade = y < BASE + 4 ? -1 : 0;
      const ramp = y > BASE + 4 && wet ? WET : CONCRETE;
      return tone(ramp, concreteAt(x, y, 2.3, LIGHTS) + shade - (joint ? 1.2 : 0), x, y);
    }
    // The steel drain channel along it, its slots.
    if (y < APRON.asphalt) {
      if (y === APRON.drain) return at(STEEL, 3);
      return at(STEEL, x % 4 < 2 ? 0 : 1);
    }
    // The asphalt the trucks come in on, into the lamps' pools, its grit.
    if (noise(87, x, y, 2) > 0.87) return at(ASPHALT, 3);
    const grain = (noise(88, x, y * 2, 30) - 0.5) * 0.6;
    return tone(wet ? WET_ASPHALT : ASPHALT, 1.4 + grain + lightAt(LIGHTS, x, y) * 0.9, x, y);
  });
  // The pale lip of the yard against the dock.
  canvas.hline(DOCK_LEFT, BASE, canvas.width - DOCK_LEFT, at(CONCRETE, 0));
}

/**
 * The puddle in front of bay 2: the lamp's streak in it; frame 1 to 3, the rings the bass sends
 * across it (docs/art/histoire.md: « l'eau tremble avant qu'on entende quoi que ce soit »).
 */
function drawPuddle(canvas: Canvas, frame: number): void {
  const { x, y, width, height } = PUDDLE;
  const water = new Mask(canvas.width, canvas.height);
  water.ellipse(x, y, width, height);
  water.ellipse(x + 20, y - 3, width * 0.5, height * 0.6);
  const streak = PACKS[1] ?? x;
  const drop = { x: x + width * 0.42, y: y + height * 0.5 };
  canvas.paint(x, y - 4, width, height + 4, (px, py) => {
    if (!water.has(px, py)) return undefined;
    // Its far edge catches the lamp; the water mirrors the dock's dark face, the lamp a streak.
    if (!water.has(px, py - 1)) return at(CONCRETE, 5);
    if (frame > 0) {
      const r = Math.hypot((px + 0.5 - drop.x) / 2.6, py + 0.5 - drop.y);
      const ring = 1.6 + frame * 2.4;
      if (Math.abs(r - ring) < 0.55) return at(CONCRETE, 5);
    }
    const near = (py - y) / height;
    if (Math.abs(px - streak) < 1 && near < 0.8 && (px + py) % 2 === 0) return at(SODIUM, 1);
    return tone(CONCRETE, 1.7 + near * 0.6 + (noise(81, px, py, 6) - 0.5) * 0.5, px, py);
  });
}

/**
 * Rust and grit shaken off the canopy by the bass, falling over bays 1 and 2 (frames 1 to 3),
 * behind the fighters where the eye is; it stops above the shutters' loose slats, which rattle.
 */
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

/** The caged lamp by the stage door. */
const LAMP = { x: DOOR.x + DOOR.width + 22, y: DOOR.y - 6 } as const;

/** Moths around the caged lamp, each on its own small loop (frames 0 to 3). */
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

/** Flyers pasted on a pier: plain sheets, torn (Sound Clash has no poster). */
function drawFlyers(canvas: Canvas): void {
  for (const [x, y, width, height] of [
    [523, 282, 20, 28],
    [526, 314, 18, 24],
  ] as const) {
    canvas.paint(x, y, width, height, (px, py) =>
      tone(PAPER, 1.6 + (noise(x, px, py, 6) - 0.5) - (py - y) / height, px, py),
    );
    for (let d = 0; d < 5; d++)
      canvas.hline(x + width - 5 + d, y + height - 5 + d, 5 - d, at(BRICK, 2));
  }
}

/** The plate by the stage door: 后门, the back door, for the neighborhood's deliveries. */
function drawBackDoorPlate(canvas: Canvas): void {
  const x = DOOR.x + DOOR.width + 12;
  const y = DOOR.y + 38;
  canvas.fill(x, y, 24, 14, at(STEEL, 1));
  canvas.hline(x, y, 24, at(STEEL, 3));
  spellHan('后门', 1, 1, (px, py) => {
    canvas.set(x + 2 + px, y + 3 + py, at(TAG.cream, 1));
  });
}

// --- People. ------------------------------------------------------------------------------------

/** The cigarette at the hip, the forearm forward. */
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
/** A drag: the hand at the mouth. */
const DRAG: Pose = {
  ...HOLDING,
  arms: [
    { joint: [6, 9], end: [5, -4] },
    { joint: [-1, 13], end: [-1, 26] },
  ],
};

/** A bouncer, frame 0 at rest, 1 taking a drag, 2 nodding to the bass. */
interface Bouncer {
  readonly figure: Figure;
  readonly rest: Pose;
  readonly smokes: boolean;
}

const BOUNCERS: readonly Bouncer[] = [
  {
    figure: {
      x: 346,
      y: DOCK_TOP,
      height: 88,
      shoulders: 32,
      facing: 1,
      head: 'beanie',
      coat: 'puffer',
      pose: HOLDING,
      rim: { side: 1, above: true, ramp: RIM_WARM },
    },
    rest: HOLDING,
    smokes: true,
  },
  {
    figure: {
      x: 488,
      y: DOCK_TOP,
      height: 90,
      shoulders: 34,
      facing: -1,
      head: 'bare',
      coat: 'puffer',
      pose: CROSSED,
      rim: { side: -1, above: true, ramp: RIM_WARM },
      face: true,
    },
    rest: CROSSED,
    smokes: false,
  },
];

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

function drawBouncer(canvas: Canvas, { figure, rest, smokes }: Bouncer, frame: number): void {
  const pose: Pose =
    frame === 1 && smokes ? DRAG : frame === 2 ? { ...rest, lean: 3, dip: 1 } : rest;
  const shown = { ...figure, pose };
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

// --- The animations. ----------------------------------------------------------------------------

function bouncerRect({ figure }: Bouncer): Rect {
  const width = figure.shoulders + 34;
  return {
    x: figure.x - Math.round(width / 2),
    y: figure.y - figure.height - 14,
    width,
    height: figure.height + 14,
  };
}

/** The dancers bounce on the beat; with the bass, all of them jump, every beat. */
function danceAt(step: number, offset: number): number {
  const half = step % BEAT < BEAT / 2;
  if (bassBeat(step) !== undefined) return half ? 3 : 0;
  return half ? ((Math.floor(step / BEAT) + offset) % 2 === 0 ? 1 : 2) : 0;
}

/** The animations of the layer, each over its own rectangle. */
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
    // The club through bay 3: the DJ playing live, the crowd on the beat, up with the bass.
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
  // The shutters of bays 1 and 2 rattle in their guides, a little out of step.
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

/** A bay: its shutter (bay 3's half up on the club), its lamp's light on it. */
function drawBay(canvas: Canvas, index: number, rattle = 0): void {
  const bay = BAYS[index];
  if (!bay) return;
  const rect: Rect = { x: bay.x, y: BAY.top, width: BAY.width, height: DOCK_TOP - BAY.top };
  const bottom = index === 2 ? OPEN_BOTTOM : DOCK_TOP;
  drawShutter(canvas, rect, bottom, bay.label, LIGHTS, 300 + index * 7, rattle);
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
  drawDockFace(canvas);
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
  drawTag(canvas, { x: 306, y: DOCK_TOP + 14, width: 92, height: 30 }, random, SPRAY_RAMPS);
  drawTag(canvas, { x: 420, y: DOCK_TOP + 16, width: 70, height: 24 }, random, SPRAY_RAMPS);
  drawTag(canvas, { x: 728, y: DOCK_TOP + 18, width: 52, height: 20 }, random, SPRAY_RAMPS);
  drawTag(canvas, { x: 1190, y: DOCK_TOP + 16, width: 70, height: 24 }, random, SPRAY_RAMPS);
  drawTag(canvas, { x: 1374, y: 292, width: 56, height: 22 }, random, SPRAY_RAMPS);
  BOUNCERS.forEach((bouncer, index) => {
    drawBouncer(canvas, bouncer, frameOf(`bouncer${index}`));
  });
  drawLitter(canvas, 448, BASE + 10, streamOf(5, 'litter'));
  drawBin(canvas, 452, BASE + 8, false);
  drawBin(canvas, 484, BASE + 10, true);
  drawCrates(canvas, BAYS[0].x + BAY.width - 26, DOCK_TOP);
  drawVan(canvas, BAYS[0].x + BAY.width / 2, VAN_FOOT, LIGHTS);
  drawSedan(canvas, 240, SEDAN_FOOT, LIGHTS);
  drawPallets(canvas, 1300, BASE + 8, 5);
  drawDumpster(canvas, DUMPSTER.x, DUMPSTER.foot, DUMPSTER.width);
  drawCat(canvas, CAT_X, LID, frameOf('cat'));
  drawBags(canvas, 92, BASE + 6, 4, streamOf(5, 'bags'));
  drawSleeper(canvas, SLEEPER.x, SLEEPER.foot, frameOf('sleeper'));
  drawPuddle(canvas, frameOf('ripple'));
  drawRustFall(canvas, frameOf('rust'));
  drawSteam(canvas, frameOf('vent'));
  canvas.paint(0, FLOOR_END, width, height - FLOOR_END, () => 0);
  return canvas;
}
