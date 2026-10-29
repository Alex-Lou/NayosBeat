import { describe, expect, it } from 'vitest';
import {
  lookOf,
  SELECT_COLUMNS,
  SELECT_SLOTS,
  selectFighters,
} from '../../src/app/select-fighters';
import { artOf } from '../../src/art';
import { ROSTER } from '../../src/data/roster';

describe('select screen fighters', () => {
  it('offers the roster in its order, each fighter in both its colorways', () => {
    const fighters = selectFighters();
    expect(fighters.map(({ id }) => id)).toEqual(ROSTER.map(({ id }) => id));
    for (const { look, mirrorLook } of fighters) {
      expect(look).toBeDefined();
      expect(mirrorLook).toBeDefined();
      expect(mirrorLook?.strip).not.toBe(look?.strip);
    }
  });

  it('keeps full rows, with room for the whole roster', () => {
    expect(SELECT_SLOTS).toBe(10);
    expect(SELECT_SLOTS % SELECT_COLUMNS).toBe(0);
    expect(ROSTER.length).toBeLessThanOrEqual(SELECT_SLOTS);
  });

  it("plays Nayo's idle as the game does: ten frames of 88×162, 6 ticks each", () => {
    expect(lookOf(artOf('nayo'))).toMatchObject({
      frames: 10,
      width: 88,
      height: 162,
      portrait: { x: 30, y: 0, size: 56 },
      idle: Array.from({ length: 10 }, (_, frame) => ({ frame, seconds: 0.1 })),
    });
  });

  it("plays Riff's idle at its own uneven pace", () => {
    const look = lookOf(artOf('riff'));
    expect(look?.idle.map(({ frame }) => frame)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(look?.idle.map(({ seconds }) => Math.round(seconds * 60))).toEqual([
      7, 4, 5, 5, 7, 3, 9, 8,
    ]);
  });

  it('crops the top of the first frame without a bust, and shows no one without art', () => {
    const riff = artOf('riff');
    if (!riff) throw new Error('Riff has no art');
    const { portrait: bust, ...plain } = riff;
    expect(bust).toBeDefined();
    expect(lookOf(plain)?.portrait).toEqual({ x: 0, y: 0, size: 94 });
    expect(lookOf(undefined)).toBeUndefined();
  });
});
