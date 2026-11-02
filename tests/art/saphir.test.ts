import { describe, expect, it } from 'vitest';
import { SAPHIR, SAPHIR_ALT } from '../../src/art/saphir';
import { SAPHIR_SHEETS } from '../../src/art/saphir/sheets';
import { playedSheets } from '../../src/art/types';
import { validateArt } from '../../src/art/validate';
import { SAPHIR as SAPHIR_TEMPLATE } from '../../src/data/fighters/saphir';

// Not yet the art the game draws her with: she is lit up by her own PR (docs/art/perso-3.md).
describe('Saphir art', () => {
  it('matches the frame data of her template, in both colorways', () => {
    expect(validateArt(SAPHIR, SAPHIR_TEMPLATE)).toEqual([]);
    expect(validateArt(SAPHIR_ALT, SAPHIR_TEMPLATE)).toEqual([]);
  });

  it('plays all her strips, each with an image', () => {
    const played = playedSheets(SAPHIR);
    const sheets = Object.keys(SAPHIR_SHEETS);
    expect([...played].filter((sheet) => !sheets.includes(sheet))).toEqual([]);
    expect(sheets.filter((sheet) => !played.has(sheet))).toEqual([]);
    for (const art of [SAPHIR, SAPHIR_ALT]) {
      expect(Object.keys(art.urls).sort()).toEqual(Object.keys(SAPHIR_SHEETS).sort());
    }
  });

  it('frames her bust inside the first frame of her idle', () => {
    const { portrait, cells } = SAPHIR;
    const idle = cells?.['idle'];
    if (!portrait || !idle) throw new Error('Saphir has no portrait or no idle cell');
    expect(portrait.x + portrait.size).toBeLessThanOrEqual(idle.width);
    expect(portrait.y + portrait.size).toBeLessThanOrEqual(idle.height);
  });
});
