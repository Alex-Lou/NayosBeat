import type Phaser from 'phaser';
import type { HitStyle } from './hit-styles';

/**
 * The comic-book lettering the sound words and the stamps share (docs/combat-v2.md §7.9): one
 * font, light on top and the attacker's strike color below, inked, the attacker's energy color
 * as the drop. One look for everything the fight shouts.
 */

/** Comic lettering, self-hosted (see main.ts). */
export const COMIC_FONT = 'Bangers, Impact, sans-serif';
/** The outline of the letters. */
export const INK = '#150b24';
/** The top of the letters' fill. */
const PAPER = '#fffbe8';

/** The letters' fill for `style`, `size` world pixels high: light on top, its strike color below. */
export function comicFill(
  text: Phaser.GameObjects.Text,
  size: number,
  style: HitStyle,
): CanvasGradient {
  const fill = text.context.createLinearGradient(0, 0, 0, size);
  fill.addColorStop(0, PAPER);
  fill.addColorStop(1, hex(style.strike));
  return fill;
}

/**
 * The comic drop of the inked outline, `size` world pixels down and right, in `style`'s energy
 * color. Shadow offsets count in device pixels (`resolution` per world pixel), unlike every
 * other text size.
 */
export function comicDrop(
  size: number,
  resolution: number,
  style: HitStyle,
): Phaser.Types.GameObjects.Text.TextShadow {
  const offset = size * resolution;
  const color = hex(style.energy);
  return { offsetX: offset, offsetY: offset, color, stroke: true, fill: false };
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
