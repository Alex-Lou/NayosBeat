import { describe, expect, it } from 'vitest';
import { stackedY } from '../../src/render/caption-stack';

const box = (x: number, y: number, width = 60) => ({ x, y, width, height: 10 });

describe('stackedY', () => {
  it('puts the later name above the earlier one when they meet', () => {
    expect(stackedY(box(100, 200), box(130, 200))).toBe(200 - 10 - 2);
    expect(stackedY(box(100, 205), box(100, 200))).toBe(188);
  });

  it('leaves names that do not meet where they are', () => {
    expect(stackedY(box(100, 200), box(160, 200))).toBeNull();
    expect(stackedY(box(100, 200), box(100, 180))).toBeNull();
  });
});
