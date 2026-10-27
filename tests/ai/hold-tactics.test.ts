import { describe, expect, it } from 'vitest';
import { cpuStep, createCpu, type CpuLevel } from '../../src/ai/cpu';
import { holdInput, type HoldProfile } from '../../src/ai/hold-tactics';
import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { HOLD_LIMIT_FRAMES, STRUGGLE_FRAMES } from '../../src/core/rules';
import { step } from '../../src/core/step';
import { grabbed, NAYO_MIRROR, RIFF_MIRROR } from '../core/hold-helpers';
import { facingOff } from '../core/helpers';

const PROFILE: HoldProfile = { reactionFrames: 8, tech: 0, struggle: 0, pummels: 0 };

/**
 * Plays a hold to its end, `player` driven by `holdInput` with `profile`, the other by `other`:
 * the states, one per tick.
 */
function playHold(
  start: GameState,
  player: 0 | 1,
  profile: HoldProfile,
  config: MatchConfig = NAYO_MIRROR,
  other: (tick: number) => InputBits = () => 0,
): GameState[] {
  const states: GameState[] = [];
  let state = start;
  let seed = 7;
  for (let tick = 0; tick < 150 && (tick === 0 || state.hold); tick++) {
    const decision = state.hold
      ? holdInput(player, profile, state, state.hold, config, seed)
      : { input: 0, seed };
    seed = decision.seed;
    const inputs: [InputBits, InputBits] = [0, 0];
    inputs[player] = decision.input;
    inputs[player === 0 ? 1 : 0] = other(tick);
    state = step(state, inputs, config);
    states.push(state);
  }
  return states;
}

const kinds = (states: readonly GameState[]) =>
  states.flatMap((state) => state.contacts.map((contact) => contact.kind));

/** The CPU in a hold (docs/combat-v2.md §13.1, §13.2, §13.4). */
describe('the CPU held', () => {
  it('always breaks free with tech at 1 and a reaction within the clinch', () => {
    for (const reactionFrames of [0, 6, 11, 14]) {
      const states = playHold(grabbed(), 1, { ...PROFILE, reactionFrames, tech: 1 });
      expect(kinds(states), `reaction ${reactionFrames}`).toContain('tech');
    }
  });

  it('never tries on a PUNITION, and struggles at its pace', () => {
    const recovering = { action: 'attack', move: 'standHeavy', actionFrame: 12 } as const;
    const start = grabbed(NAYO_MIRROR, [{}, recovering]);
    const states = playHold(start, 1, { ...PROFILE, tech: 1, struggle: 8 });
    expect(kinds(states)).not.toContain('tech');
    const limits = states.flatMap((state) => (state.hold ? [state.hold.limit] : []));
    // 8 presses a second from t12, 3 ticks each: about 3 off every 7 or 8 ticks (§4.4).
    expect(Math.min(...limits)).toBeLessThanOrEqual(HOLD_LIMIT_FRAMES - 5 * STRUGGLE_FRAMES);
  });
});

describe('the CPU holding', () => {
  it.each([
    { config: NAYO_MIRROR, pummels: Infinity, most: 2 },
    { config: RIFF_MIRROR, pummels: Infinity, most: 3 },
    { config: NAYO_MIRROR, pummels: 1, most: 1 },
    { config: NAYO_MIRROR, pummels: 0, most: 0 },
  ])(
    'pummels $pummels times as it wants ($most fit for $config.fighters.0.name), then throws',
    ({ config, pummels, most }) => {
      const states = playHold(grabbed(config), 0, { ...PROFILE, pummels }, config);
      const done = kinds(states);
      expect(done.filter((kind) => kind === 'pummel')).toHaveLength(most);
      expect(done.at(-1)).toBe('throw');
      expect(states.some((state) => state.fighters[0].move === 'throwForward')).toBe(true);
    },
  );

  it('throws backward with its back to a wall, putting the opponent in the corner', () => {
    const start: GameState = {
      ...facingOff(30, NAYO_MIRROR, [{ x: px(40) }, { x: px(70) }]),
      cameraX: px(240),
    };
    let state = step(start, [Input.Grab, 0], NAYO_MIRROR);
    while (!state.hold) state = step(state, [0, 0], NAYO_MIRROR);
    const states = playHold(state, 0, PROFILE);
    expect(states.some((s) => s.fighters[0].move === 'throwBack')).toBe(true);
  });

  it('pummels a fighter a knee knocks out, even when it wants no pummel', () => {
    const states = playHold(grabbed(NAYO_MIRROR, [{}, { health: 10 }]), 0, PROFILE);
    expect(kinds(states)).toEqual(['pummel']);
    expect(states.at(-1)?.fighters[1].action).toBe('ko');
  });
});

describe('the CPU levels in a hold', () => {
  /** A hard CPU (player 2) grabs player 1, who does nothing: what it does with the hold. */
  function hardHold(level: CpuLevel, seed: number): string[] {
    let state = facingOff(30, NAYO_MIRROR);
    let cpu = createCpu(1, level, seed);
    const done: string[] = [];
    for (let tick = 0; tick < 200; tick++) {
      const decision = cpuStep(cpu, state, NAYO_MIRROR);
      cpu = decision.cpu;
      const input = tick === 0 ? Input.Grab : state.hold ? decision.input : 0;
      state = step(state, [0, input], NAYO_MIRROR);
      done.push(...state.contacts.filter((c) => c.by === 1).map((c) => c.kind));
    }
    return done;
  }

  it('reads its own profile: the hard CPU pummels twice, the easy one throws at once', () => {
    expect(hardHold('hard', 3)).toEqual(['grab', 'pummel', 'pummel', 'throw']);
    expect(hardHold('easy', 3)).toEqual(['grab', 'throw']);
  });

  it('plays the same hold from the same seed', () => {
    expect(hardHold('normal', 11)).toEqual(hardHold('normal', 11));
  });
});
