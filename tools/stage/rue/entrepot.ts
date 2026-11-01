/**
 * L'Entrepôt (docs/art/decor-rue.md §3.2, docs/art/histoire.md): an old warehouse of painted
 * brick, its ghost sign almost gone, workshop windows leaking the club's violet, a rolling
 * shutter, the iron door under a caged lamp and its small neon. Sound Clash has no poster: the
 * neon has no name.
 */

import { Canvas, Mask, at, tone } from './canvas.ts';
import { castShadow, drawLedge, wallLevel, type Rect, type Wall } from './facade.ts';
import { spell } from './font.ts';
import { lightAt } from './light.ts';
import {
  BRICK_RED,
  GLASS,
  LAMP,
  NEON_ORANGE,
  NEON_VIOLET,
  PLYWOOD,
  SHUTTER,
  STEEL,
} from './palette.ts';
import { noise } from './random.ts';
import { drawHalo, drawTubes } from './signs.ts';

/**
 * Where the paint has flaked off: the red brick under it shows, its courses clear, in patches
 * with ragged edges, more of them low on the wall where people lean; the paint's broken lip
 * catches the light on top of each patch.
 */
export function drawPeeling(canvas: Canvas, rect: Rect, wall: Wall): void {
  const flaked = (x: number, y: number): boolean => {
    const low = (y - rect.y) / rect.height;
    const flake = noise(wall.seed + 31, x, y, 26) * 0.75 + noise(wall.seed + 32, x, y, 6) * 0.25;
    return flake > 0.81 - low * 0.1;
  };
  canvas.paint(rect.x, rect.y, rect.width, rect.height, (x, y) => {
    if (!flaked(x, y))
      return flaked(x, y + 1) ? tone(wall.ramp, wallLevel(wall, x, y) + 1.2, x, y) : undefined;
    const course = Math.floor((y - rect.y) / 4);
    const joint = (y - rect.y) % 4 === 3 || (x - rect.x + (course % 2) * 5) % 10 === 9;
    const shade = !flaked(x, y - 1) || !flaked(x, y - 2) ? -0.9 : 0;
    return tone(BRICK_RED, wallLevel(wall, x, y) + 0.6 + (joint ? -0.9 : 0) + shade, x, y);
  });
}

/**
 * The ghost sign: an old painted ad, ENTREPÔTS, dark letters on a pale band, both faded to a step
 * or so off the wall and worn through in broad patches. Barely there, as it should be.
 */
export function drawGhostSign(canvas: Canvas, x: number, y: number, wall: Wall): void {
  const scale = 4;
  const letters = new Mask(canvas.width, canvas.height);
  const width = spell('ENTREPÔTS', scale, 1, (px, py) => {
    letters.add(x + px, y + py);
  });
  const band: Rect = { x: x - 10, y: y - 14, width: width + 20, height: 7 * scale + 24 };
  canvas.paint(band.x, band.y, band.width, band.height, (px, py) => {
    const worn = noise(wall.seed + 47, px, py, 16) * 0.8 + noise(wall.seed + 42, px, py, 4) * 0.2;
    if (worn < 0.36) return undefined;
    const faded = worn < 0.44 ? -0.5 : 0;
    const level = letters.has(px, py)
      ? wallLevel(wall, px, py) - 0.1
      : wallLevel(wall, px, py) + 0.85 + faded;
    return tone(wall.ramp, level, px, py);
  });
}

/** A steel workshop window: small panes in a grid, most dark, some glowing violet, one boarded. */
export function drawWorkshopWindow(
  canvas: Canvas,
  rect: Rect,
  wall: Wall,
  glowing: (column: number, row: number) => 'dark' | 'violet' | 'boarded',
): void {
  const { x, y, width, height } = rect;
  drawLedge(canvas, x - 4, y - 6, width + 8, 5, wall.lights);
  canvas.fill(x, y, width, height, at(STEEL, 1));
  const columns = 4;
  const rows = 3;
  const paneWidth = (width - 2) / columns;
  const paneHeight = (height - 2) / rows;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const px = Math.round(x + 2 + column * paneWidth);
      const py = Math.round(y + 2 + row * paneHeight);
      const w = Math.round(paneWidth) - 2;
      const h = Math.round(paneHeight) - 2;
      const look = glowing(column, row);
      canvas.paint(px, py, w, h, (qx, qy) => {
        if (look === 'violet') return tone(NEON_VIOLET, 0.7 + (qy - py) / h, qx, qy);
        if (look === 'boarded') return at(PLYWOOD, (qx - px) % 5 === 4 ? 0 : 1);
        const reflect = qx - px === qy - py ? 1.6 : 0;
        return tone(GLASS, 1 + reflect - (qy - py) / h, qx, qy);
      });
    }
  }
  drawLedge(canvas, x - 3, y + height, width + 6, 4, wall.lights);
  castShadow(canvas, wall, x - 3, y + height + 4, width + 6, 4);
}

/**
 * The club's iron door in its recess: riveted steel, a barred peephole leaking violet, a pull
 * handle, a worn step.
 */
export function drawIronDoor(canvas: Canvas, rect: Rect, wall: Wall): void {
  const { x, y, width, height } = rect;
  canvas.fill(x - 6, y - 6, width + 12, height + 6, at(SHUTTER, 0));
  drawLedge(canvas, x - 8, y - 12, width + 16, 6, wall.lights);
  canvas.paint(x, y, width, height, (px, py) => {
    const lit = lightAt(wall.lights, px, py) * 0.7;
    const panel =
      px - x === 3 || px - x === width - 4 || py - y === 4 || py - y === height - 5 ? -0.7 : 0;
    return tone(SHUTTER, 1.6 + lit + panel, px, py);
  });
  for (let py = y + 8; py < y + height - 6; py += 16) {
    canvas.set(x + 2, py, at(SHUTTER, 4));
    canvas.set(x + width - 3, py, at(SHUTTER, 4));
  }
  // The peephole, barred, violet behind it.
  const hole: Rect = { x: x + Math.round(width / 2) - 8, y: y + 26, width: 16, height: 10 };
  canvas.paint(hole.x, hole.y, hole.width, hole.height, (px, py) =>
    (px - hole.x) % 4 === 3
      ? at(STEEL, 0)
      : tone(NEON_VIOLET, 1.2 + (py - hole.y) / hole.height, px, py),
  );
  canvas.fill(x + width - 10, y + 50, 3, 16, at(STEEL, 4));
  // The light under the door.
  canvas.hline(x + 2, y + height - 1, width - 4, at(NEON_VIOLET, 1));
}

/**
 * The club's neon, ours: a record (a violet ring, its label) and an orange arrow down to the
 * door. `breath`, 0 to 1, widens its halo (a slow breath, never a blink).
 */
export function drawClubNeon(canvas: Canvas, cx: number, cy: number, breath: number): void {
  canvas.fill(cx - 18, cy - 18, 36, 46, at(STEEL, 0));
  const ring = new Mask(canvas.width, canvas.height);
  const arrow = new Mask(canvas.width, canvas.height);
  for (let y = cy - 13; y <= cy + 13; y++) {
    for (let x = cx - 13; x <= cx + 13; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if ((d > 9 && d <= 11.5) || d <= 2.5) ring.add(x, y);
    }
  }
  arrow.rect(cx - 1, cy + 16, 3, 6);
  arrow.polygon([
    [cx - 5, cy + 21],
    [cx + 6, cy + 21],
    [cx + 0.5, cy + 27],
  ]);
  drawHalo(canvas, ring, NEON_VIOLET, 4 + breath * 2.5);
  drawHalo(canvas, arrow, NEON_ORANGE, 3);
  drawTubes(canvas, ring, NEON_VIOLET);
  drawTubes(canvas, arrow, NEON_ORANGE);
}

/** A caged bulb over the door: a warm bulb behind three bars, its plate on the wall. */
export function drawCagedLamp(canvas: Canvas, x: number, y: number): void {
  canvas.fill(x - 6, y - 4, 12, 3, at(STEEL, 2));
  canvas.fill(x - 4, y - 1, 8, 9, at(LAMP, 1));
  canvas.fill(x - 2, y + 1, 4, 5, at(LAMP, 2));
  for (const px of [x - 4, x - 1, x + 2]) canvas.vline(px, y - 1, 10, at(STEEL, 1));
  canvas.hline(x - 5, y + 8, 10, at(STEEL, 1));
  canvas.paint(x - 14, y - 6, 28, 26, (px, py) => {
    if (canvas.get(px, py) === at(LAMP, 1) || canvas.get(px, py) === at(LAMP, 2)) return undefined;
    if (canvas.get(px, py) === at(STEEL, 1) || canvas.get(px, py) === at(STEEL, 2))
      return undefined;
    const d = Math.hypot(px - x, (py - y - 3) * 1.1);
    if (d < 9) return (px + py) % 2 === 0 ? at(NEON_ORANGE, 1) : undefined;
    return undefined;
  });
}
