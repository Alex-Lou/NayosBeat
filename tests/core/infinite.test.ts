import { describe, expect, it } from 'vitest';
import { nextRandom } from '../../src/ai/rng';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { DIRECTIONS, Input, type InputBits } from '../../src/core/input';
import { COMBO_LIMIT } from '../../src/core/rules';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { startsMove } from './combo-helpers';
import { searchCombos, type Command } from './combo-search';
import { facingOff } from './helpers';

/**
 * No infinite (docs/combos-v3.md §1.13), measured on the real engine, a slow test: a beam search
 * for the longest combo each fighter can find, in the middle of the stage and in the corner,
 * from the starters of the design, stays within COMBO_LIMIT hits and 45 % of the opponent's
 * health; a seeded fuzz of random presses never brings a combo past the limit, and no blocked
 * string lasts. The search is the prototype's (300 branches a depth): it finds its longest combos
 * again, Nayo's 11 hits and Riff's 12, the limit's. The fuzz is shorter than the prototype's
 * (200 000 ticks a seed), so that the file runs in about 15 s.
 */

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Dash } = Input;

/** Every button with every direction that gives a move, and the dash. */
const COMMANDS: readonly Command[] = [
  ['L', L],
  ['↓L', D | L],
  ['→L', F | L],
  ['←L', B | L],
  ['H', H],
  ['→H', F | H],
  ['↓H', D | H],
  ['←H', B | H],
  ['S', S],
  ['→S', F | S],
  ['↓S', D | S],
  ['DASH', Dash],
];

/** Branches kept at each depth. */
const WIDTH = 300;

/** A starter: what player 1 presses, from how far, and what the opponent does. */
interface Starter {
  readonly name: string;
  readonly distance: number;
  readonly steps: readonly InputBits[];
  /** The opponent starts a blow on this tick: the starter lands in it, a CONTRE. */
  readonly attacksAt?: number;
}

const STARTERS: readonly Starter[] = [
  { name: 'L', distance: 40, steps: [L] },
  { name: '↓L', distance: 34, steps: [D | L] },
  { name: '←H', distance: 30, steps: [B | H] },
  { name: 'L, L, ←H', distance: 40, steps: [L, L, B | H] },
  { name: 'H CONTRE', distance: 45, steps: [H], attacksAt: 4 },
  { name: '→H CONTRE', distance: 30, steps: [F | H], attacksAt: 14 },
];

/** The two `distance` px apart, in the middle or with the opponent's back to the wall. */
function placed(config: MatchConfig, distance: number, corner: boolean): GameState {
  if (!corner) return facingOff(distance, config);
  const wall = config.stage.width - px(16);
  const state = facingOff(distance, config, [{ x: wall - px(distance) }, { x: wall }]);
  return { ...state, cameraX: config.stage.width - px(240) };
}

/** The state once the starter's last blow connected, or null if it dropped. */
function started(config: MatchConfig, starter: Starter, corner: boolean): GameState | null {
  let state = placed(config, starter.distance, corner);
  let tick = 0;
  const opponent = (): InputBits => (tick++ === starter.attacksAt ? H : 0);
  for (const input of starter.steps) {
    let out = false;
    for (let press = 0; press < 60 && !out; press++) {
      const before = state.fighters[0];
      state = step(state, [press % 2 === 0 ? input : input & DIRECTIONS, opponent()], config);
      out = startsMove(before, state.fighters[0]);
    }
    for (let wait = 0; wait < 80; wait++) {
      const attacker = state.fighters[0];
      if ((attacker.moveConnected && state.hitstop === 0) || attacker.action !== 'attack') break;
      state = step(state, [0, opponent()], config);
    }
  }
  const { action, comboCount } = state.fighters[1];
  return (action === 'hitstun' || action === 'airHit') && comboCount > 0 ? state : null;
}

const PAIRS: readonly (readonly [FighterTemplate, FighterTemplate, number])[] = [
  // The attacker, its opponent, the longest combo it finds.
  [NAYO, RIFF, 11],
  [RIFF, NAYO, 12],
];

describe('the beam search (§1.13)', () => {
  for (const [attacker, defender, longestFound] of PAIRS) {
    const config: MatchConfig = { stage: TRAINING_STAGE, fighters: [attacker, defender] };
    it(`${attacker.name}: at most ${COMBO_LIMIT} hits and 45 % of the health, mid and corner`, () => {
      let longest = 0;
      for (const corner of [false, true]) {
        for (const starter of STARTERS) {
          const start = started(config, starter, corner);
          if (!start) throw new Error(`${starter.name} did not start a combo`);
          const found = searchCombos(start, starter.name, COMMANDS, config, WIDTH);
          const where = `${starter.name}${corner ? ' (corner)' : ''}: ${found.longest.path.join(', ')}`;
          expect(found.longest.hits, where).toBeLessThanOrEqual(COMBO_LIMIT);
          // The starter's blows count too.
          const damage = found.heaviest.damage + defender.maxHealth - start.fighters[1].health;
          const heaviest = `${found.heaviest.path.join(', ')}: ${damage}`;
          expect(damage * 100, heaviest).toBeLessThanOrEqual(45 * defender.maxHealth);
          longest = Math.max(longest, found.longest.hits);
        }
      }
      expect(longest).toBe(longestFound);
    }, 60_000);
  }
});

/** Presses, and the directions held with them. */
const BUTTONS = [L, H, S, Dash, L, H, 0];
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
    const config: MatchConfig = {
      stage: TRAINING_STAGE,
      fighters: [attacker, defender],
      training: true,
    };
    for (const blocking of [false, true]) {
      it(`${attacker.name} ${blocking ? 'on a guard' : 'on a dummy'}: no combo past the limit`, () => {
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
