/**
 * The club seen through bay 3, its shutter rolled all the way up (docs/art/decor-dock.md §2.2):
 * the room in its violet haze, the DJ on the riser at the back playing live (casque on one ear,
 * cap, hoodie), the crowd in silhouettes in front of the opening: dancers in hoods and caps, a
 * couple kissing, someone pulling on a joint. Nobody stands outside: the party is in.
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { noise } from '../kit/random.ts';
import type { Rect } from '../kit/stage.ts';
import { drawFigure, type Figure, type Pose } from '../rue/people.ts';
import {
  EMBER,
  EXIT,
  FIGURE_RAMPS,
  GLASS,
  PAPER,
  RIM_VIOLET,
  RIM_WARM,
  SODIUM,
  STEAM,
  STEEL,
} from './palette.ts';

/**
 * The frames of the club, played by mid.ts on the beat: 0 at rest; 1 the DJ scratching, half the
 * dancers dipping, the joint drawn on; 2 the DJ on the crossfader, the other half dipping, the
 * smoke breathed out; 3 the bass, everyone up, arms in the air; 4 the DJ's hand to his casque.
 */
export const CLUB_FRAMES = 5;

/** The riser at the back, low: its top row, over the opening's floor line. */
function riserOf(rect: Rect): { top: number; left: number; width: number } {
  return { top: rect.y + rect.height - 14, left: rect.x + 46, width: 62 };
}

/** The booth's front panel rises from the riser to the DJ's hips: the decks at his hands. */
const BOOTH = 34;

/** The room behind the opening: dark up high, the stage lights' haze low, a few pin lights. */
function drawRoom(canvas: Canvas, rect: Rect): void {
  const { x, y, width, height } = rect;
  canvas.paint(x, y, width, height, (px, py) => {
    const low = (py - y) / height;
    const glow = 0.6 + low * 1.6 + (noise(78, px, py, 12) - 0.5) * 0.8;
    return tone(GLASS, Math.min(glow, 2.3), px, py);
  });
  // Pin lights in the ceiling, and a stack of speakers either side of the riser, far back.
  for (let px = x + 8; px < x + width; px += 23)
    canvas.set(px, y + 4 + ((px >> 2) % 3), at(GLASS, 3));
  const riser = riserOf(rect);
  for (const sx of [riser.left - 18, riser.left + riser.width + 4]) {
    canvas.fill(sx, riser.top - 34, 14, 34, at(STEEL, 0));
    canvas.ellipse(sx + 3, riser.top - 30, 8, 8, at(STEEL, 1));
    canvas.ellipse(sx + 2, riser.top - 18, 10, 10, at(STEEL, 1));
  }
}

/** The riser, its fixed violet LED strip (nothing blinks, docs/flashs.md), the DJ's table. */
function drawBooth(canvas: Canvas, rect: Rect): void {
  const riser = riserOf(rect);
  canvas.fill(riser.left, riser.top, riser.width, 14, at(STEEL, 1));
  canvas.hline(riser.left, riser.top, riser.width, at(STEEL, 3));
  canvas.hline(riser.left + 2, riser.top + 5, riser.width - 4, at(GLASS, 4));
  const table = { x: riser.left + 10, top: riser.top - BOOTH, width: 42 };
  canvas.fill(table.x, table.top, table.width, BOOTH, at(STEEL, 0));
  canvas.hline(table.x, table.top, table.width, at(STEEL, 3));
  canvas.vline(table.x, table.top, BOOTH, at(STEEL, 2));
  for (const deck of [table.x + 1, table.x + table.width - 15]) {
    canvas.fill(deck, table.top - 3, 14, 3, at(STEEL, 2));
    canvas.hline(deck + 2, table.top - 4, 10, at(STEEL, 0));
  }
  const mixer = table.x + table.width / 2 - 5;
  canvas.fill(mixer, table.top - 4, 10, 4, at(STEEL, 1));
  canvas.set(mixer + 2, table.top - 3, at(EXIT, 2));
  canvas.set(mixer + 5, table.top - 3, at(SODIUM, 2));
  canvas.set(mixer + 8, table.top - 3, at(EXIT, 2));
  // The gooseneck lamp, its warm dot.
  canvas.line(
    table.x + table.width - 2,
    table.top - 3,
    table.x + table.width - 8,
    table.top - 12,
    at(STEEL, 3),
  );
  canvas.fill(table.x + table.width - 11, table.top - 14, 4, 2, at(SODIUM, 3));
}

/** The DJ's arms, frame by frame: on the decks, scratching, on the crossfader, up, at the casque. */
const DJ_ARMS: readonly Pose['arms'][] = [
  [
    { joint: [6, 9], end: [12, 15] },
    { joint: [-4, 10], end: [-10, 16] },
  ],
  [
    { joint: [7, 8], end: [15, 13] },
    { joint: [-3, 10], end: [-4, 15] },
  ],
  [
    { joint: [5, 10], end: [6, 15] },
    { joint: [-4, 10], end: [-2, 15] },
  ],
  [
    { joint: [6, 9], end: [12, 15] },
    { joint: [-5, -2], end: [-7, -16] },
  ],
  [
    { joint: [5, 9], end: [12, 15] },
    { joint: [-5, 6], end: [-3, -6] },
  ],
];

function djOf(rect: Rect, frame: number): Figure {
  const riser = riserOf(rect);
  const arms = DJ_ARMS[frame] ?? DJ_ARMS[0];
  if (!arms) throw new Error('The DJ has no arms');
  return {
    x: riser.left + 31,
    y: riser.top,
    height: 74,
    shoulders: 24,
    facing: 1,
    head: 'cap',
    coat: 'short',
    pose: {
      arms,
      legs: [
        { joint: [3, 19], end: [5, 0] },
        { joint: [-2, 19], end: [-5, 0] },
      ],
      lean: frame === 1 || frame === 2 ? 2 : 1,
      dip: frame === 3 ? -2 : 0,
    },
    rim: { side: 0, above: true, ramp: RIM_WARM },
    face: true,
  };
}

/** The casque on one ear: its band over the cap, one cup on the ear, the other off on the neck. */
function drawCasque(canvas: Canvas, dj: Figure): void {
  const head = Math.round(dj.height * 0.145);
  const top = dj.y - dj.height + dj.pose.dip;
  const cx = dj.x + dj.pose.lean * dj.facing;
  canvas.line(cx - 4, top + 3, cx + 2, top - 1, at(STEEL, 3));
  canvas.fill(cx - dj.facing * 4 - 1, top + Math.round(head * 0.35), 3, 4, at(STEEL, 4));
  canvas.fill(cx + dj.facing * 2, top + head + 2, 3, 3, at(STEEL, 3));
}

/** Arms loose, the feet apart: a dancer at rest. */
const LOOSE: Pose = {
  arms: [
    { joint: [5, 10], end: [8, 19] },
    { joint: [-4, 11], end: [-6, 20] },
  ],
  legs: [
    { joint: [4, 19], end: [6, 0] },
    { joint: [-3, 19], end: [-6, 0] },
  ],
  lean: 0,
  dip: 0,
};
const UP: Pose['arms'] = [
  { joint: [6, -2], end: [8, -16] },
  { joint: [-6, -2], end: [-8, -16] },
];
/** An arm around the other's neck, leaning in: the kiss. */
const KISS: Pose = {
  arms: [
    { joint: [8, 2], end: [13, -4] },
    { joint: [-2, 12], end: [2, 20] },
  ],
  legs: [
    { joint: [2, 19], end: [3, 0] },
    { joint: [-2, 19], end: [-4, 0] },
  ],
  lean: 3,
  dip: 0,
};
/** The joint: the hand at the lips, or down by the hip. */
const DRAG: Pose['arms'] = [
  { joint: [6, 9], end: [5, -4] },
  { joint: [-2, 13], end: [-1, 24] },
];
const HOLD: Pose['arms'] = [
  { joint: [3, 13], end: [8, 20] },
  { joint: [-2, 13], end: [-1, 24] },
];

/** The crowd in front of the opening, frame by frame (CLUB_FRAMES). */
function crowdOf(rect: Rect, frame: number): Figure[] {
  const floor = rect.y + rect.height;
  const up = frame === 3 ? 4 : 0;
  const rim = (side: -1 | 1) => ({ side, above: true, ramp: RIM_VIOLET }) as const;
  const dancer = (x: number, facing: -1 | 1, head: Figure['head'], dips: boolean): Figure => ({
    x,
    y: floor - up,
    height: 78,
    shoulders: 24,
    facing,
    head,
    coat: 'short',
    pose: {
      ...LOOSE,
      ...(frame === 3 && { arms: UP }),
      dip: (frame === 1 && dips) || (frame === 2 && !dips) ? 3 : 0,
    },
    rim: rim(facing === 1 ? -1 : 1),
  });
  const drawing = frame === 1;
  return [
    dancer(rect.x + 11, 1, 'hood', true),
    {
      x: rect.x + 27,
      y: floor,
      height: 76,
      shoulders: 22,
      facing: 1,
      head: 'bun',
      coat: 'short',
      pose: KISS,
      rim: rim(-1),
    },
    {
      x: rect.x + 38,
      y: floor,
      height: 80,
      shoulders: 26,
      facing: -1,
      head: 'cap',
      coat: 'puffer',
      pose: { ...KISS, arms: [KISS.arms[1], KISS.arms[0]] },
      rim: rim(1),
    },
    {
      x: rect.x + 116,
      y: floor - up,
      height: 80,
      shoulders: 26,
      facing: -1,
      head: 'beanie',
      coat: 'short',
      pose: { ...LOOSE, arms: drawing ? DRAG : HOLD, lean: 1 },
      rim: rim(1),
    },
    dancer(rect.x + 137, -1, 'hood', false),
  ];
}

/** Where the smoker's hand is (people.ts's geometry): the joint's end. */
function handOf(figure: Figure): [number, number] {
  const { height: tall, shoulders, facing, pose } = figure;
  const k = tall / 80;
  const upper = Math.max(1.8, 2.4 * k);
  const sx = shoulders / 2 - upper + pose.lean * 0.7;
  const sy = figure.y - Math.round(tall * 0.81) + pose.dip + 4;
  const end = pose.arms[0].end;
  return [Math.round(figure.x + (sx + end[0] * k) * facing), Math.round(sy + end[1] * k)];
}

/** The joint's ember and its smoke: a curl rising in the stage light, thicker breathed out. */
function drawJoint(canvas: Canvas, smoker: Figure, frame: number): void {
  const [hx, hy] = handOf(smoker);
  const tip = hx + smoker.facing * 3;
  canvas.set(tip, hy - 1, at(EMBER, frame === 1 ? 1 : 0));
  canvas.set(tip - smoker.facing, hy - 1, at(PAPER, 3));
  const puffs = frame === 2 ? 9 : 4;
  for (let i = 0; i < puffs; i++) {
    const rise = 3 + i * 3;
    canvas.set(
      tip + Math.round(Math.sin(i * 1.3) * 2) - smoker.facing,
      hy - rise,
      at(STEAM, i < 3 ? 2 : 1),
    );
  }
}

/** The club through the opening `rect`, at `frame` (CLUB_FRAMES). */
export function drawClub(canvas: Canvas, rect: Rect, frame: number): void {
  drawRoom(canvas, rect);
  const dj = djOf(rect, frame);
  drawFigure(canvas, dj, FIGURE_RAMPS);
  drawCasque(canvas, dj);
  drawBooth(canvas, rect);
  const crowd = crowdOf(rect, frame);
  for (const figure of crowd) drawFigure(canvas, figure, FIGURE_RAMPS);
  const smoker = crowd[3];
  if (smoker) drawJoint(canvas, smoker, frame);
  // Low smoke rolling along the floor, over the feet.
  const floor = rect.y + rect.height;
  const smoke = new Mask(canvas.width, canvas.height);
  for (let px = rect.x; px < rect.x + rect.width; px++) {
    for (let py = floor - 8; py < floor; py++)
      if (noise(77, px, py * 2, 16) > 0.7) smoke.add(px, py);
  }
  canvas.paint(rect.x, floor - 8, rect.width, 8, (px, py) =>
    smoke.has(px, py) ? tone(STEAM, 0.8 + (py - floor + 8) / 8, px, py) : undefined,
  );
}
