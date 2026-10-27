import type Phaser from 'phaser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sfx } from '../../src/audio/sfx';
import { px } from '../../src/core/constants';
import { FightFeedback } from '../../src/render/fight-feedback';
import type { FightEvent } from '../../src/render/fight-events';
import { hitStyleOf } from '../../src/render/hit-styles';

/**
 * The effects stand in for the engine's game objects: each one records what it was asked to
 * show, so the test reads which effects a blow plays.
 */
const shown = vi.hoisted(() => ({
  burst: vi.fn(),
  graze: vi.fn(),
  kick: vi.fn(),
  bleed: vi.fn(),
}));

vi.mock('../../src/render/hit-fx', () => ({
  HitFx: class {
    play = shown.burst;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/graze', () => ({
  Graze: class {
    play = shown.graze;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/dust', () => ({
  Dust: class {
    kick = shown.kick;
    puff = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/blood', () => ({
  BLEEDS: { heavyHit: {}, ko: {} },
  Blood: class {
    bleed = shown.bleed;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/effects', () => ({
  Effects: class {
    shake = vi.fn();
    flash = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/onomatopoeia', () => ({
  Onomatopoeia: class {
    blow = vi.fn();
    beginTick = vi.fn();
    reset = vi.fn();
    update = vi.fn();
  },
}));

const NAYO_STYLE = hitStyleOf('nayo');
const SILENT = { play: vi.fn() } as unknown as Sfx;

function feedback(): FightFeedback {
  return new FightFeedback({} as Phaser.Scene, 400, SILENT, [NAYO_STYLE, NAYO_STYLE]);
}

/** A blow landing at `y` px above the ground, low (at the feet) or not. */
function blow(type: 'hit' | 'ko', low: boolean, heavy = false): FightEvent {
  const impact = { x: px(200), y: px(low ? 9 : 50), away: 1, by: 0, low, grab: false } as const;
  return type === 'hit' ? { type, damage: 25, heavy, ...impact } : { type, ...impact };
}

describe('the spark of a blow (docs/combat-v2.md §9.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skims the floor on a low hit: grazing spark and dust, no burst, no blood', () => {
    feedback().react(blow('hit', true), 0);
    expect(shown.graze).toHaveBeenCalledWith(NAYO_STYLE, 'light', px(200), px(9), 1);
    expect(shown.kick).toHaveBeenCalledWith(px(200), 1);
    expect(shown.burst).not.toHaveBeenCalled();
    expect(shown.bleed).not.toHaveBeenCalled();
  });

  it('throws the heavy grazing spark on a sweep, still without the burst', () => {
    feedback().react(blow('hit', true, true), 0);
    expect(shown.graze).toHaveBeenCalledWith(NAYO_STYLE, 'heavy', px(200), px(9), 1);
    expect(shown.burst).not.toHaveBeenCalled();
    expect(shown.bleed).not.toHaveBeenCalled();
  });

  it('bursts on a hit higher up, without the grazing spark', () => {
    feedback().react(blow('hit', false, true), 0);
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'heavy', px(200), px(50), 1);
    expect(shown.graze).not.toHaveBeenCalled();
    expect(shown.kick).not.toHaveBeenCalled();
    expect(shown.bleed).toHaveBeenCalledOnce();
  });

  it('keeps the burst of a low KO, the final blow, with the grazing spark and no blood', () => {
    feedback().react(blow('ko', true), 0);
    expect(shown.burst).toHaveBeenCalledWith(NAYO_STYLE, 'ko', px(200), px(9), 1);
    expect(shown.graze).toHaveBeenCalledWith(NAYO_STYLE, 'heavy', px(200), px(9), 1);
    expect(shown.bleed).not.toHaveBeenCalled();
  });
});
