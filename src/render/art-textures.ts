import type Phaser from 'phaser';
import { cellOf, playedEffects, playedSheets, type FighterArt } from '../art/types';

/** A fighter's strips: its body, or the front effects drawn over both fighters. */
export type Layer = 'body' | 'fx';

/** Name of a strip's image: the strip itself, or `fx/` and the strip for its front effects. */
export function stripName(sheet: string, layer: Layer = 'body'): string {
  return layer === 'fx' ? `fx/${sheet}` : sheet;
}

export function textureKey(art: FighterArt, sheet: string, layer: Layer = 'body'): string {
  return `${art.key}/${stripName(sheet, layer)}`;
}

/**
 * Image URL of each strip of one layer that a clip plays, by sheet, or by the name a clip gives
 * its effects (the others never show).
 */
export function playedUrls(art: FighterArt, layer: Layer): [sheet: string, url: string][] {
  const played = layer === 'fx' ? playedEffects(art) : playedSheets(art);
  const urls = layer === 'fx' ? (art.fx ?? {}) : art.urls;
  return Object.entries(urls).filter(([sheet]) => played.has(sheet));
}

/**
 * Loads every strip of `art` that a clip plays, effects included, that is not already in the
 * texture cache. An image with an atlas has its frames cut to what they draw and packed: Phaser
 * puts each back at its place in the cell (a trimmed frame keeps the cell's size), so frames,
 * anchors and flips work as with a row of equal cells, which an image without one is.
 */
export function loadArt(scene: Phaser.Scene, art: FighterArt): void {
  for (const layer of ['body', 'fx'] as const) {
    for (const [sheet, url] of playedUrls(art, layer)) {
      const key = textureKey(art, sheet, layer);
      if (scene.textures.exists(key)) continue;
      const name = stripName(sheet, layer);
      const atlas = art.atlases?.[name];
      if (atlas !== undefined) {
        scene.load.atlas(key, url, atlas);
        continue;
      }
      const cell = cellOf(art, name);
      scene.load.spritesheet(key, url, { frameWidth: cell.width, frameHeight: cell.height });
    }
  }
}
