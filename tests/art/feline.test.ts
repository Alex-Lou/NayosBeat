import { describe, expect, it } from 'vitest';
import { FELINE, FELINE_ALT } from '../../src/art/feline';
import { FELINE_SHEETS } from '../../src/art/feline/sheets';
import { playedSheets } from '../../src/art/types';
import { validateArt } from '../../src/art/validate';
import { INTRO_FRAMES } from '../../src/core/rules';
import { FELINE as FELINE_TEMPLATE } from '../../src/data/fighters/feline';

describe('Feline art', () => {
  it('matches the frame data of its template in both colorways', () => {
    expect(validateArt(FELINE, FELINE_TEMPLATE)).toEqual([]);
    expect(validateArt(FELINE_ALT, FELINE_TEMPLATE)).toEqual([]);
  });

  it('plays all her strips, each with an image, and a 90-tick intro', () => {
    const played = playedSheets(FELINE);
    const sheets = Object.keys(FELINE_SHEETS);
    expect([...played].filter((sheet) => !sheets.includes(sheet))).toEqual([]);
    expect(sheets.filter((sheet) => !played.has(sheet))).toEqual([]);
    for (const art of [FELINE, FELINE_ALT]) {
      expect(Object.keys(art.urls).sort()).toEqual(Object.keys(FELINE_SHEETS).sort());
    }
    const introTicks = FELINE.clips.intro.ticks.reduce((sum, ticks) => sum + ticks, 0);
    expect(introTicks).toBe(INTRO_FRAMES);
  });

  it('rejects a move clip that does not last as long as the move', () => {
    const shortClaw = { ...FELINE.clips.standLight, ticks: [2, 2, 3, 4], frames: [0, 0, 0, 0] };
    const art = { ...FELINE, clips: { ...FELINE.clips, standLight: shortClaw } };
    expect(validateArt(art, FELINE_TEMPLATE)).toEqual([
      'feline: clip standLight lasts 11 ticks, its gameplay lasts 14',
    ]);
  });
});
