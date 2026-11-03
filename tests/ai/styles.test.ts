import { describe, expect, it } from 'vitest';
import { cpuStep, createCpu } from '../../src/ai/cpu';
import { styleOf } from '../../src/ai/styles';
import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import { wallsAt } from '../../src/core/positions';
import type { GameState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { SAPHIR } from '../../src/data/fighters/saphir';
import { TRAINING_STAGE } from '../../src/data/stages';
import { fightState } from '../core/helpers';

/**
 * A fighter's game plan by distance (src/ai/styles.ts): Saphir, the CPU, holds her mid-range,
 * pokes from it and steps back out of the contact, unless her back is to a wall.
 */
const NAYO_SAPHIR: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, SAPHIR] };
const POKES = [Input.Heavy, Input.Special, Input.Left | Input.Light, Input.Light];
const SEEDS = Array.from({ length: 60 }, (_, seed) => seed + 1);

/** Saphir standing at `saphir` (sub-pixels), Nayo `distance` px to her left, facing her. */
function apart(distance: number, saphir = px(560)): GameState {
  const state = fightState(NAYO_SAPHIR);
  const [nayo, her] = state.fighters;
  return {
    ...state,
    fighters: [
      { ...nayo, x: saphir - px(distance), facing: 1 },
      { ...her, x: saphir, facing: -1 },
    ],
  };
}

/** Saphir's inputs over `ticks` ticks of standing there (the game held still). */
function inputsOf(state: GameState, seed: number, ticks: number): InputBits[] {
  let cpu = createCpu(1, 'hard', seed);
  const inputs: InputBits[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    const decision = cpuStep(cpu, state, NAYO_SAPHIR);
    cpu = decision.cpu;
    inputs.push(decision.input);
  }
  return inputs;
}

/** Saphir's first input that is not nothing, within a second of standing there. */
function firstInput(state: GameState, seed: number): InputBits {
  return inputsOf(state, seed, 60).find((input) => input !== 0) ?? 0;
}

const share = (inputs: readonly InputBits[], test: (input: InputBits) => boolean) =>
  inputs.filter(test).length / inputs.length;

describe("Saphir's game plan by distance (styles.ts)", () => {
  it('wants 60 to 100 px, as her spec says (docs/combat-v2.md §6.4)', () => {
    expect(styleOf('Saphir')?.range).toEqual({ min: 64, max: 100 });
    expect(styleOf('Nayo')).toBeNull();
  });

  it('pokes from her range: the Chassé, the Syncope, the Pas glissé, the Pointe', () => {
    const seconds = SEEDS.map((seed) => inputsOf(apart(80), seed, 90));
    const poked = seconds.filter((inputs) => inputs.some((input) => POKES.includes(input)));
    expect(poked.length / SEEDS.length).toBeGreaterThan(0.8);
    // Never walking in from there: she waits, or steps back out.
    expect(seconds.flat().some((input) => input === Input.Left)).toBe(false);
  });

  it('steps back out of the contact, back to her range', () => {
    const inputs = SEEDS.map((seed) => firstInput(apart(40), seed));
    const away = (input: InputBits) => (input & Input.Right) !== 0 && (input & Input.Down) === 0;
    expect(share(inputs, away)).toBeGreaterThan(0.4);
  });

  it('fights where she stands with her back to a wall: no stepping out into it', () => {
    // Saphir 20 px from the right edge of the screen, Nayo 40 px in front of her.
    const walls = wallsAt(fightState(NAYO_SAPHIR).cameraX, TRAINING_STAGE);
    const state = apart(40, walls.max - px(20));
    const inputs = SEEDS.map((seed) => firstInput(state, seed));
    const backing = (input: InputBits) => input === Input.Right;
    const open = SEEDS.map((seed) => firstInput(apart(40), seed));
    expect(share(inputs, backing)).toBeLessThan(share(open, backing) / 2);
  });
});
