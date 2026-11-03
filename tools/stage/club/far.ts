/**
 * The far layer (docs/art/decor-club.md §2.1): the back of L'Entrepôt's room. The black brick wall,
 * the truss along the ceiling and its lamps, their light in flat beams; the two speaker walls, the
 * DJ's booth between them on its riser, its fixed bar of violet LEDs, the DJ behind it. Opaque
 * everywhere. Flat tones (docs/art/proprete.md). Image pixels (STAGE_SCALE).
 */

import { Canvas, Mask, at } from '../kit/canvas.ts';
import { drawFigure, STANDING, type Figure, type Pose } from '../rue/people.ts';
import { BRICK, CABINET, CONE, FIGURE_RAMPS, FLOOR, RIM, STEEL, VIOLET, WOOD } from './palette.ts';

/** The back's floor line, the booth's riser, the booth. */
export const BACK = { floor: 430, riser: 392 } as const;
export const BOOTH = { left: 500, right: 700, top: 330 } as const;
/** The speaker walls, each four cabinets high, two wide. */
export const STACKS = [292, 718] as const;
const CABINET_SIZE = { width: 95, height: 68 } as const;

/** The truss's lamps: where each hangs, where its beam falls. */
const LAMPS = [
  { x: 260, to: 420 },
  { x: 600, to: 600 },
  { x: 940, to: 780 },
] as const;

/** The brick: courses of flat tones, their joints a step darker. */
function drawWall(canvas: Canvas): void {
  canvas.paint(0, 0, canvas.width, BACK.floor, (x, y) => {
    const course = Math.floor(y / 12);
    const joint = y % 12 === 0 || (x + (course % 2) * 24) % 48 === 0;
    return at(BRICK, joint ? 1 : 2);
  });
}

/** The lamps' beams: long flat wedges of violet haze down to the floor. */
function drawBeams(canvas: Canvas): void {
  for (const { x, to } of LAMPS) {
    const beam = new Mask(canvas.width, canvas.height);
    beam.polygon([
      [x - 6, 74],
      [x + 6, 74],
      [to + 70, BACK.floor],
      [to - 70, BACK.floor],
    ]);
    canvas.paint(0, 74, canvas.width, BACK.floor - 74, (px, py) =>
      beam.has(px, py) ? at(VIOLET, 0) : undefined,
    );
  }
}

/** The truss along the ceiling, its lamps. */
function drawTruss(canvas: Canvas): void {
  canvas.fill(0, 44, canvas.width, 22, at(STEEL, 1));
  canvas.hline(0, 44, canvas.width, at(STEEL, 3));
  canvas.hline(0, 65, canvas.width, at(STEEL, 3));
  for (let x = 0; x < canvas.width; x += 22) {
    canvas.line(x, 45, x + 11, 64, at(STEEL, 2));
    canvas.line(x + 11, 64, x + 22, 45, at(STEEL, 2));
  }
  for (const { x } of LAMPS) {
    canvas.fill(x - 8, 66, 16, 8, at(STEEL, 3));
    canvas.fill(x - 5, 72, 10, 3, at(VIOLET, 3));
  }
}

/** A speaker cabinet: its frame, two cones, `pump` (0 or 1) pushing them out. */
export function drawCabinet(canvas: Canvas, x: number, y: number, pump: number): void {
  const { width, height } = CABINET_SIZE;
  canvas.fill(x, y, width, height, at(CABINET, 1));
  canvas.hline(x, y, width, at(CABINET, 3));
  canvas.vline(x, y, height, at(CABINET, 2));
  for (const cx of [x + width * 0.3, x + width * 0.7]) {
    const r = 15 + pump;
    canvas.paint(cx - r - 1, y + height / 2 - r - 1, r * 2 + 2, r * 2 + 2, (px, py) => {
      const d = Math.hypot(px + 0.5 - cx, py + 0.5 - (y + height / 2));
      if (d > r) return undefined;
      return at(CONE, d > r - 2 ? 1 : d < 4 ? 1 : pump === 1 && d < 8 ? 2 : 0);
    });
  }
}

/** The two speaker walls, `pump` their cones. */
export function drawStacks(canvas: Canvas, pump: number): void {
  for (const left of STACKS) {
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 2; column++) {
        const x = left + column * CABINET_SIZE.width;
        const y = BACK.floor - (row + 1) * CABINET_SIZE.height;
        drawCabinet(canvas, x, y, pump);
      }
    }
  }
}

/** The DJ at its decks: headphones on one ear, nodding, a hand up with the bass. */
const DECKS: Pose = {
  ...STANDING,
  arms: [
    { joint: [6, 13], end: [12, 22] },
    { joint: [-4, 13], end: [-10, 22] },
  ],
};
const HAND_UP: Pose = {
  ...DECKS,
  arms: [
    { joint: [6, 9], end: [10, -10] },
    { joint: [-4, 13], end: [-10, 22] },
  ],
};
export const DJ: Figure = {
  x: 600,
  y: BACK.riser,
  height: 84,
  shoulders: 30,
  facing: 1,
  head: 'cap',
  coat: 'short',
  pose: DECKS,
  rim: { side: 0, above: true, ramp: RIM },
};

/** The DJ, frame 0 at the decks, 1 nodding, 2 a hand up with the bass. */
export function drawDj(canvas: Canvas, frame: number): void {
  const pose = frame === 2 ? HAND_UP : { ...DECKS, dip: frame === 1 ? 2 : 0 };
  drawFigure(canvas, { ...DJ, pose }, FIGURE_RAMPS);
}

/** The booth: its riser, its front of dark wood, its fixed bar of LEDs, the decks on it. */
function drawBooth(canvas: Canvas): void {
  const { left, right, top } = BOOTH;
  canvas.fill(left - 60, BACK.riser, right - left + 120, BACK.floor - BACK.riser, at(STEEL, 1));
  canvas.hline(left - 60, BACK.riser, right - left + 120, at(STEEL, 4));
  canvas.fill(left, top + 24, right - left, BACK.riser - top - 24, at(WOOD, 1));
  canvas.fill(left, top + 20, right - left, 4, at(VIOLET, 3));
  canvas.hline(left, top + 19, right - left, at(VIOLET, 1));
  canvas.fill(left + 20, top + 12, 50, 8, at(STEEL, 3));
  canvas.fill(right - 70, top + 12, 50, 8, at(STEEL, 3));
  canvas.fill(left + 86, top + 10, 28, 10, at(STEEL, 4));
}

/** The far layer, `width` × `height` image pixels, the DJ at frame `dj`, the cones at `pump`. */
export function drawFar(width: number, height: number, dj = 0, pump = 0): Canvas {
  const canvas = new Canvas(width, height);
  drawWall(canvas);
  drawBeams(canvas);
  drawTruss(canvas);
  drawStacks(canvas, pump);
  drawDj(canvas, dj);
  drawBooth(canvas);
  canvas.paint(0, BACK.floor, width, height - BACK.floor, (x, y) =>
    at(FLOOR, y < BACK.floor + 3 ? 0 : 1),
  );
  return canvas;
}
