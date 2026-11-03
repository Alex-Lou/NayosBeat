/**
 * The street's people (docs/art/decor-rue.md §3.2, §6): night silhouettes, half the fighters'
 * size (the middle layer is twice as far), dark, with a rim of the light they stand in on the
 * side it comes from. Built as a mask of simple volumes (head, torso, limbs), then shaded.
 * Palette-free: each stage passes its own ramps (FigureRamps), so any stage can draw people.
 */

import { Canvas, Mask, at } from '../kit/canvas.ts';

/** The ramps a figure is shaded in, as slots of the stage's own palette. */
export interface FigureRamps {
  /** The body, darkest first: 0 the contour, 1 the legs, 2 the torso. */
  readonly body: readonly number[];
  /** The face where it catches the light: 0 and 1. */
  readonly skin: readonly number[];
}

/** Where a figure's light comes from, and the ramp of its rim. */
export interface Rim {
  /** Toward the light: -1 left, 1 right, 0 straight above. */
  readonly side: -1 | 0 | 1;
  /** A light from above too (a street lamp): the tops of the head and shoulders catch it. */
  readonly above: boolean;
  readonly ramp: readonly number[];
}

export type Head = 'bare' | 'cap' | 'beanie' | 'hood' | 'long' | 'bun' | 'curls';

/**
 * Where each limb goes, in pixels for a figure 80 px tall (scaled to its height), x toward the
 * side it faces, from the shoulder (arms) or the hip (legs).
 */
export interface Pose {
  /** Elbow and hand of the front arm, then of the back one. */
  readonly arms: readonly [Limb, Limb];
  /** Knee and foot of the front leg, then of the back one; the foot's y is its height off the ground. */
  readonly legs: readonly [Limb, Limb];
  /** How far the head and shoulders are pushed forward (a nod, a lean). */
  readonly lean: number;
  /** How far the whole body sinks (a dip on the beat), in image pixels. */
  readonly dip: number;
}

export interface Limb {
  readonly joint: readonly [number, number];
  readonly end: readonly [number, number];
}

export interface Figure {
  /** Feet center, image pixels. */
  readonly x: number;
  readonly y: number;
  /** From the soles to the top of the head. */
  readonly height: number;
  /** Width of the shoulders. */
  readonly shoulders: number;
  readonly facing: -1 | 1;
  readonly head: Head;
  /** A coat down to the knees, a short jacket, a puffer that rounds the torso. */
  readonly coat: 'long' | 'short' | 'puffer';
  readonly pose: Pose;
  readonly rim: Rim;
  /** The face catches light: the skin shows on its lit side. */
  readonly face?: boolean;
  /** A shadow on a curtain: every pixel this one slot, no rim. */
  readonly shadow?: number;
  /**
   * Its clothes (docs/art/decor-rue.md §6.1): dressed, the figure is shaded part by part in their
   * ramps, lit on its light's side, in shadow on the other; without, a dark silhouette.
   */
  readonly outfit?: Outfit;
}

/** A dressed figure's ramps, each darkest first: shadow, base, lit. */
export interface Outfit {
  /** The jacket or coat, its sleeves. */
  readonly top: readonly number[];
  readonly legs: readonly number[];
  readonly shoes: readonly number[];
  /** The hair, or the hood, beanie or cap over it. */
  readonly hair: readonly number[];
}

const REFERENCE = 80;

/** Arms hanging, legs straight. */
export const STANDING: Pose = {
  arms: [
    { joint: [1, 13], end: [2, 26] },
    { joint: [-1, 13], end: [-1, 26] },
  ],
  legs: [
    { joint: [1, 19], end: [2, 0] },
    { joint: [0, 19], end: [-2, 0] },
  ],
  lean: 0,
  dip: 0,
};

/** Hands in the pockets: elbows out, hands at the hips. */
export const POCKETS: Pose = {
  ...STANDING,
  arms: [
    { joint: [4, 12], end: [-1, 22] },
    { joint: [-3, 12], end: [1, 22] },
  ],
};

/** Arms crossed on the chest. */
export const CROSSED: Pose = {
  ...STANDING,
  arms: [
    { joint: [3, 11], end: [-9, 9] },
    { joint: [-2, 11], end: [9, 11] },
  ],
};

/** A phone to the ear, the other hand in a pocket. */
export const PHONE: Pose = {
  ...STANDING,
  arms: [
    { joint: [4, 10], end: [3, -6] },
    { joint: [-3, 12], end: [1, 22] },
  ],
};

/** Weight on the back leg, the front one loose. */
export const HIP: Pose = {
  ...POCKETS,
  legs: [
    { joint: [4, 19], end: [5, 0] },
    { joint: [-1, 19], end: [-2, 0] },
  ],
};

/** The parts of a figure, each its own mask (a dressed figure is shaded part by part). */
export type Part = 'legs' | 'shoes' | 'torso' | 'arms' | 'hands' | 'head' | 'hair';
const PARTS: readonly Part[] = ['legs', 'shoes', 'torso', 'arms', 'hands', 'head', 'hair'];

/**
 * The figure's silhouette, in its own box (origin ox, oy at the feet): the whole, and each part.
 * The whole is the same whether the parts are read or not.
 */
function maskOf(
  figure: Figure,
  width: number,
  height: number,
  ox: number,
  oy: number,
): { mask: Mask; parts: Readonly<Record<Part, Mask>> } {
  const { height: tall, shoulders, facing, head, coat, pose } = figure;
  const k = tall / REFERENCE;
  const whole = new Mask(width, height);
  const parts = Object.fromEntries(PARTS.map((part) => [part, new Mask(width, height)])) as Record<
    Part,
    Mask
  >;
  /** Draws into the whole and into `part`. */
  const on = (part: Part) => ({
    limb: (x0: number, y0: number, x1: number, y1: number, radius: number) => {
      whole.limb(x0, y0, x1, y1, radius);
      parts[part].limb(x0, y0, x1, y1, radius);
    },
    ellipse: (x: number, y: number, w: number, h: number) => {
      whole.ellipse(x, y, w, h);
      parts[part].ellipse(x, y, w, h);
    },
    rect: (x: number, y: number, w: number, h: number) => {
      whole.rect(x, y, w, h);
      parts[part].rect(x, y, w, h);
    },
    polygon: (points: readonly (readonly [number, number])[]) => {
      whole.polygon(points);
      parts[part].polygon(points);
    },
  });
  const f = (dx: number): number => ox + dx * facing;
  const sole = oy;
  const hipY = sole - Math.round(tall * 0.49) + pose.dip;
  const shoulderY = sole - Math.round(tall * 0.81) + pose.dip;
  const headHeight = Math.round(tall * 0.145);
  const headWidth = Math.round(headHeight * 0.8);
  const headTop = sole - tall + pose.dip;
  const lean = pose.lean;
  const half = shoulders / 2;
  const hipHalf = Math.round(shoulders * 0.33);
  const bulk = coat === 'puffer' ? 1.5 : 0;
  const thigh = Math.max(2.2, 3.1 * k);
  const shin = Math.max(1.8, 2.5 * k);
  // Legs: hip to knee to ankle, tapering, and the shoe a little longer forward.
  pose.legs.forEach(({ joint, end }, index) => {
    const hx = (index === 0 ? 1 : -1) * hipHalf * 0.45;
    const kx = f(hx + joint[0] * k);
    const ky = hipY + joint[1] * k;
    const ax = f(hx + end[0] * k);
    const ay = sole - end[1] * k - 3;
    on('legs').limb(f(hx), hipY, kx, ky, thigh);
    on('legs').limb(kx, ky, ax, ay, shin);
    on('shoes').ellipse(ax - 3 + facing * 1.5, ay - 1, 7, 4);
  });
  // Torso: from the neck's base down the sloping shoulders, in at the waist, out at the hips.
  const chest = half - Math.max(2, 2.6 * k);
  on('torso').polygon([
    [f(lean - 3), shoulderY - 2],
    [f(lean + 3), shoulderY - 2],
    [f(lean * 0.7 + half + bulk), shoulderY + 3],
    [f(lean * 0.5 + chest + bulk), shoulderY + 9],
    [f(hipHalf + bulk), hipY - 4],
    [f(hipHalf + 1 + bulk), hipY + 3],
    [f(-hipHalf - 1 - bulk), hipY + 3],
    [f(-hipHalf - bulk), hipY - 4],
    [f(lean * 0.5 - chest - bulk), shoulderY + 9],
    [f(lean * 0.7 - half - bulk), shoulderY + 3],
  ]);
  if (coat === 'long') {
    on('torso').polygon([
      [f(-hipHalf - 1), hipY],
      [f(hipHalf + 1), hipY],
      [f(hipHalf + 3), hipY + tall * 0.24],
      [f(-hipHalf - 3), hipY + tall * 0.24],
    ]);
  }
  // Arms: shoulder to elbow to hand, the hand a small knob.
  const upper = Math.max(1.8, 2.4 * k) + bulk * 0.6;
  const fore = Math.max(1.6, 2.1 * k) + bulk * 0.4;
  pose.arms.forEach(({ joint, end }, index) => {
    const sx = (index === 0 ? 1 : -1) * (half - upper) + lean * 0.7;
    const sy = shoulderY + 4;
    const ex = f(sx + joint[0] * k);
    const ey = sy + joint[1] * k;
    const hx = f(sx + end[0] * k);
    const hy = sy + end[1] * k;
    on('arms').limb(f(sx), sy, ex, ey, upper);
    on('arms').limb(ex, ey, hx, hy, fore);
    on('hands').ellipse(hx - 2, hy - 1.5, 4, 4);
  });
  // Neck and head.
  const headX = f(lean) + facing * 0.5;
  on('head').rect(headX - 2, headTop + headHeight - 2, 4, shoulderY - headTop - headHeight + 3);
  on('head').ellipse(headX - headWidth / 2, headTop, headWidth, headHeight);
  // The jaw, a little forward.
  on('head').rect(headX + (facing > 0 ? 0 : -3), headTop + headHeight * 0.55, 3, headHeight * 0.4);
  if (head === 'cap') {
    on('hair').ellipse(headX - headWidth / 2 - 0.5, headTop - 1, headWidth + 1, headHeight * 0.6);
    on('hair').rect(headX + (facing > 0 ? 1 : -6), headTop + 2, 5, 2);
  } else if (head === 'beanie') {
    on('hair').ellipse(headX - headWidth / 2 - 0.5, headTop - 3, headWidth + 1, headHeight * 0.75);
  } else if (head === 'hood') {
    on('hair').ellipse(
      headX - headWidth / 2 - 1.5 - facing,
      headTop - 1,
      headWidth + 3,
      headHeight + 3,
    );
  } else if (head === 'long') {
    on('hair').polygon([
      [headX - facing * (headWidth / 2 + 1), headTop + 2],
      [headX + facing, headTop + 2],
      [headX - facing, shoulderY + 7],
      [headX - facing * (headWidth / 2 + 2), shoulderY + 7],
    ]);
  } else if (head === 'bun') {
    on('hair').ellipse(headX - facing * (headWidth / 2) - 3, headTop - 3, 6, 6);
  } else if (head === 'curls') {
    on('hair').ellipse(headX - headWidth / 2 - 2, headTop - 2, headWidth + 4, headHeight + 1);
  }
  return { mask: whole, parts };
}

/** Box around a figure, in its own pixels: wide enough for any pose. */
function boxOf(figure: Figure): { width: number; height: number; ox: number; oy: number } {
  const width = figure.shoulders * 3 + 24;
  const height = figure.height + 12;
  return { width, height, ox: Math.round(width / 2), oy: height - 2 };
}

/**
 * Draws the figure: a dark body, its torso a step lighter, its rim on the side of its light
 * (two pixels deep), the top of the head and shoulders lit from above under a lamp, a darker
 * contour on the shadow side to part it from what is behind.
 */
export function drawFigure(canvas: Canvas, figure: Figure, ramps: FigureRamps): void {
  const { body, skin } = ramps;
  const box = boxOf(figure);
  const { mask, parts } = maskOf(figure, box.width, box.height, box.ox, box.oy);
  if (figure.outfit && figure.shadow === undefined) {
    drawDressed(canvas, figure, figure.outfit, skin, mask, parts, box);
    return;
  }
  const { side, above, ramp } = figure.rim;
  const left = figure.x - box.ox;
  const top = figure.y - box.oy;
  const headTop = box.oy - figure.height + figure.pose.dip;
  const waist = box.oy - figure.height * 0.5;
  const knees = box.oy - figure.height * 0.25;
  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      if (!mask.has(x, y)) continue;
      if (figure.shadow !== undefined) {
        canvas.set(left + x, top + y, figure.shadow);
        continue;
      }
      const open = (dx: number, dy: number): boolean => !mask.has(x + dx, y + dy);
      // The light fades down the body: a full rim on the head and torso, a faint one to the
      // knees, none below.
      const reach = y < waist ? 2 : y < knees ? 1 : 0;
      let slot = at(body, y < waist ? 2 : 1);
      if (side !== 0 && reach > 0 && open(side, 0)) slot = at(ramp, reach - 1);
      else if (side !== 0 && reach > 1 && open(side * 2, 0) && open(side, -1)) slot = at(ramp, 0);
      else if (above && y < waist - 6 && open(0, -1)) slot = at(ramp, y < headTop + 4 ? 1 : 0);
      else if (open(side === 0 ? 1 : -side, 0) || open(0, 1)) slot = at(body, 0);
      else if (
        figure.face &&
        y >= headTop + 4 &&
        y < headTop + figure.height * 0.13 &&
        open(figure.facing * 2, 0)
      ) {
        slot = at(skin, y < headTop + 7 ? 1 : 0);
      }
      canvas.set(left + x, top + y, slot);
    }
  }
}

/** The part a pixel of a dressed figure belongs to: the nearest to the eye first. */
function partAt(parts: Readonly<Record<Part, Mask>>, x: number, y: number): Part {
  for (const part of ['hands', 'hair', 'head', 'arms', 'torso', 'shoes'] as const) {
    if (parts[part].has(x, y)) return part;
  }
  return 'legs';
}

/**
 * A dressed figure: each part in its own ramp (the face and hands in the skin's), its base tone
 * in the middle, its light's side a step lighter and rimmed as a silhouette's is, the other side
 * and the undersides a step darker; a sleeve parted from the torso by its shadow; the hair over
 * the back of the head and its crown.
 */
function drawDressed(
  canvas: Canvas,
  figure: Figure,
  outfit: Outfit,
  skin: readonly number[],
  mask: Mask,
  parts: Readonly<Record<Part, Mask>>,
  box: { width: number; height: number; ox: number; oy: number },
): void {
  const { side, above, ramp: rim } = figure.rim;
  const left = figure.x - box.ox;
  const top = figure.y - box.oy;
  const tall = figure.height;
  const headTop = box.oy - tall + figure.pose.dip;
  const headHeight = Math.round(tall * 0.145);
  const headX = box.ox + figure.pose.lean * figure.facing + figure.facing * 0.5;
  const waist = box.oy - tall * 0.5;
  const knees = box.oy - tall * 0.25;
  const away = side === 0 ? -figure.facing : -side;
  const rampOf: Record<Part, readonly number[]> = {
    hands: skin,
    head: skin,
    hair: outfit.hair,
    arms: outfit.top,
    torso: outfit.top,
    shoes: outfit.shoes,
    legs: outfit.legs,
  };
  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      if (!mask.has(x, y)) continue;
      const open = (dx: number, dy: number): boolean => !mask.has(x + dx, y + dy);
      let part = partAt(parts, x, y);
      // The hair over the crown and the back of the head; the face toward where it looks.
      if (part === 'head') {
        const behind = (x - headX) * figure.facing < -1;
        if (y < headTop + 2 || (behind && y < headTop + headHeight * 0.75)) part = 'hair';
      }
      const ramp = rampOf[part];
      const lit = side !== 0 ? open(side, 0) || open(side * 2, 0) : open(0, -1) || open(0, -2);
      const shade = open(away, 0) || open(0, 1);
      let slot = at(ramp, lit ? 2 : shade ? 0 : 1);
      // A sleeve over the torso: its edge in shadow, so the arm reads.
      if (part === 'arms' && parts.torso.has(x + away, y) && !parts.arms.has(x + away, y)) {
        slot = at(ramp, 0);
      }
      // The legs darker toward the shoes: the light falls from above.
      if (part === 'legs' && y > knees && !lit) slot = at(ramp, 0);
      // The rim of the light it stands in, as on a silhouette: down to the knees.
      const reach = y < waist ? 2 : y < knees ? 1 : 0;
      if (side !== 0 && reach > 0 && open(side, 0)) slot = at(rim, reach - 1);
      else if (above && y < waist - 6 && open(0, -1)) slot = at(rim, y < headTop + 4 ? 1 : 0);
      canvas.set(left + x, top + y, slot);
    }
  }
}

/** The figure's box on the canvas: what it may cover, for an animation's rectangle. */
export function boundsOf(figure: Figure): { x: number; y: number; width: number; height: number } {
  const box = boxOf(figure);
  return { x: figure.x - box.ox, y: figure.y - box.oy, width: box.width, height: box.height };
}
