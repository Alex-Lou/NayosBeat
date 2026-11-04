/**
 * The club seen through bay 3, its shutter rolled all the way up (docs/art/decor-dock.md §2.2):
 * the room in its violet haze, the DJ on the riser at the back playing live (casque on one ear,
 * cap, hoodie), the crowd in front of the opening: dancers in hoods and caps, a couple kissing,
 * someone pulling on a joint. Clean pixel art and dressed figures (docs/art/proprete.md).
 */

import { Canvas, at } from '../kit/canvas.ts';
import type { Rect } from '../kit/stage.ts';
import { drawFigure, type Figure, type Outfit, type Pose } from '../rue/people.ts';
import {
  CLOTH,
  EMBER,
  EXIT,
  FIGURE_RAMPS,
  GLASS,
  HAIR,
  PAPER,
  RIM_VIOLET,
  RIM_WARM,
  SODIUM,
  STEAM,
  STEEL,
} from './palette.ts';

export const CLUB_FRAMES = 5;

function riserOf(rect: Rect): { top: number; left: number; width: number } {
  return { top: rect.y + rect.height - 14, left: rect.x + 44, width: 64 };
}

const BOOTH = 34;

function drawRoom(canvas: Canvas, rect: Rect, frame: number): void {
  const { x, y, width, height } = rect;
  canvas.paint(x, y, width, height, (px, py) => {
    const wall = px < x + 10 || px >= x + width - 10;
    if (wall) return at(STEEL, 0);
    const low = (py - y) / height;
    const step = low > 0.72 ? 2 : low > 0.36 ? 1 : 0;
    return at(GLASS, step);
  });
  canvas.fill(x + 10, y + 6, width - 20, 3, at(STEEL, 1));
  canvas.hline(x + 10, y + 6, width - 20, at(STEEL, 3));
  for (let px = x + 18; px < x + width - 14; px += 22) {
    canvas.fill(px, y + 9, 4, 2, at(GLASS, 3));
    canvas.set(px + 1, y + 10, at(GLASS, 4));
  }
  const riser = riserOf(rect);
  const pulse = frame === 3 ? 1 : 0;
  for (const [sx, side] of [
    [riser.left - 22, 1],
    [riser.left + riser.width + 4, -1],
  ] as const) {
    canvas.fill(sx + (side > 0 ? -3 : 14), riser.top - 36, 3, 36, at(STEEL, 1));
    canvas.fill(sx, riser.top - 38, 14, 38, at(STEEL, 0));
    canvas.hline(sx, riser.top - 38, 14, at(STEEL, 3));
    canvas.hline(sx, riser.top - 22, 14, at(STEEL, 2));
    canvas.ellipse(
      sx + 3 - pulse,
      riser.top - 34 - pulse,
      8 + pulse * 2,
      8 + pulse * 2,
      at(STEEL, 2),
    );
    canvas.ellipse(sx + 5, riser.top - 32, 4, 4, at(GLASS, 2 + pulse));
    canvas.ellipse(
      sx + 2 - pulse,
      riser.top - 19 - pulse,
      10 + pulse * 2,
      10 + pulse * 2,
      at(STEEL, 2),
    );
    canvas.ellipse(sx + 5, riser.top - 16, 4, 4, at(GLASS, 2 + pulse));
  }
}

function drawBooth(canvas: Canvas, rect: Rect): void {
  const riser = riserOf(rect);
  canvas.polygon(
    [
      [riser.left + 4, riser.top - 4],
      [riser.left + riser.width - 4, riser.top - 4],
      [riser.left + riser.width, riser.top],
      [riser.left, riser.top],
    ],
    at(STEEL, 2),
  );
  canvas.fill(riser.left, riser.top, riser.width, 14, at(STEEL, 1));
  canvas.hline(riser.left, riser.top, riser.width, at(STEEL, 3));
  canvas.hline(riser.left + 2, riser.top + 5, riser.width - 4, at(GLASS, 4));
  canvas.hline(riser.left + 2, riser.top + 6, riser.width - 4, at(GLASS, 3));
  const table = { x: riser.left + 10, top: riser.top - BOOTH, width: 44 };
  canvas.polygon(
    [
      [table.x + 2, table.top - 3],
      [table.x + table.width - 2, table.top - 3],
      [table.x + table.width, table.top],
      [table.x, table.top],
    ],
    at(STEEL, 2),
  );
  canvas.fill(table.x, table.top, table.width, BOOTH, at(STEEL, 0));
  canvas.hline(table.x, table.top, table.width, at(STEEL, 4));
  canvas.vline(table.x, table.top, BOOTH, at(STEEL, 2));
  canvas.vline(table.x + table.width - 1, table.top, BOOTH, at(STEEL, 2));
  canvas.fill(table.x + 6, table.top + 6, table.width - 12, BOOTH - 12, at(STEEL, 1));
  canvas.hline(table.x + 8, table.top + 10, table.width - 16, at(GLASS, 3));
  for (const deck of [table.x + 1, table.x + table.width - 15]) {
    canvas.fill(deck, table.top - 3, 14, 3, at(STEEL, 2));
    canvas.hline(deck + 2, table.top - 4, 10, at(STEEL, 4));
    canvas.fill(deck + 6, table.top - 5, 2, 1, at(SODIUM, 3));
  }
  const mixer = table.x + Math.floor(table.width / 2) - 5;
  canvas.fill(mixer, table.top - 4, 10, 4, at(STEEL, 1));
  canvas.set(mixer + 2, table.top - 3, at(EXIT, 3));
  canvas.set(mixer + 5, table.top - 3, at(SODIUM, 3));
  canvas.set(mixer + 8, table.top - 3, at(EXIT, 3));
  canvas.line(
    table.x + table.width - 2,
    table.top - 3,
    table.x + table.width - 8,
    table.top - 12,
    at(STEEL, 3),
  );
  canvas.fill(table.x + table.width - 11, table.top - 14, 4, 2, at(SODIUM, 3));
}

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

const DJ_OUTFIT: Outfit = {
  top: CLOTH.maroon,
  legs: CLOTH.denim,
  shoes: CLOTH.black,
  hair: CLOTH.black,
};

function djOf(rect: Rect, frame: number): Figure {
  const riser = riserOf(rect);
  const arms = DJ_ARMS[frame] ?? DJ_ARMS[0];
  if (!arms) throw new Error('The DJ has no arms');
  return {
    x: riser.left + 32,
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
    outfit: DJ_OUTFIT,
  };
}

function drawCasque(canvas: Canvas, dj: Figure): void {
  const head = Math.round(dj.height * 0.145);
  const top = dj.y - dj.height + dj.pose.dip;
  const cx = dj.x + dj.pose.lean * dj.facing;
  canvas.line(cx - 4, top + 3, cx + 2, top - 1, at(STEEL, 3));
  canvas.fill(cx - dj.facing * 4 - 1, top + Math.round(head * 0.35), 3, 4, at(STEEL, 4));
  canvas.fill(cx + dj.facing * 2, top + head + 2, 3, 3, at(STEEL, 3));
}

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
const DRAG: Pose['arms'] = [
  { joint: [6, 9], end: [5, -4] },
  { joint: [-2, 13], end: [-1, 24] },
];
const HOLD: Pose['arms'] = [
  { joint: [3, 13], end: [8, 20] },
  { joint: [-2, 13], end: [-1, 24] },
];

function crowdOf(rect: Rect, frame: number): Figure[] {
  const floor = rect.y + rect.height;
  const up = frame === 3 ? 4 : 0;
  const rim = (side: -1 | 1) => ({ side, above: true, ramp: RIM_VIOLET }) as const;
  const dancer = (
    x: number,
    facing: -1 | 1,
    head: Figure['head'],
    dips: boolean,
    outfit: Outfit,
  ): Figure => ({
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
    outfit,
  });
  const drawing = frame === 1;
  return [
    dancer(rect.x + 11, 1, 'hood', true, {
      top: CLOTH.olive,
      legs: CLOTH.black,
      shoes: CLOTH.beige,
      hair: CLOTH.olive,
    }),
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
      outfit: {
        top: CLOTH.mustard,
        legs: CLOTH.denim,
        shoes: CLOTH.black,
        hair: HAIR.brown,
      },
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
      outfit: {
        top: CLOTH.leather,
        legs: CLOTH.grey,
        shoes: CLOTH.black,
        hair: CLOTH.black,
      },
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
      outfit: {
        top: CLOTH.denim,
        legs: CLOTH.khaki,
        shoes: CLOTH.black,
        hair: CLOTH.maroon,
      },
    },
    dancer(rect.x + 137, -1, 'hood', false, {
      top: CLOTH.grey,
      legs: CLOTH.black,
      shoes: CLOTH.black,
      hair: CLOTH.grey,
    }),
  ];
}

function handOf(figure: Figure): [number, number] {
  const { height: tall, shoulders, facing, pose } = figure;
  const k = tall / 80;
  const upper = Math.max(1.8, 2.4 * k);
  const sx = shoulders / 2 - upper + pose.lean * 0.7;
  const sy = figure.y - Math.round(tall * 0.81) + pose.dip + 4;
  const end = pose.arms[0].end;
  return [Math.round(figure.x + (sx + end[0] * k) * facing), Math.round(sy + end[1] * k)];
}

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

export function drawClub(canvas: Canvas, rect: Rect, frame: number): void {
  drawRoom(canvas, rect, frame);
  const dj = djOf(rect, frame);
  drawFigure(canvas, dj, FIGURE_RAMPS);
  drawCasque(canvas, dj);
  drawBooth(canvas, rect);
  const crowd = crowdOf(rect, frame);
  for (const figure of crowd) drawFigure(canvas, figure, FIGURE_RAMPS);
  const smoker = crowd[3];
  if (smoker) drawJoint(canvas, smoker, frame);
  const floor = rect.y + rect.height;
  for (const [dx, w, h, step] of [
    [6, 36, 5, 1],
    [34, 44, 6, 2],
    [72, 46, 5, 1],
    [108, 36, 6, 2],
  ] as const) {
    canvas.ellipse(rect.x + dx, floor - h, w, h, at(STEAM, step));
  }
}
