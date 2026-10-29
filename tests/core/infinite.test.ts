import { describe, expect, it } from 'vitest';
import { nextRandom } from '../../src/ai/rng';
import type { MatchConfig, TrainingGauge } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import { COMBO_LIMIT } from '../../src/core/rules';
import { step } from '../../src/core/step';
import { TRAINING_STAGE } from '../../src/data/stages';
import { describeBeamSearch, PAIRS, placed } from './beam-search';

/**
 * No infinite (docs/combos-v3.md §1.13), measured on the real engine, a slow test: the beam
 * search without gauge (the gauges' searches have their own files: infinite-*.test.ts), and a
 * seeded fuzz of random presses, BOOST among them, that never brings a combo past the limit,
 * with no blocked string that lasts, the gauge refilled or not. The fuzz is shorter than the
 * prototype's (200 000 ticks a seed), so that the file runs in reasonable time.
 */

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Dash, Boost: X } = Input;

describeBeamSearch(0);

/** Presses, and the directions held with them. */
const BUTTONS = [L, H, S, Dash, L, H, 0, X];
const HELD = [0, 0, F, B, D, D | F, D | B];
const FUZZ_TICKS = 50_000;
/** The longest blocked string allowed (§6.2): a guard always gets out. */
const BLOCK_STRING_MAX = 120;

/** What the fuzz saw: the longest combo, the longest blocked string (ticks out of freezes). */
interface Fuzzed {
  readonly longest: number;
  readonly longestBlock: number;
}

/**
 * Seeded random presses for player 1 on a training dummy (1 health at least) that does nothing
 * or guards high and low at random, the two kept close; in the corner, put back against the
 * wall whenever both are free.
 */
function fuzz(config: MatchConfig, seed: number, blocking: boolean, corner: boolean): Fuzzed {
  let next = seed;
  const random = (): number => {
    const [value, after] = nextRandom(next);
    next = after;
    return value;
  };
  const wall = config.stage.width - px(16);
  let state = placed(config, 40, corner);
  let held = 0;
  let longest = 0;
  let blockString = 0;
  let longestBlock = 0;
  for (let tick = 0; tick < FUZZ_TICKS; tick++) {
    if (random() < 0.2) held = HELD[Math.floor(random() * HELD.length)] ?? 0;
    const press = random() < 0.6 ? (BUTTONS[Math.floor(random() * BUTTONS.length)] ?? 0) : 0;
    const [a, b] = state.fighters;
    const free = a.action === 'idle' && b.action === 'idle';
    if (corner && free && b.x !== wall) {
      state = {
        ...state,
        fighters: [
          { ...a, x: wall - px(40) },
          { ...b, x: wall },
        ],
      };
    } else if (Math.abs(a.x - b.x) > px(90) && a.action === 'idle') {
      // Kept close: once both stand apart, the attacker steps back in.
      state = { ...state, fighters: [{ ...a, x: b.x - px(40) * Math.sign(b.x - a.x) }, b] };
    }
    const [attacker, defender] = state.fighters;
    const back = defender.x > attacker.x ? Input.Right : Input.Left;
    const guard = blocking ? back | (random() < 0.5 ? D : 0) : 0;
    state = step(state, [held | press, guard], config);
    const victim = state.fighters[1];
    longest = Math.max(longest, victim.comboCount);
    const frozen = state.hitstop > 0;
    blockString = victim.action === 'blockstun' ? blockString + (frozen ? 0 : 1) : 0;
    longestBlock = Math.max(longestBlock, blockString);
  }
  return { longest, longestBlock };
}

describe('the fuzz (§1.13)', () => {
  for (const [attacker, defender] of PAIRS) {
    for (const [blocking, trainingGauge] of [
      [false, 'normal'],
      [true, 'normal'],
      [false, 'infinite'],
      [true, 'infinite'],
    ] as const satisfies readonly (readonly [boolean, TrainingGauge])[]) {
      const config: MatchConfig = {
        stage: TRAINING_STAGE,
        fighters: [attacker, defender],
        training: true,
        trainingGauge,
      };
      const on = blocking ? 'on a guard' : 'on a dummy';
      it(`${attacker.name} ${on}, gauge ${trainingGauge}: no combo past the limit`, () => {
        for (const seed of [1, 2]) {
          for (const corner of [false, true]) {
            const { longest, longestBlock } = fuzz(config, seed, blocking, corner);
            const where = `seed ${seed}${corner ? ', corner' : ''}`;
            expect(longest, where).toBeLessThanOrEqual(COMBO_LIMIT);
            expect(longestBlock, where).toBeLessThanOrEqual(BLOCK_STRING_MAX);
            if (!blocking) expect(longest, where).toBeGreaterThan(2);
          }
        }
      });
    }
  }
});
