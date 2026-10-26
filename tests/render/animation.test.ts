import { describe, expect, it } from 'vitest';
import type { Clip } from '../../src/art/types';
import { clipFrameAt, clipIdOf } from '../../src/render/animation';
import { makeFighter } from '../core/helpers';

describe('clipIdOf', () => {
  it('shows each state with its own clip', () => {
    expect(clipIdOf(makeFighter({ action: 'idle' }))).toBe('idle');
    expect(clipIdOf(makeFighter({ action: 'walkBack' }))).toBe('walkBack');
    expect(clipIdOf(makeFighter({ action: 'knockdown' }))).toBe('knockdown');
  });

  it('shows an attack with the clip of its move', () => {
    expect(clipIdOf(makeFighter({ action: 'attack', move: 'crouchHeavy' }))).toBe('crouchHeavy');
    expect(clipIdOf(makeFighter({ action: 'airAttack', move: 'jumpLight' }))).toBe('jumpLight');
  });

  it('flips only on jumps toward the side the fighter faces', () => {
    expect(clipIdOf(makeFighter({ action: 'air', facing: 1, vx: 180 }))).toBe('jumpForward');
    expect(clipIdOf(makeFighter({ action: 'air', facing: -1, vx: -180 }))).toBe('jumpForward');
    expect(clipIdOf(makeFighter({ action: 'air', facing: 1, vx: -160 }))).toBe('jump');
    expect(clipIdOf(makeFighter({ action: 'air', facing: 1, vx: 0 }))).toBe('jump');
  });

  it('uses the crouching variants of hit and block reactions', () => {
    expect(clipIdOf(makeFighter({ action: 'hitstun', crouching: true }))).toBe('hitCrouch');
    expect(clipIdOf(makeFighter({ action: 'blockstun', crouching: false }))).toBe('blockStand');
  });
});

describe('clipFrameAt', () => {
  const once: Clip = { sheet: 's', frames: [0, 1, 2], ticks: [2, 3, 4] };

  it('shows each frame for its number of ticks', () => {
    const shown = Array.from({ length: 9 }, (_, tick) => clipFrameAt(once, tick));
    expect(shown).toEqual([0, 0, 1, 1, 1, 2, 2, 2, 2]);
  });

  it('holds the last frame once over', () => {
    expect(clipFrameAt(once, 9)).toBe(2);
    expect(clipFrameAt(once, 500)).toBe(2);
  });

  it('plays again from loopFrom once over', () => {
    // Crouch: two transition frames, then a two-frame loop.
    const crouch: Clip = { sheet: 's', frames: [0, 1, 2, 3], ticks: [2, 2, 3, 3], loopFrom: 2 };
    const shown = Array.from({ length: 16 }, (_, tick) => clipFrameAt(crouch, tick));
    expect(shown).toEqual([0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 3, 3]);
  });

  it('loops a whole clip from its start', () => {
    const idle: Clip = { sheet: 's', frames: [0, 1], ticks: [2, 2], loopFrom: 0 };
    const shown = Array.from({ length: 9 }, (_, tick) => clipFrameAt(idle, tick));
    expect(shown).toEqual([0, 0, 1, 1, 0, 0, 1, 1, 0]);
  });
});
