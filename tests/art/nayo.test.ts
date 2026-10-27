import { describe, expect, it } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { validateArt } from '../../src/art/validate';
import { NAYO as NAYO_TEMPLATE } from '../../src/data/fighters/nayo';

describe('Nayo art', () => {
  it('matches the frame data of its template', () => {
    expect(validateArt(NAYO, NAYO_TEMPLATE)).toEqual([]);
  });

  it('rejects a move clip that does not last as long as the move', () => {
    const shortJab = { ...NAYO.clips.standLight, ticks: [2, 2, 3, 4], frames: [0, 0, 0, 0] };
    const art = { ...NAYO, clips: { ...NAYO.clips, standLight: shortJab } };
    expect(validateArt(art, NAYO_TEMPLATE)).toEqual([
      'nayo: clip standLight lasts 11 ticks, its gameplay lasts 14',
    ]);
  });

  it('rejects frames that are not in the strip', () => {
    const last = NAYO.sheets.idle?.frames ?? 0;
    const frames = NAYO.clips.idle.frames.map((frame, index) => (index === 0 ? last : frame));
    const art = { ...NAYO, clips: { ...NAYO.clips, idle: { ...NAYO.clips.idle, frames } } };
    expect(validateArt(art, NAYO_TEMPLATE)).toEqual([
      `nayo: clip idle: frames must be indices of sheet idle (0 to ${last - 1})`,
    ]);
  });

  it('rejects a strip without image', () => {
    const art = {
      ...NAYO,
      urls: { ...NAYO.urls, idle: undefined } as unknown as Record<string, string>,
    };
    expect(validateArt(art, NAYO_TEMPLATE)).toEqual(['nayo: sheet idle has no image URL']);
  });

  it('rejects effects of a strip that does not exist', () => {
    const art = { ...NAYO, fx: { ...NAYO.fx, dance: 'dance.png' } };
    expect(validateArt(art, NAYO_TEMPLATE)).toEqual(['nayo: effects of unknown sheet dance']);
  });
});
