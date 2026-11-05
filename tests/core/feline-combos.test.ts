import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import { FELINE } from '../../src/data/fighters/feline';
import { NAYO } from '../../src/data/fighters/nayo';
import { TRAINING_STAGE } from '../../src/data/stages';
import { floored, landsFloored, playCombo, unbroken } from './combo-helpers';
import { facingOff } from './helpers';

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Dash, Boost: X } = Input;

const FELINE_VS_NAYO: MatchConfig = { stage: TRAINING_STAGE, fighters: [FELINE, NAYO] };

interface Route {
  readonly notation: string;
  readonly distance: number;
  readonly steps: readonly InputBits[];
  readonly damages: readonly number[];
  readonly floors: boolean;
}

const ROUTES: readonly Route[] = [
  { notation: 'L, L, L', distance: 40, steps: [L, L, L], damages: [30, 36, 40], floors: true },
  {
    notation: 'L, L, H → S (Lame de portail, keeps opponent standing)',
    distance: 40,
    steps: [L, L, H, S],
    damages: [30, 36, 64, 52],
    floors: false,
  },
  {
    notation: 'L, L, H, H → S (Lame de portail)',
    distance: 40,
    steps: [L, L, H, H, S],
    damages: [30, 36, 64, 42, 45],
    floors: false,
  },
  {
    notation: 'L, L, H, H → →S (Rush dimensionnel)',
    distance: 40,
    steps: [L, L, H, H, F | S],
    damages: [30, 36, 64, 42, 48],
    floors: true,
  },
  {
    notation: 'Dash (Bond astral cancelled f9) → L, L, H → →S',
    distance: 84,
    steps: [Dash, L, L, H, F | S],
    damages: [30, 36, 64, 56],
    floors: true,
  },
  {
    notation: '←H (Uppercut astral) → ↓S (Portail ascendant)',
    distance: 30,
    steps: [B | H, D | S],
    damages: [65, 94],
    floors: true,
  },
  {
    notation: 'L, L, ←H (Elan chasse) ⇢ L, L, L',
    distance: 40,
    steps: [L, L, B | H, L, L, L],
    damages: [30, 36, 48, 21, 24, 25],
    floors: true,
  },
  {
    notation: 'L, L, ←H ⇢ L, L, →H (Enclume astrale rebond) ⇢ L, L, L',
    distance: 40,
    steps: [L, L, B | H, L, L, F | H, L, L, L],
    damages: [30, 36, 48, 21, 24, 30, 15, 20, 25],
    floors: true,
  },
];

const total = (damages: readonly number[]): number => damages.reduce((a, b) => a + b, 0);

describe("Feline's routes without gauge", () => {
  for (const { notation, distance, steps, damages, floors } of ROUTES) {
    it(`${notation}: ${total(damages)} from ${distance} px, ${floors ? 'floored' : 'standing'}`, () => {
      const result = playCombo(facingOff(distance, FELINE_VS_NAYO), FELINE_VS_NAYO, steps);
      expect(result.hits.map((hit) => hit.damage)).toEqual(damages);
      expect(unbroken(result)).toBe(true);
      expect(floored(result)).toBe(floors);
    });
  }
});

const BOOST_ROUTES: readonly (Route & { readonly boost: number })[] = [
  {
    notation: 'L, L, H, H → BOOST (Lame astrale knockdown)',
    distance: 40,
    steps: [L, L, H, H, X],
    damages: [30, 36, 64, 42, 57],
    floors: true,
    boost: 1000,
  },
  {
    notation: 'H, →BOOST (Rush astral launch) ⇢ L → ↓S',
    distance: 40,
    steps: [H, F | X, L, D | S],
    damages: [80, 81, 24, 73],
    floors: true,
    boost: 1000,
  },
  {
    notation: 'L, L, H → DASH (Eclipse) → L, L, H, H → →S',
    distance: 40,
    steps: [L, L, H, Dash, L, L, H, H, F | S],
    damages: [30, 36, 64, 21, 24, 40, 30, 40],
    floors: true,
    boost: 1000,
  },
  {
    notation: 'L, L, H, H → ←BOOST (Dechirure)',
    distance: 40,
    steps: [L, L, H, H, B | X],
    damages: [30, 36, 64, 42, 48, 40, 70],
    floors: true,
    boost: 3000,
  },
];

describe("Feline's routes with the gauge", () => {
  for (const { notation, distance, steps, damages, floors, boost } of BOOST_ROUTES) {
    it(`${notation}: ${total(damages)} from ${distance} px, ${boost / 1000} bar(s)`, () => {
      const start = facingOff(distance, FELINE_VS_NAYO, [{ boost }, {}]);
      const result = playCombo(start, FELINE_VS_NAYO, steps);
      expect(result.hits.map((hit) => hit.damage)).toEqual(damages);
      expect(unbroken(result)).toBe(true);
      expect(landsFloored(result, FELINE_VS_NAYO)).toBe(floors);
    });
  }
});
