import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { artOf, type Colorway } from '../../src/art';
import { STAGE_ART } from '../../src/art/entrepot';
import { stripName, playedUrls } from '../../src/render/art-textures';
import { ROSTER, type FighterId } from '../../src/data/roster';

/**
 * The video memory a match may take for its fighters' strips and its stage (docs/art/atlas.md):
 * 90 MB in the worst pairing, a mirror match loading both colorways. Provisional, to be confirmed
 * on the oldest iPhone the game aims at; every art change is checked against it.
 */
const CEILING_MB = 90;
/** The widest and tallest texture: every phone's GPU takes 2048 px. */
const MAX_TEXTURE = 2048;
const MB = 1024 * 1024;

/** Width and height of a PNG, from its header. */
function pngSize(file: URL): { width: number; height: number } {
  const png = readFileSync(file);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Each texture a fight loads for `fighter` in `colorway`: its strips and effects a clip plays. */
function textures(
  fighter: FighterId,
  colorway: Colorway,
): { name: string; width: number; height: number }[] {
  const art = artOf(fighter, colorway);
  if (!art) return [];
  return (['body', 'fx'] as const).flatMap((layer) =>
    playedUrls(art, layer).map(([sheet]) => {
      const name = stripName(sheet, layer);
      const file = new URL(`../../src/art/${fighter}/${colorway}/${name}.png`, import.meta.url);
      return { name: `${fighter}/${colorway}/${name}`, ...pngSize(file) };
    }),
  );
}

/** Bytes of video memory of a fighter's textures in a colorway: 4 a pixel (RGBA). */
function bytesOf(fighter: FighterId, colorway: Colorway): number {
  return textures(fighter, colorway).reduce(
    (sum, { width, height }) => sum + width * height * 4,
    0,
  );
}

/**
 * Bytes of the stage drawn (src/art/stage-layers.ts), one RGBA image a layer at its size (`npm run
 * sprites` refuses any other), not in an atlas; none for the grey box.
 */
const STAGE_BYTES = (STAGE_ART?.layers ?? []).reduce(
  (sum, { width, height }) => sum + width * height * 4,
  0,
);

describe('video memory of a match', () => {
  const drawn = ROSTER.map(({ id }) => id).filter((id) => artOf(id) !== undefined);

  it(`stays under ${CEILING_MB} MB in the worst pairing, a mirror match included`, () => {
    expect(drawn.length).toBeGreaterThan(0);
    const pairings = drawn.flatMap((a) =>
      drawn.map((b) => ({
        match: `${a} vs ${b}`,
        // In a mirror match, player 2 wears the other colorway: both are loaded.
        bytes:
          STAGE_BYTES + bytesOf(a, 'main') + (a === b ? bytesOf(b, 'alt') : bytesOf(b, 'main')),
      })),
    );
    const worst = pairings.reduce((most, pairing) => (pairing.bytes > most.bytes ? pairing : most));
    expect(worst.bytes / MB, worst.match).toBeLessThanOrEqual(CEILING_MB);
  });

  it(`loads no texture beyond ${MAX_TEXTURE} px on a side`, () => {
    for (const fighter of drawn) {
      for (const colorway of ['main', 'alt'] as const) {
        for (const { name, width, height } of textures(fighter, colorway)) {
          expect(Math.max(width, height), name).toBeLessThanOrEqual(MAX_TEXTURE);
        }
      }
    }
  });
});
