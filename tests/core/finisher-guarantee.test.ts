import { describe, expect, it } from 'vitest';
import type { FighterTemplate } from '../../src/core/config';
import { FINISHER_DANGER_PERCENT } from '../../src/core/finisher';
import { Input, type InputBits } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { damageOf, playCombo } from './combo-helpers';
import {
  armedStart,
  cancelledLate,
  everLocked,
  matchOf,
  played,
  superContacts,
} from './finisher-helpers';
import { mirroredInput } from './helpers';

/**
 * The guarantee (docs/finisher.md §1.6, §5.8 test 3): the Finisher locks the pair only where
 * every blow of its super will land, so the last one always falls. On the matrix of routes into
 * back + BOOST, at every distance from 14 px to past the reach of the super, in the middle and in
 * the corner, for player 1 and player 2, the victim at the 30 % threshold; with the cancel
 * pressed late, all through its window; and on a victim caught jumping. Where it could not hold,
 * the super stays a plain one: Riff's ← + H, whose victim is in the air (the fourth light, rule
 * b), a body the blows to come would no longer reach, one that would land before the last. The
 * routes of the design lock where they were measured (§1.3).
 */

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Up: U, Boost: X } = Input;

/**
 * A route: its name, its steps for player 1, the distances where it must lock in the middle, and
 * those where it must never lock, in the middle or in the corner.
 */
type Route = readonly [
  name: string,
  steps: readonly InputBits[],
  locks: readonly number[],
  never?: readonly number[],
];

const ROUTES: readonly (readonly [FighterTemplate, FighterTemplate, readonly Route[]])[] = [
  [
    NAYO,
    RIFF,
    [
      ['L, L, H, H', [L, L, H, H, B | X], [24, 36, 48]],
      ['↓ + S', [D | S, B | X], [24, 36]],
      ['→ + S', [F | S, B | X], [24, 36, 48]],
      ['← + H', [B | H, B | X], [24, 36]],
      ['H', [H, B | X], []],
      ['alone', [B | X], [24, 36, 48]],
    ],
  ],
  [
    RIFF,
    NAYO,
    [
      ['L, L, H, H', [L, L, H, H, B | X], [24, 36]],
      ['H', [H, B | X], [24, 36, 48]],
      ['H, H', [H, H, B | X], [24, 36, 48]],
      ['→ + S', [F | S, B | X], []],
      ['↓ + L', [D | L, B | X], []],
      ['← + H', [B | H, B | X], []],
      // The knee floors before the Slam lands (§1.3): no blow touches.
      ['↓ + S', [D | S, B | X], [], [24, 36, 48]],
      ['alone', [B | X], [24, 36, 48]],
    ],
  ],
];

/** Every px from 14 apart to past the reach of both supers (about 75 and 90 px). */
const DISTANCES = Array.from({ length: 83 }, (_, index) => 14 + index);

/** The distances of the late cancels, and the latest: ticks after the opener's last step. */
const LATE_DISTANCES = [24, 36, 48] as const;
const LATEST = 40;

/**
 * Whether `by`'s Finisher locked on `states`; if so, what the lock promises: every blow of the
 * super a hit, the KO, and never more than the 30 % it began from (`threshold`: the caps of 45
 * and 50 % hold, test 9).
 */
function heldIfLocked(
  states: readonly GameState[],
  by: 0 | 1,
  blows: number,
  threshold: number,
  where: string,
): boolean {
  if (!everLocked(states, by)) return false;
  const end = states[states.length - 1];
  expect(
    superContacts(states, by).map(({ kind }) => kind),
    where,
  ).toEqual(Array(blows).fill('hit'));
  expect(end?.fighters[by === 0 ? 1 : 0].health, where).toBe(0);
  expect(end?.round.result, where).toEqual({ winner: by, reason: 'ko' });
  const hits = states.flatMap(({ contacts }) =>
    contacts.filter((contact) => contact.by === by && contact.kind === 'hit'),
  );
  expect(damageOf(hits), where).toBeLessThanOrEqual(threshold);
  return true;
}

const blowsOf = (template: FighterTemplate): number =>
  1 + (template.moves.super?.pulses?.length ?? 0);

const thresholdOf = (template: FighterTemplate): number =>
  Math.trunc((template.maxHealth * FINISHER_DANGER_PERCENT) / 100);

describe('the guarantee: once locked, every blow lands (§1.6, test 3)', () => {
  for (const [attacker, victim, routes] of ROUTES) {
    const blows = blowsOf(attacker);
    const threshold = thresholdOf(victim);
    for (const [name, steps, locks, never = []] of routes) {
      it(`${attacker.name}, ${name}, then back + BOOST, from 14 to ${DISTANCES.length + 13} px`, () => {
        for (const by of [0, 1] as const) {
          const config = matchOf(attacker, victim, by);
          const played = by === 0 ? steps : steps.map(mirroredInput);
          for (const corner of [false, true]) {
            for (const distance of DISTANCES) {
              const where = `player ${by + 1}, ${distance} px${corner ? ', corner' : ''}`;
              const start = armedStart(config, by, { distance, corner });
              const run = playCombo(start, config, played, () => 0, by);
              const locked = heldIfLocked(run.states, by, blows, threshold, where);
              if (never.includes(distance)) expect(locked, where).toBe(false);
              else if (!corner && locks.includes(distance)) expect(locked, where).toBe(true);
            }
          }
        }
      });

      if (steps.length < 2) continue;
      it(`${attacker.name}, ${name}, then back + BOOST up to ${LATEST} ticks late`, () => {
        for (const by of [0, 1] as const) {
          const config = matchOf(attacker, victim, by);
          const played = by === 0 ? steps : steps.map(mirroredInput);
          const cancel = played[played.length - 1] ?? 0;
          for (const corner of [false, true]) {
            for (const distance of LATE_DISTANCES) {
              const start = armedStart(config, by, { distance, corner });
              const opener = playCombo(start, config, played.slice(0, -1), () => 0, by);
              for (let delay = 0; delay <= LATEST; delay++) {
                const where = `player ${by + 1}, ${distance} px${corner ? ', corner' : ''}, +${delay}`;
                const run = cancelledLate(opener, config, cancel, delay, by);
                heldIfLocked(run.states, by, blows, threshold, where);
              }
            }
          }
        }
      });
    }
  }

  it("Riff's ← + H never locks: its victim is in the air, the second blow would miss", () => {
    const config = matchOf(RIFF, NAYO, 0);
    const run = playCombo(armedStart(config, 0, { distance: 24 }), config, [B | H, B | X]);
    const landed = superContacts(run.states, 0);
    expect(landed.map(({ kind }) => kind)).toEqual(['hit']);
    expect(everLocked(run.states, 0)).toBe(false);
    expect(run.end.fighters[1].health).toBeGreaterThan(0);
  });
});

describe('the guarantee on a victim caught jumping (§1.6, test 3)', () => {
  for (const [attacker, victim] of [
    [NAYO, RIFF],
    [NAYO, NAYO],
    [RIFF, NAYO],
  ] as const) {
    it(`${attacker.name}'s super as an anti-air on ${victim.name}`, () => {
      const blows = blowsOf(attacker);
      const threshold = thresholdOf(victim);
      let caughtInTheAir = 0;
      for (const by of [0, 1] as const) {
        const config = matchOf(attacker, victim, by);
        const victimIndex = by === 0 ? 1 : 0;
        const back = by === 0 ? B : F;
        // The victim's jumps: straight up, towards the attacker and away.
        for (const jump of [U, U | back, U | (by === 0 ? F : B)]) {
          for (let distance = 30; distance <= 78; distance += 6) {
            for (let pressed = 0; pressed <= 36; pressed += 3) {
              const states = played(armedStart(config, by, { distance }), config, 150, (tick) => {
                const mine = tick === pressed ? back | X : 0;
                const theirs = tick < 6 ? jump : 0;
                return by === 0 ? [mine, theirs] : [theirs, mine];
              });
              const where = `player ${by + 1}, jump ${jump}, ${distance} px, pressed on ${pressed}`;
              if (!heldIfLocked(states, by, blows, threshold, where)) continue;
              const first = states.find((state) => superContacts([state], by).length > 0);
              if ((first?.fighters[victimIndex].y ?? 0) > 0) caughtInTheAir++;
            }
          }
        }
      }
      // The Mégabasse locks on bodies in the air; the Slam never does (the fourth light, rule b).
      if (attacker === NAYO) expect(caughtInTheAir).toBeGreaterThan(0);
      else expect(caughtInTheAir).toBe(0);
    });
  }
});
