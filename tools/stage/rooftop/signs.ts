/**
 * The giant signs seen from behind (docs/art/decor-rooftop.md §2.2), in high-detail pixel art and
 * 3D channel-letter depth (docs/art/proprete.md): deep extruded steel letter cans on a frame,
 * horizontal mounting rails, transformer boots, and multi-step neon halos.
 */

import { Canvas, Mask, at, dithered } from '../kit/canvas.ts';
import { HAN_SIZE, spellHan } from '../kit/font.ts';
import { STEEL } from './palette.ts';

function hdTone(ramp: readonly number[], level: number, x: number, y: number): number {
  const top = ramp.length - 1;
  const clamped = Math.min(Math.max(level, 0), top);
  const base = Math.floor(clamped);
  const fraction = clamped - base;
  const step = dithered(fraction, x >> 1, y) ? 1 : 0;
  return ramp[Math.min(base + step, top)] ?? 0;
}

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
      const t = 1 - d / reach;
      canvas.set(x, y, hdTone(glow, t * 1.45, x, y));
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
  drawCleanHalo(canvas, letters, glow, scale * 1.25);
  const { left, top, right, bottom } = canvas.clip;
  const extX = vertical ? -5 : 5;
  const extY = 3;
  for (let py = top; py < bottom; py++) {
    for (let px = left; px < right; px++) {
      if (letters.has(px, py)) continue;
      for (let step = 1; step <= Math.abs(extX); step++) {
        const sx = px - Math.sign(extX) * step;
        const sy = py - Math.round((step / Math.abs(extX)) * extY);
        if (letters.has(sx, sy)) {
          canvas.set(px, py, at(STEEL, step === Math.abs(extX) ? 2 : py % 6 === 0 ? 2 : 0));
          break;
        }
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
        canvas.set(px, py, at(glow, bright ? 4 : 3));
        continue;
      }
      const rim2 =
        !letters.has(px - 2, py) ||
        !letters.has(px + 2, py) ||
        !letters.has(px, py - 2) ||
        !letters.has(px, py + 2);
      if (rim2) {
        canvas.set(px, py, at(glow, 2));
        continue;
      }
      const inner =
        !letters.has(px - 3, py) ||
        !letters.has(px + 3, py) ||
        !letters.has(px, py - 3) ||
        !letters.has(px, py + 3);
      if (inner) {
        canvas.set(px, py, at(STEEL, 4));
        continue;
      }
      const seam = (px - x) % scale === 0 || (py - y) % scale === 0;
      const bolt = (px - x) % scale >= 3 && (px - x) % scale <= 4 && (py - y) % scale === 3;
      if (bolt) {
        canvas.set(px, py, at(STEEL, 5));
      } else if (seam) {
        canvas.set(px, py, at(STEEL, 0));
      } else {
        const grad = 1.4 + ((py - y) % (scale * 2)) / (scale * 1.4);
        canvas.set(px, py, hdTone(STEEL, grad, px, py));
      }
    }
  }
  return letters;
}
