/**
 * Walls and windows (docs/art/decor-rue.md §3.2, §5): brick lit by the street's lights, the
 * brick itself only hinted at in loose patches (full courses would be fine, tight stripes that
 * shimmer when the screen shakes), stone lintels and sills that catch the light on their top
 * edge and cast a shadow under.
 */

import { Canvas, at, tone } from './canvas.ts';
import { lightAt, type Light } from './light.ts';
import { CURTAIN, FRUIT, GLASS, PLYWOOD, SHUTTER, STONE, WARM } from './palette.ts';
import { noise, type Random } from './random.ts';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Wall {
  readonly ramp: readonly number[];
  /** Its step in the dark, before any light. */
  readonly base: number;
  readonly lights: readonly Light[];
  readonly seed: number;
  /** Share of the wall where the courses show, 0 to 1. */
  readonly bricks: number;
}

/** A brick's size, mortar included: 10 × 4 image pixels (20 × 7 cm at the middle layer's scale). */
const BRICK = { width: 10, height: 4 } as const;

/** Rows over which the street's light, bounced off the sidewalk and the shop windows, rises. */
const BOUNCE = { from: 250, to: 400, steps: 1.3 } as const;

/**
 * The wall's step at x, y: its base, the lights, the street's bounce low on the facade (so the
 * fighters' dark clothes stand out against it, audit P8), soot streaks running down.
 */
export function wallLevel(wall: Wall, x: number, y: number): number {
  const streaks = (noise(wall.seed, x, y * 0.25, 22) - 0.5) * 0.7;
  const patches = (noise(wall.seed + 7, x, y, 70) - 0.5) * 0.5;
  const bounce = Math.min(Math.max((y - BOUNCE.from) / (BOUNCE.to - BOUNCE.from), 0), 1);
  return wall.base + lightAt(wall.lights, x, y) + streaks + patches + bounce * BOUNCE.steps;
}

/** Brick courses where the wall shows them: darker mortar joints, a brick here and there off-tone. */
function brickOffset(wall: Wall, rect: Rect, x: number, y: number): number {
  const show = noise(wall.seed + 3, x, y, 26) * 0.75 + noise(wall.seed + 4, x, y, 9) * 0.25;
  if (show < 1 - wall.bricks) return 0;
  const course = Math.floor((y - rect.y) / BRICK.height);
  const shift = course % 2 === 0 ? 0 : BRICK.width / 2;
  const column = Math.floor((x - rect.x + shift) / BRICK.width);
  const inBrickX = (x - rect.x + shift) % BRICK.width;
  const inBrickY = (y - rect.y) % BRICK.height;
  if (inBrickY === BRICK.height - 1 || inBrickX === BRICK.width - 1) return -0.9;
  // One brick in seven a little lighter or darker, the same one every run.
  const pick = noise(wall.seed + 5, column * 13, course * 7, 1);
  return pick > 0.86 ? 0.55 : pick < 0.12 ? -0.45 : 0;
}

export function drawWall(canvas: Canvas, rect: Rect, wall: Wall): void {
  canvas.paint(rect.x, rect.y, rect.width, rect.height, (x, y) =>
    tone(wall.ramp, wallLevel(wall, x, y) + brickOffset(wall, rect, x, y), x, y),
  );
}

/** Darkens the wall under a ledge, fading over `depth` rows: the ledge's cast shadow. */
export function castShadow(
  canvas: Canvas,
  wall: Wall,
  x: number,
  y: number,
  width: number,
  depth: number,
): void {
  canvas.paint(x, y, width, depth, (px, py) => {
    const fade = 1 - (py - y) / depth;
    return tone(wall.ramp, wallLevel(wall, px, py) - 1.6 * fade, px, py);
  });
}

/** A stone slab (lintel, sill, cornice): its lit top edge, its face, its dark underside. */
export function drawLedge(
  canvas: Canvas,
  x: number,
  y: number,
  width: number,
  height: number,
  lights: readonly Light[],
): void {
  canvas.paint(x, y, width, height, (px, py) => {
    const lit = lightAt(lights, px, py);
    const row = py - y;
    const edge = row === 0 ? 1.4 : row === height - 1 ? -1.2 : 0;
    return tone(STONE, 1 + lit * 0.7 + edge, px, py);
  });
}

export type WindowLook =
  | { readonly kind: 'dark' }
  | { readonly kind: 'lit'; readonly curtains: boolean; readonly lamp: number }
  | { readonly kind: 'blinds' }
  | { readonly kind: 'boarded' };

export interface Sash {
  readonly rect: Rect;
  readonly look: WindowLook;
  /** A window air conditioner in the lower sash. */
  readonly unit: boolean;
  /** Plant pots on the sill. */
  readonly pots: boolean;
}

/** Inside a lit window: warm light, brighter around its lamp, curtains drawn to the sides. */
function litPane(canvas: Canvas, rect: Rect, curtains: boolean, lamp: number): void {
  const { x, y, width, height } = rect;
  const lampX = x + width * lamp;
  const lampY = y + height * 0.55;
  canvas.paint(x, y, width, height, (px, py) => {
    const glow = Math.max(0, 1 - Math.hypot(px - lampX, (py - lampY) * 1.3) / (width * 0.8)) ** 2;
    return tone(WARM, 1.1 + glow * 3, px, py);
  });
  if (!curtains) return;
  const drape = Math.max(4, Math.round(width * 0.22));
  for (const [left, folds] of [
    [x, 1],
    [x + width - drape, -1],
  ] as const) {
    canvas.paint(left, y, drape, height, (px, py) => {
      // Folds every 4 px, the inner edge a step lighter where the lamp reaches.
      const fold = (px - left) % 4 === (folds > 0 ? 3 : 0) ? -1 : 0;
      return tone(CURTAIN, 1 + fold + (py - y < 3 ? -1 : 0), px, py);
    });
  }
}

/** A dark pane: the sky's glow on its upper part, a diagonal reflection, darker below. */
function darkPane(canvas: Canvas, rect: Rect, random: Random): void {
  const { x, y, width, height } = rect;
  const streak = random.int(-4, 4);
  canvas.paint(x, y, width, height, (px, py) => {
    const along = px - x - (py - y) * 0.6 - width * 0.25 - streak;
    const reflect = along >= 0 && along < 3 && py - y < height * 0.6 ? 2 : 0;
    return tone(GLASS, 1.4 - ((py - y) / height) * 1.2 + reflect, px, py);
  });
}

/**
 * A double-hung window: stone lintel above, a dark frame, two sashes (the meeting rail between
 * them), a stone sill with its shadow below; a lit room, drawn blinds, boards; maybe an air
 * conditioner, plant pots.
 */
export function drawWindow(
  canvas: Canvas,
  sash: Sash,
  wall: Wall,
  random: Random,
): { glass: Rect } {
  const { x, y, width, height } = sash.rect;
  const { lights } = wall;
  drawLedge(canvas, x - 4, y - 7, width + 8, 6, lights);
  castShadow(canvas, wall, x - 4, y - 1, width + 8, 3);
  // The recess: the frame's dark reveal on the left and top.
  canvas.fill(x, y, width, height, at(SHUTTER, 0));
  const glass: Rect = { x: x + 3, y: y + 2, width: width - 5, height: height - 4 };
  const { look } = sash;
  if (look.kind === 'lit') litPane(canvas, glass, look.curtains, look.lamp);
  else if (look.kind === 'dark') darkPane(canvas, glass, random);
  else if (look.kind === 'blinds') {
    canvas.paint(glass.x, glass.y, glass.width, glass.height, (px, py) =>
      tone(WARM, (py - glass.y) % 5 === 4 ? 0.4 : 1.2, px, py),
    );
  } else {
    canvas.paint(glass.x, glass.y, glass.width, glass.height, (px, py) => {
      const plank = Math.floor((px - glass.x) / 7);
      const seam = (px - glass.x) % 7 === 6 ? -1 : 0;
      return tone(PLYWOOD, 1.2 + (plank % 2) * 0.5 + seam, px, py);
    });
  }
  // The meeting rail and the frame's lit sill edge.
  const rail = y + Math.round(height * 0.48);
  canvas.fill(x + 2, rail, width - 3, 2, at(SHUTTER, 2));
  canvas.hline(x + 2, rail, width - 3, at(SHUTTER, 3));
  canvas.fill(x + 2, y + 1, 1, height - 2, at(SHUTTER, 2));
  if (sash.unit) {
    const unitWidth = Math.min(width - 4, 26);
    const ux = x + Math.round((width - unitWidth) / 2);
    const uy = rail + 4;
    canvas.paint(ux, uy, unitWidth, 14, (px, py) => {
      const grille = (py - uy) % 3 === 2 && px > ux + 2 && px < ux + unitWidth - 3 ? -1 : 0;
      return tone(SHUTTER, 2.4 + (py === uy ? 1 : 0) + grille, px, py);
    });
    canvas.fill(ux, uy + 14, unitWidth, 2, at(SHUTTER, 0));
  }
  drawLedge(canvas, x - 3, y + height, width + 6, 4, lights);
  castShadow(canvas, wall, x - 3, y + height + 4, width + 6, 4);
  if (sash.pots) {
    for (let px = x + 2; px < x + width - 6; px += random.int(8, 12)) {
      canvas.fill(px, y + height - 4, 5, 4, at(PLYWOOD, 3));
      canvas.fill(px - 1, y + height - 8, 7, 4, at(FRUIT.green, 0));
      canvas.set(px + 2, y + height - 9, at(FRUIT.green, 1));
    }
  }
  return { glass };
}
