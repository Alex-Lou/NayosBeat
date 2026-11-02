/**
 * The far layer (docs/art/decor-gym.md §2.1): the end of the railway arch the gym is in. The vault
 * closes over the fight in rings of brick, darker the deeper; at its end, under the last ring, a
 * fan window of railway iron shows the night outside: the city, and the next span of the viaduct,
 * where a train crosses now and then (`drawTrain`). Opaque everywhere. Image pixels (STAGE_SCALE).
 */

import { Canvas, at, tone } from '../kit/canvas.ts';
import { lightAt, type Light } from '../kit/light.ts';
import { noise, streamOf, type Random } from '../kit/random.ts';
import {
  CLOUD,
  DISTANT,
  DISTANT_LIT,
  IRON,
  PLYWOOD,
  RING_STONE,
  SKY,
  TRAIN,
  TRAIN_LIT,
  VAULT,
} from './palette.ts';

/** The end arch: its center on the springing line, its inner radius, its ring's width. */
export const END = { x: 600, y: 330, radius: 300, ring: 22 } as const;
/** The fan window inside it, and the deck of the next span across it. */
const WINDOW = { radius: 272, sill: 330 } as const;
export const DECK = { top: 262, bottom: 276 } as const;
/** The rings of the vault, nearer and nearer: their inner radius and width. */
const RINGS = [
  { radius: 400, width: 18 },
  { radius: 520, width: 22 },
  { radius: 680, width: 28 },
] as const;

/** The gym's tubes, seen from the far end: a pool of cold light on the end wall, low. */
const LIGHTS: readonly Light[] = [
  { x: 600, y: 470, radius: 380, strength: 1.6, squash: 0.6 },
  { x: 250, y: 300, radius: 260, strength: 0.9, squash: 1 },
  { x: 950, y: 300, radius: 260, strength: 0.9, squash: 1 },
];

/** The train's cars: their length, the gap between two, how many. */
export const TRAIN_CARS = { length: 132, gap: 6, count: 3 } as const;
export const TRAIN_LENGTH = TRAIN_CARS.count * (TRAIN_CARS.length + TRAIN_CARS.gap);
/** Where the train's nose is at each frame: from past the right edge to past the left one. */
export const TRAIN_FRAMES = 22;

function distance(x: number, y: number): number {
  return Math.hypot(x + 0.5 - END.x, y + 0.5 - END.y);
}

/**
 * The vault's brick at x, y: courses along the arcs (their joints radial, staggered), darker the
 * deeper toward the end arch and the higher, soot in broad patches, the tubes' light low.
 */
function vaultAt(x: number, y: number, seed: number): number {
  const d = distance(x, y);
  const angle = Math.atan2(END.y - y - 0.5, x + 0.5 - END.x);
  const course = Math.floor(d / 6);
  const across = angle * d;
  const joint = d % 6 < 1 || (((across + (course % 2) * 7) % 14) + 14) % 14 < 1;
  const soot = (noise(seed, x, y, 48) - 0.5) * 1.6;
  const deep = Math.max(0, 1 - (d - END.radius) / 520) * 1.4;
  const light = lightAt(LIGHTS, x, y);
  return 2.3 + soot - deep + light + (joint ? -0.9 : 0);
}

/** The arch rings: dressed stone voussoirs, the joints radial, the inner edge catching light. */
function drawRing(canvas: Canvas, radius: number, width: number, seed: number): void {
  canvas.paint(0, 0, canvas.width, END.y + 1, (x, y) => {
    const d = distance(x, y);
    if (d < radius || d >= radius + width) return undefined;
    const angle = Math.atan2(END.y - y - 0.5, x + 0.5 - END.x);
    const stones = Math.round((Math.PI * radius) / 26);
    const joint = Math.abs(((angle / Math.PI) * stones) % 1) < 0.06;
    const edge = d < radius + 2 ? 1.1 : d >= radius + width - 2 ? -0.8 : 0;
    const level = 2 + edge + (noise(seed, x, y, 20) - 0.5) + lightAt(LIGHTS, x, y) * 0.7;
    return tone(RING_STONE, level - (joint ? 1.2 : 0), x, y);
  });
  // Below the springing line, the ring comes down as a pier on each side.
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? END.x - radius - width : END.x + radius;
    canvas.paint(x, END.y, width, canvas.height - END.y, (px, py) => {
      const inner = side < 0 ? px >= x + width - 2 : px < x + 2;
      const block = (py - END.y) % 24 === 0 ? -1.2 : 0;
      const level = 1.8 + (inner ? 1 : 0) + block + lightAt(LIGHTS, px, py) * 0.7;
      return tone(RING_STONE, level + (noise(seed, px, py, 20) - 0.5), px, py);
    });
  }
}

/** The night outside: the sky darker overhead, the city's towers, a few windows still lit. */
function drawOutside(canvas: Canvas, random: Random): void {
  const top = END.y - WINDOW.radius;
  canvas.paint(END.x - WINDOW.radius, top, WINDOW.radius * 2, WINDOW.radius, (x, y) => {
    if (distance(x, y) >= WINDOW.radius) return undefined;
    const low = (y - top) / WINDOW.radius;
    const cloud = noise(31, x, y * 2, 70);
    if (cloud > 0.62 && low > 0.2 && low < 0.7) return tone(CLOUD, (cloud - 0.62) * 9, x, y);
    return tone(SKY, low * 6.5, x, y);
  });
  // The towers: blocks of darker tone standing on the deck, windows lit here and there.
  let x = END.x - WINDOW.radius;
  while (x < END.x + WINDOW.radius) {
    const width = random.int(30, 70);
    const height = random.int(40, 130);
    const roof = DECK.top - height;
    const shade = random.int(0, 2);
    canvas.paint(x, roof, width, DECK.top - roof, (px, py) => {
      if (distance(px, py) >= WINDOW.radius) return undefined;
      const lit = (px - x) % 8 < 3 && (py - roof) % 10 < 4 && px - x > 3 && px < x + width - 3;
      if (lit && noise(x + 7, px >> 3, py >> 3, 1) > 0.78) return at(DISTANT_LIT, (px + py) % 3);
      return at(DISTANT, shade + (px === x ? 1 : 0));
    });
    x += width + random.int(-6, 10);
  }
}

/** Under the next span: the street beyond, dark, a few lamps and lit doors. */
function drawBelowDeck(canvas: Canvas): void {
  canvas.paint(
    END.x - WINDOW.radius,
    DECK.bottom,
    WINDOW.radius * 2,
    END.y - DECK.bottom,
    (x, y) => {
      if (distance(x, y) >= WINDOW.radius) return undefined;
      const lamp = noise(17, x >> 2, y >> 2, 1) > 0.93 && y > DECK.bottom + 20;
      if (lamp) return at(DISTANT_LIT, 1);
      return tone(DISTANT, 1.2 - (y - DECK.bottom) / 40, x, y);
    },
  );
}

/** The next span of the viaduct, across the window: its deck, its parapet, a pier going down. */
function drawDeck(canvas: Canvas): void {
  canvas.paint(
    END.x - WINDOW.radius,
    DECK.top - 6,
    WINDOW.radius * 2,
    END.y - DECK.top + 6,
    (x, y) => {
      if (distance(x, y) >= WINDOW.radius) return undefined;
      if (y < DECK.top) return (x >> 1) % 6 === 0 ? at(IRON, 1) : undefined; // the parapet's posts
      if (y < DECK.bottom) return at(IRON, y === DECK.top ? 3 : 2 - Number(y > DECK.bottom - 4));
      const pier = Math.abs(x - END.x - 120) < 22 || Math.abs(x - END.x + 170) < 22;
      return pier ? at(IRON, 1) : undefined;
    },
  );
  // The parapet's rail.
  for (let x = END.x - WINDOW.radius; x < END.x + WINDOW.radius; x++) {
    if (distance(x, DECK.top - 6) < WINDOW.radius) canvas.set(x, DECK.top - 6, at(IRON, 2));
  }
}

/**
 * The train on the deck, its nose at `nose` (it runs leftward): cars of dark steel, a band of lit
 * windows, the gaps between cars; only inside the window.
 */
export function drawTrain(canvas: Canvas, nose: number): void {
  const bottom = DECK.top - 1;
  const height = 24;
  for (let car = 0; car < TRAIN_CARS.count; car++) {
    const left = nose + car * (TRAIN_CARS.length + TRAIN_CARS.gap);
    canvas.paint(left, bottom - height, TRAIN_CARS.length, height, (x, y) => {
      if (distance(x, y) >= WINDOW.radius) return undefined;
      const row = y - (bottom - height);
      const along = x - left;
      // The front car's nose, rounded.
      if (car === 0 && along < 4 && row < 4 - along) return undefined;
      const window = row >= 5 && row < 12 && along % 14 >= 3 && along % 14 < 12;
      if (window) return at(TRAIN_LIT, row < 7 ? 2 : 1);
      if (row === 0) return at(TRAIN, 3);
      return at(TRAIN, row > 18 ? 0 : 1 + Number(row === 13));
    });
  }
}

/** The nose of the train at frame `frame` (1 to TRAIN_FRAMES; 0: no train). */
export function trainNose(frame: number): number {
  const from = END.x + WINDOW.radius;
  const to = END.x - WINDOW.radius - TRAIN_LENGTH;
  return Math.round(from + ((to - from) * (frame - 1)) / (TRAIN_FRAMES - 1));
}

/**
 * The fan window's iron: the frame along the arch, transoms in rings, mullions as spokes from the
 * hub, the sill; a few panes boarded up.
 */
function drawWindowIron(canvas: Canvas): void {
  const spokes = 12;
  canvas.paint(
    END.x - WINDOW.radius,
    END.y - WINDOW.radius,
    WINDOW.radius * 2,
    WINDOW.radius + 8,
    (x, y) => {
      const d = distance(x, y);
      if (d >= WINDOW.radius + 2) return undefined;
      if (y >= WINDOW.sill)
        return y < WINDOW.sill + 8 ? at(IRON, y === WINDOW.sill ? 4 : 2) : undefined;
      if (d >= WINDOW.radius - 6) return at(IRON, d < WINDOW.radius - 4 ? 4 : 2);
      if (d < 40) return at(IRON, d < 36 ? 2 : 3);
      for (const ring of [110, 190])
        if (Math.abs(d - ring) < 2.5) return at(IRON, d < ring ? 3 : 2);
      const angle = Math.atan2(END.y - y - 0.5, x + 0.5 - END.x);
      const spoke = (angle / Math.PI) * spokes;
      if (Math.abs(spoke - Math.round(spoke)) * ((Math.PI * d) / spokes) < 2) return at(IRON, 3);
      // Two panes boarded with plywood, between their spokes and rings.
      const pane = Math.floor(spoke);
      if ((pane === 2 && d > 190) || (pane === 9 && d > 110 && d < 190)) {
        return tone(PLYWOOD, 1 + (noise(5, x, y, 6) - 0.5), x, y);
      }
      return undefined;
    },
  );
}

/** The end wall around the window and under it: brick, in the tubes' light. */
function drawEndWall(canvas: Canvas, seed: number): void {
  const left = END.x - END.radius;
  const top = END.y - END.radius;
  canvas.paint(left, top, END.radius * 2, canvas.height - top, (x, y) => {
    if (y < END.y && distance(x, y) >= END.radius) return undefined;
    const course = Math.floor(y / 6);
    const joint = y % 6 === 5 || (x + (course % 2) * 7) % 14 === 0;
    const level =
      2 + (noise(seed, x, y, 40) - 0.5) * 1.2 + lightAt(LIGHTS, x, y) + (joint ? -0.8 : 0);
    return tone(VAULT, level, x, y);
  });
}

/** The vault, its rings, the side walls under them. */
function drawVault(canvas: Canvas, seed: number): void {
  canvas.paint(0, 0, canvas.width, canvas.height, (x, y) => {
    if (y < END.y) return tone(VAULT, vaultAt(x, y, seed), x, y);
    // Under the springing line, the side walls: plain courses, in the vault's shade.
    const course = Math.floor(y / 6);
    const joint = y % 6 === 5 || (x + (course % 2) * 7) % 14 === 0;
    const level = 1.6 + (noise(seed, x, y, 48) - 0.5) * 1.4 + lightAt(LIGHTS, x, y);
    return tone(VAULT, level + (joint ? -0.8 : 0), x, y);
  });
  for (const [index, { radius, width }] of RINGS.entries())
    drawRing(canvas, radius, width, seed + index);
}

/** The far layer, `width` × `height` image pixels; the train's nose at `train` when it passes. */
export function drawFar(width: number, height: number, seed: number, train?: number): Canvas {
  const canvas = new Canvas(width, height);
  drawVault(canvas, seed + 11);
  drawEndWall(canvas, seed + 21);
  drawOutside(canvas, streamOf(seed, 'towers'));
  drawBelowDeck(canvas);
  drawDeck(canvas);
  if (train !== undefined) drawTrain(canvas, train);
  drawWindowIron(canvas);
  drawRing(canvas, END.radius, END.ring, seed + 31);
  return canvas;
}
