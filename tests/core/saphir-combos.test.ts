import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import { NAYO } from '../../src/data/fighters/nayo';
import { SAPHIR } from '../../src/data/fighters/saphir';
import { TRAINING_STAGE } from '../../src/data/stages';
import { floored, landsFloored, playCombo, unbroken } from './combo-helpers';
import { facingOff } from './helpers';

/**
 * Saphir's measured routes of docs/saphir.md §5, on Nayo (1000 health), as a player keeps them
 * going: her strings, the Syncope that strikes and steps out (the combo ends standing, far), the
 * Rubato that floors, the juggle her Chandelle opens, then the routes that spend the gauge. Fewer
 * blows than Riff's, less damage than Nayo's, from farther: her identity.
 */

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Dash, Boost: X } = Input;

const SAPHIR_VS_NAYO: MatchConfig = { stage: TRAINING_STAGE, fighters: [SAPHIR, NAYO] };

interface Route {
  readonly notation: string;
  readonly distance: number;
  readonly steps: readonly InputBits[];
  readonly damages: readonly number[];
  /** Whether it ends with the opponent on the ground, or standing (the Syncope steps out). */
  readonly floors: boolean;
}

const ROUTES: readonly Route[] = [
  { notation: 'L, L, L', distance: 40, steps: [L, L, L], damages: [28, 31, 40], floors: true },
  {
    notation: 'L, H → S (Syncope)',
    distance: 40,
    steps: [L, H, S],
    damages: [28, 67, 56],
    floors: false,
  },
  {
    notation: '↓L, ↓L, H → S',
    distance: 36,
    steps: [D | L, D | L, H, S],
    damages: [24, 21, 60, 49],
    floors: false,
  },
  {
    notation: 'L, L, →H (Plongé) → S',
    distance: 40,
    steps: [L, L, F | H, S],
    damages: [28, 31, 44, 49],
    floors: false,
  },
  { notation: '←H → ↓S', distance: 30, steps: [B | H, D | S], damages: [60, 81], floors: true },
  {
    notation: 'L, L, ←H (glissée) ⇢ L, L, L',
    distance: 36,
    steps: [L, L, B | H, L, L, L],
    damages: [28, 31, 44, 19, 21, 25],
    floors: true,
  },
  {
    notation: 'H (Chassé) → S, at the tip of the Chassé',
    distance: 70,
    steps: [H, S],
    damages: [75, 63],
    floors: false,
  },
  {
    notation: 'L, L, H, H (Chassé arrière) → S',
    distance: 40,
    steps: [L, L, H, H, S],
    damages: [28, 31, 60, 38, 42],
    floors: false,
  },
  {
    notation: 'L, L, H, H → →S (Rubato)',
    distance: 40,
    steps: [L, L, H, H, F | S],
    damages: [28, 31, 60, 38, 48],
    floors: true,
  },
];

const total = (damages: readonly number[]): number => damages.reduce((a, b) => a + b, 0);

describe("Saphir's routes without gauge (docs/saphir.md §5)", () => {
  for (const { notation, distance, steps, damages, floors } of ROUTES) {
    it(`${notation}: ${total(damages)} from ${distance} px, ${floors ? 'floored' : 'standing'}`, () => {
      const result = playCombo(facingOff(distance, SAPHIR_VS_NAYO), SAPHIR_VS_NAYO, steps);
      expect(result.hits.map((hit) => hit.damage)).toEqual(damages);
      expect(unbroken(result)).toBe(true);
      expect(floored(result)).toBe(floors);
    });
  }
});

/**
 * Saphir's measured routes of docs/saphir.md §5 that spend the gauge: the Reprise that starts
 * her phrase over, and the Coda at the end of a string.
 */
const BOOST_ROUTES: readonly (Route & { readonly boost: number })[] = [
  {
    notation: 'L, L, H → DASH (Reprise) → L, L, H, H → S',
    distance: 40,
    steps: [L, L, H, Dash, L, L, H, H, S],
    damages: [28, 31, 60, 19, 21, 37, 27, 35],
    floors: false,
    boost: 1000,
  },
  {
    notation: 'L, L, H, H → ←BOOST (Coda)',
    distance: 40,
    steps: [L, L, H, H, B | X],
    damages: [28, 31, 60, 38, 42, 40, 65],
    floors: true,
    boost: 3000,
  },
];

describe("Saphir's routes with the gauge (docs/saphir.md §5)", () => {
  for (const { notation, distance, steps, damages, floors, boost } of BOOST_ROUTES) {
    it(`${notation}: ${total(damages)} from ${distance} px, ${boost / 1000} bar(s)`, () => {
      const start = facingOff(distance, SAPHIR_VS_NAYO, [{ boost }, {}]);
      const result = playCombo(start, SAPHIR_VS_NAYO, steps);
      expect(result.hits.map((hit) => hit.damage)).toEqual(damages);
      expect(unbroken(result)).toBe(true);
      expect(landsFloored(result, SAPHIR_VS_NAYO)).toBe(floors);
    });
  }
});

describe('her signature tools (docs/saphir.md §4)', () => {
  it('the Syncope steps 28 px in, then all the way back out', () => {
    // Thrown at nothing, far from the walls: where she goes, and where she ends.
    const start = facingOff(200, SAPHIR_VS_NAYO);
    const result = playCombo(start, SAPHIR_VS_NAYO, [S]);
    const from = start.fighters[0].x;
    const farthest = Math.max(...result.states.map((state) => state.fighters[0].x));
    expect(farthest - from).toBe(px(28));
    expect(result.end.fighters[0].x).toBe(from);
  });

  it('the Coda lands its three blows up to 86 px, and never steps back', () => {
    const landed = (distance: number): number => {
      const start = facingOff(distance, SAPHIR_VS_NAYO, [{ boost: 3000 }, {}]);
      return playCombo(start, SAPHIR_VS_NAYO, [B | X]).hits.length;
    };
    expect(landed(30)).toBe(3);
    expect(landed(86)).toBe(3);
    expect(landed(88)).toBeLessThan(3);
    expect((SAPHIR.moves.super?.motion?.dx ?? []).every((step) => step >= 0)).toBe(true);
  });
});
