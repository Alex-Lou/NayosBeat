import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkDrawn, PORTRAIT_SIZE, portraitRules } from '../../tools/sprites/drawn';
import { decodeIndexedPng } from '../../tools/sprites/png';
import { codePortrait } from '../../tools/sprites/portrait';
import { NAYO } from '../../tools/sprites/nayo/index';
import { SAPHIR } from '../../tools/sprites/saphir/index';
import { WATT } from '../../tools/sprites/watt/index';

/** The busts of the select screen drawn by the code (tools/sprites/portrait.ts). */
describe.each([SAPHIR, WATT])("$name's bust, drawn by the code", (fighter) => {
  const bust = codePortrait(fighter);
  const fileOf = (colorway: string) =>
    new URL(`../../src/art/${fighter.name}/${colorway}/portrait.png`, import.meta.url);

  it('keeps to the contract of a portrait drawn by hand, in its palette', async () => {
    const image = await decodeIndexedPng(readFileSync(fileOf('main')));
    const palette = fighter.paletteOf('main');
    expect(checkDrawn(`${fighter.name} portrait`, image, portraitRules(fighter), palette)).toEqual(
      [],
    );
  });

  it.each(['main', 'alt'])('is the one generated in %s (npm run sprites)', async (colorway) => {
    const image = await decodeIndexedPng(readFileSync(fileOf(colorway)));
    expect(image.width).toBe(PORTRAIT_SIZE);
    expect(Array.from(image.pixels)).toEqual(Array.from(bust ?? []));
  });
});

describe('a fighter without a bust pose', () => {
  it('leaves a fighter without a portrait pose to its guard', () => {
    expect(NAYO.portrait).toBeUndefined();
    expect(codePortrait(NAYO)).toBeUndefined();
  });
});
