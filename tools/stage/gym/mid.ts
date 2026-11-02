/**
 * The middle layer (docs/art/decor-gym.md §2.2): the gym itself, under the nearest ring of the
 * vault. Its piers at both ends, an iron beam across, the bags and the tubes hanging from it; the
 * ring in the middle, two sparring in it; the speed bag, the rope, the lockers on the right; the
 * round timer. Transparent where the end of the arch shows (far.ts). Image pixels (STAGE_SCALE):
 * the gym's floor runs back to row BASE; what is under the ground line (row 460) is hidden by the
 * floor layer.
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { spell } from '../kit/font.ts';
import { lightAt, type Light } from '../kit/light.ts';
import { noise } from '../kit/random.ts';
import type { Rect } from '../kit/stage.ts';
import { PAPER, POSTER_RED, RIM_COOL, SIGN_INK } from '../rue/palette.ts';
import { drawFigure, STANDING, type Figure, type Pose } from '../rue/people.ts';
import { drawHalo, drawTubes } from '../rue/signs.ts';
import {
  APRON,
  DUST,
  FLUO,
  IRON,
  LAMP_GREEN,
  LAMP_RED,
  LEATHER,
  LEATHER_BLACK,
  LOCKER,
  RING_STONE,
  ROPE,
  ROPE_PALE,
  TAPE,
  VAULT,
  WOOD,
} from './palette.ts';

/** Row the gym's floor runs back to. */
export const BASE = 420;
/** Last row the layer draws: just past the ground line, under the floor's top edge. */
const FLOOR_END = 470;
/** The beam across the vault, the bags and tubes hanging from it. */
const BEAM = { y: 92, height: 12 } as const;
/** The nearest ring of the vault: a circle, its inner edge, its width. */
const NEAR_RING = { x: 720, y: 560, radius: 690, width: 26 } as const;

/** The tubes: where each hangs (its center), how wide. */
const TUBES = [
  { x: 330, y: 168 },
  { x: 720, y: 160 },
  { x: 1108, y: 168 },
] as const;
const TUBE_WIDTH = 64;

const LIGHTS: readonly Light[] = TUBES.map(({ x, y }) => ({
  x,
  y: y + 200,
  radius: 300,
  strength: 1.5,
  squash: 0.7,
}));

/** Steps of 1/60 s: one beat at 120 BPM, the club's tempo (docs/art/histoire.md). */
const BEAT = 30;
/**
 * The train's cycle (far.ts `drawTrain`): every animation it shakes loops over this many steps,
 * the train crossing from step PASSING on. Every 40 s: the gym's four minutes, sped up.
 */
export const TRAIN_CYCLE = 2400;
export const PASSING = 1200;

/** An animation of the layer: what it covers, and how it draws each of its frames. */
export interface Animation {
  readonly name: string;
  readonly rect: Rect;
  readonly frames: number;
  /** Frame and the steps (1/60 s) it lasts, in order, looping. */
  readonly timeline: readonly (readonly [number, number])[];
  readonly draw: (canvas: Canvas, frame: number) => void;
}

function inNearRing(x: number, y: number): number {
  return Math.hypot(x + 0.5 - NEAR_RING.x, y + 0.5 - NEAR_RING.y);
}

// --- The near ring of the vault, its piers, the beam. ----------------------------------------

/** Brick at x, y, its courses `course` pixels high, its tone `base`, lit by the tubes. */
function brickAt(x: number, y: number, base: number, seed: number): number {
  const course = Math.floor(y / 6);
  const joint = y % 6 === 5 || (x + (course % 2) * 7) % 14 === 0;
  const soot = (noise(seed, x, y, 40) - 0.5) * 1.2;
  return base + soot + lightAt(LIGHTS, x, y) * 0.8 + (joint ? -0.8 : 0);
}

/** Outside the near ring, the vault's soffit and its piers: brick, near and dark. */
function drawNearVault(canvas: Canvas): void {
  const { radius, width } = NEAR_RING;
  canvas.paint(0, 0, canvas.width, BASE, (x, y) => {
    const d = inNearRing(x, y);
    if (d < radius) return undefined;
    if (d < radius + width) {
      const angle = Math.atan2(NEAR_RING.y - y, x - NEAR_RING.x);
      const joint = Math.abs(((angle / Math.PI) * 90) % 1) < 0.07;
      const edge = d < radius + 2 ? 1.2 : 0;
      return tone(RING_STONE, 1.6 + edge - (joint ? 1.1 : 0) + lightAt(LIGHTS, x, y) * 0.6, x, y);
    }
    return tone(VAULT, brickAt(x, y, 1.1, 71), x, y);
  });
}

/** The beam: a riveted iron girder from one side of the ring to the other. */
function drawBeam(canvas: Canvas): void {
  const { y, height } = BEAM;
  canvas.paint(0, y, canvas.width, height, (x, py) => {
    if (inNearRing(x, py) >= NEAR_RING.radius + 4) return undefined;
    const row = py - y;
    if (row < 2 || row >= height - 2) return at(IRON, row === 0 ? 4 : 2);
    if (x % 24 === 0 && (row === 3 || row === height - 4)) return at(IRON, 5);
    return at(IRON, 1);
  });
}

/** A chain from (x, top) down to (x2, bottom): links every other pixel. */
function drawChain(canvas: Canvas, x: number, top: number, x2: number, bottom: number): void {
  const length = bottom - top;
  for (let y = top; y < bottom; y++) {
    const px = Math.round(x + ((x2 - x) * (y - top)) / length);
    canvas.set(px, y, at(IRON, (y >> 1) % 2 === 0 ? 3 : 1));
  }
}

// --- The tubes. -------------------------------------------------------------------------------

/** A fluorescent tube in its tray, hung on two chains; lit, it glows; out, it is grey. */
function drawTube(canvas: Canvas, cx: number, y: number, lit: boolean, sway = 0): void {
  const left = cx - TUBE_WIDTH / 2 + sway;
  drawChain(canvas, cx - 24, BEAM.y + BEAM.height, left + 8, y - 3);
  drawChain(canvas, cx + 24, BEAM.y + BEAM.height, left + TUBE_WIDTH - 8, y - 3);
  canvas.fill(left - 2, y - 4, TUBE_WIDTH + 4, 3, at(IRON, 3));
  canvas.hline(left - 2, y - 4, TUBE_WIDTH + 4, at(IRON, 4));
  const tube = new Mask(canvas.width, canvas.height);
  tube.rect(left, y - 1, TUBE_WIDTH, 3);
  if (!lit) {
    canvas.fill(left, y - 1, TUBE_WIDTH, 3, at(FLUO, 1));
    return;
  }
  drawHalo(canvas, tube, FLUO, 5);
  drawTubes(canvas, tube, FLUO);
}

/**
 * The tubes' light in the dusty air: under each, a cone widening to the floor, a sparse stipple
 * over whatever is behind (only where the layer is still clear), thinner the lower.
 */
function drawCones(canvas: Canvas): void {
  for (const { x, y } of TUBES) {
    const top = y + 4;
    canvas.paint(x - 110, top, 220, BASE - top, (px, py) => {
      if (canvas.get(px, py) !== 0) return undefined;
      const t = (py - top) / (BASE - top);
      const half = TUBE_WIDTH / 2 + t * 70;
      if (Math.abs(px - x) > half) return undefined;
      const every = t < 0.3 ? 3 : t < 0.65 ? 4 : 6;
      return (px + py * 2) % every === 0 && py % 2 === 0 ? at(FLUO, 0) : undefined;
    });
  }
}

// --- The ring. ---------------------------------------------------------------------------------

const RING = { left: 530, right: 910, canvas: 358, apron: 420, post: 58, inset: 26 } as const;
/** The ropes' heights over the canvas, the front ones; the back ones three pixels higher. */
const ROPES = [14, 30, 46] as const;

function drawRopes(canvas: Canvas, left: number, right: number, base: number, back: boolean): void {
  ROPES.forEach((height, index) => {
    const y = base - height;
    for (let x = left; x <= right; x++) {
      const t = (x - left) / (right - left);
      const sag = Math.round(Math.sin(t * Math.PI) * 2);
      const ramp = index === 1 ? ROPE_PALE : ROPE;
      canvas.set(x, y + sag, at(ramp, back ? 0 : 2));
      canvas.set(x, y + sag + 1, at(ramp, back ? 0 : 1));
    }
  });
}

function drawPost(canvas: Canvas, x: number, base: number, back: boolean): void {
  const top = base - RING.post;
  canvas.fill(x - 3, top, 6, RING.post, at(IRON, back ? 1 : 3));
  canvas.vline(x - 3, top, RING.post, at(IRON, back ? 2 : 5));
  // The corner's pads, where the ropes tie on.
  for (const height of ROPES) {
    canvas.fill(x - 4, base - height - 3, 8, 6, at(back ? APRON : ROPE, back ? 1 : 1));
    canvas.hline(x - 4, base - height - 3, 8, at(back ? APRON : ROPE, 2));
  }
}

/** The back of the ring: its far ropes and posts, its canvas. */
function drawRingBack(canvas: Canvas): void {
  const { left, right, inset } = RING;
  const backBase = RING.canvas - 4;
  drawRopes(canvas, left + inset, right - inset, backBase, true);
  drawPost(canvas, left + inset, backBase, true);
  drawPost(canvas, right - inset, backBase, true);
  // The canvas, seen almost edge on: a strip of worn burgundy.
  canvas.paint(left, backBase, right - left, RING.canvas - backBase, (x, y) =>
    tone(APRON, 2.6 + lightAt(LIGHTS, x, y) * 0.5 + (noise(3, x, y, 12) - 0.5), x, y),
  );
}

/** The front of the ring: its near ropes and posts, the apron with the club's name, the steps. */
function drawRingFront(canvas: Canvas): void {
  const { left, right } = RING;
  drawRopes(canvas, left, right, RING.canvas, false);
  drawPost(canvas, left, RING.canvas, false);
  drawPost(canvas, right, RING.canvas, false);
  canvas.paint(left - 6, RING.canvas, right - left + 12, RING.apron - RING.canvas, (x, y) => {
    const fold = (x - left) % 38 < 2 ? -0.7 : 0;
    const level = 1.5 - (y - RING.canvas) * 0.02 + fold + lightAt(LIGHTS, x, y) * 0.6;
    return tone(APRON, y === RING.canvas ? 4 : level, x, y);
  });
  const text = 'VIADUCT';
  const width = spell(text, 3, 2, () => undefined);
  const x0 = Math.round((left + right - width) / 2);
  spell(text, 3, 2, (px, py) => {
    const x = x0 + px;
    const y = RING.canvas + 20 + py;
    if (noise(9, x, y, 4) > 0.22) canvas.set(x, y, at(TAPE, 0));
  });
  // Wooden steps up to the left corner.
  for (let step = 0; step < 3; step++) {
    const y = RING.apron - (step + 1) * 18;
    canvas.fill(left - 40 + step * 10, y, 32, 4, tone(WOOD, 5, 0, 0));
    canvas.fill(left - 40 + step * 10, y + 4, 32, 14, at(WOOD, 2));
  }
}

// --- People. ------------------------------------------------------------------------------------

/** Fists up at the chin, elbows in. */
const GUARD: Pose = {
  arms: [
    { joint: [4, 11], end: [9, -1] },
    { joint: [-1, 11], end: [5, 0] },
  ],
  legs: [
    { joint: [3, 19], end: [7, 0] },
    { joint: [-3, 19], end: [-8, 0] },
  ],
  lean: 1,
  dip: 1,
};

/** The lead hand out: a jab. */
const JAB: Pose = {
  ...GUARD,
  arms: [
    { joint: [12, 2], end: [24, 0] },
    { joint: [-1, 11], end: [5, 0] },
  ],
  lean: 3,
};

/** The rear hand across: a cross. */
const CROSS: Pose = {
  ...GUARD,
  arms: [
    { joint: [4, 11], end: [8, 1] },
    { joint: [10, 4], end: [22, 1] },
  ],
  lean: 4,
};

/** Slipping a punch: head off the line, low. */
const SLIP: Pose = { ...GUARD, lean: -3, dip: 5 };

const COOL_RIM = { side: 0, above: true, ramp: RIM_COOL } as const;

function boxer(x: number, facing: -1 | 1, pose: Pose, head: Figure['head'] = 'bare'): Figure {
  return {
    x,
    y: RING.canvas - 1,
    height: 80,
    shoulders: 26,
    facing,
    head,
    coat: 'short',
    pose,
    rim: COOL_RIM,
    face: true,
  };
}

/** The two in the ring, frame by frame: a jab, a slip, a cross, back to guard. */
function sparringAt(frame: number): [Figure, Figure] {
  const left = [GUARD, JAB, GUARD, SLIP][frame] ?? GUARD;
  const right = [GUARD, SLIP, CROSS, GUARD][frame] ?? GUARD;
  return [boxer(676, 1, left, 'cap'), boxer(752 - (frame === 2 ? 2 : 0), -1, right, 'curls')];
}

/** The coach on the apron's corner, leaning on the top rope. */
const COACH: Figure = {
  x: 930,
  y: BASE,
  height: 84,
  shoulders: 30,
  facing: -1,
  head: 'beanie',
  coat: 'puffer',
  pose: {
    ...STANDING,
    arms: [
      { joint: [6, 6], end: [12, -2] },
      { joint: [-2, 12], end: [2, 22] },
    ],
    lean: 2,
  },
  rim: COOL_RIM,
};

// --- The heavy bags. -------------------------------------------------------------------------------

const BAG = { top: 318, height: 62, width: 22 } as const;
/** The bags along the beam, left to right: the middle one is worked on. */
const BAGS = [214, 300, 392] as const;

/** A bag's swivel: the chain comes down to it, the bag's four short straps hang from it. */
const SWIVEL = 10;

/**
 * A heavy bag hung on its chain, swung `swing` pixels at its foot (it turns about its swivel, the
 * long chain above stays still): leather, straps.
 */
function drawBag(canvas: Canvas, x: number, swing: number): void {
  const top = BAG.top;
  drawChain(canvas, x, BEAM.y + BEAM.height, x, top - SWIVEL);
  const length = SWIVEL + BAG.height;
  const shiftAt = (y: number) => Math.round((swing * (y - top + SWIVEL)) / length);
  canvas.line(x, top - SWIVEL, x - 6 + shiftAt(top), top, at(IRON, 3));
  canvas.line(x, top - SWIVEL, x + 6 + shiftAt(top), top, at(IRON, 3));
  for (let row = 0; row < BAG.height; row++) {
    const y = top + row;
    const round = row < 4 ? 4 - row : row > BAG.height - 5 ? row - (BAG.height - 5) : 0;
    const left = x - BAG.width / 2 + shiftAt(y) + round;
    const width = BAG.width - round * 2;
    for (let dx = 0; dx < width; dx++) {
      const across = dx / width;
      const strap = row === 8 || row === 9 || row === BAG.height - 10;
      const level = 3.4 - Math.abs(across - 0.35) * 5 + lightAt(LIGHTS, left + dx, y) * 0.5;
      canvas.set(
        left + dx,
        y,
        strap ? at(LEATHER_BLACK, 1 + Number(across < 0.4)) : tone(LEATHER, level, left + dx, y),
      );
    }
  }
}

/** The worked bag and the one working it: guard, a jab that lands, the bag swings, the guard. */
function drawBagWork(canvas: Canvas, frame: number): void {
  const swing = [0, 0, 3, 1][frame] ?? 0;
  drawBag(canvas, BAGS[1], swing);
  const pose = [GUARD, JAB, CROSS, GUARD][frame] ?? GUARD;
  drawFigure(canvas, {
    x: BAGS[1] - 36,
    y: BASE,
    height: 82,
    shoulders: 28,
    facing: 1,
    head: 'hood',
    coat: 'short',
    pose,
    rim: { side: 1, above: true, ramp: RIM_COOL },
  });
}

// --- The right side: speed bag, rope, timer, lockers. ---------------------------------------------

const SPEED = { x: 1004, platform: 326 } as const;

function drawSpeedBag(canvas: Canvas, frame: number): void {
  const { x, platform } = SPEED;
  // The platform on its bracket, off the back of the near pier... on a post of its own.
  canvas.fill(x - 4, platform - 2, 6, BASE - platform + 2, at(IRON, 2));
  canvas.fill(x - 22, platform - 4, 44, 4, tone(WOOD, 5, 0, 0));
  canvas.hline(x - 22, platform, 44, at(WOOD, 1));
  // The bag, a teardrop under the swivel, snapping back and forth.
  const lean = frame === 0 ? -3 : 3;
  canvas.ellipse(x + 8 + lean, platform + 2, 10, 14, at(LEATHER, 3));
  canvas.ellipse(x + 10 + lean, platform + 4, 4, 6, at(LEATHER, 4));
  drawFigure(canvas, {
    x: x - 14,
    y: BASE,
    height: 80,
    shoulders: 26,
    facing: 1,
    head: 'bun',
    coat: 'short',
    pose: {
      ...GUARD,
      arms:
        frame === 0
          ? [
              { joint: [6, 2], end: [13, -9] },
              { joint: [4, 6], end: [9, -4] },
            ]
          : [
              { joint: [4, 6], end: [9, -4] },
              { joint: [6, 2], end: [13, -9] },
            ],
      lean: 0,
      dip: 0,
    },
    rim: { side: -1, above: true, ramp: RIM_COOL },
  });
}

const SKIPPER = { x: 1092 } as const;

/** Skipping rope: the rope over the head, in front, under the feet as they leave the floor. */
function drawSkipper(canvas: Canvas, frame: number): void {
  const jump = frame === 2 ? -6 : 0;
  const figure: Figure = {
    x: SKIPPER.x,
    y: BASE,
    height: 80,
    shoulders: 26,
    facing: -1,
    head: 'long',
    coat: 'short',
    pose: {
      ...STANDING,
      arms: [
        { joint: [3, 11], end: [8, 18] },
        { joint: [-3, 11], end: [-6, 18] },
      ],
      dip: jump,
    },
    rim: { side: 1, above: true, ramp: RIM_COOL },
  };
  drawFigure(canvas, figure);
  // The rope, an arc from hand to hand: over the head, in front of the shins, under the feet.
  const handY = BASE - 80 + 11 + 18 + 14 + jump;
  const hands = [SKIPPER.x - 8, SKIPPER.x + 8] as const;
  const bottom = [BASE - 90, BASE - 20, BASE + 2][frame] ?? BASE;
  for (let x = hands[0] - 2; x <= hands[1] + 2; x++) {
    const t = (x - (hands[0] - 2)) / (hands[1] - hands[0] + 4);
    const y = Math.round(handY + (bottom - handY) * Math.sin(t * Math.PI));
    canvas.set(x, y, at(ROPE_PALE, 1));
  }
}

const TIMER: Rect = { x: 846, y: 214, width: 76, height: 34 };

/** The round timer hung from the beam: ROUND lit green for three minutes, REST red for one. */
function drawTimer(canvas: Canvas, frame: number): void {
  const { x, y, width, height } = TIMER;
  drawChain(canvas, x + 10, BEAM.y + BEAM.height, x + 10, y);
  drawChain(canvas, x + width - 10, BEAM.y + BEAM.height, x + width - 10, y);
  canvas.fill(x, y, width, height, at(LOCKER, 0));
  canvas.hline(x, y, width, at(LOCKER, 3));
  const lamp = (cx: number, ramp: readonly number[], lit: boolean, label: string) => {
    const lampMask = new Mask(canvas.width, canvas.height);
    lampMask.ellipse(cx - 4, y + 6, 9, 9);
    if (lit) drawHalo(canvas, lampMask, ramp, 3);
    canvas.ellipse(cx - 4, y + 6, 9, 9, at(ramp, lit ? 3 : 0));
    if (lit) canvas.fill(cx - 2, y + 8, 3, 2, at(ramp, 3));
    spell(label, 1, 1, (px, py) => {
      canvas.set(cx - 12 + px, y + 23 + py, at(ramp, lit ? 2 : 1));
    });
  };
  lamp(x + 20, LAMP_GREEN, frame === 0, 'ROUND');
  lamp(x + width - 18, LAMP_RED, frame === 1, 'REST');
}

/** The lockers along the right, dented, one door open; a bench in front, a bag and a towel on it. */
function drawLockers(canvas: Canvas): void {
  const left = 1170;
  const top = 326;
  for (let door = 0; door < 6; door++) {
    const x = left + door * 26;
    const open = door === 3;
    canvas.paint(x, top, 25, BASE - top, (px, py) => {
      if (open && px - x > 4) return at(LOCKER, 0);
      const vent =
        py - top > 8 && py - top < 22 && (py - top) % 3 === 0 && px - x > 6 && px - x < 19;
      const dent = noise(door + 40, px, py, 6) > 0.8 ? -0.6 : 0;
      const level = 2 + dent + (px === x ? -1 : 0) + lightAt(LIGHTS, px, py) * 0.5;
      return vent ? at(LOCKER, 0) : tone(LOCKER, level, px, py);
    });
    if (open) {
      canvas.fill(x - 6, top + 2, 6, BASE - top - 4, at(LOCKER, 3));
      canvas.fill(x + 8, top + 30, 12, 20, at(TAPE, 0));
    }
    canvas.fill(x + 19, top + 40, 2, 5, at(IRON, 4));
  }
  // The bench, its gym bag and towel.
  canvas.fill(1150, 398, 170, 5, tone(WOOD, 5, 0, 0));
  canvas.fill(1160, 403, 4, 17, at(IRON, 2));
  canvas.fill(1300, 403, 4, 17, at(IRON, 2));
  canvas.fill(1186, 384, 38, 14, at(LEATHER_BLACK, 2));
  canvas.hline(1186, 384, 38, at(LEATHER_BLACK, 3));
  canvas.fill(1250, 392, 30, 6, at(TAPE, 1));
  canvas.fill(1268, 398, 8, 12, at(TAPE, 0));
}

/** The posters on the piers: NO PAIN / NO GAIN, and an old fight bill. */
function drawPosters(canvas: Canvas): void {
  const poster = (x: number, y: number, width: number, height: number, lines: string[]) => {
    canvas.paint(x, y, width, height, (px, py) =>
      tone(PAPER, 1.4 + (noise(x, px, py, 8) - 0.5) - (py - y) / height, px, py),
    );
    lines.forEach((text, index) => {
      const textWidth = spell(text, 1, 1, () => undefined);
      spell(text, 1, 1, (px, py) => {
        canvas.set(
          x + Math.round((width - textWidth) / 2) + px,
          y + 6 + index * 11 + py,
          at(index === 0 ? POSTER_RED : SIGN_INK, 1),
        );
      });
    });
    // A torn corner.
    for (let d = 0; d < 6; d++)
      canvas.hline(x + width - 6 + d, y + height - 6 + d, 6 - d, at(VAULT, 1));
  };
  poster(16, 238, 48, 40, ['NO PAIN', 'NO GAIN']);
  poster(1378, 230, 50, 52, ['FIGHT', 'NIGHT', 'SAT 9PM']);
}

/** The far end of the gym's floor, back to the end wall: old boards, lit under the tubes. */
function drawBackFloor(canvas: Canvas): void {
  canvas.paint(0, BASE, canvas.width, FLOOR_END - BASE, (x, y) => {
    const row = Math.floor((y - BASE) / 7);
    const joint = (y - BASE) % 7 === 6 || (x + row * 53) % 170 === 0;
    const level = 2.2 + lightAt(LIGHTS, x, y) * 0.9 + (noise(13, x, y, 30) - 0.5) * 0.6;
    return tone(WOOD, level - (joint ? 1 : 0) - (y === BASE ? 1 : 0), x, y);
  });
}

/** How far the dust falls under the beam. */
const DUST_FALL = 110;

/**
 * Dust shaken from the vault by the train: specks falling through a tube's light (frame 1 to 3),
 * over the tube at `x`.
 */
function drawDust(canvas: Canvas, x: number, frame: number): void {
  if (frame === 0) return;
  for (let speck = 0; speck < 10; speck++) {
    const sx = x - 46 + ((speck * 37) % 92);
    const sy = BEAM.y + 20 + ((speck * 23 + frame * 30) % DUST_FALL);
    canvas.set(sx, sy, at(DUST, speck % 2));
  }
}

/** The animations of the layer, each over its own rectangle. */
export const MID_ANIMATIONS: readonly Animation[] = [
  {
    name: 'sparring',
    rect: { x: 624, y: 268, width: 192, height: 92 },
    frames: 4,
    timeline: [
      [0, BEAT],
      [1, BEAT / 2],
      [2, BEAT / 2],
      [3, BEAT],
    ],
    draw: (canvas, frame) => {
      for (const figure of sparringAt(frame)) drawFigure(canvas, figure);
    },
  },
  {
    name: 'bagwork',
    rect: {
      x: BAGS[1] - 80,
      y: BEAM.y + BEAM.height,
      width: 120,
      height: BASE - BEAM.y - BEAM.height + 2,
    },
    frames: 4,
    timeline: [
      [0, BEAT],
      [1, BEAT / 3],
      [2, BEAT / 3],
      [3, BEAT],
    ],
    draw: drawBagWork,
  },
  {
    name: 'speedbag',
    rect: { x: SPEED.x - 50, y: SPEED.platform - 8, width: 80, height: BASE - SPEED.platform + 10 },
    frames: 2,
    timeline: [
      [0, 6],
      [1, 6],
    ],
    draw: drawSpeedBag,
  },
  {
    name: 'skipping',
    rect: { x: SKIPPER.x - 30, y: BASE - 100, width: 60, height: 104 },
    frames: 3,
    timeline: [
      [0, 8],
      [1, 8],
      [2, 8],
    ],
    draw: drawSkipper,
  },
  {
    name: 'timer',
    rect: { x: TIMER.x - 4, y: TIMER.y - 4, width: TIMER.width + 8, height: TIMER.height + 8 },
    frames: 2,
    timeline: [
      [0, 180 * 60],
      [1, 60 * 60],
    ],
    draw: drawTimer,
  },
  {
    // The right tube, failing: it goes out and back now and then, never faster than 1.5 Hz.
    name: 'flicker',
    rect: {
      x: TUBES[2].x - TUBE_WIDTH / 2 - 8,
      y: TUBES[2].y - 10,
      width: TUBE_WIDTH + 16,
      height: 18,
    },
    frames: 2,
    timeline: [
      [0, 420],
      [1, 20],
      [0, 20],
      [1, 20],
      [0, 700],
      [1, 30],
    ],
    draw: (canvas, frame) => {
      drawTube(canvas, TUBES[2].x, TUBES[2].y, frame === 0);
    },
  },
  ...BAGS.filter((_, index) => index !== 1).map((x, index): Animation => ({
    name: `swing${index}`,
    rect: { x: x - 20, y: BAG.top - SWIVEL, width: 40, height: BAG.height + SWIVEL + 1 },
    frames: 3,
    timeline: [
      [0, PASSING + 30 + index * 10],
      [1, 30],
      [2, 30],
      [1, 30],
      [0, 30],
      [2, 30],
      [1, 40],
      [0, TRAIN_CYCLE - PASSING - 220 - index * 10],
    ],
    draw: (canvas, frame) => {
      drawBag(canvas, x, (index === 0 ? 1 : -1) * ([0, 3, -3][frame] ?? 0));
    },
  })),
  ...TUBES.map(({ x }, index): Animation => ({
    name: `dust${index}`,
    rect: { x: x - 50, y: BEAM.y + 20, width: 100, height: DUST_FALL },
    frames: 4,
    timeline: [
      [0, PASSING + 20 + index * 8],
      [1, 14],
      [2, 14],
      [3, 14],
      [1, 14],
      [2, 14],
      [3, 14],
      [0, TRAIN_CYCLE - PASSING - 104 - index * 8],
    ],
    draw: (canvas, frame) => {
      drawDust(canvas, x, frame);
    },
  })),
];

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
  drawNearVault(canvas);
  drawBackFloor(canvas);
  drawCones(canvas);
  drawBeam(canvas);
  drawRingBack(canvas);
  for (const figure of sparringAt(frameOf('sparring'))) drawFigure(canvas, figure);
  drawRingFront(canvas);
  drawFigure(canvas, COACH);
  drawBag(canvas, BAGS[0], [0, 3, -3][frameOf('swing0')] ?? 0);
  drawBag(canvas, BAGS[2], -([0, 3, -3][frameOf('swing1')] ?? 0));
  drawBagWork(canvas, frameOf('bagwork'));
  drawLockers(canvas);
  drawSpeedBag(canvas, frameOf('speedbag'));
  drawSkipper(canvas, frameOf('skipping'));
  drawTimer(canvas, frameOf('timer'));
  drawTube(canvas, TUBES[0].x, TUBES[0].y, true);
  drawTube(canvas, TUBES[1].x, TUBES[1].y, true);
  drawTube(canvas, TUBES[2].x, TUBES[2].y, frameOf('flicker') === 0);
  drawPosters(canvas);
  TUBES.forEach(({ x }, index) => {
    drawDust(canvas, x, frameOf(`dust${index}`));
  });
  canvas.paint(0, FLOOR_END, width, height - FLOOR_END, () => 0);
  return canvas;
}
