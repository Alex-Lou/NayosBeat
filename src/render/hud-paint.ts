import type Phaser from 'phaser';

/**
 * The HUD's pixel art is drawn as spans: runs of pixels of one color, in view pixels. Pure
 * functions compute them (health-bar.ts, boost-gauge.ts, hud-discs.ts), so they are tested
 * without an engine; the views only paint them, into a Graphics redrawn when they change, or
 * once into a texture for what never moves.
 */
export interface Span {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: number;
  readonly alpha?: number;
}

/** Clears `graphics` and paints `spans` into it. */
export function paintSpans(graphics: Phaser.GameObjects.Graphics, spans: readonly Span[]): void {
  graphics.clear();
  for (const { x, y, width, height, color, alpha = 1 } of spans) {
    if (width > 0 && height > 0) graphics.fillStyle(color, alpha).fillRect(x, y, width, height);
  }
}

/** Paints `spans` once into a new texture `key` (kept by the game for the next fights). */
export function spanTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  spans: readonly Span[],
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;
  const context = texture.getContext();
  for (const { x, y, width: w, height: h, color, alpha = 1 } of spans) {
    context.globalAlpha = alpha;
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.fillRect(x, y, w, h);
  }
  texture.refresh();
}

/** `color` moved toward `toward` by `amount`, 0 (itself) to 1 (`toward`). */
export function mix(color: number, toward: number, amount: number): number {
  const channel = (shift: number): number => {
    const from = (color >> shift) & 0xff;
    const to = (toward >> shift) & 0xff;
    return Math.round(from + (to - from) * amount) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

/** A span mirrored across a box `width` wide: the right player's side of the HUD. */
export function mirrored(span: Span, width: number): Span {
  return { ...span, x: width - span.x - span.width };
}

/**
 * Where row `row` of a slanted tube of `rows` rows starts in its box: one pixel further toward the
 * timer per row up, the outline's pixel left of it (rows -1 and `rows`: the outline above and
 * under the tube).
 */
export function tubeRowStart(rows: number, row: number): number {
  return 2 + rows - 1 - row;
}

/** The box of a slanted tube of `rows` rows of `length` pixels, its outline included. */
export function tubeBox(rows: number, length: number): { width: number; height: number } {
  return { width: length + rows + 3, height: rows + 2 };
}

/** A tube's outline, one pixel around it, `rim` on top (the fighter's energy color). */
export function tubeOutline(rows: number, length: number, rim: number, outline: number): Span[] {
  const spans: Span[] = [];
  for (let row = -1; row <= rows; row++) {
    const x = tubeRowStart(rows, row) - 1;
    spans.push({ x, y: row + 1, width: length + 2, height: 1, color: row === -1 ? rim : outline });
  }
  return spans;
}

/** Spans moved by (`dx`, `dy`). */
export function moved(spans: readonly Span[], dx: number, dy: number): Span[] {
  return spans.map((span) => ({ ...span, x: span.x + dx, y: span.y + dy }));
}
