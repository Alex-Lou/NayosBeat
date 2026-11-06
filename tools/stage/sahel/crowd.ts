/**
 * Sahel Sunset's crowd, alive (docs/art/decor-sahel.md §4): the people the illustration painted
 * along the street are taken from the middle layer itself (art-src/sahel/mid.png), split into
 * persons where the line of their heads dips, and moved on a shared beat as the Loading Dock's
 * dancers are: heads nodding by turns, and, when the music drops, everyone up, arms raised.
 *
 * Each frame is the person's own pixels, moved by whole pixels (D23), laid over the layer: the
 * figures keep the painting's colours and grain, nothing is redrawn in another style.
 */

import type { Rgba } from '../../sprites/png.ts';
import { Canvas } from '../kit/canvas.ts';
import type { CodeProp, Rect } from '../kit/stage.ts';
import { enlist, imageIn, MID } from './shared.ts';

/** A stretch of the crowd: where its heads are, and how dark a person is against the street. */
interface Zone {
  readonly name: string;
  readonly rect: Rect;
  /** Lightness (0–255) under which a pixel is a person's. */
  readonly dark: number;
  /** How far down from the top of the heads the persons move (head and shoulders). */
  readonly bob: number;
  /** Each person: the middle of its head and the top of it, in middle-layer pixels. */
  readonly heads: readonly (readonly [x: number, top: number])[];
  /** Half a person's width (the farther, the narrower). */
  readonly half: number;
}

/** One warm rim for the raised hands, in the props' shared palette. */
const RIM = enlist([
  { r: 0, g: 0, b: 0, a: 0 },
  { r: 214, g: 138, b: 86, a: 255 },
]);

const ZONES: readonly Zone[] = [
  {
    name: 'crowd-left',
    rect: { x: 0, y: 282, width: 430, height: 70 },
    dark: 92,
    bob: 26,
    half: 10,
    heads: [
      [12, 292],
      [63, 297],
      [99, 293],
      [113, 317],
      [160, 299],
      [197, 317],
      [250, 310],
      [305, 291],
      [383, 302],
    ],
  },
  {
    name: 'crowd-centre',
    rect: { x: 610, y: 292, width: 380, height: 70 },
    dark: 78,
    bob: 28,
    half: 8,
    heads: [
      [630, 308],
      [657, 312],
      [673, 318],
      [697, 315],
      [722, 313],
      [750, 319],
      [770, 333],
      [787, 337],
      [813, 338],
      [840, 335],
      [860, 337],
      [883, 337],
      [907, 333],
      [927, 332],
      [950, 333],
      [970, 330],
    ],
  },
  {
    name: 'crowd-right',
    rect: { x: 1150, y: 264, width: 290, height: 80 },
    dark: 82,
    bob: 28,
    half: 10,
    heads: [
      [1173, 320],
      [1192, 315],
      [1223, 323],
      [1262, 320],
      [1293, 298],
      [1322, 328],
      [1370, 287],
      [1408, 281],
    ],
  },
];

/** The shared beat: 30 steps (120 per minute), and the drop, 8 beats in the middle of 40 s. */
export const BEAT = 30;
export const CYCLE = 2400;
export const DROP_AT = 1200;
const DROP_BEATS = 8;

function dropBeat(step: number): number | undefined {
  const into = step - DROP_AT;
  return into >= 0 && into < DROP_BEATS * BEAT ? Math.floor(into / BEAT) : undefined;
}

/** The timeline of a frame chosen step by step, run-length encoded. */
export function timelineOf(frameAt: (step: number) => number): [number, number][] {
  const timeline: [number, number][] = [];
  for (let step = 0; step < CYCLE; step++) {
    const frame = frameAt(step);
    const last = timeline.at(-1);
    if (last && last[0] === frame) last[1] += 1;
    else timeline.push([frame, 1]);
  }
  return timeline;
}

/**
 * Frames: 1 still (the layer shows through), 2 and 3 every other person nodding, 4 the drop,
 * everyone up, arms raised, on every beat. (Frame 0, clear, is never shown.)
 */
function crowdAt(step: number, offset: number): number {
  const half = step % BEAT < BEAT / 2;
  if (dropBeat(step) !== undefined) return half ? 4 : 2 + (Math.floor(step / BEAT) % 2);
  if (!half) return 1;
  return (Math.floor(step / BEAT) + offset) % 2 === 0 ? 2 : 3;
}

function lightness({ r, g, b }: Rgba): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** A person of a zone: the columns it spans, and the top of its head in each. */
interface Person {
  readonly left: number;
  readonly right: number;
  readonly top: readonly number[];
}

/** The persons of a zone, from its heads: each spans its head's width, its top flat. */
function personsOf(zone: Zone): Person[] {
  return zone.heads.map(([x, top]) => ({
    left: x - zone.half,
    right: x + zone.half,
    top: Array.from({ length: zone.half * 2 }, () => top),
  }));
}

/**
 * A raised arm: the upper arm out to the elbow, the forearm up to the fist above the head, 3 px
 * thick as the figures' limbs are at this size, the fist catching the low sun on top.
 */
function arm(
  canvas: Canvas,
  shoulder: readonly [number, number],
  elbow: readonly [number, number],
  hand: readonly [number, number],
  body: number,
  rim: number,
): void {
  canvas.line(shoulder[0], shoulder[1], elbow[0], elbow[1], body, 3);
  canvas.line(elbow[0], elbow[1], hand[0], hand[1], body, 3);
  canvas.fill(hand[0] - 1, hand[1] - 2, 4, 4, body);
  canvas.hline(hand[0] - 1, hand[1] - 3, 4, rim);
}

/** The crowd's animations, one per zone, laid over the middle layer. */
export function crowdProps(): CodeProp[] {
  const layer = MID;
  const rim = RIM + 1;
  return ZONES.map((zone, order) => {
    const persons = personsOf(zone);
    const { rect } = zone;
    // Room above the heads for the raised arms.
    const area: Rect = { x: rect.x, y: rect.y - 14, width: rect.width, height: rect.height + 14 };
    const slotAt = (x: number, y: number) => layer.pixels[y * layer.width + x] ?? 0;
    const isDark = (x: number, y: number): boolean => {
      const color = layer.palette[slotAt(x, y)];
      return !!color && color.a > 0 && lightness(color) < zone.dark;
    };
    const frame = (index: number) => {
      const canvas = new Canvas(area.width, area.height);
      if (index <= 1) return imageIn(canvas, 0);
      persons.forEach((person, n) => {
        const moving = index >= 4 || (index === 2) === (n % 2 === 0);
        if (!moving) return;
        const lift = index >= 4 ? 2 : 1;
        for (let x = person.left; x < person.right; x++) {
          const top = person.top[x - person.left] ?? rect.y + rect.height;
          for (let y = top - 2; y < top + zone.bob && y < rect.y + rect.height; y++) {
            if (!isDark(x, y)) continue;
            canvas.set(x - area.x, y - lift - area.y, slotAt(x, y));
          }
        }
        // The drop: two persons in three throw their arms up.
        if (index >= 4 && n % 3 !== 0) {
          const middle = Math.round((person.left + person.right) / 2);
          const top = (person.top[0] ?? rect.y) - lift;
          // The arm in the person's own darkest tone, read off its chest.
          let body = slotAt(middle, top + lift + 14);
          for (let dy = 10; dy <= 20; dy += 2) {
            for (const dx of [-3, 0, 3]) {
              const y = Math.min(top + lift + dy, rect.y + rect.height - 1);
              const here = layer.palette[slotAt(middle + dx, y)];
              const best = layer.palette[body];
              if (here && best && here.a > 0 && lightness(here) < lightness(best)) {
                body = slotAt(middle + dx, y);
              }
            }
          }
          // Some throw both fists up, some one, waving.
          const both = n % 2 === 0;
          for (const side of both ? ([-1, 1] as const) : ([1] as const)) {
            const shoulder = [middle + side * 6 - area.x, top + 13 - area.y] as const;
            const elbow = [middle + side * 11 - area.x, top + 3 - area.y] as const;
            const hand = [middle + side * (both ? 8 : 10) - area.x, top - 9 - area.y] as const;
            arm(canvas, shoulder, elbow, hand, body, rim);
          }
        }
      });
      return imageIn(canvas, 0);
    };
    return {
      name: zone.name,
      layer: 'mid',
      rect: area,
      timeline: timelineOf((step) => crowdAt(step, order)),
      frames: Array.from({ length: 5 }, (_, index) => frame(index)),
      overlay: true,
    };
  });
}
