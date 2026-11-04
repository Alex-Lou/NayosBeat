/**
 * The giant signs seen from behind (docs/art/decor-rooftop.md §2.2), in clean pixel art and 3D
 * channel-letter depth (docs/art/proprete.md): 3D extruded steel letter cans on a frame, their
 * faces turned to the street below, their neon light spilling around the front rims.
 */

import { Canvas, Mask, at } from '../kit/canvas.ts';
import { HAN_SIZE, spellHan } from '../kit/font.ts';
import { STEEL } from './palette.ts';

export function signLetters(
  canvas: Canvas,
  text: string,
  x: number,
  y: number,
  scale: number,
  vertical: boolean,
): Mask {
  const mask = new Mask(canvas.width, canvas.height);
  const chars = Array.from(text);
  const lit = new Set<string>();
  chars.forEach((char, index) => {
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
    for (const dx of [-1, 1]) {
      if (!has(gx + dx, gy + 1) || has(gx + dx, gy) || has(gx, gy + 1)) continue;
      const cx = x + gx * scale + scale / 2;
      const cy = y + gy * scale + scale / 2;
      mask.limb(cx, cy, cx + dx * scale, cy + scale, scale / 2);
    }
  }
  return mask;
}

function drawCleanHalo(
  canvas: Canvas,
  letters: Mask,
  glow: readonly number[],
  reach: number,
): void {
  const { width, height } = letters;
  const distance = new Float32Array(width * height).fill(Infinity);
  const radius = Math.ceil(reach);
  const { left, top, right, bottom } = canvas.clip;
  for (let y = Math.max(0, top - radius); y < Math.min(height, bottom + radius); y++) {
    for (let x = Math.max(0, left - radius); x < Math.min(width, right + radius); x++) {
      if (!letters.has(x, y)) continue;
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
      canvas.set(x, y, at(glow, d <= reach * 0.48 ? 1 : 0));
    }
  }
}

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
  drawCleanHalo(canvas, letters, glow, scale * 1.15);
  const { left, top, right, bottom } = canvas.clip;
  const extX = vertical ? -3 : 3;
  const extY = 2;
  for (let py = top; py < bottom; py++) {
    for (let px = left; px < right; px++) {
      if (letters.has(px, py)) continue;
      if (letters.has(px - extX, py - extY) || letters.has(px - Math.sign(extX) * 2, py - 1)) {
        canvas.set(px, py, at(STEEL, 0));
      }
    }
  }
  for (let py = top; py < bottom; py++) {
    for (let px = left; px < right; px++) {
      if (!letters.has(px, py)) continue;
      const rim =
        !letters.has(px - 1, py) ||
        !letters.has(px + 1, py) ||
        !letters.has(px, py - 1) ||
        !letters.has(px, py + 1);
      if (rim) {
        const bright = !letters.has(px, py - 1) || !letters.has(px - 1, py);
        canvas.set(px, py, at(glow, bright ? 3 : 2));
        continue;
      }
      const inner =
        !letters.has(px - 2, py) ||
        !letters.has(px + 2, py) ||
        !letters.has(px, py - 2) ||
        !letters.has(px, py + 2);
      if (inner) {
        canvas.set(px, py, at(STEEL, 3));
        continue;
      }
      const seam = (px - x) % scale === 0 || (py - y) % scale === 0;
      const bolt = (px - x) % scale === 3 && (py - y) % scale === 3;
      if (bolt) {
        canvas.set(px, py, at(STEEL, 4));
      } else if (seam) {
        canvas.set(px, py, at(STEEL, 0));
      } else {
        canvas.set(px, py, at(STEEL, (py - y) % (scale * 2) < scale ? 2 : 1));
      }
    }
  }
  return letters;
}
