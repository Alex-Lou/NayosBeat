import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { WATT } from '../../src/data/fighters/watt';
import { TRAINING_STAGE } from '../../src/data/stages';
import { floored, landsFloored, playCombo, unbroken } from './combo-helpers';
import { facingOff } from './helpers';

/**
 * Watt's measured routes of docs/watt.md §6, on Nayo (1000 health), as a player keeps them going:
 * short phrases that end on the floor near him, the juggle his Soulevé opens, then the routes
 * that spend the gauge. Then his tools: the longest grab of the cast, and Plein feu, a short
 * reversal.
 */

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Dash, Boost: X } = Input;

const WATT_VS_NAYO: MatchConfig = { stage: TRAINING_STAGE, fighters: [WATT, NAYO] };
const WATT_VS_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [WATT, RIFF] };

interface Route {
  readonly notation: string;
  readonly distance: number;
  readonly steps: readonly InputBits[];
  readonly damages: readonly number[];
}

const ROUTES: readonly Route[] = [
  { notation: 'L, L, L', distance: 30, steps: [L, L, L], damages: [30, 34, 44] },
  { notation: 'L, H → S (Coup de jus)', distance: 30, steps: [L, H, S], damages: [30, 76, 72] },
  { notation: 'L, L, H, H', distance: 30, steps: [L, L, H, H], damages: [30, 34, 68, 49] },
  { notation: 'L, L, H → S', distance: 30, steps: [L, L, H, S], damages: [30, 34, 68, 63] },
  {
    notation: 'L, L, H → →S (Surcharge)',
    distance: 30,
    steps: [L, L, H, F | S],
    damages: [30, 34, 68, 59],
  },
  {
    notation: 'L, L, →H (Coup de masse) → S',
    distance: 30,
    steps: [L, L, F | H, S],
    damages: [30, 34, 48, 63],
  },
  {
    notation: 'L, L, ←H (Soulevé) → ↓S (Plafonnier)',
    distance: 28,
    steps: [L, L, B | H, D | S],
    damages: [30, 34, 44, 66],
  },
  {
    notation: 'L, L, ←H ⇢ L, L, L',
    distance: 28,
    steps: [L, L, B | H, L, L, L],
    damages: [30, 34, 44, 21, 22, 27],
  },
  { notation: '←H (Arraché) → ↓S', distance: 24, steps: [B | H, D | S], damages: [65, 85] },
  { notation: 'H → S', distance: 40, steps: [H, S], damages: [85, 81] },
];

const total = (damages: readonly number[]): number => damages.reduce((a, b) => a + b, 0);

describe("Watt's routes without gauge (docs/watt.md §6)", () => {
  for (const { notation, distance, steps, damages } of ROUTES) {
    it(`${notation}: ${total(damages)} from ${distance} px, floored`, () => {
      const result = playCombo(facingOff(distance, WATT_VS_NAYO), WATT_VS_NAYO, steps);
      expect(result.hits.map((hit) => hit.damage)).toEqual(damages);
      expect(unbroken(result)).toBe(true);
      expect(floored(result)).toBe(true);
    });
  }
});

/** The routes that spend the gauge: the Rallumage, the Remixes, Plein feu. */
const BOOST_ROUTES: readonly (Route & { readonly boost: number })[] = [
  {
    notation: 'L, L, H → DASH (Rallumage) → L, L, H → S',
    distance: 30,
    steps: [L, L, H, Dash, L, L, H, S],
    damages: [30, 34, 68, 21, 22, 42, 45],
    boost: 1000,
  },
  {
    notation: 'L, L, H → BOOST (Coup de jus survolté)',
    distance: 30,
    steps: [L, L, H, X],
    damages: [30, 34, 68, 77],
    boost: 1000,
  },
  {
    notation: 'L, L, H → →BOOST (Surcharge survoltée)',
    distance: 30,
    steps: [L, L, H, F | X],
    damages: [30, 34, 68, 70],
    boost: 1000,
  },
  {
    notation: 'L, L, H, H → ←BOOST (Plein feu)',
    distance: 30,
    steps: [L, L, H, H, B | X],
    damages: [30, 34, 68, 49, 42, 40, 70],
    boost: 3000,
  },
];

describe("Watt's routes with the gauge (docs/watt.md §6)", () => {
  for (const { notation, distance, steps, damages, boost } of BOOST_ROUTES) {
    it(`${notation}: ${total(damages)} from ${distance} px, ${boost / 1000} bar(s)`, () => {
      const start = facingOff(distance, WATT_VS_NAYO, [{ boost }, {}]);
      const result = playCombo(start, WATT_VS_NAYO, steps);
      expect(result.hits.map((hit) => hit.damage)).toEqual(damages);
      expect(unbroken(result)).toBe(true);
      expect(landsFloored(result, WATT_VS_NAYO)).toBe(true);
    });
  }
});

describe('his signature tools (docs/watt.md §1, §7)', () => {
  /** Whether Watt's grab, thrown at `distance` px, holds the opponent. */
  const holds = (config: MatchConfig, distance: number): boolean => {
    const result = playCombo(facingOff(distance, config), config, [L | H]);
    return result.states.some((state) => state.fighters[1].action === 'held');
  };

  it('the grab holds up to 53 px on Nayo and 54 on Riff, the longest of the cast', () => {
    expect(holds(WATT_VS_NAYO, 30)).toBe(true);
    expect(holds(WATT_VS_NAYO, 53)).toBe(true);
    expect(holds(WATT_VS_NAYO, 54)).toBe(false);
    expect(holds(WATT_VS_RIFF, 54)).toBe(true);
    expect(holds(WATT_VS_RIFF, 55)).toBe(false);
  });

  it('Plein feu lands its three blows up to 58 px, and never steps', () => {
    const landed = (distance: number): number => {
      const start = facingOff(distance, WATT_VS_NAYO, [{ boost: 3000 }, {}]);
      return playCombo(start, WATT_VS_NAYO, [B | X]).hits.length;
    };
    expect(landed(30)).toBe(3);
    expect(landed(58)).toBe(3);
    expect(landed(60)).toBeLessThan(3);
    expect(WATT.moves.super?.motion).toBeUndefined();
  });
});
