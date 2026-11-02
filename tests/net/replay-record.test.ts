import { describe, expect, it } from 'vitest';
import { Input, type InputBits } from '../../src/core/input';
import { recordReplay, REPLAY_BUTTONS, writtenInput } from '../../src/net/replay-record';
import { parseInput, replayHash, type Replay } from '../../tools/replays/replay';

const REPLAYS = import.meta.glob<Replay>('../core/replays/*.json', {
  eager: true,
  import: 'default',
});

describe('an online match written as a replay (docs/multijoueur.md §9.3)', () => {
  it('writes every button by the replays’ name, and reads back what it wrote', () => {
    expect(writtenInput(0)).toBe('');
    expect(writtenInput(Input.Down | Input.Light)).toBe('down+light');
    const all = Object.values(REPLAY_BUTTONS).reduce((bits, flag) => bits | flag, 0);
    expect(parseInput(writtenInput(all))).toBe(all);
    // A flag of the wire (the pause) is no button: it is not written.
    expect(writtenInput(Input.Heavy | (1 << 11))).toBe('heavy');
  });

  it('records every golden replay, tick by tick, as the same match', () => {
    for (const [path, replay] of Object.entries(REPLAYS)) {
      if (replay.training) continue;
      const ticks: (readonly [InputBits, InputBits])[] = replay.inputs.flatMap(
        ([count, one, two]) =>
          Array.from({ length: count }, () => [parseInput(one), parseInput(two)] as const),
      );
      const recorded = recordReplay('again', replay.fighters, ticks);
      expect(recorded.inputs.length, path).toBeLessThanOrEqual(replay.inputs.length);
      expect(replayHash({ ...replay, inputs: recorded.inputs }), path).toBe(replay.hash);
    }
  });
});
