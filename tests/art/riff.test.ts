import { describe, expect, it } from 'vitest';
import { artOf } from '../../src/art';
import { RIFF, RIFF_ALT } from '../../src/art/riff';
import { RIFF_SHEETS } from '../../src/art/riff/sheets';
import { playedSheets } from '../../src/art/types';
import { validateArt } from '../../src/art/validate';
import { RIFF as RIFF_TEMPLATE } from '../../src/data/fighters/riff';

describe('Riff art', () => {
  it('matches the frame data of her template, in both colorways', () => {
    expect(validateArt(RIFF, RIFF_TEMPLATE)).toEqual([]);
    expect(validateArt(RIFF_ALT, RIFF_TEMPLATE)).toEqual([]);
  });

  it('is the art the game draws her with: no grey box any more', () => {
    expect(artOf('riff')).toBe(RIFF);
    expect(artOf('riff', 'alt')).toBe(RIFF_ALT);
  });

  it('plays all 43 of her strips (docs/combat-v2.md §11.3), each with an image', () => {
    expect([...playedSheets(RIFF)].sort()).toEqual(Object.keys(RIFF_SHEETS).sort());
    for (const art of [RIFF, RIFF_ALT]) {
      expect(Object.keys(art.urls).sort()).toEqual(Object.keys(RIFF_SHEETS).sort());
    }
  });
});
