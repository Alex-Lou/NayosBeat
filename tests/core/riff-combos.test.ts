import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { floored, playCombo, unbroken } from './combo-helpers';
import { facingOff } from './helpers';

/**
 * Riff's measured routes of docs/combos-v3.md §4 that need no gauge, on Nayo (1000 health), as
 * a player keeps them going: her strings, the juggle her Retourné opens, the Vrille that picks
 * it up again. More blows, less damage than Nayo's: her identity.
 */

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Dash } = Input;

const RIFF_VS_NAYO: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };

interface Route {
  readonly notation: string;
  readonly distance: number;
  readonly steps: readonly InputBits[];
  readonly damages: readonly number[];
  readonly crouching?: true;
}

const ROUTES: readonly Route[] = [
  { notation: 'L, L, L', distance: 40, steps: [L, L, L], damages: [25, 27, 36] },
  {
    notation: '↓L, ↓L, H → S',
    distance: 30,
    steps: [D | L, D | L, H, S],
    damages: [20, 18, 56, 49],
  },
  { notation: '←H → ↓S', distance: 26, steps: [B | H, D | S], damages: [55, 85] },
  {
    notation: 'L, L, H, H (Coup de boule) → S',
    distance: 36,
    steps: [L, L, H, H, S],
    damages: [25, 27, 56, 35, 42],
  },
  {
    notation: 'L, L, H, H → ↓S',
    distance: 36,
    steps: [L, L, H, H, D | S],
    damages: [25, 27, 56, 35, 57],
  },
  {
    notation: 'L, L, →H (Hache) → S',
    distance: 36,
    steps: [L, L, F | H, S],
    damages: [25, 27, 40, 49],
  },
  {
    notation: 'L, L, ↓H on a crouching Nayo',
    distance: 36,
    steps: [L, L, D | H],
    damages: [25, 27, 52],
    crouching: true,
  },
  {
    notation: '←H ⇢ L, L, L',
    distance: 26,
    steps: [B | H, L, L, L],
    damages: [55, 22, 24, 31],
  },
  {
    notation: '←H ⇢ L, L, L (Vrille) ⇢ L, L → ↓S',
    distance: 26,
    steps: [B | H, L, L, L, L, L, D | S],
    damages: [55, 22, 24, 31, 15, 15, 47],
  },
  {
    notation: 'L, L, ←H (sauté) ⇢ L, L, L (Vrille) ⇢ L, L → ↓S',
    distance: 30,
    steps: [L, L, B | H, L, L, L, L, L, D | S],
    damages: [25, 27, 40, 17, 18, 22, 12, 15, 47],
  },
  {
    notation: 'Footwork cancelled ~L → H, H → ↓S',
    distance: 90,
    steps: [Dash, L, H, H, D | S],
    damages: [25, 63, 40, 66],
  },
  {
    notation: '↓L, →L, L, ←H ⇢ H, H → ↓S',
    distance: 30,
    steps: [D | L, F | L, L, B | H, H, H, D | S],
    damages: [20, 27, 24, 35, 42, 25, 47],
  },
];

const total = (damages: readonly number[]): number => damages.reduce((a, b) => a + b, 0);

describe("Riff's routes without gauge (combos-v3 §4)", () => {
  for (const { notation, distance, steps, damages, crouching } of ROUTES) {
    it(`${notation}: ${total(damages)} from ${distance} px, knocked down`, () => {
      const nayo = (): InputBits => (crouching ? D : 0);
      const result = playCombo(facingOff(distance, RIFF_VS_NAYO), RIFF_VS_NAYO, steps, nayo);
      expect(result.hits.map((hit) => hit.damage)).toEqual(damages);
      expect(unbroken(result)).toBe(true);
      expect(floored(result)).toBe(true);
    });
  }

  it('the Vrille spins Nayo up instead of flooring him, once a combo', () => {
    const steps = [B | H, L, L, L, L, L, L];
    const result = playCombo(facingOff(26, RIFF_VS_NAYO), RIFF_VS_NAYO, steps);
    // The second Swipe floors: the combo has had its extender.
    expect(result.hits.map((hit) => hit.move)).toEqual([
      'backHeavy',
      'standLight',
      'chainLight',
      'lightFinisher',
      'standLight',
      'chainLight',
      'lightFinisher',
    ]);
    expect(unbroken(result)).toBe(true);
  });
});
