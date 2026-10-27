import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/core/state';
import {
  FIGHTER_FIELDS,
  GAME_FIELDS,
  playReplay,
  replayConfig,
  replayHash,
  stateHash,
  type Replay,
} from '../../tools/replays/replay';

const REPLAYS = import.meta.glob<Replay>('./replays/*.json', { eager: true, import: 'default' });

describe('golden replays', () => {
  it('cover the scripted sequences', () => {
    expect(Object.keys(REPLAYS).length).toBeGreaterThanOrEqual(10);
  });

  for (const [path, replay] of Object.entries(REPLAYS)) {
    const name = path.replace(/^.*\/(.*)\.json$/, '$1');
    it(`${name}: ${replay.description}`, () => {
      expect(
        replayHash(replay),
        'The game plays differently. If that is intended, run `npm run replays:update`.',
      ).toBe(replay.hash);
    });
  }

  it('hash every field of the state', () => {
    const [first] = Object.values(REPLAYS);
    if (!first) throw new Error('No replay found');
    const state = createInitialState(replayConfig(first));
    expect([...GAME_FIELDS].sort()).toEqual(Object.keys(state).sort());
    expect([...FIGHTER_FIELDS].sort()).toEqual(Object.keys(state.fighters[0]).sort());
  });

  it('change hash when the state changes', () => {
    const [first] = Object.values(REPLAYS);
    if (!first) throw new Error('No replay found');
    const state = createInitialState(replayConfig(first));
    const [a, b] = state.fighters;
    const moved = { ...state, fighters: [{ ...a, x: a.x + 1 }, b] as const };
    expect(stateHash(moved)).not.toBe(stateHash(state));
    expect(stateHash(structuredClone(state))).toBe(stateHash(state));
  });

  it('hash every tick, not only the state the match ends in', () => {
    // The same jump a second apart, then the same crouch: both matches end in the same state.
    const replay = (wait: number): Replay => ({
      description: '',
      fighters: ['nayo', 'riff'],
      inputs: [
        [120 + wait, '', ''],
        [2, 'up', ''],
        [120 - wait, '', ''],
        [60, 'down', ''],
      ],
      hash: '',
    });
    const [early, late] = [replay(0), replay(60)];
    expect(stateHash(playReplay(late))).toBe(stateHash(playReplay(early)));
    expect(replayHash(late)).not.toBe(replayHash(early));
  });
});
