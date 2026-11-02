import { describe, expect, it, vi } from 'vitest';
import { Input } from '../../src/core/input';
import { createInitialState } from '../../src/core/state';
import { HeldStruggle } from '../../src/input/held-struggle';
import { LocalTickSource } from '../../src/render/tick-source';
import { replayConfig } from '../../tools/replays/replay';

const STATE = createInitialState(
  replayConfig({ description: '', fighters: ['nayo', 'riff'], inputs: [], hash: '' }),
);

describe('the local tick source (docs/multijoueur.md §9.5)', () => {
  it('plays every tick asked, each player what it holds', () => {
    const source = new LocalTickSource(new HeldStruggle(false), () => null);
    expect(source.playable(3)).toBe(3);
    expect(source.next([Input.Light, Input.Heavy], STATE)).toEqual([Input.Light, Input.Heavy]);
  });

  it('gives player 2 to the CPU when it plays, the struggle applied to player 1 first', () => {
    const order: string[] = [];
    const struggle = new HeldStruggle(false);
    const apply = vi.spyOn(struggle, 'apply').mockImplementation((player, bits) => {
      order.push(`struggle ${player}`);
      return bits;
    });
    const cpu = vi.fn(() => {
      order.push('cpu');
      return Input.Down;
    });
    const source = new LocalTickSource(struggle, cpu);
    expect(source.next([Input.Up, Input.Heavy], STATE)).toEqual([Input.Up, Input.Down]);
    expect(order).toEqual(['struggle 0', 'cpu']);
    expect(apply).toHaveBeenCalledTimes(1);
    // A CPU that presses nothing still plays player 2.
    cpu.mockReturnValue(0);
    expect(source.next([0, Input.Heavy], STATE)).toEqual([0, 0]);
  });
});
