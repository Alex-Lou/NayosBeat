import { describe, expect, it } from 'vitest';
import { KODA, KODA_ALT } from '../../src/art/koda';
import { KODA_SHEETS } from '../../src/art/koda/sheets';
import { playedSheets } from '../../src/art/types';
import { validateArt } from '../../src/art/validate';
import { INTRO_FRAMES } from '../../src/core/rules';
import { KODA as KODA_TEMPLATE } from '../../src/data/fighters/koda';

describe('Koda art', () => {
  it('matches the frame data of its template in both colorways', () => {
    expect(validateArt(KODA, KODA_TEMPLATE)).toEqual([]);
    expect(validateArt(KODA_ALT, KODA_TEMPLATE)).toEqual([]);
  });

  it('plays all his strips, each with an image, and a 90-tick intro', () => {
    const played = playedSheets(KODA);
    const sheets = Object.keys(KODA_SHEETS);
    expect([...played].filter((sheet) => !sheets.includes(sheet))).toEqual([]);
    expect(sheets.filter((sheet) => !played.has(sheet))).toEqual([]);
    for (const art of [KODA, KODA_ALT]) {
      expect(Object.keys(art.urls).sort()).toEqual(Object.keys(KODA_SHEETS).sort());
    }
    const introTicks = KODA.clips.intro.ticks.reduce((sum, ticks) => sum + ticks, 0);
    expect(introTicks).toBe(INTRO_FRAMES);
  });

  it('rejects a move clip that does not last as long as the move', () => {
    const shortPalm = { ...KODA.clips.standLight, ticks: [2, 2, 3, 4], frames: [0, 0, 0, 0] };
    const art = { ...KODA, clips: { ...KODA.clips, standLight: shortPalm } };
    expect(validateArt(art, KODA_TEMPLATE)).toEqual([
      'koda: clip standLight lasts 11 ticks, its gameplay lasts 14',
    ]);
  });
});
