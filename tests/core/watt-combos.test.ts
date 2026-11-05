import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { WATT } from '../../src/data/fighters/watt';
import { TRAINING_STAGE } from '../../src/data/stages';
import { step } from '../../src/core/step';
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
  {
    notation: 'L, ←L (Secousse), L, L',
    distance: 30,
    steps: [L, B | L, L, L],
    damages: [30, 18, 30, 38],
  },
  { notation: 'L, H → S (Coup de jus)', distance: 30, steps: [L, H, S], damages: [30, 76, 72] },
  {
    notation: 'L, L, H, H → S (Coup de jus, 6 hits)',
    distance: 30,
    steps: [L, L, H, H, S],
    damages: [30, 34, 68, 14, 18, 45],
  },
  {
    notation: 'L, ←L, L, H, H → S (7 hits)',
    distance: 28,
    steps: [L, B | L, L, H, H, S],
    damages: [30, 18, 30, 59, 12, 15, 45],
  },
  {
    notation: '←L (Court-circuit), L, H → S',
    distance: 30,
    steps: [B | L, L, H, S],
    damages: [26, 34, 68, 63],
  },
  {
    notation: 'L, L, ↓L (Prise de terre) → S',
    distance: 30,
    steps: [L, L, D | L, S],
    damages: [30, 34, 32, 63],
  },
  {
    notation: 'H, ↓L (Prise de terre) → →S (Surcharge)',
    distance: 35,
    steps: [H, D | L, F | S],
    damages: [85, 36, 68],
  },
  {
    notation: '↘H (Disjoncteur) ⇢ L, L, L',
    distance: 28,
    steps: [D | F | H, L, L, L],
    damages: [58, 27, 30, 38],
  },
  {
    notation: 'L, →H (Disjoncteur) ⇢ L, L, L',
    distance: 28,
    steps: [L, F | H, L, L, L],
    damages: [30, 52, 24, 26, 33],
  },
  {
    notation: '↓L, →H (Disjoncteur) ⇢ L, L, L',
    distance: 28,
    steps: [D | L, F | H, L, L, L],
    damages: [24, 52, 24, 26, 33],
  },
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
    damages: [30, 34, 44, 63],
  },
  {
    notation: 'L, L, ←H ⇢ L, L, L',
    distance: 28,
    steps: [L, L, B | H, L, L, L],
    damages: [30, 34, 44, 21, 22, 27],
  },
  {
    notation: 'L, L, ←H ⇢ L, L, →H (Rebond) ⇢ L, L, L',
    distance: 28,
    steps: [L, L, B | H, L, L, F | H, L, L, L],
    damages: [30, 34, 44, 21, 22, 28, 15, 19, 27],
  },
  {
    notation: '↓L, L, H → S (Paume basse chain)',
    distance: 30,
    steps: [D | L, L, H, S],
    damages: [24, 34, 68, 63],
  },
  {
    notation: '→H (Coup de pilon) → S (Coup de jus)',
    distance: 35,
    steps: [F | H, S],
    damages: [65, 81],
  },
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
    damages: [30, 34, 68, 14, 18, 35, 40, 70],
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

describe('his own kit (docs/watt-arsenal.md §4)', () => {
  it('S up close is the Branchement, 140 on the catch, the grab contact counted once', () => {
    const result = playCombo(facingOff(30, WATT_VS_NAYO), WATT_VS_NAYO, [S]);
    expect(result.hits.map((hit) => hit.damage)).toEqual([0, 140]);
    // A throw opens its own count: the grab and the throw are one catch, then it floors.
    expect(floored(result)).toBe(true);
    // Past 40 px, S stays the Coup de jus.
    const far = playCombo(facingOff(45, WATT_VS_NAYO), WATT_VS_NAYO, [S]);
    expect(far.hits.map((hit) => hit.damage)).toEqual([90]);
  });

  it('the cable reels the opponent in to 34 px, +4 for him: combos from L, L, H and the Branchement follows', () => {
    const result = playCombo(facingOff(80, WATT_VS_NAYO), WATT_VS_NAYO, [B | S, S]);
    expect(result.hits.map((hit) => hit.damage)).toEqual([40, 0, 140]);
    expect(floored(result)).toBe(true);
    const stringPull = playCombo(facingOff(35, WATT_VS_NAYO), WATT_VS_NAYO, [L, L, H, B | S]);
    expect(stringPull.hits.map((hit) => hit.damage)).toEqual([30, 34, 68, 28]);
    expect(unbroken(stringPull)).toBe(true);
  });

  it('the Pas blindé cancels from frame 10 into a combo', () => {
    const result = playCombo(facingOff(65, WATT_VS_NAYO), WATT_VS_NAYO, [Dash, L, L, H, S]);
    expect(result.hits.map((hit) => hit.damage)).toEqual([30, 34, 68, 63]);
    expect(unbroken(result)).toBe(true);
    expect(floored(result)).toBe(true);
  });

  it('a full tension electrifies the next special, then empties', () => {
    const start = facingOff(50, WATT_VS_NAYO, [{ tension: 100 }, {}]);
    const result = playCombo(start, WATT_VS_NAYO, [S]);
    expect(result.hits.map((hit) => hit.damage)).toEqual([113]);
    expect(result.end.fighters[0].tension).toBe(0);
    // The Surcharge, armored on its whole run, hits harder too.
    const rush = playCombo(facingOff(80, WATT_VS_NAYO, [{ tension: 100 }, {}]), WATT_VS_NAYO, [
      F | S,
    ]);
    expect(rush.hits.map((hit) => hit.damage)).toEqual([106]);
    // The cable, stunned long enough for the whole phrase.
    const cable = playCombo(facingOff(80, WATT_VS_NAYO, [{ tension: 100 }, {}]), WATT_VS_NAYO, [
      B | S,
      L,
      L,
      H,
    ]);
    expect(cable.hits.map((hit) => hit.damage)).toEqual([50, 27, 30, 59]);
    // The charged cable stuns past his recovery and the Paume's startup: a guaranteed phrase.
    expect(unbroken(cable)).toBe(true);
    // The Branchement, 175 once electrified.
    const branch = playCombo(facingOff(30, WATT_VS_NAYO, [{ tension: 100 }, {}]), WATT_VS_NAYO, [
      S,
    ]);
    expect(branch.hits.map((hit) => hit.damage)).toEqual([0, 175]);
  });

  it('a charged Coup de jus is safe once blocked: blockstun 20, not 12', () => {
    const start = facingOff(50, WATT_VS_NAYO, [{ tension: 100 }, {}]);
    const result = playCombo(start, WATT_VS_NAYO, [S], () => Input.Right);
    const blocked = result.states.find((state) => state.fighters[1].action === 'blockstun');
    expect(blocked).toBeDefined();
    expect(blocked?.fighters[1].stunFrames).toBe(20);
  });

  it('the Plafonnier saisi catches a jumper (110) or a juggled body after Arraché / Soulevé', () => {
    let state = facingOff(10, WATT_VS_NAYO);
    for (let tick = 0; tick < 120 && !state.contacts.some((c) => c.move === 'throwCatch'); tick++) {
      const watt = tick < 12 ? D | S : 0;
      const nayo = tick < 2 ? Input.Jump : 0;
      state = step(state, [watt, nayo], WATT_VS_NAYO);
    }
    const caught = state.contacts.find((c) => c.move === 'throwCatch');
    expect(caught?.damage).toBe(110);
    const fromArrache = playCombo(facingOff(26, WATT_VS_NAYO), WATT_VS_NAYO, [B | H, D | S]);
    expect(fromArrache.hits.map((hit) => hit.damage)).toEqual([65, 0, 99]);
    expect(floored(fromArrache)).toBe(true);
    const fromSouleve = playCombo(facingOff(28, WATT_VS_NAYO), WATT_VS_NAYO, [L, L, B | H, D | S]);
    expect(fromSouleve.hits.map((hit) => hit.damage)).toEqual([30, 34, 44, 0, 77]);
    expect(floored(fromSouleve)).toBe(true);
  });

  it('the Plongeon falls on the grounded opponent, 100 on the catch, and Enclume (↓ + H) hits deep in the air', () => {
    let state = facingOff(30, WATT_VS_NAYO);
    const ticks: readonly InputBits[] = [Input.Jump, S, S, S, S, S, 0];
    for (let tick = 0; tick < 160 && !state.contacts.some((c) => c.move === 'throwDive'); tick++) {
      const watt = ticks[tick] ?? 0;
      state = step(state, [watt, 0], WATT_VS_NAYO);
    }
    const caught = state.contacts.find((c) => c.move === 'throwDive');
    expect(caught?.damage).toBe(100);
    let airState = facingOff(24, WATT_VS_NAYO);
    const anvilTicks: readonly InputBits[] = [Input.Jump, 0, D | H, D | H, 0];
    for (
      let tick = 0;
      tick < 60 && !airState.contacts.some((c) => c.move === 'jumpDownHeavy');
      tick++
    ) {
      airState = step(airState, [anvilTicks[tick] ?? 0, 0], WATT_VS_NAYO);
    }
    const anvil = airState.contacts.find((c) => c.move === 'jumpDownHeavy');
    expect(anvil?.damage).toBe(68);
  });

  it('the Pas blindé absorbs one blow through its dash', () => {
    // Nayo jabs as Watt dashes into it: the armor eats it, the dash goes on.
    const result = playCombo(facingOff(60, WATT_VS_NAYO), WATT_VS_NAYO, [Dash, L], (tick) =>
      tick < 20 ? Input.Light : 0,
    );
    expect(result.states.some((state) => state.contacts.some((c) => c.kind === 'armor'))).toBe(
      true,
    );
  });
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
