import { describe, expect, it } from 'vitest';
import { besideX } from '../../src/render/caption-stack';

const box = (x: number, width = 60) => ({ x, width });

describe('besideX', () => {
  it('puts the later name beside the earlier one when they meet, on its own side', () => {
    expect(besideX(box(130), box(100), 480)).toBe(100 + 60 + 6);
    expect(besideX(box(90), box(100), 480)).toBe(100 - 66);
  });

  it('goes the other way when the end of the line leaves no room', () => {
    expect(besideX(box(470, 40), box(450, 40), 480)).toBe(450 - 46);
    expect(besideX(box(10, 40), box(30, 40), 480)).toBe(30 + 46);
  });

  it('leaves names that do not meet where they are', () => {
    expect(besideX(box(100), box(170), 480)).toBeNull();
  });
});
