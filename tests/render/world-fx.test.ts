import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { FELINE } from '../../src/art/feline';
import { px } from '../../src/core/constants';
import type { GameState } from '../../src/core/state';
import { WorldFx } from '../../src/render/world-fx';

/** What each sprite showed, tick after tick: its cell and x, or null when hidden. */
const shown = vi.hoisted(() => [] as ({ cell: number; x: number; flip: boolean } | null)[][]);

vi.mock('../../src/render/anchored-sprite', () => ({
  AnchoredSprite: class {
    private readonly index = shown.push([]) - 1;
    setDepth(): this {
      return this;
    }
    hide(): void {
      shown[this.index]?.push(null);
    }
    show(_sheet: string, cell: number, x: number, _y: number, flip: boolean): void {
      shown[this.index]?.push({ cell, x, flip });
    }
  },
}));

interface Tick {
  readonly move: string | null;
  readonly actionFrame: number;
  readonly x: number;
  readonly hitstop?: number;
  readonly facing?: 1 | -1;
}

function play(ticks: readonly Tick[]): void {
  shown.length = 0;
  const fx = new WorldFx({} as Phaser.Scene, 200, [FELINE, undefined], 'full');
  // Made hidden: what follows is one entry a tick.
  for (const sprite of shown) sprite.length = 0;
  for (const { move, actionFrame, x, hitstop = 0, facing = 1 } of ticks) {
    const fighter = { move, actionFrame, x: px(x), y: 0, facing };
    fx.tick({ hitstop, fighters: [fighter, fighter] } as unknown as GameState);
  }
}

/** The Rush as the core plays it: still until tick 9, 14 px a tick to tick 11, then 42 px on. */
const rush = (from: number, facing: 1 | -1 = 1): Tick[] =>
  Array.from({ length: 34 }, (_, frame) => ({
    move: 'specialForward',
    actionFrame: frame,
    x: from + facing * (frame < 9 ? 0 : Math.min(42, 14 * (frame - 8))),
    facing,
  }));

describe('WorldFx (the Rush portals, fixed in the world)', () => {
  it('opens the entry at her hands and the exit ahead, each staying where it opened', () => {
    play(rush(100));
    const [entry = [], exit = []] = shown;
    const entryXs = new Set(entry.flatMap((s) => (s ? [s.x] : [])));
    const exitXs = new Set(exit.flatMap((s) => (s ? [s.x] : [])));
    expect([...entryXs]).toEqual([121]);
    expect([...exitXs]).toEqual([150]);
    // The entry opens on her first tick, the exit on tick 8, before she bursts out on 12.
    expect(entry[0]?.cell).toBe(0);
    expect(exit.findIndex((s) => s !== null)).toBe(8);
    // Each closes on the portal's last cell, then is hidden.
    expect(entry.filter((s) => s !== null).at(-1)?.cell).toBe(9);
    expect(entry.at(-1)).toBeNull();
  });

  it('opens them on the side she faces', () => {
    play(rush(300, -1));
    expect(shown[0]?.find((s) => s !== null)).toMatchObject({ x: 279, flip: true });
    expect(shown[1]?.find((s) => s !== null)).toMatchObject({ x: 250, flip: true });
  });

  it('freezes with the hitstop, as the bodies do', () => {
    const ticks = rush(100).slice(0, 13);
    const frozen = { ...ticks[12], hitstop: 5 } as Tick;
    play([...ticks, frozen, frozen, frozen]);
    const exit = shown[1] ?? [];
    expect(new Set(exit.slice(-4).map((s) => s?.cell)).size).toBe(1);
  });

  it('shows nothing for a move without any', () => {
    play([{ move: 'standLight', actionFrame: 0, x: 100 }]);
    expect(shown.every((sprite) => sprite.every((s) => s === null))).toBe(true);
  });
});
