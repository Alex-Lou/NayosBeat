/**
 * Signs and tags (docs/art/decor-rue.md §3.2, §10): generic words in our own font, neon drawn as
 * tubes with a halo of whole pixels, a lit box, tags traced at random. No real name, brand or logo.
 */

import { Canvas, Mask, at, tone } from './canvas.ts';
import type { Rect } from './facade.ts';
import { spell } from './font.ts';
import { LIGHTBOX, NEON_DEAD, SIGN_INK, STEEL, TAG } from './palette.ts';
import type { Random } from './random.ts';

/**
 * A neon's halo on what is behind it: within `reach` pixels of its tubes, the glow's two steps,
 * the outer ring dithered. `reach` grows with `breath` (a breathing neon's frames).
 */
export function drawHalo(
  canvas: Canvas,
  tubes: Mask,
  ramp: readonly number[],
  reach: number,
): void {
  const { width, height } = tubes;
  const distance = new Float32Array(width * height).fill(Infinity);
  const radius = Math.ceil(reach);
  const { left, top, right, bottom } = canvas.clip;
  for (let y = Math.max(0, top - radius); y < Math.min(height, bottom + radius); y++) {
    for (let x = Math.max(0, left - radius); x < Math.min(width, right + radius); x++) {
      if (!tubes.has(x, y)) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const d = Math.hypot(dx, dy);
          const index = py * width + px;
          if (d < (distance[index] ?? Infinity)) distance[index] = d;
        }
      }
    }
  }
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const d = distance[y * width + x] ?? Infinity;
      if (d === 0 || d > reach) continue;
      const inner = d <= reach * 0.45;
      if (inner) canvas.set(x, y, at(ramp, 1));
      else if ((x + y) % 2 === 0) canvas.set(x, y, at(ramp, d <= reach * 0.75 ? 1 : 0));
      else if (d <= reach * 0.75) canvas.set(x, y, at(ramp, 0));
    }
  }
}

/** Draws tubes: their color, a brighter core where the tube is thick enough. */
export function drawTubes(canvas: Canvas, tubes: Mask, ramp: readonly number[]): void {
  const { left, top, right, bottom } = canvas.clip;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      if (!tubes.has(x, y)) continue;
      const core = tubes.has(x - 1, y) && tubes.has(x + 1, y) && tubes.has(x, y - 1);
      canvas.set(x, y, at(ramp, core ? 4 : 3));
    }
  }
}

/**
 * A neon word at x, y (its letters' top), `scale` pixels a font pixel: its backboard, its halo,
 * its tubes; the letters in `dead` are dark tubes, no glow.
 */
export function drawNeonWord(
  canvas: Canvas,
  x: number,
  y: number,
  text: string,
  scale: number,
  ramp: readonly number[],
  dead: ReadonlySet<number>,
): Rect {
  const lit = new Mask(canvas.width, canvas.height);
  const off = new Mask(canvas.width, canvas.height);
  const width = spell(text, scale, 1, (px, py, letter) => {
    (dead.has(letter) ? off : lit).add(x + px, y + py);
  });
  const height = 7 * scale;
  const board: Rect = {
    x: x - 5,
    y: y - 5 - 2 * scale,
    width: width + 10,
    height: height + 10 + 2 * scale,
  };
  canvas.fill(board.x, board.y, board.width, board.height, at(STEEL, 0));
  canvas.hline(board.x, board.y, board.width, at(STEEL, 2));
  drawHalo(canvas, lit, ramp, 4.5);
  drawTubes(canvas, lit, ramp);
  for (let py = board.y; py < board.y + board.height; py++) {
    for (let px = board.x; px < board.x + board.width; px++) {
      if (off.has(px, py)) canvas.set(px, py, at(NEON_DEAD, off.has(px, py - 1) ? 0 : 1));
    }
  }
  return board;
}

/**
 * A backlit sign box: steel frame, a pale face brighter in its middle (its tubes behind), dark
 * letters, one end gone dim where a tube died.
 */
export function drawLightbox(canvas: Canvas, rect: Rect, text: string, scale: number): void {
  const { x, y, width, height } = rect;
  canvas.fill(x, y, width, height, at(STEEL, 1));
  canvas.hline(x, y, width, at(STEEL, 4));
  const face: Rect = { x: x + 3, y: y + 3, width: width - 6, height: height - 6 };
  const dimFrom = face.x + face.width * 0.78;
  canvas.paint(face.x, face.y, face.width, face.height, (px, py) => {
    const middle = 1 - Math.abs((py - face.y) / face.height - 0.5) * 2;
    const dim = px > dimFrom ? -1.4 : 0;
    return tone(LIGHTBOX, 0.9 + middle * 1.3 + dim, px, py);
  });
  const textWidth = spell(text, scale, 1, () => undefined);
  const left = face.x + Math.round((face.width - textWidth) / 2);
  const top = face.y + Math.round((face.height - 7 * scale) / 2) + scale;
  spell(text, scale, 1, (px, py) => {
    canvas.set(left + px, top + py, at(SIGN_INK, left + px > dimFrom ? 0 : 1));
  });
}

/** Dark text pixels: a painted word (an awning's, a door's). */
export function drawPainted(
  canvas: Canvas,
  x: number,
  y: number,
  text: string,
  slot: number,
): number {
  return spell(text, 1, 1, (px, py) => {
    canvas.set(x + px, y + py, slot);
  });
}

const TAG_COLORS = [TAG.rose, TAG.teal, TAG.cream, TAG.violet, TAG.ochre] as const;

/**
 * A hand tag: one cursive stroke across `rect`, two pixels thick, its loops a curve that runs
 * back on itself (x = t + a sin θ), each loop its own size, an underline, a drip or two.
 */
export function drawTag(canvas: Canvas, rect: Rect, random: Random): void {
  const ramp = random.pick(TAG_COLORS);
  const color = at(ramp, 1);
  const loops = random.int(4, 6);
  const sizes = Array.from({ length: loops + 1 }, () => 0.5 + random.next() * 0.7);
  const middle = rect.y + rect.height * 0.45;
  let previous: readonly [number, number] | undefined;
  for (let t = 0; t < 1; t += 0.004) {
    const theta = t * loops * Math.PI * 2;
    const size = sizes[Math.floor(t * loops)] ?? 1;
    const x =
      rect.x + 4 + t * (rect.width - 12) + (rect.width / loops) * 0.22 * size * Math.sin(theta);
    const y = middle - rect.height * 0.32 * size * Math.cos(theta) + Math.sin(t * 7) * 2;
    if (previous) canvas.line(previous[0], previous[1], x, y, color, 2);
    previous = [x, y];
  }
  canvas.line(
    rect.x + 2,
    rect.y + rect.height - 3,
    rect.x + rect.width - 4,
    rect.y + rect.height - 6,
    color,
    2,
  );
  for (let drip = 0; drip < random.int(1, 3); drip++) {
    canvas.vline(
      rect.x + random.int(6, rect.width - 6),
      rect.y + rect.height - 3,
      random.int(3, 9),
      at(ramp, 0),
    );
  }
}

/**
 * A throw-up: bubble letters, rounded blocks each overlapping the one before, each ringed with a
 * dark outline and a pale one, filled in two tones (lit on top), a counter punched in some.
 */
export function drawThrowUp(
  canvas: Canvas,
  rect: Rect,
  random: Random,
  ramp: readonly number[] = random.pick(TAG_COLORS),
): void {
  const letters = random.int(3, 4);
  const step = (rect.width - 8) / letters;
  for (let letter = 0; letter < letters; letter++) {
    const lx = Math.round(rect.x + 4 + letter * step);
    const ly = rect.y + 2 + random.int(-3, 3);
    const lw = Math.round(step + 6);
    const lh = rect.height - 4 + random.int(-3, 2);
    const fill = new Mask(canvas.width, canvas.height);
    fill.rect(lx + 4, ly, lw - 8, lh);
    fill.rect(lx, ly + 4, lw, lh - 8);
    for (const [cx, cy] of [
      [lx, ly],
      [lx + lw - 8, ly],
      [lx, ly + lh - 8],
      [lx + lw - 8, ly + lh - 8],
    ] as const) {
      fill.ellipse(cx, cy, 8, 8);
    }
    const hole = new Mask(canvas.width, canvas.height);
    if (random.chance(0.6)) hole.rect(lx + lw / 2 - 1, ly + lh * 0.28, 3, lh * 0.3);
    const inside = (x: number, y: number): boolean => fill.has(x, y) && !hole.has(x, y);
    const near = (x: number, y: number, r: number): boolean => {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) if (inside(x + dx, y + dy)) return true;
      }
      return false;
    };
    for (let y = ly - 3; y < ly + lh + 3; y++) {
      for (let x = lx - 3; x < lx + lw + 3; x++) {
        if (inside(x, y)) canvas.set(x, y, at(ramp, inside(x, y - 3) ? 0 : 1));
        else if (near(x, y, 1)) canvas.set(x, y, TAG.outline);
        else if (near(x, y, 2) && !hole.has(x, y)) canvas.set(x, y, at(TAG.cream, 0));
      }
    }
  }
}
