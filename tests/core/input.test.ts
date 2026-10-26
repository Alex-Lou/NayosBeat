import { describe, expect, it } from 'vitest';
import { cleanSocd, Input } from '../../src/core/input';

describe('cleanSocd', () => {
  it('turns left + right into neutral', () => {
    expect(cleanSocd(Input.Left | Input.Right)).toBe(0);
  });

  it('keeps up when up + down are held', () => {
    expect(cleanSocd(Input.Up | Input.Down)).toBe(Input.Up);
  });

  it('keeps other inputs untouched', () => {
    expect(cleanSocd(Input.Left | Input.Right | Input.Jump)).toBe(Input.Jump);
    expect(cleanSocd(Input.Down | Input.Right)).toBe(Input.Down | Input.Right);
  });
});
