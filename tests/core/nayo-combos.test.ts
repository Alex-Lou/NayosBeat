import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { floored, playCombo, unbroken } from './combo-helpers';
import { step } from '../../src/core/step';
import { facingOff } from './helpers';

/**
 * Nayo's routes of docs/combos-v3.md §3.1 that need no gauge, each from its distance, played on
 * the real engine as a player keeps them going (`playCombo`), to the damage of every blow on Riff
 * (900 health): the strings, the phrase, the juggle with points, the Rebond and the folding
 * CONTRE of the Crochet, as the prototype measured them. A link waits for Nayo to recover: the
 * next step is pressed again until it comes out.
 */

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Up: U } = Input;

const NAYO_VS_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };

interface Route {
  readonly id: string;
  readonly notation: string;
  /** Pixels between the two at the start. */
  readonly distance: number;
  readonly steps: readonly InputBits[];
  /** Every blow's damage, in order. */
  readonly damages: readonly number[];
  /** What Riff does on each tick: nothing, crouching, or starting a blow to be caught in. */
  readonly riff?: (tick: number) => InputBits;
}

const crouching = (): InputBits => D;
/** Riff starts her elbow on `tick`: Nayo's first blow lands in it, a CONTRE. */
const elbowAt =
  (tick: number) =>
  (t: number): InputBits =>
    t === tick ? H : 0;

const ROUTES: readonly Route[] = [
  // Débutant.
  { id: 'D1', notation: 'L, L, L', distance: 40, steps: [L, L, L], damages: [30, 36, 40] },
  { id: 'D2', notation: 'L, L → →S', distance: 40, steps: [L, L, F | S], damages: [30, 36, 60] },
  { id: 'D3', notation: '→L, L, L', distance: 60, steps: [F | L, L, L], damages: [35, 36, 40] },
  {
    id: 'D4',
    notation: 'L, ←L, ←L, ←L',
    distance: 40,
    steps: [L, B | L, B | L, B | L],
    damages: [30, 18, 32, 35],
  },
  {
    id: 'D5',
    notation: '↓L, ↓L, ↓H on a crouching Riff',
    distance: 34,
    steps: [D | L, D | L, D | H],
    damages: [25, 22, 56],
    riff: crouching,
  },
  // Intermédiaire.
  {
    id: 'I1',
    notation: 'L, L, H → →S',
    distance: 40,
    steps: [L, L, H, F | S],
    damages: [30, 36, 64, 52],
  },
  {
    id: 'I2',
    notation: 'L, L, →H (Marteau) → →S',
    distance: 40,
    steps: [L, L, F | H, F | S],
    damages: [30, 36, 48, 52],
  },
  {
    id: 'I3',
    notation: 'L, L, ↓H (Balayage) on a crouching Riff',
    distance: 40,
    steps: [L, L, D | H],
    damages: [30, 36, 56],
    riff: crouching,
  },
  { id: 'I4', notation: 'H, H → →S', distance: 50, steps: [H, H, F | S], damages: [80, 54, 60] },
  { id: 'I5', notation: '←H → ↓S', distance: 30, steps: [B | H, D | S], damages: [65, 99] },
  {
    id: 'I6',
    notation: '←H ⇢ L, L, L',
    distance: 30,
    steps: [B | H, L, L, L],
    damages: [65, 27, 32, 35],
  },
  {
    id: 'I7',
    notation: '↓L, ↓L, H → →S',
    distance: 34,
    steps: [D | L, D | L, H, F | S],
    damages: [25, 22, 64, 52],
  },
  {
    id: 'I8',
    notation: 'L, L, H, H → →S',
    distance: 40,
    steps: [L, L, H, H, F | S],
    damages: [30, 36, 64, 42, 45],
  },
  // Avancé.
  {
    id: 'A1',
    notation: 'L, L, ←H (chassé) ⇢ L, L, L',
    distance: 40,
    steps: [L, L, B | H, L, L, L],
    damages: [30, 36, 48, 21, 24, 25],
  },
  {
    id: 'A2',
    notation: 'L, L, ←H ⇢ L, L, →H (Rebond) ⇢ L, L, L, les Quatre temps',
    distance: 40,
    steps: [L, L, B | H, L, L, F | H, L, L, L],
    damages: [30, 36, 48, 21, 24, 30, 15, 20, 25],
  },
  {
    id: 'A3',
    notation: 'les Quatre temps, fin ⇢ L, L → ↓S',
    distance: 40,
    steps: [L, L, B | H, L, L, F | H, L, L, D | S],
    damages: [30, 36, 48, 21, 24, 30, 15, 20, 55],
  },
  {
    id: 'A4',
    notation: 'H, ←H ⇢ L, L, L',
    distance: 30,
    steps: [H, B | H, L, L, L],
    damages: [80, 54, 24, 28, 30],
  },
  {
    id: 'A5',
    notation: 'H as a CONTRE (he folds) ⇢ L, L, H, H → →S',
    distance: 40,
    steps: [H, L, L, H, H, F | S],
    damages: [96, 27, 32, 56, 36, 37],
    riff: elbowAt(4),
  },
  {
    id: 'A6',
    notation: '←H as a CONTRE ⇢ L, L, →H ⇢ L, L, L',
    distance: 30,
    steps: [B | H, L, L, F | H, L, L, L],
    damages: [78, 27, 32, 42, 18, 20, 25],
    riff: elbowAt(3),
  },
  // Expert.
  {
    id: 'E1',
    notation: 'L, ←L, L, ←H ⇢ L, L, →H ⇢ L, L, L, les Dix temps',
    distance: 40,
    steps: [L, B | L, L, B | H, L, L, F | H, L, L, L],
    damages: [30, 18, 32, 42, 18, 20, 30, 15, 20, 25],
  },
  {
    id: 'E2',
    notation: '↓L, →L, L, ←H ⇢ →L, L, →H ⇢ L, ←H → ↓S',
    distance: 34,
    steps: [D | L, F | L, L, B | H, F | L, L, F | H, L, B | H, D | S],
    damages: [25, 31, 32, 42, 21, 20, 30, 15, 32, 55],
  },
  {
    id: 'E9',
    notation: '→H (Overhand) as a CONTRE ⇢ L, L, H, H → →S',
    distance: 30,
    steps: [F | H, L, L, H, H, F | S],
    damages: [84, 27, 32, 56, 36, 37],
    riff: elbowAt(14),
  },
];

/** How long Nayo lets Riff's jump come at him before the anti-air (combos-v3 §3.1, A10). */
const WAIT = 24;

const total = (damages: readonly number[]): number => damages.reduce((a, b) => a + b, 0);

describe("Nayo's routes without gauge (combos-v3 §3.1)", () => {
  for (const route of ROUTES) {
    const { id, notation, distance, steps, damages, riff } = route;
    it(`${id}, ${notation}: ${total(damages)} from ${distance} px, knocked down`, () => {
      const result = playCombo(facingOff(distance, NAYO_VS_RIFF), NAYO_VS_RIFF, steps, riff);
      expect(result.hits.map((hit) => hit.damage)).toEqual(damages);
      expect(unbroken(result)).toBe(true);
      expect(floored(result)).toBe(true);
    });
  }

  it('A5 and E9 open on a CONTRE, the others on a plain blow', () => {
    const opening = (route: Route | undefined): string | null => {
      if (!route) throw new Error('No such route');
      const start = facingOff(route.distance, NAYO_VS_RIFF);
      const result = playCombo(start, NAYO_VS_RIFF, route.steps, route.riff);
      return result.hits[0]?.counter ?? null;
    };
    expect(opening(ROUTES.find(({ id }) => id === 'A5'))).toBe('counter');
    expect(opening(ROUTES.find(({ id }) => id === 'E9'))).toBe('counter');
    expect(opening(ROUTES.find(({ id }) => id === 'I8'))).toBeNull();
  });

  it('A10, an anti-air: Riff jumps in from 100 px, a late ←H ⇢ L, L → ↓S: 201', () => {
    const jump = (tick: number): InputBits => (tick < 5 ? U | B : 0);
    // Nayo waits for her to come down: the Remontant catches her low.
    let start = facingOff(100, NAYO_VS_RIFF);
    for (let tick = 0; tick < WAIT; tick++) start = step(start, [0, jump(tick)], NAYO_VS_RIFF);
    const steps = [B | H, L, L, D | S];
    const result = playCombo(start, NAYO_VS_RIFF, steps, (tick) => jump(tick + WAIT));
    expect(result.hits.map((hit) => hit.damage)).toEqual([65, 27, 32, 77]);
    expect(unbroken(result)).toBe(true);
  });
});
