import { describe, expect, it } from 'vitest';
import { applyHit } from '../../src/core/combat';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { updateFighter } from '../../src/core/fighter';
import {
  FINISHER_DANGER_PERCENT,
  finisherLocked,
  finisherReady,
  finisherState,
  inDanger,
} from '../../src/core/finisher';
import { Input, type InputBits } from '../../src/core/input';
import { BOOST_MAX, COMBO_LIMIT } from '../../src/core/rules';
import {
  FLAG_BOUNCE,
  FLAG_DANGER,
  FLAG_FINISHER,
  FLAG_LIMIT,
  FLAG_SPENT_SUPER,
  type GameState,
} from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { playReplay, type Replay } from '../../tools/replays/replay';
import { floored, playCombo } from './combo-helpers';
import {
  armedStart,
  cancelledLate,
  everLocked,
  matchOf,
  played,
  superContacts,
  type ArmedSetup,
} from './finisher-helpers';
import { makeFighter, mirroredInput } from './helpers';

/**
 * The Finisher's core (docs/finisher.md §1.1, §1.6, §1.7, §1.10, §5.8 tests 1, 2, 4 to 8, 10
 * and 19): its four lights, the lock on a clean first contact, the blows that stop at 1 HP and
 * the last that takes all, the end of a lock without a KO, the exchanges, the untouchable pair,
 * the plain super once blocked or whiffed, no data of its own, and its replay. The guarantee
 * (test 3) has its own file.
 */

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Up: U, Boost: X } = Input;

const REPLAYS = import.meta.glob<Replay>('./replays/finisher.json', {
  eager: true,
  import: 'default',
});

/** Back, for player `by`: away from the opponent on the other side. */
const back = (by: 0 | 1): InputBits => (by === 0 ? B : F);

/** The victim's health at the threshold: 300 for Nayo, 270 for Riff. */
const thresholdOf = (template: FighterTemplate): number =>
  Math.trunc((template.maxHealth * FINISHER_DANGER_PERCENT) / 100);

/** Back + BOOST pressed by player `by` on tick 0, `other` played by the opponent. */
function superAlone(
  config: MatchConfig,
  by: 0 | 1,
  setup: ArmedSetup,
  other: (tick: number) => InputBits = () => 0,
  ticks = 150,
): GameState[] {
  return played(armedStart(config, by, setup), config, ticks, (tick) => {
    const mine = tick === 0 ? back(by) | X : 0;
    return by === 0 ? [mine, other(tick)] : [other(tick), mine];
  });
}

/** The victim's health after each contact of `by`'s super. */
function healthAfterBlows(states: readonly GameState[], by: 0 | 1): number[] {
  const victim = by === 0 ? 1 : 0;
  return states.flatMap((state) =>
    state.contacts.some((contact) => contact.by === by && contact.move === 'super')
      ? [state.fighters[victim].health]
      : [],
  );
}

describe('the four lights (§1.1, test 1)', () => {
  for (const attacker of [NAYO, RIFF]) {
    const victim = attacker === NAYO ? RIFF : NAYO;
    const blows = 1 + (attacker.moves.super?.pulses?.length ?? 0);
    for (const by of [0, 1] as const) {
      it(`${attacker.name} as player ${by + 1}: match point, full gauge, danger, room`, () => {
        const config = matchOf(attacker, victim, by);
        const lights = (setup: Partial<ArmedSetup> = {}) =>
          finisherState(armedStart(config, by, { distance: 40, ...setup }), by, config);
        const threshold = thresholdOf(victim);
        const reeling = { action: 'hitstun', stunFrames: 20, comboCount: 4 } as const;
        const marked = { ...reeling, flags: FLAG_DANGER };

        expect(lights()).toBe('ready');
        expect(finisherReady(armedStart(config, by, { distance: 40 }), by, config)).toBe(true);
        // 1. The match point: never in round 1, both in round 3 (or after a draw).
        expect(lights({ wins: [0, 0] })).toBe('off');
        expect(lights({ wins: [1, 1] })).toBe('ready');
        expect(lights({ wins: by === 0 ? [0, 1] : [1, 0] })).toBe('off');
        // 2. Three bars, and the super not spent in the sequence.
        expect(lights({ attacker: { boost: BOOST_MAX - 1 } })).toBe('off');
        expect(lights({ attacker: { flags: FLAG_SPENT_SUPER } })).toBe('off');
        // 3. In danger: by its health in neutral, by the combo's mark in a combo.
        expect(lights({ health: threshold + 1 })).toBe('off');
        expect(lights({ health: 1 })).toBe('ready');
        expect(lights({ health: 5, victim: reeling })).toBe('off');
        expect(lights({ health: victim.maxHealth, victim: marked })).toBe('ready');
        // 4 (a). Room for every blow of the super, neither floored by the limit nor bouncing.
        const full = { ...marked, comboCount: COMBO_LIMIT - blows };
        expect(lights({ victim: full })).toBe('ready');
        expect(lights({ victim: { ...full, comboCount: full.comboCount + 1 } })).toBe('blocked');
        expect(lights({ victim: { ...marked, flags: FLAG_DANGER | FLAG_LIMIT } })).toBe('blocked');
        expect(lights({ victim: { ...marked, flags: FLAG_DANGER | FLAG_BOUNCE } })).toBe('blocked');
        // 4 (b). The Slam leaves the ground: its victim must be on it. The Mégabasse does not.
        const air = attacker === RIFF ? 'blocked' : 'ready';
        const juggled = { ...marked, action: 'airHit', y: px(30), comboCount: 2 } as const;
        expect(lights({ victim: juggled })).toBe(air);
        expect(lights({ victim: { action: 'air', y: px(30) } })).toBe(air);
        // Blocked only with the first three lights on.
        expect(lights({ wins: [0, 0], victim: { ...marked, flags: FLAG_LIMIT } })).toBe('off');
      });
    }
  }

  it('reads the danger as the combo began: from 31 % it never arms, however low it goes', () => {
    const config = matchOf(NAYO, RIFF, 0);
    const threshold = thresholdOf(RIFF);
    for (const [health, arms] of [
      [threshold, true],
      [threshold + 1, false],
    ] as const) {
      const run = playCombo(armedStart(config, 0, { distance: 36, health }), config, [L, L, H, H]);
      const inCombo = run.states.filter(({ fighters: [, riff] }) => riff.action === 'hitstun');
      expect(inCombo.length).toBeGreaterThan(0);
      for (const state of inCombo) {
        expect((state.fighters[1].flags & FLAG_DANGER) !== 0, `${health}`).toBe(arms);
        expect(finisherState(state, 0, config), `${health}`).toBe(arms ? 'ready' : 'off');
      }
      const lowest = Math.min(...run.states.map(({ fighters: [, riff] }) => riff.health));
      expect(inDanger({ ...makeFighter(), health: lowest }, RIFF.maxHealth)).toBe(true);
    }
  });

  it("marks the combo's first blow only, and forgets it once back on its feet", () => {
    const jab = NAYO.moves.standLight;
    const opened = applyHit(makeFighter({ health: 200 }), px(370), jab, 0, {
      counter: null,
      impactPercent: 50,
      danger: true,
    });
    expect(opened.flags & FLAG_DANGER).toBe(FLAG_DANGER);
    // Later blows keep the mark the first one set, either way.
    const later = applyHit(opened, px(370), jab, 0, {
      counter: null,
      impactPercent: 50,
      danger: false,
    });
    expect(later.flags & FLAG_DANGER).toBe(FLAG_DANGER);
    const standing = updateFighter(makeFighter({ flags: FLAG_DANGER }), 0, RIFF, px(900));
    expect(standing.flags & FLAG_DANGER).toBe(0);
  });
});

describe('the lock takes on a clean first contact only (§1.6, test 2)', () => {
  it('armed as it starts, the super locks the pair from its first blow to the KO', () => {
    const config = matchOf(NAYO, RIFF, 0);
    const states = superAlone(config, 0, { distance: 40 });
    expect((states[0]?.fighters[0].flags ?? 0) & FLAG_FINISHER).toBe(FLAG_FINISHER);
    const first = states.findIndex((state) => state.contacts.length > 0);
    const [before, contact] = [states[first - 1], states[first]];
    if (!before || !contact) throw new Error('The Mégabasse must land');
    expect(finisherLocked(before, 0)).toBe(false);
    expect(finisherLocked(contact, 0)).toBe(true);
    const end = states[states.length - 1];
    expect(end?.round.result).toEqual({ winner: 0, reason: 'ko' });
    // The lock lasts as long as the super: the victim, knocked out, stays held.
    const lockedTicks = states.filter((state) => finisherLocked(state, 0)).length;
    expect(lockedTicks).toBeGreaterThan(30);
  });

  it('never on a blow blocked: the Finisher is gone, a plain super goes on', () => {
    const config = matchOf(NAYO, RIFF, 0);
    const states = superAlone(config, 0, { distance: 40 }, () => F);
    const blocks = superContacts(states, 0);
    expect(blocks.map(({ kind }) => kind)).toEqual(['block', 'block', 'block']);
    expect(everLocked(states, 0)).toBe(false);
    const blocked = states.find((state) => state.contacts.length > 0);
    expect((blocked?.fighters[0].flags ?? FLAG_FINISHER) & FLAG_FINISHER).toBe(0);
  });

  it('never when the attacker is hit on that tick: a jab traded with the Slam', () => {
    const config = matchOf(RIFF, NAYO, 0);
    const states = superAlone(config, 0, { distance: 40 }, (tick) => (tick === 8 ? L : 0));
    const trade = states.find((state) => state.contacts.length === 2);
    expect(trade?.contacts.map(({ by, move }) => [by, move])).toEqual([
      [1, 'standLight'],
      [0, 'super'],
    ]);
    expect(everLocked(states, 0)).toBe(false);
  });

  it("never on a victim that jumped in the Slam's leap (the fourth light, rule b)", () => {
    const config = matchOf(RIFF, NAYO, 0);
    const jumped = superAlone(config, 0, { distance: 40 }, (tick) =>
      tick >= 2 && tick < 5 ? U : 0,
    );
    const [first] = jumped.filter((state) =>
      state.contacts.some((contact) => contact.move === 'super'),
    );
    expect(first?.fighters[1].y).toBeGreaterThan(0);
    expect(everLocked(jumped, 0)).toBe(false);
    expect(jumped[jumped.length - 1]?.fighters[1].health).toBeGreaterThan(0);
    // Standing, the same Slam locks and knocks out.
    const standing = superAlone(config, 0, { distance: 40 });
    expect(everLocked(standing, 0)).toBe(true);
    expect(standing[standing.length - 1]?.fighters[1].health).toBe(0);
  });

  it('never on a blow after the first: on a body getting up, a plain super', () => {
    // The first blow finds the body still down (invulnerable); a later one, alone, would lock and
    // take everything at once. Plain, the Slam's last deals 170, the Mégabasse's 140, or 80 + 126.
    for (const [attacker, victim, stunFrames, health, blows, left] of [
      [RIFF, NAYO, 16, 300, 1, 130],
      [NAYO, RIFF, 14, 270, 1, 130],
      [NAYO, RIFF, 8, 270, 2, 64],
    ] as const) {
      for (const by of [0, 1] as const) {
        const where = `${attacker.name}, getting up in ${stunFrames}, player ${by + 1}`;
        const config = matchOf(attacker, victim, by);
        const down = {
          action: 'knockdown',
          stunFrames,
          comboCount: 3,
          flags: FLAG_DANGER,
        } as const;
        const states = superAlone(config, by, { distance: 40, health, victim: down });
        expect(superContacts(states, by), where).toHaveLength(blows);
        expect(everLocked(states, by), where).toBe(false);
        const end = states[states.length - 1];
        expect(end?.fighters[by === 0 ? 1 : 0].health, where).toBe(left);
        expect(end?.round.result, where).toBeNull();
      }
    }
  });

  it('never if a blow to come would fall short: from 70 px on Riff, 85 on Nayo, at neutral', () => {
    // Each blow slides the body 2.5 px further: the last must still reach it.
    for (const [attacker, victim, reach] of [
      [NAYO, RIFF, 69],
      [NAYO, NAYO, 68],
      [RIFF, NAYO, 84],
      [RIFF, RIFF, 86],
    ] as const) {
      for (const by of [0, 1] as const) {
        const config = matchOf(attacker, victim, by);
        for (const corner of [false, true]) {
          const where = `${attacker.name} on ${victim.name}, player ${by + 1}${corner ? ', corner' : ''}`;
          const within = superAlone(config, by, { distance: reach, corner });
          expect(everLocked(within, by), where).toBe(true);
          expect(within[within.length - 1]?.round.result, where).toEqual({
            winner: by,
            reason: 'ko',
          });
          const beyond = superAlone(config, by, { distance: reach + 1, corner });
          expect(superContacts(beyond, by).length, where).toBeGreaterThan(0);
          expect(everLocked(beyond, by), where).toBe(false);
          expect(beyond[beyond.length - 1]?.round.result, where).toBeNull();
        }
      }
    }
    // The plain super out there: two blows of three on Riff (left at 118), one of two on Nayo.
    const far = superAlone(matchOf(NAYO, RIFF, 0), 0, { distance: 70 });
    expect(healthAfterBlows(far, 0)).toEqual([190, 118]);
    const farther = superAlone(matchOf(RIFF, NAYO, 0), 0, { distance: 85 });
    expect(healthAfterBlows(farther, 0)).toEqual([180]);
  });

  it('never on a juggled body that would land before the last blow: ↓ + S cancelled late', () => {
    // The Uppercut leaves Riff low; the super spends no juggle point and lifts her little.
    for (const by of [0, 1] as const) {
      const config = matchOf(NAYO, RIFF, by);
      const uppercut = by === 0 ? D | S : mirroredInput(D | S);
      const start = armedStart(config, by, { distance: 24 });
      const opener = playCombo(start, config, [uppercut], () => 0, by);
      const cancel = back(by) | X;
      const inTime = cancelledLate(opener, config, cancel, 25, by);
      expect(everLocked(inTime.states, by), `player ${by + 1}`).toBe(true);
      expect(inTime.end.round.result, `player ${by + 1}`).toEqual({ winner: by, reason: 'ko' });
      // A tick later, she floors on f14, before the last blow: a plain super of two blows.
      const late = cancelledLate(opener, config, cancel, 26, by);
      expect(everLocked(late.states, by), `player ${by + 1}`).toBe(false);
      expect(healthAfterBlows(late.states, by), `player ${by + 1}`).toEqual([88, 24]);
      expect(floored(late, by === 0 ? 1 : 0), `player ${by + 1}`).toBe(true);
    }
  });
});

describe('the blows of the lock (§1.6, test 4)', () => {
  for (const [attacker, victim, left] of [
    [NAYO, RIFF, [1, 1, 0]],
    [RIFF, NAYO, [1, 0]],
  ] as const) {
    it(`${attacker.name}: those before the last stop at 1 HP, the last at 0, on either side`, () => {
      for (const by of [0, 1] as const) {
        const config = matchOf(attacker, victim, by);
        const locked = superAlone(config, by, { distance: 40, health: 10 });
        expect(healthAfterBlows(locked, by), `player ${by + 1}`).toEqual(left);
        // The plain super, in round 1: its first blow knocks out.
        const plain = superAlone(config, by, { distance: 40, health: 10, wins: [0, 0] });
        expect(healthAfterBlows(plain, by), `player ${by + 1}`).toEqual([0]);
      }
    });
  }

  it('the last takes all the health left, whatever the scaling, and never more', () => {
    const config = matchOf(NAYO, RIFF, 0);
    const run = playCombo(armedStart(config, 0, { distance: 36 }), config, [L, L, H, H, B | X]);
    const blows = superContacts(run.states, 0);
    expect(blows).toHaveLength(3);
    const last = blows[2];
    const before =
      thresholdOf(RIFF) - run.hits.slice(0, -1).reduce((sum, hit) => sum + hit.damage, 0);
    expect(last?.damage).toBe(before);
    expect(run.end.fighters[1].health).toBe(0);
  });
});

describe('a lock that ends without a KO (§1.6, §1.10, test 5)', () => {
  it('pulled away after the first blow, the victim keeps its health; the timer runs again', () => {
    const config = matchOf(NAYO, RIFF, 0);
    let state = armedStart(config, 0, { distance: 40 });
    const states: GameState[] = [];
    let pulled = false;
    for (let tick = 0; tick < 150; tick++) {
      state = step(state, [tick === 0 ? B | X : 0, 0], config);
      if (!pulled && finisherLocked(state, 0)) {
        // Out of reach of the next blows, by hand: what the guarantee forbids.
        const [nayo, riff] = state.fighters;
        state = { ...state, fighters: [nayo, { ...riff, x: riff.x + px(120) }] };
        pulled = true;
      }
      states.push(state);
    }
    expect(superContacts(states, 0)).toHaveLength(1);
    const timers = states.filter((s) => finisherLocked(s, 0)).map(({ round }) => round.timer);
    expect(new Set(timers).size).toBe(1);
    const end = states[states.length - 1];
    if (!end) throw new Error('No state');
    expect(finisherLocked(end, 0)).toBe(false);
    // Its first blow alone, as it would deal in a plain super.
    expect(end.fighters[1].health).toBe(thresholdOf(RIFF) - (NAYO.moves.super?.damage ?? 0));
    expect(end.round.timer).toBeLessThan(timers[0] ?? 0);
  });
});

describe('the exchanges arm nothing (§1.6, test 6)', () => {
  it('two Mégabasses on the same tick trade at f8, 96 each, and neither locks', () => {
    const config = matchOf(NAYO, NAYO, 0);
    const start = armedStart(config, 0, {
      distance: 40,
      wins: [1, 1],
      attacker: { health: 300 },
      victim: { boost: BOOST_MAX },
    });
    expect(finisherReady(start, 0, config) && finisherReady(start, 1, config)).toBe(true);
    const states = played(start, config, 120, (tick) => (tick === 0 ? [B | X, F | X] : [0, 0]));
    const trade = states.find((state) => state.contacts.length > 0);
    expect(trade?.contacts.map(({ move, kind, damage }) => [move, kind, damage])).toEqual([
      ['super', 'hit', 96],
      ['super', 'hit', 96],
    ]);
    expect(everLocked(states, 0) || everLocked(states, 1)).toBe(false);
  });

  it("Riff's Slam and Nayo's jab on the same tick, or his Vinyle: no lock", () => {
    const config = matchOf(RIFF, NAYO, 0);
    for (const [answer, at, move] of [
      [L, 8, 'standLight'],
      [S, 0, 'special'],
    ] as const) {
      const states = superAlone(config, 0, { distance: 40 }, (tick) => (tick === at ? answer : 0));
      const first = states.find((state) => state.contacts.some((c) => c.move === 'super'));
      expect(first?.contacts.map((contact) => contact.move).sort()).toEqual([move, 'super'].sort());
      expect(everLocked(states, 0), move).toBe(false);
    }
  });
});

describe('the untouchable pair (§1.6, §1.10, test 7)', () => {
  const config = matchOf(NAYO, NAYO, 0);
  /** Player 2 throws its Vinyle, player 1 lets its Mégabasse go as it flies. */
  const vinyl = (wins: readonly [number, number]) =>
    played(armedStart(config, 0, { distance: 40, wins }), config, 160, (tick) => [
      tick === 10 ? B | X : 0,
      tick === 0 ? S : 0,
    ]);

  it('a Vinyle in flight goes through it; unlocked, it hits', () => {
    const locked = vinyl([1, 0]);
    expect(locked.flatMap(({ contacts }) => contacts.filter(({ by }) => by === 1))).toEqual([]);
    expect(superContacts(locked, 0).map(({ kind }) => kind)).toEqual(['hit', 'hit', 'hit']);
    const through = locked.filter(
      (state) => finisherLocked(state, 0) && state.projectiles.some(({ owner }) => owner === 1),
    );
    expect(through.length).toBeGreaterThan(0);
    // Unlocked (round 1), it hits Nayo in the middle of his super, cut short at two blows.
    const plain = vinyl([0, 0]);
    const disc = plain.flatMap(({ contacts }) => contacts.filter(({ by }) => by === 1));
    expect(disc.map(({ move, kind }) => [move, kind])).toEqual([['special', 'hit']]);
    expect(superContacts(plain, 0)).toHaveLength(2);
  });

  it("nor does its own projectile touch the victim, but the super's blows", () => {
    let state = armedStart(config, 0, { distance: 40 });
    const states: GameState[] = [];
    for (let tick = 0; tick < 120; tick++) {
      state = step(state, [tick === 0 ? B | X : 0, 0], config);
      if (finisherLocked(state, 0) && state.projectiles.length === 0 && tick < 40) {
        const victim = state.fighters[1];
        const disc = { owner: 0, move: 'special', x: victim.x, facing: 1 } as const;
        state = { ...state, projectiles: [disc] };
      }
      states.push(state);
    }
    const moves = states.flatMap(({ contacts }) => contacts.map(({ move }) => move));
    expect(moves).toEqual(['super', 'super', 'super']);
  });

  it('the timer stands still from the first contact to the KO', () => {
    const states = vinyl([1, 0]);
    const first = states.findIndex((state) => state.contacts.some((c) => c.move === 'super'));
    const ko = states.findIndex((state) => state.fighters[1].health === 0);
    expect(first).toBeGreaterThan(0);
    expect(ko).toBeGreaterThan(first);
    const timers = states.slice(first - 1, ko + 1).map(({ round }) => round.timer);
    expect(new Set(timers).size).toBe(1);
    // The plain super lets it run between its blows.
    const plain = vinyl([0, 0]);
    const plainTimers = plain.slice(first - 1, ko + 1).map(({ round }) => round.timer);
    expect(new Set(plainTimers).size).toBeGreaterThan(1);
  });
});

/** The state without the Finisher's mark nor the score: what a plain super leaves. */
function unmarked(state: GameState): unknown {
  return {
    ...state,
    round: { ...state.round, wins: null },
    fighters: state.fighters.map((fighter) => ({
      ...fighter,
      flags: fighter.flags & ~FLAG_FINISHER,
    })),
  };
}

/** Ticks the attacker is free before the one who blocked (negative: after it). */
function advantageOf(states: readonly GameState[]): number {
  let attackerFree = -1;
  let defenderFree = -1;
  let blocked = false;
  states.forEach((state, tick) => {
    const [attacker, defender] = state.fighters;
    if (state.contacts.some(({ kind }) => kind === 'block')) blocked = true;
    if (blocked && defenderFree < 0 && defender.action !== 'blockstun') defenderFree = tick;
    if (tick > 0 && attackerFree < 0 && attacker.move === null) attackerFree = tick;
  });
  return defenderFree - attackerFree;
}

describe('blocked or whiffed: a plain super, nothing more (§1.7, test 8)', () => {
  for (const [attacker, victim, behind, chip] of [
    [NAYO, RIFF, -16, 45],
    [RIFF, NAYO, -15, 43],
  ] as const) {
    it(`${attacker.name}: three bars lost, ${behind} on the guard, ${chip} of chip, never the last point`, () => {
      const config = matchOf(attacker, victim, 0);
      const guarded = (setup: Partial<ArmedSetup>) =>
        superAlone(config, 0, { distance: 40, ...setup }, () => F);
      const armed = guarded({});
      expect((armed[0]?.fighters[0].flags ?? 0) & FLAG_FINISHER).toBe(FLAG_FINISHER);
      expect(everLocked(armed, 0)).toBe(false);
      const blocks = superContacts(armed, 0);
      expect(blocks.every(({ kind }) => kind === 'block')).toBe(true);
      expect(blocks.reduce((sum, { damage }) => sum + damage, 0)).toBe(chip);
      expect(armed[armed.length - 1]?.fighters[0].boost).toBe(0);
      expect(advantageOf(armed)).toBe(behind);
      // The same as the plain super of round 1, tick by tick, but for the Finisher's mark.
      expect(armed.map(unmarked)).toEqual(guarded({ wins: [0, 0] }).map(unmarked));
      // The chip never takes the last point.
      const low = guarded({ health: 20 });
      expect(low[low.length - 1]?.fighters[1].health).toBe(1);
      expect(low[low.length - 1]?.round.phase).toBe('fight');
    });

    it(`${attacker.name}: whiffed from afar, three bars lost, the plain super's recovery`, () => {
      const config = matchOf(attacker, victim, 0);
      const armed = superAlone(config, 0, { distance: 200 });
      expect(superContacts(armed, 0)).toEqual([]);
      expect(armed[armed.length - 1]?.fighters[0].boost).toBe(0);
      const plain = superAlone(config, 0, { distance: 200, wins: [0, 0] });
      expect(armed.map(unmarked)).toEqual(plain.map(unmarked));
    });
  }
});

describe('no data of its own (§1.6, test 10)', () => {
  it('the armed super is the super: its move, its data, its last blow that floors', () => {
    for (const template of [NAYO, RIFF]) {
      const config = matchOf(template, template === NAYO ? RIFF : NAYO, 0);
      const [started] = superAlone(config, 0, { distance: 40 });
      expect(started?.fighters[0].move).toBe('super');
      const move = template.moves.super;
      const last = move?.pulses?.[move.pulses.length - 1]?.hit;
      expect(last?.knockdown, template.name).toBeDefined();
    }
  });
});

describe('finisher.json (§5.9, test 19)', () => {
  const [replay] = Object.values(REPLAYS);

  it('plays a Finisher in training: locked, its last blow stopped at 1 HP', () => {
    if (!replay) throw new Error('finisher.json is missing');
    const states: GameState[] = [];
    playReplay(replay, (state) => states.push(state));
    expect(everLocked(states, 0)).toBe(true);
    const blows = superContacts(states, 0);
    expect(blows.map(({ kind }) => kind)).toEqual(['hit', 'hit', 'hit']);
    const lastBlow = blows[2];
    const last = states.find((state) => lastBlow && state.contacts.includes(lastBlow));
    expect(last?.fighters[1].health).toBe(1);
    expect(lastBlow?.damage).toBeGreaterThan(400);
    expect(Math.min(...states.map(({ fighters: [, riff] }) => riff.health))).toBe(1);
    // The dummy gets up and refills.
    expect(states[states.length - 1]?.fighters[1].health).toBe(RIFF.maxHealth);
  });
});
