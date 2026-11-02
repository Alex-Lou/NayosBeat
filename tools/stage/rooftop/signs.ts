/**
 * The giant signs seen from behind (docs/art/decor-rooftop.md §2.2): channel letters on a steel
 * frame, their faces turned to the street below. From the roof, each letter is its dark back, its
 * panels and bolts, the lit edge of its face peeking out, and its light spilling around it into the
 * night: the words read mirrored, last letter first.
 */

import { Canvas, Mask, at, tone } from '../kit/canvas.ts';
import { HAN_SIZE, spellHan } from '../kit/font.ts';
import { drawHalo } from '../rue/signs.ts';
import { STEEL } from './palette.ts';

/** A sign's letters as a mask: each font pixel a block, its diagonals filled as strokes. */
export function signLetters(
  canvas: Canvas,
  text: string,
  x: number,
  y: number,
  scale: number,
  vertical: boolean,
): Mask {
  const mask = new Mask(canvas.width, canvas.height);
  // The font's pixels, letter by letter, mirrored: the sign is seen from behind.
  const chars = Array.from(text);
  const lit = new Set<string>();
  chars.forEach((char, index) => {
    // Seen from behind, a row of letters reads from its last; a column keeps its order.
    const slot = vertical ? index : chars.length - 1 - index;
    spellHan(char, 1, 0, (px, py) => {
      const mirrored = HAN_SIZE - 1 - px;
      const gx = vertical ? mirrored : slot * (HAN_SIZE + 2) + mirrored;
      const gy = vertical ? slot * (HAN_SIZE + 1) + py : py;
      lit.add(`${gx},${gy}`);
    });
  });
  const has = (gx: number, gy: number) => lit.has(`${gx},${gy}`);
  for (const key of lit) {
    const [gx = 0, gy = 0] = key.split(',').map(Number);
    mask.rect(x + gx * scale, y + gy * scale, scale, scale);
    // A diagonal stroke: a limb between the two blocks' centers, as thick as a block.
    for (const dx of [-1, 1]) {
      if (!has(gx + dx, gy + 1) || has(gx + dx, gy) || has(gx, gy + 1)) continue;
      const cx = x + gx * scale + scale / 2;
      const cy = y + gy * scale + scale / 2;
      mask.limb(cx, cy, cx + dx * scale, cy + scale, scale / 2);
    }
  }
  return mask;
}

/**
 * A giant sign's back at x, y (its letters' top left), `scale` pixels a font pixel: the glow
 * spilling around its letters (`glow`, two steps, over what is behind), each letter's dark back
 * with its panel seams and bolts, the lit rim of its face (`glow` step 2). Returns its letters'
 * mask.
 */
export function drawSignBack(
  canvas: Canvas,
  text: string,
  x: number,
  y: number,
  scale: number,
  glow: readonly number[],
  vertical = false,
): Mask {
  const letters = signLetters(canvas, text, x, y, scale, vertical);
  drawHalo(canvas, letters, glow, scale * 1.1);
  const { left, top, right, bottom } = canvas.clip;
  for (let py = top; py < bottom; py++) {
    for (let px = left; px < right; px++) {
      if (!letters.has(px, py)) continue;
      const rim =
        !letters.has(px - 1, py) ||
        !letters.has(px + 1, py) ||
        !letters.has(px, py - 1) ||
        !letters.has(px, py + 1);
      if (rim) {
        canvas.set(px, py, at(glow, 2));
        continue;
      }
      const inner =
        !letters.has(px - 2, py) ||
        !letters.has(px + 2, py) ||
        !letters.has(px, py - 2) ||
        !letters.has(px, py + 2);
      const seam = (px - x) % scale === 0 || (py - y) % scale === 0;
      const bolt = (px - x) % scale === 3 && (py - y) % scale === 3;
      const level = inner ? 3 : bolt ? 3.4 : seam ? 0.6 : 1.6 + (py - y) / (scale * 30);
      canvas.set(px, py, tone(STEEL, level, px, py));
    }
  }
  return letters;
}
