import { describe, expect, it } from 'vitest';
import { WATT, WATT_ALT } from '../../src/art/watt';
import { WATT_SHEETS } from '../../src/art/watt/sheets';
import { playedSheets } from '../../src/art/types';
import { validateArt } from '../../src/art/validate';
import { WATT as WATT_TEMPLATE } from '../../src/data/fighters/watt';

// Not yet the art the game draws his with: she is lit up by his own PR (docs/art/perso-3.md).
describe('Watt art', () => {
  it('matches the frame data of his template, in both colorways', () => {
    expect(validateArt(WATT, WATT_TEMPLATE)).toEqual([]);
    expect(validateArt(WATT_ALT, WATT_TEMPLATE)).toEqual([]);
  });

  it('plays all his strips, each with an image', () => {
    const played = playedSheets(WATT);
    const sheets = Object.keys(WATT_SHEETS);
    expect([...played].filter((sheet) => !sheets.includes(sheet))).toEqual([]);
    expect(sheets.filter((sheet) => !played.has(sheet))).toEqual([]);
    for (const art of [WATT, WATT_ALT]) {
      expect(Object.keys(art.urls).sort()).toEqual(Object.keys(WATT_SHEETS).sort());
    }
  });

  it('frames his bust inside the first frame of his idle', () => {
    const { portrait, cells } = WATT;
    const idle = cells?.['idle'];
    if (!portrait || !idle) throw new Error('Watt has no portrait or no idle cell');
    expect(portrait.x + portrait.size).toBeLessThanOrEqual(idle.width);
    expect(portrait.y + portrait.size).toBeLessThanOrEqual(idle.height);
  });
});
