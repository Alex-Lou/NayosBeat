import { describe, expect, it } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { validateArt } from '../../src/art/validate';
import { POLYVALENT } from '../../src/data/fighters';

describe('Nayo art', () => {
  it('matches the frame data of its template (Polyvalent)', () => {
    expect(validateArt(NAYO, POLYVALENT)).toEqual([]);
  });

  it('rejects a move clip that does not last as long as the move', () => {
    const shortJab = { ...NAYO.clips.standLight, ticks: [2, 2, 3, 4], frames: [0, 0, 0, 0] };
    const art = { ...NAYO, clips: { ...NAYO.clips, standLight: shortJab } };
    expect(validateArt(art, POLYVALENT)).toEqual([
      'nayo: clip standLight lasts 11 ticks, its gameplay lasts 14',
    ]);
  });

  it('rejects frames that are not in the strip', () => {
    const art = {
      ...NAYO,
      clips: { ...NAYO.clips, idle: { ...NAYO.clips.idle, frames: [0, 1, 2, 3, 4, 6] } },
    };
    expect(validateArt(art, POLYVALENT)).toEqual([
      'nayo: clip idle: frames must be indices of sheet idle (0 to 5)',
    ]);
  });

  it('rejects a strip without image', () => {
    const art = {
      ...NAYO,
      urls: { ...NAYO.urls, idle: undefined } as unknown as Record<string, string>,
    };
    expect(validateArt(art, POLYVALENT)).toEqual(['nayo: sheet idle has no image URL']);
  });
});
