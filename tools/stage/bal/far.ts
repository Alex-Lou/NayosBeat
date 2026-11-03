/**
 * The far layer (docs/art/decor-bal.md §2.1): the back of the ballroom. Its ivory walls, their gold
 * pilasters and wainscot; three chandeliers under the ceiling; two high windows on the night, their
 * velvet drapes, the rain or the snow behind the glass in their weathers; between them the band
 * stand, its gold proscenium, the velvet curtains drawn back on the swing band, its marquee « SWING
 * NIGHT » hung in the opening. Opaque everywhere. Flat tones (docs/art/proprete.md). Image pixels
 * (STAGE_SCALE).
 */

import { Canvas, Mask, at } from '../kit/canvas.ts';
import { spell } from '../kit/font.ts';
import type { Rect } from '../kit/stage.ts';
import { drawFigure, STANDING, type Figure, type Pose } from '../rue/people.ts';
import {
  CLOTH,
  DRESS,
  FIGURE_RAMPS,
  GOLD,
  LAMP,
  NIGHT,
  PARQUET,
  RAIN,
  RIM,
  SILL,
  SNOW,
  VELVET,
  WALL,
  WOOD,
} from './palette.ts';

/** The back's floor line, the band stand's riser, its opening. */
export const BACK = { floor: 430, riser: 384 } as const;
export const STAND = { left: 440, right: 760, top: 200 } as const;
/** The high windows' glass, its arch the top half-circle. */
export const WINDOWS: readonly Rect[] = [
  { x: 210, y: 124, width: 80, height: 196 },
  { x: 910, y: 124, width: 80, height: 196 },
];
const SILL_ROWS = 6;
const CEILING = 56;
const WAINSCOT = 330;
const PILASTERS = [120, 380, 820, 1080] as const;
const CHANDELIERS = [250, 600, 950] as const;
const MARQUEE = 236;

// --- The room. ----------------------------------------------------------------------------------

/** The walls: the ceiling, the cornice, the ivory panels, the wainscot and its rail. */
function drawWall(canvas: Canvas): void {
  canvas.paint(0, 0, canvas.width, BACK.floor, (_, y) => {
    if (y < CEILING) return at(WALL, 0);
    if (y < CEILING + 8) return at(GOLD, y === CEILING ? 3 : 1);
    if (y < WAINSCOT) return at(WALL, 2);
    if (y < WAINSCOT + 2) return at(GOLD, y === WAINSCOT ? 2 : 1);
    return at(WALL, 1);
  });
  // The wainscot's panels, a molding a step lighter.
  for (let x = 20; x < canvas.width - 100; x += 130) {
    const panel = { x, y: WAINSCOT + 14, width: 100, height: BACK.floor - WAINSCOT - 28 };
    canvas.hline(panel.x, panel.y, panel.width, at(WALL, 3));
    canvas.hline(panel.x, panel.y + panel.height, panel.width, at(WALL, 0));
    canvas.vline(panel.x, panel.y, panel.height, at(WALL, 3));
    canvas.vline(panel.x + panel.width, panel.y, panel.height + 1, at(WALL, 0));
  }
  for (const x of PILASTERS) {
    canvas.fill(x - 12, CEILING + 8, 24, BACK.floor - CEILING - 8, at(WALL, 3));
    canvas.vline(x - 12, CEILING + 8, BACK.floor - CEILING - 8, at(WALL, 4));
    canvas.vline(x + 11, CEILING + 8, BACK.floor - CEILING - 8, at(WALL, 1));
    canvas.fill(x - 16, CEILING + 8, 32, 10, at(GOLD, 1));
    canvas.hline(x - 16, CEILING + 8, 32, at(GOLD, 3));
    canvas.fill(x - 16, BACK.floor - 14, 32, 14, at(WALL, 1));
    canvas.hline(x - 16, BACK.floor - 14, 32, at(GOLD, 2));
  }
}

/** A chandelier: its chain, its gold crown, its tier of bulbs in their glow. */
function drawChandelier(canvas: Canvas, x: number): void {
  canvas.fill(x - 1, 0, 2, 30, at(GOLD, 1));
  canvas.ellipse(x - 24, 28, 48, 10, at(GOLD, 1));
  canvas.hline(x - 24, 30, 48, at(GOLD, 3));
  canvas.fill(x - 36, 44, 72, 2, at(GOLD, 2));
  for (let bulb = x - 32; bulb <= x + 30; bulb += 10) {
    canvas.fill(bulb - 1, 37, 4, 7, at(LAMP, 1));
    canvas.fill(bulb, 38, 2, 5, at(LAMP, 3));
  }
  canvas.ellipse(x - 6, 46, 12, 14, at(GOLD, 2));
  canvas.fill(x - 1, 58, 2, 4, at(GOLD, 3));
}

// --- The windows. -------------------------------------------------------------------------------

/** Whether x, y is on the glass of `window` (its arch included), grown by `grow` pixels. */
function onGlass(window: Rect, x: number, y: number, grow = 0): boolean {
  const radius = window.width / 2 + grow;
  const cx = window.x + window.width / 2;
  const spring = window.y + window.width / 2;
  if (x + 0.5 < cx - radius || x + 0.5 > cx + radius || y >= window.y + window.height + grow) {
    return false;
  }
  if (y >= spring) return true;
  return Math.hypot(x + 0.5 - cx, y + 0.5 - spring) <= radius;
}

/** A high window: its gold frame, the night behind, its sill outside, its mullion and transoms. */
function drawWindow(canvas: Canvas, window: Rect): void {
  const { x, y, width, height } = window;
  const spring = y + width / 2;
  const sill = y + height - SILL_ROWS;
  canvas.paint(x - 6, y - 6, width + 12, height + 12, (px, py) => {
    if (!onGlass(window, px, py, 5)) return undefined;
    if (!onGlass(window, px, py)) return at(GOLD, 1);
    if (py >= sill) return at(SILL, py === sill ? 1 : 0);
    return at(NIGHT, py < spring ? 0 : py < spring + 70 ? 1 : 2);
  });
  canvas.fill(x + width / 2 - 1, y, 2, sill - y, at(GOLD, 1));
  for (const transom of [spring, spring + 70]) canvas.fill(x, transom, width, 2, at(GOLD, 1));
  // The valance over it, its fringe; the drapes at its sides, their tie-backs.
  canvas.fill(x - 24, y - 20, width + 48, 16, at(VELVET, 3));
  canvas.hline(x - 24, y - 20, width + 48, at(VELVET, 4));
  canvas.hline(x - 24, y - 5, width + 48, at(GOLD, 2));
  for (const left of [x - 24, x + width + 6]) {
    canvas.fill(left, y - 4, 18, WAINSCOT - y + 4, at(VELVET, 2));
    canvas.vline(left === x - 24 ? left + 17 : left, y - 4, WAINSCOT - y + 4, at(VELVET, 4));
    canvas.vline(left === x - 24 ? left : left + 17, y - 4, WAINSCOT - y + 4, at(VELVET, 1));
    canvas.fill(left, 252, 18, 3, at(GOLD, 2));
  }
}

/** The rain behind the glass (`frame` 1 to 3): streaks leaning a little, over the night. */
function drawRain(canvas: Canvas, window: Rect, frame: number): void {
  if (frame === 0) return;
  const sill = window.y + window.height - SILL_ROWS;
  for (let line = 0; line < window.width + 20; line += 9) {
    for (let drop = 0; drop < window.height; drop += 30) {
      const top = window.y + ((drop + frame * 10 + line * 7) % window.height);
      for (let row = 0; row < 8; row++) {
        const px = window.x + line - Math.round((top + row - window.y) / 8);
        const py = top + row;
        if (py < sill && onGlass(window, px, py)) {
          canvas.set(px, py, at(RAIN, line % 27 === 0 ? 2 : 1));
        }
      }
    }
  }
}

/** The snow behind the glass (`frame` 1 to 4): flakes falling slowly, swaying by column. */
function drawSnow(canvas: Canvas, window: Rect, frame: number): void {
  if (frame === 0) return;
  const sill = window.y + window.height - SILL_ROWS;
  for (let column = 0; column < window.width; column += 11) {
    for (let drop = 0; drop < window.height; drop += 24) {
      const fall = (drop + frame * 6 + column * 5) % window.height;
      const px = window.x + column + ((frame + column) % 4 < 2 ? 0 : 1);
      const py = window.y + fall;
      const big = (column + drop) % 3 === 0;
      for (const [dx, dy] of big
        ? [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
          ]
        : [[0, 0]]) {
        if (py + (dy ?? 0) < sill && onGlass(window, px + (dx ?? 0), py + (dy ?? 0))) {
          canvas.set(px + (dx ?? 0), py + (dy ?? 0), at(SNOW, big ? 1 : 2));
        }
      }
    }
  }
}

// --- The band stand. ----------------------------------------------------------------------------

/**
 * The marquee hung in the stand's opening, under the valance (the HUD covers the wall above it):
 * « SWING NIGHT » in bulbs, « TOUS LES SAMEDIS » under it.
 */
function drawMarquee(canvas: Canvas): void {
  const middle = (STAND.left + STAND.right) / 2;
  canvas.fill(middle - 78, MARQUEE, 156, 40, at(GOLD, 0));
  canvas.hline(middle - 78, MARQUEE, 156, at(GOLD, 2));
  canvas.hline(middle - 78, MARQUEE + 39, 156, at(GOLD, 1));
  const big = spell('SWING NIGHT', 2, 1, () => undefined);
  spell('SWING NIGHT', 2, 1, (x, y) => {
    canvas.set(Math.round(middle - big / 2) + x, MARQUEE + 6 + y, at(LAMP, 3));
  });
  const small = spell('TOUS LES SAMEDIS', 1, 1, () => undefined);
  spell('TOUS LES SAMEDIS', 1, 1, (x, y) => {
    canvas.set(Math.round(middle - small / 2) + x, MARQUEE + 26 + y, at(LAMP, 2));
  });
}

/** The stand: its gold proscenium, the back curtain, the drapes drawn back, the valance. */
function drawStand(canvas: Canvas): void {
  const { left, right, top } = STAND;
  const { riser } = BACK;
  canvas.paint(left, top, right - left, riser - top, (x) =>
    at(VELVET, (x - left) % 16 === 0 ? 1 : 0),
  );
  canvas.fill(left - 22, top - 22, right - left + 44, 22, at(GOLD, 1));
  canvas.hline(left - 22, top - 22, right - left + 44, at(GOLD, 3));
  for (const side of [left - 22, right]) {
    canvas.fill(side, top, 22, riser - top, at(GOLD, 1));
    canvas.vline(side === left - 22 ? side : side + 21, top - 22, riser - top + 22, at(GOLD, 3));
    canvas.vline(side === left - 22 ? side + 21 : side, top, riser - top, at(GOLD, 0));
  }
  for (const facing of [1, -1] as const) {
    const edge = facing === 1 ? left : right;
    const drape = new Mask(canvas.width, canvas.height);
    drape.polygon([
      [edge, top],
      [edge + facing * 48, top],
      [edge + facing * 16, 296],
      [edge + facing * 32, riser],
      [edge, riser],
    ]);
    canvas.paint(Math.min(edge, edge + facing * 48), top, 48, riser - top, (x, y) =>
      drape.has(x, y) ? at(VELVET, drape.has(x + facing, y) ? 3 : 4) : undefined,
    );
    canvas.fill(edge + (facing === 1 ? 0 : -20), 292, 20, 4, at(GOLD, 2));
  }
  canvas.paint(left, top, right - left, 30, (x, y) => {
    const scallop = 6 - Math.round(Math.abs(((x - left) % 40) - 20) * 0.3);
    const bottom = top + 20 + scallop;
    if (y > bottom) return undefined;
    return y === bottom ? at(GOLD, 2) : at(VELVET, 3);
  });
}

/** The riser: its velvet skirt in pleats, its gold edge. */
function drawRiser(canvas: Canvas): void {
  const { left, right } = STAND;
  const { riser, floor } = BACK;
  canvas.paint(left - 30, riser, right - left + 60, floor - riser, (x, y) => {
    if (y === riser) return at(GOLD, 3);
    if (y === riser + 1 || y === floor - 1) return at(GOLD, 1);
    return at(VELVET, (x - left) % 12 === 0 ? 1 : 2);
  });
}

/** The band: who plays, where, facing which way. */
const MUSICIAN: Omit<Figure, 'x' | 'facing' | 'head'> = {
  y: BACK.riser,
  height: 74,
  shoulders: 28,
  coat: 'short',
  pose: STANDING,
  rim: { side: 0, above: true, ramp: RIM },
};
export const BAND = {
  trumpet: { ...MUSICIAN, x: 482, facing: 1, head: 'bare' },
  sax: { ...MUSICIAN, x: 548, facing: 1, head: 'curls' },
  bass: { ...MUSICIAN, x: 640, facing: -1, head: 'bare' },
  drums: { ...MUSICIAN, x: 716, y: BACK.riser - 16, facing: -1, head: 'bare' },
} as const satisfies Record<string, Figure>;

/** Where the band's animation is: the four of them, their instruments. */
export const BAND_RECT: Rect = { x: 452, y: 296, width: 296, height: BACK.riser - 296 };

/** Both hands at the mouth, on the horn; `raised` with the chorus. */
function hornPose(raised: boolean, dip: number): Pose {
  return {
    ...STANDING,
    arms: [
      { joint: [7, 9], end: [11, raised ? -6 : -1] },
      { joint: [3, 11], end: [8, raised ? -3 : 3] },
    ],
    lean: raised ? -2 : 0,
    dip,
  };
}

/** The trumpet, the saxophone, from the player's mouth. */
function drawHorns(canvas: Canvas, raised: boolean, dip: number): void {
  const { trumpet, sax } = BAND;
  const mouth = (figure: Figure): number => figure.y - figure.height + 9 + dip;
  const ty = mouth(trumpet);
  const tip = raised ? ty - 10 : ty + 6;
  canvas.line(trumpet.x + 5, ty, trumpet.x + 24, tip, at(GOLD, 3), 2);
  canvas.fill(trumpet.x + 23, tip - 2, 3, 6, at(GOLD, 4));
  const sy = mouth(sax);
  const knee = raised ? [sax.x + 16, sy + 24] : [sax.x + 10, sy + 30];
  const bell = raised ? [sax.x + 24, sy + 12] : [sax.x + 17, sy + 21];
  canvas.line(sax.x + 5, sy, knee[0] ?? 0, knee[1] ?? 0, at(GOLD, 2), 2);
  canvas.line(knee[0] ?? 0, knee[1] ?? 0, bell[0] ?? 0, bell[1] ?? 0, at(GOLD, 3), 3);
}

/** The double bass beside its player, who plucks it. */
function drawBass(canvas: Canvas, dip: number): void {
  const { bass } = BAND;
  const x = bass.x - 18;
  canvas.line(x + 1, BACK.riser - 52, x, BACK.riser - 92, at(WOOD, 0), 2);
  canvas.ellipse(x - 12, BACK.riser - 54, 24, 26, at(GOLD, 1));
  canvas.ellipse(x - 13, BACK.riser - 34, 26, 30, at(GOLD, 1));
  canvas.fill(x - 1, BACK.riser - 44, 2, 30, at(WOOD, 0));
  drawFigure(
    canvas,
    {
      ...bass,
      pose: {
        ...STANDING,
        arms: [
          { joint: [6, 9], end: [12, -4] },
          { joint: [4, 13], end: [12, 20 - dip] },
        ],
        dip,
      },
    },
    FIGURE_RAMPS,
  );
}

/** The drummer behind the bass drum and its head « BAL », the cymbal; sticks up with the chorus. */
function drawDrums(canvas: Canvas, raised: boolean, hit: number): void {
  const { drums } = BAND;
  drawFigure(
    canvas,
    {
      ...drums,
      pose: {
        ...STANDING,
        arms: [
          { joint: [6, 10], end: raised ? [10, -10] : [14, 16 - hit * 4] },
          { joint: [-4, 10], end: raised ? [-8, -10] : [-12, 18 - (1 - hit) * 4] },
        ],
      },
    },
    FIGURE_RAMPS,
  );
  canvas.fill(drums.x + 20, BACK.riser - 60, 2, 60, at(GOLD, 1));
  canvas.fill(drums.x + 10, BACK.riser - 62 + hit, 22, 2, at(GOLD, 3));
  const cx = drums.x - 8;
  canvas.ellipse(cx - 23, BACK.riser - 47, 46, 46, at(GOLD, 2));
  canvas.ellipse(cx - 21, BACK.riser - 45, 42, 42, at(CLOTH, 2));
  const word = spell('BAL', 2, 1, () => undefined);
  spell('BAL', 2, 1, (x, y) => {
    canvas.set(Math.round(cx - word / 2) + x, BACK.riser - 31 + y, at(DRESS, 2));
  });
}

/** The music stands before the horns, their gold fronts: they hide the players' legs. */
function drawStands(canvas: Canvas): void {
  for (const { x } of [BAND.trumpet, BAND.sax]) {
    canvas.fill(x - 18, BACK.riser - 34, 36, 34, at(GOLD, 0));
    canvas.hline(x - 18, BACK.riser - 34, 36, at(GOLD, 3));
    canvas.vline(x - 18, BACK.riser - 33, 33, at(GOLD, 1));
    canvas.vline(x + 17, BACK.riser - 33, 33, at(GOLD, 1));
  }
}

/**
 * The band at `frame`: 0 and 1 and 2 swinging on the beat (each a little dip), 3 the chorus, the
 * horns raised, the drummer's sticks up.
 */
function drawBand(canvas: Canvas, frame: number): void {
  const raised = frame === 3;
  const dip = frame === 1 ? 2 : 0;
  for (const figure of [BAND.trumpet, BAND.sax]) {
    drawFigure(canvas, { ...figure, pose: hornPose(raised, dip) }, FIGURE_RAMPS);
  }
  drawHorns(canvas, raised, dip);
  drawBass(canvas, frame === 2 ? 2 : 0);
  drawDrums(canvas, raised, frame === 2 ? 1 : 0);
  drawStands(canvas);
}

/**
 * The far layer, `width` × `height` image pixels; `frameOf` gives each animation's frame (0 for the
 * still layer): `band`, and the windows' `rain0`, `rain1`, `snow0`, `snow1`.
 */
export function drawFar(
  width: number,
  height: number,
  frameOf: (name: string) => number = () => 0,
): Canvas {
  const canvas = new Canvas(width, height);
  drawWall(canvas);
  CHANDELIERS.forEach((x) => {
    drawChandelier(canvas, x);
  });
  WINDOWS.forEach((window, index) => {
    drawWindow(canvas, window);
    drawRain(canvas, window, frameOf(`rain${index}`));
    drawSnow(canvas, window, frameOf(`snow${index}`));
  });
  drawStand(canvas);
  drawMarquee(canvas);
  drawBand(canvas, frameOf('band'));
  drawRiser(canvas);
  canvas.paint(0, BACK.floor, width, height - BACK.floor, (_, y) =>
    at(PARQUET, y < BACK.floor + 3 ? 0 : 1),
  );
  return canvas;
}
