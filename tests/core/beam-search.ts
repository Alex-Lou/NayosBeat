import { describe, expect, it } from 'vitest';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { DIRECTIONS, Input, type InputBits } from '../../src/core/input';
import { BOOST_BAR, COMBO_LIMIT } from '../../src/core/rules';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { startsMove } from './combo-helpers';
import { searchCombos, type Command } from './combo-search';
import { facingOff } from './helpers';

/**
 * The beam search of the anti-infinite proof (docs/combos-v3.md §1.13), one gauge at a time:
 * each gauge's search runs from its own test file, so that the slow searches run side by side.
 * For each fighter, in the middle of the stage and in the corner, from the starters of the
 * design, the longest combo found stays within COMBO_LIMIT hits, and within 45 % of the
 * opponent's health without gauge; with one bar, three, or a gauge refilled on every tick, it
 * never takes half of it (Nayo's Crochet as a CONTRE, his string, the Rewind and a juggle: 48.6 %
 * with one bar). Without gauge, no combo earns a bar. The search is the prototype's (300
 * branches a depth), which plays the Rewind too: without gauge, it finds its longest combos
 * again, Nayo's 11 hits and Riff's 12, the limit's.
 */

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Dash, Boost: X } = Input;

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
  ['BOOST', X],
  ['→BOOST', F | X],
  ['↓BOOST', D | X],
  ['←BOOST', B | X],
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

/**
 * The two `distance` px apart, in the middle or with the opponent's back to the wall, the
 * attacker's gauge at `boost` (a training match may refill it).
 */
export function placed(
  config: MatchConfig,
  distance: number,
  corner: boolean,
  boost = 0,
): GameState {
  const gauge = boost > 0 ? { boost } : {};
  if (!corner) return facingOff(distance, config, [gauge, {}]);
  const wall = config.stage.width - px(16);
  const state = facingOff(distance, config, [{ x: wall - px(distance), ...gauge }, { x: wall }]);
  return { ...state, cameraX: config.stage.width - px(240) };
}

/** The state once the starter's last blow connected, or null if it dropped. */
function started(
  config: MatchConfig,
  starter: Starter,
  corner: boolean,
  boost: number,
): GameState | null {
  let state = placed(config, starter.distance, corner, boost);
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

export const PAIRS: readonly (readonly [FighterTemplate, FighterTemplate, number])[] = [
  // The attacker, its opponent, the longest combo it finds.
  [NAYO, RIFF, 11],
  [RIFF, NAYO, 12],
];

/** The attacker's gauge at the start: a number of points, or refilled on every tick. */
export type SearchGauge = number | 'refilled';

/** The beam search's tests with the attacker's gauge at `gauge`, for both fighters. */
export function describeBeamSearch(gauge: SearchGauge): void {
  describe(`the beam search, gauge ${gauge} (§1.13)`, () => {
    for (const [attacker, defender, longestFound] of PAIRS) {
      const refilled = gauge === 'refilled';
      const config: MatchConfig = {
        stage: TRAINING_STAGE,
        fighters: [attacker, defender],
        ...(refilled ? { training: true, trainingGauge: 'infinite' } : {}),
      };
      const boost = refilled ? 0 : gauge;
      // Percent of the opponent's health a combo may take: never half of it, with the gauge.
      const most = gauge === 0 ? 45 : 49;
      it(`${attacker.name}: at most ${COMBO_LIMIT} hits and ${most} % of the health, mid and corner`, () => {
        let longest = 0;
        let fullest = 0;
        for (const corner of [false, true]) {
          for (const starter of STARTERS) {
            const start = started(config, starter, corner, boost);
            if (!start) throw new Error(`${starter.name} did not start a combo`);
            const found = searchCombos(start, starter.name, COMMANDS, config, WIDTH);
            const where = `${starter.name}${corner ? ' (corner)' : ''}: ${found.longest.path.join(', ')}`;
            expect(found.longest.hits, where).toBeLessThanOrEqual(COMBO_LIMIT);
            // The starter's blows count too.
            const damage = found.heaviest.damage + defender.maxHealth - start.fighters[1].health;
            const heaviest = `${found.heaviest.path.join(', ')}: ${damage}`;
            expect(damage * 100, heaviest).toBeLessThanOrEqual(most * defender.maxHealth);
            longest = Math.max(longest, found.longest.hits);
            fullest = Math.max(fullest, found.fullest);
          }
        }
        if (gauge === 0) {
          expect(longest).toBe(longestFound);
          // No combo pays for a Rewind nor a Remix of its own (§1.8.4).
          expect(fullest).toBeLessThan(BOOST_BAR);
        }
      }, 120_000);
    }
  });
}
