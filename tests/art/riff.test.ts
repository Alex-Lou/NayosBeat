import { describe, expect, it } from 'vitest';
import { artOf } from '../../src/art';
import { RIFF, RIFF_ALT } from '../../src/art/riff';
import { RIFF_SHEETS } from '../../src/art/riff/sheets';
import { playedSheets } from '../../src/art/types';
import { validateArt } from '../../src/art/validate';
import { RIFF as RIFF_TEMPLATE } from '../../src/data/fighters/riff';
import { RIFF_PENDING } from '../../tools/sprites/riff/pending-timing';

describe('Riff art', () => {
  it('matches the frame data of her template, in both colorways', () => {
    expect(validateArt(RIFF, RIFF_TEMPLATE)).toEqual([]);
    expect(validateArt(RIFF_ALT, RIFF_TEMPLATE)).toEqual([]);
  });

  it('is the art the game draws her with: no grey box any more', () => {
    expect(artOf('riff')).toBe(RIFF);
    expect(artOf('riff', 'alt')).toBe(RIFF_ALT);
  });

  it('plays all her strips (docs/combat-v2.md §11.3) but the ones drawn ahead, each with an image', () => {
    // Drawn ahead of its gameplay: the Slam, until its clip comes with the super
    // (tools/sprites/riff/pending-timing.ts).
    const played = playedSheets(RIFF);
    const sheets = Object.keys(RIFF_SHEETS);
    expect([...played].filter((sheet) => !sheets.includes(sheet))).toEqual([]);
    expect(sheets.filter((sheet) => !played.has(sheet) && !(sheet in RIFF_PENDING))).toEqual([]);
    for (const art of [RIFF, RIFF_ALT]) {
      expect(Object.keys(art.urls).sort()).toEqual(Object.keys(RIFF_SHEETS).sort());
    }
  });
});
