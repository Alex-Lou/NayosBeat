import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkDrawn, PORTRAIT_SIZE, portraitRules } from '../../tools/sprites/drawn';
import { decodeIndexedPng } from '../../tools/sprites/png';
import { codePortrait } from '../../tools/sprites/portrait';
import { NAYO } from '../../tools/sprites/nayo/index';
import { SAPHIR } from '../../tools/sprites/saphir/index';

/** The busts of the select screen drawn by the code (tools/sprites/portrait.ts). */
describe("Saphir's bust, drawn by the code", () => {
  const bust = codePortrait(SAPHIR);

  it('keeps to the contract of a portrait drawn by hand, in its palette', async () => {
    const file = new URL('../../src/art/saphir/main/portrait.png', import.meta.url);
    const image = await decodeIndexedPng(readFileSync(file));
    const palette = SAPHIR.paletteOf('main');
    expect(checkDrawn('saphir portrait', image, portraitRules(SAPHIR), palette)).toEqual([]);
  });

  it.each(['main', 'alt'])('is the one generated in %s (npm run sprites)', async (colorway) => {
    const file = new URL(`../../src/art/saphir/${colorway}/portrait.png`, import.meta.url);
    const image = await decodeIndexedPng(readFileSync(file));
    expect(image.width).toBe(PORTRAIT_SIZE);
    expect(Array.from(image.pixels)).toEqual(Array.from(bust ?? []));
  });

  it('leaves a fighter without a portrait pose to its guard', () => {
    expect(NAYO.portrait).toBeUndefined();
    expect(codePortrait(NAYO)).toBeUndefined();
  });
});
