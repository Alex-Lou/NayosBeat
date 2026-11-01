import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { SAPHIR } from '../../src/data/fighters/saphir';
import { TRAINING_STAGE } from '../../src/data/stages';
import { damageOf, floored, playCombo, unbroken, type ComboRun } from './combo-helpers';
import { facingOff, run } from './helpers';

/**
 * The reference combos of docs/combat-v2.md §7.8, played on the real engine as a player keeps
 * them going (`playCombo`), to the damage point: the single formula of §7.7 (scaling, CONTRE),
 * the cancels of §7.1, the chain of §7.2, the links of §7.3 and the juggle of §7.6.
 */

const { Light, Heavy, Special, Grab, Dash, Down, Left, Right, Up } = Input;

const NAYO_VS_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const RIFF_VS_NAYO: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };

/** Player 1 plays `steps` from `distancePx` away; the opponent plays `opponent`. */
function combo(
  config: MatchConfig,
  distancePx: number,
  steps: readonly InputBits[],
  opponent?: (tick: number) => InputBits,
): ComboRun {
  return playCombo(facingOff(distancePx, config), config, steps, opponent);
}

function expectCombo(result: ComboRun, damages: readonly number[], knockdown = true): void {
  expect(result.hits.map((hit) => hit.damage)).toEqual(damages);
  expect(damageOf(result.hits)).toBe(damages.reduce((a, b) => a + b, 0));
  expect(unbroken(result)).toBe(true);
  expect(floored(result)).toBe(knockdown);
}

describe('Nayo, reference combos (§7.8)', () => {
  it('L, L, L: Direct, Cross, Mise au tapis: 106, knocked down', () => {
    expectCombo(combo(NAYO_VS_RIFF, 40, [Light, Light, Light]), [30, 36, 40]);
  });

  it('L, L → Pied fendu: 126, knocked down', () => {
    expectCombo(combo(NAYO_VS_RIFF, 40, [Light, Light, Right | Special]), [30, 36, 60]);
  });

  it('↓L, ↓L, H → Pied fendu: 163, knocked down', () => {
    const steps = [Down | Light, Down | Light, Heavy, Right | Special];
    expectCombo(combo(NAYO_VS_RIFF, 34, steps), [25, 22, 64, 52]);
  });

  it('←H launches → Uppercut in the juggle: 164, knocked down', () => {
    expectCombo(combo(NAYO_VS_RIFF, 30, [Left | Heavy, Down | Special]), [65, 99]);
  });

  it('Overhand as a CONTRE ⇢ Direct → Cross → Pied fendu: 195, knocked down', () => {
    // Riff starts her elbow: the Overhand lands in its startup, a CONTRE.
    const riff = (tick: number): InputBits => (tick === 14 ? Heavy : 0);
    const result = combo(NAYO_VS_RIFF, 30, [Right | Heavy, Light, Light, Right | Special], riff);
    expect(result.hits[0]?.counter).toBe('counter');
    expectCombo(result, [84, 27, 32, 52]);
  });

  it('Prise, 2 knees, Renvoi: 130', () => {
    const result = combo(NAYO_VS_RIFF, 30, [Grab, Light, Light, Heavy]);
    expect(result.hits.map((hit) => hit.kind)).toEqual(['grab', 'pummel', 'pummel', 'throw']);
    expect(damageOf(result.hits)).toBe(130);
  });
});

describe('Riff, reference combos (§7.8)', () => {
  it('L, L, L: Jab, Revers, Swipe: 88, knocked down', () => {
    expectCombo(combo(RIFF_VS_NAYO, 36, [Light, Light, Light]), [25, 27, 36]);
  });

  it('↓L, ↓L, H → Glissade: 143, knocked down', () => {
    const steps = [Down | Light, Down | Light, Heavy, Special];
    expectCombo(combo(RIFF_VS_NAYO, 32, steps), [20, 18, 56, 49]);
  });

  it('Dash cancelled on frame 8 → Jab → Coude → Genou montant: 164, knocked down', () => {
    const result = combo(RIFF_VS_NAYO, 90, [Dash, Light, Heavy, Down | Special]);
    // The jab comes out on the dash's frame 8, the first it can be cancelled on.
    const jab = result.states.findIndex((state) => state.fighters[0].move === 'standLight');
    expect(result.states[jab - 1]?.fighters[0]).toMatchObject({
      move: 'dashForward',
      actionFrame: 7,
    });
    expectCombo(result, [25, 63, 76]);
  });

  it('←H launches → Genou montant in the juggle: 140, knocked down', () => {
    expectCombo(combo(RIFF_VS_NAYO, 30, [Left | Heavy, Down | Special]), [55, 85]);
  });

  it('Talon as a CONTRE ⇢ Jab → Revers → Swipe: 149, knocked down', () => {
    // Nayo starts his hook: the Talon lands in its startup, a CONTRE.
    const nayo = (tick: number): InputBits => (tick === 10 ? Heavy : 0);
    const result = combo(RIFF_VS_NAYO, 30, [Right | Heavy, Light, Light, Light], nayo);
    expect(result.hits[0]?.counter).toBe('counter');
    expectCombo(result, [72, 22, 24, 31]);
  });

  it('Ciseau aérien as a cross-up → ↓L → ↓L → Glissade: 108, knocked down', () => {
    // A forward jump over a crouching Nayo (the take-off reads the direction held), the splits
    // out on the way down: they hit him from behind, late enough to link on the landing.
    const crouching = (): InputBits => Down;
    const jump = run(4, [Up | Right, Down], facingOff(48, RIFF_VS_NAYO), RIFF_VS_NAYO);
    const inAir = run(14, [0, Down], jump, RIFF_VS_NAYO);
    const steps = [Light, Down | Light, Down | Light, Special];
    const result = playCombo(inAir, RIFF_VS_NAYO, steps, crouching);
    const first = result.hits[0];
    expect(first?.move).toBe('jumpLight');
    const hitState = result.states.find((state) => first && state.contacts.includes(first));
    expect(hitState?.fighters[0].x).toBeGreaterThan(hitState?.fighters[1].x ?? Infinity);
    expectCombo(result, [25, 18, 16, 49]);
  });

  it('Prise, 3 headbutts, Ciseaux: 115', () => {
    const result = combo(RIFF_VS_NAYO, 30, [Grab, Light, Light, Light, Heavy]);
    expect(damageOf(result.hits)).toBe(115);
  });
});

describe('L, L, L (§7.2)', () => {
  const PAIRS: readonly [string, MatchConfig][] = [
    ['Nayo on Riff', NAYO_VS_RIFF],
    ['Riff on Nayo', RIFF_VS_NAYO],
    ['Nayo on Nayo', { stage: TRAINING_STAGE, fighters: [NAYO, NAYO] }],
    ['Riff on Riff', { stage: TRAINING_STAGE, fighters: [RIFF, RIFF] }],
    ['Saphir on Nayo', { stage: TRAINING_STAGE, fighters: [SAPHIR, NAYO] }],
    ['Saphir on Riff', { stage: TRAINING_STAGE, fighters: [SAPHIR, RIFF] }],
    ['Nayo on Saphir', { stage: TRAINING_STAGE, fighters: [NAYO, SAPHIR] }],
    ['Riff on Saphir', { stage: TRAINING_STAGE, fighters: [RIFF, SAPHIR] }],
    ['Saphir on Saphir', { stage: TRAINING_STAGE, fighters: [SAPHIR, SAPHIR] }],
  ];
  /** From bodies touching, every half pixel. */
  const NEAREST = 26;
  const STEP = 0.5;

  for (const [who, config] of PAIRS) {
    for (const crouching of [false, true]) {
      const defender = (): InputBits => (crouching ? Down : 0);
      it(`holds wherever the first L hits: ${who}, ${crouching ? 'crouching' : 'standing'}`, () => {
        let reached = 0;
        for (let distance = NEAREST; ; distance += STEP) {
          const start = facingOff(distance, config);
          if (playCombo(start, config, [Light], defender).hits.length === 0) break;
          const result = playCombo(start, config, [Light, Light, Light], defender);
          expect(
            result.hits.map((hit) => hit.move),
            `${distance} px`,
          ).toEqual(['standLight', 'chainLight', 'lightFinisher']);
          expect(unbroken(result), `${distance} px`).toBe(true);
          expect(floored(result), `${distance} px`).toBe(true);
          reached = distance;
        }
        // The jab's reach, at least: the sweep covered every distance it hits from.
        expect(reached).toBeGreaterThan(40);
      });
    }
  }
});

// The rule « a light cancelled into a normal never steps in » of §7.1 is gone: the phrase bounds
// the cancels instead (docs/combos-v3.md §1.2, tests/core/strings.test.ts).
describe('the Toprock (§7.1)', () => {
  it("still cancels into a normal that stays in place, and Riff's dash into it", () => {
    const result = combo(RIFF_VS_NAYO, 50, [Right | Light, Down | Light]);
    expect(result.hits.map((hit) => hit.move)).toEqual(['forwardLight', 'crouchLight']);
    const dashed = combo(RIFF_VS_NAYO, 90, [Dash, Right | Light]);
    expect(dashed.hits.map((hit) => hit.move)).toEqual(['forwardLight']);
  });
});
