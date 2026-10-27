import { describe, expect, it } from 'vitest';
import { overlapMiddleX, overlapMiddleY, overlaps, toWorld } from '../../src/core/boxes';
import { box } from '../../src/data/fighters/shared';
import { px } from '../../src/core/constants';

const JAB = box(10, 46, 30, 12);
const BODY = box(-16, 0, 32, 84);

describe('overlaps', () => {
  it('places each box at its owner, mirrored when facing left', () => {
    // Jab out to 40 px in front; the body starts 16 px before its owner.
    expect(overlaps(JAB, px(100), 0, 1, BODY, px(155), 0, -1)).toBe(true);
    expect(overlaps(JAB, px(100), 0, 1, BODY, px(156), 0, -1)).toBe(false);
    expect(overlaps(JAB, px(155), 0, -1, BODY, px(100), 0, 1)).toBe(true);
    expect(overlaps(JAB, px(100), 0, -1, BODY, px(155), 0, -1)).toBe(false);
  });

  it('is symmetric, and boxes that only touch do not overlap', () => {
    expect(overlaps(BODY, px(155), 0, -1, JAB, px(100), 0, 1)).toBe(true);
    const low = box(0, 0, 10, 10);
    expect(overlaps(low, 0, 0, 1, low, 0, px(10), 1)).toBe(false);
    expect(overlaps(low, 0, 0, 1, low, 0, px(9), 1)).toBe(true);
  });

  it('finds the middle of the overlap, as the drawn boxes show it', () => {
    const jab = toWorld(JAB, px(100), 0, 1);
    const body = toWorld(BODY, px(150), 0, -1);
    const left = Math.max(jab.left, body.left);
    const right = Math.min(jab.left + jab.width, body.left + body.width);
    expect(overlapMiddleX(JAB, px(100), 1, BODY, px(150), -1)).toBe((left + right) / 2);
    expect(overlapMiddleY(JAB, 0, BODY, 0)).toBe(px(52));
    // In the air: both bottoms move with their owner's feet.
    expect(overlapMiddleY(JAB, px(30), BODY, 0)).toBe(px(80));
  });
});
