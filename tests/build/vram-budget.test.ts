import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { artOf, type Colorway } from '../../src/art';
import { STAGE_SCALE } from '../../src/art/stage-layers';
import { STAGE_MAPS, type StageMap } from '../../src/art/stages';
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
 * Each stage's textures (src/art/stage-layers.ts, src/art/stages.ts): one image a layer,
 * STAGE_SCALE times finer than the world (`npm run stages` refuses any other size), and its props'
 * sheet. A fight loads one stage in one atmosphere, all of a stage's the same size: its base one's
 * are counted. None for the grey box.
 */
function stageTextures({ name: stage, variants }: StageMap) {
  const art = variants[0]?.art;
  return [
    ...(art?.layers ?? []).map(({ name, width, height }) => ({
      name: `${stage}/${name}`,
      width: width * STAGE_SCALE,
      height: height * STAGE_SCALE,
    })),
    ...(art?.props
      ? [
          {
            name: `${stage}/props`,
            ...pngSize(new URL(`../../src/art/${stage}/props.png`, import.meta.url)),
          },
        ]
      : []),
  ];
}

const STAGE_TEXTURES = STAGE_MAPS.flatMap(stageTextures);

/** The stage that takes the most video memory. */
const STAGE_BYTES = Math.max(
  0,
  ...STAGE_MAPS.map((map) =>
    stageTextures(map).reduce((sum, { width, height }) => sum + width * height * 4, 0),
  ),
);

/**
 * The live lights paint, for each layer, the pixels that light themselves on a canvas of its size,
 * drawn over their glows (src/render/light-show.ts): at most one more texture a layer, of the one
 * stage a fight loads (stage-view.ts `loadStage`), its props' sheet left out. (Since there are
 * several stages, a filter on « stage/props » matched nothing: every stage's every texture was
 * summed, as if a fight held them all.)
 */
const EMITTER_BYTES = Math.max(
  0,
  ...STAGE_MAPS.map((map) =>
    stageTextures(map)
      .filter(({ name }) => !name.endsWith('/props'))
      .reduce((sum, { width, height }) => sum + width * height * 4, 0),
  ),
);

describe('video memory of a match', () => {
  const drawn = ROSTER.map(({ id }) => id).filter((id) => artOf(id) !== undefined);

  it('counts each stage at the size it is drawn, its props included (docs/art/decor-rue.md §2)', () => {
    for (const { name, width, height } of STAGE_TEXTURES.filter(
      ({ name }) => !name.endsWith('/props'),
    )) {
      const file = new URL(`../../src/art/${name}.png`, import.meta.url);
      expect(pngSize(file), name).toEqual({ width, height });
    }
    // About 7 MB: under a tenth of the ceiling.
    expect(STAGE_BYTES / MB).toBeLessThan(CEILING_MB / 10);
  });

  it(`stays under ${CEILING_MB} MB in the worst pairing, a mirror match included`, () => {
    expect(drawn.length).toBeGreaterThan(0);
    const pairings = drawn.flatMap((a) =>
      drawn.map((b) => ({
        match: `${a} vs ${b}`,
        // In a mirror match, player 2 wears the other colorway: both are loaded.
        bytes:
          STAGE_BYTES +
          EMITTER_BYTES +
          bytesOf(a, 'main') +
          (a === b ? bytesOf(b, 'alt') : bytesOf(b, 'main')),
      })),
    );
    const worst = pairings.reduce((most, pairing) => (pairing.bytes > most.bytes ? pairing : most));
    expect(worst.bytes / MB, worst.match).toBeLessThanOrEqual(CEILING_MB);
  });

  it(`loads no texture beyond ${MAX_TEXTURE} px on a side`, () => {
    for (const { name, width, height } of STAGE_TEXTURES) {
      expect(Math.max(width, height), name).toBeLessThanOrEqual(MAX_TEXTURE);
    }
    for (const fighter of drawn) {
      for (const colorway of ['main', 'alt'] as const) {
        for (const { name, width, height } of textures(fighter, colorway)) {
          expect(Math.max(width, height), name).toBeLessThanOrEqual(MAX_TEXTURE);
        }
      }
    }
  });
});
