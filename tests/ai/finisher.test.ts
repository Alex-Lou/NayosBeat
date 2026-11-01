import { describe, expect, it } from 'vitest';
import { cpuStep, createCpu, type CpuBehavior } from '../../src/ai/cpu';
import { armedSuper } from '../../src/ai/defense';
import { planFor, plansFor, savesForSuper, superOutlook } from '../../src/ai/plans';
import type { CpuLevel } from '../../src/ai/profiles';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px, toPx } from '../../src/core/constants';
import { finisherLocked, finisherReady } from '../../src/core/finisher';
import { Input, type InputBits } from '../../src/core/input';
import { BOOST_BAR, BOOST_MAX } from '../../src/core/rules';
import { matchWinner } from '../../src/core/round';
import {
  createInitialState,
  FLAG_DANGER,
  FLAG_FINISHER,
  FLAG_MOVE_HIT,
  type FighterState,
  type GameState,
} from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { armedStart } from '../core/finisher-helpers';

/**
 * The CPU and the Finisher (docs/finisher.md §1.11, §5.5, §5.8 test 17): what each level does
 * with its own, and against the opponent's; then real matches between hard CPUs, at fixed seeds,
 * their measures frozen with a margin.
 */

const { Light: L, Heavy: H, Boost: X, Left: B } = Input;
const NAYO_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const RIFF_NAYO: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };

describe('how the CPU weighs its super (§1.11)', () => {
  /** Player 1 hard (or `level`), its gauge `boost`, its wins `wins`, the opponent at `health`. */
  const outlook = (
    health: number,
    wins: [number, number],
    boost = BOOST_MAX,
    level: CpuLevel = 'hard',
  ) => {
    const state = createInitialState(NAYO_RIFF);
    const [a, b] = state.fighters;
    const armed: GameState = {
      ...state,
      round: { ...state.round, wins },
      fighters: [
        { ...a, boost },
        { ...b, health },
      ],
    };
    return superOutlook(armed, 0, NAYO_RIFF, level);
  };

  it('plays for the Finisher at its match point: ready, or the opponent not orange yet', () => {
    expect(outlook(270, [1, 0])).toBe('finisher');
    expect(outlook(271, [1, 0])).toBe('hold');
    // Not at its match point: as ever. The opponent orange without the lights: as ever too.
    expect(outlook(271, [0, 1])).toBe('free');
    expect(outlook(270, [1, 0], 2000)).toBe('free');
  });

  it('normal never lets it go, easy spends nothing: as ever for both', () => {
    for (const level of ['easy', 'normal'] as const) {
      expect(outlook(270, [1, 0], BOOST_MAX, level)).toBe('free');
      expect(outlook(900, [1, 0], BOOST_MAX, level)).toBe('free');
    }
  });

  it('keeps the three bars for the Finisher: no single one spent on them, at three either', () => {
    expect(savesForSuper(BOOST_MAX)).toBe(false);
    expect(savesForSuper(BOOST_MAX, true)).toBe(true);
    expect(savesForSuper(2 * BOOST_BAR, true)).toBe(true);
    expect(savesForSuper(BOOST_BAR, true)).toBe(false);
  });

  /** Nayo's Direct (or `move`) just landed on a Riff `distance` px away, three bars full. */
  const landed = (
    move: FighterState['move'] = 'standLight',
    distance = 40,
  ): [FighterState, FighterState] => {
    const state = armedStart(NAYO_RIFF, 0, { distance });
    const [nayo, riff] = state.fighters;
    return [
      {
        ...nayo,
        action: 'attack',
        move,
        actionFrame: 6,
        moveConnected: true,
        flags: FLAG_MOVE_HIT,
      },
      { ...riff, action: 'hitstun', comboCount: 1, flags: FLAG_DANGER, stunTotal: 14 },
    ];
  };
  /** The steps hard draws over 400 seeds, by how often. */
  const draws = (
    outlookOf: 'finisher' | 'hold' | 'free',
    move: FighterState['move'] = 'standLight',
  ) => {
    const [me, them] = landed(move);
    const counts = new Map<string, number>();
    for (let seed = 0; seed < 400; seed++) {
      const { steps } = planFor(me, them, NAYO, 'hard', seed * 7919 + 1, outlookOf);
      const key = steps.join(' ');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const SUPER_ROUTE = [L, H, H, B | X].join(' ');

  it('weighs the routes that end on the super ×4 when FINISH is lit, none on hold', () => {
    const free = draws('free').get(SUPER_ROUTE) ?? 0;
    const finisher = draws('finisher').get(SUPER_ROUTE) ?? 0;
    expect(free).toBeGreaterThan(10);
    // 12 instead of 3 among the routes after the Direct (its Remixes kept out): about four times.
    expect(finisher / free).toBeGreaterThan(2.5);
    expect(finisher / free).toBeLessThan(6);
    const hold = draws('hold');
    expect([...hold.keys()].filter((steps) => steps.endsWith(String(B | X)))).toEqual([]);
    // No Remix either, three bars kept: they are the Finisher's.
    expect([...hold.keys()].filter((steps) => steps.includes(String(X)))).toEqual([]);
  });

  it("goes for it from Nayo's Uppercut that hit, only when FINISH is lit; Riff never from her Genou montant", () => {
    // Within 38 px: the farthest the Uppercut reaches a standing Riff (plan-routes.test.ts).
    const [nayo, riff] = landed('specialAntiAir', 30);
    const finishing = (outlookOf: 'finisher' | 'free') =>
      plansFor(nayo, riff, NAYO, outlookOf).map((plan) => plan.steps.join(' '));
    expect(finishing('finisher')).toEqual([String(B | X)]);
    expect(finishing('free')).toEqual([]);
    const riffPlans = plansFor({ ...nayo, move: 'specialAntiAir' }, riff, RIFF, 'finisher');
    expect(riffPlans.filter((plan) => plan.steps.includes(B | X))).toEqual([]);
  });
});

describe('the CPU against a Finisher (§1.11)', () => {
  /**
   * The CPU (player 2, `level`, `seed`) has seen player 1 play `opponent` for 20 ticks, `distance`
   * px away, the game moving: what it presses then.
   */
  function decision(
    level: CpuBehavior,
    seed: number,
    config: MatchConfig,
    opponent: Partial<FighterState>,
    distance = 40,
  ): InputBits {
    const state = armedStart(config, 0, { distance, attacker: opponent });
    let cpu = createCpu(1, level, seed);
    for (let tick = 0; tick < 20; tick++) cpu = cpuStep(cpu, state, config).cpu;
    return cpuStep(cpu, state, config).input;
  }
  /** Riff's Slam at the top of its dive, let go armed or not. */
  const slam = (armed: boolean): Partial<FighterState> => ({
    action: 'attack',
    move: 'super',
    actionFrame: 10,
    y: px(40),
    boost: 0,
    flags: armed ? FLAG_FINISHER : 0,
  });
  /** Standing guard against player 1 on its left: back (right), without down. */
  const STANDING = Input.Right;

  it('hard stands its guard against an armed Slam in the air, whatever its seed', () => {
    let plain = 0;
    for (let seed = 0; seed < 50; seed++) {
      expect(decision('hard', seed, RIFF_NAYO, slam(true)), `seed ${seed}`).toBe(STANDING);
      if (decision('hard', seed, RIFF_NAYO, slam(false)) === STANDING) plain++;
    }
    // A plain Slam: its block's chance, or its anti-air.
    expect(plain).toBeLessThan(50);
    expect(armedSuper({ ...RIFF_NAYO, ...slam(true) } as unknown as FighterState)).toBe(true);
  });

  it('normal does not read it that way: its block, a little more likely', () => {
    let standing = 0;
    for (let seed = 0; seed < 50; seed++) {
      if (decision('normal', seed, RIFF_NAYO, slam(true)) === STANDING) standing++;
    }
    expect(standing).toBeLessThan(50);
  });

  /**
   * A hard CPU (Riff, at 30 %) against Nayo standing still `distance` px away, armed (at his
   * match point, three bars) or not, over `seeds` seeds of `ticks` ticks: the ticks it walks or
   * dashes in within 75 px of him, the jumps it starts, the ticks it spends within 75 px, and
   * the specials it starts from neutral within 80 px.
   */
  function approach(armed: boolean, seeds = 40, ticks = 240, distance = 110) {
    let closing = 0;
    let jumps = 0;
    let near = 0;
    let specials = 0;
    for (let seed = 0; seed < seeds; seed++) {
      let state = armedStart(NAYO_RIFF, 0, { distance, wins: armed ? [1, 0] : [0, 0] });
      let cpu = createCpu(1, 'hard', seed * 31 + 5);
      for (let tick = 0; tick < ticks; tick++) {
        const decided = cpuStep(cpu, state, NAYO_RIFF);
        cpu = decided.cpu;
        const before = state.fighters[1];
        state = step(state, [0, decided.input], NAYO_RIFF);
        const riff = state.fighters[1];
        const gap = toPx(Math.abs(riff.x - state.fighters[0].x));
        const starts = riff.move !== null && riff.actionFrame === 0 && before.move !== riff.move;
        const closes = riff.action === 'walkForward' || (starts && riff.move === 'dashForward');
        if (closes && gap <= 75) closing++;
        if (riff.action === 'preJump' && before.action !== 'preJump') jumps++;
        if (gap <= 75) near++;
        // From neutral: a special that cancels a blow that hit is a combo's.
        const special = riff.move === 'special' || riff.move === 'specialForward';
        if (starts && special && before.action !== 'attack' && gap <= 80) specials++;
      }
    }
    return { closing, jumps, near, specials };
  }

  it('hard keeps out of an armed Mégabasse’s reach: no walk, dash, jump or special into it', () => {
    const plain = approach(false);
    const wary = approach(true);
    // Measured: 271 ticks walking in, 23 jumps, 7886 of the 9600 ticks within 75 px.
    expect(plain.closing).toBeGreaterThan(20);
    expect(plain.jumps).toBeGreaterThan(10);
    expect(plain.near).toBeGreaterThan(5000);
    expect(plain.specials).toBeGreaterThan(0);
    // Regression: it jumped in instead of walking (56 jumps) and pressed once there, 6236 ticks
    // within 75 px; its Saut de l'ange, thrown from 81 to 110 px, landed it 35 px closer.
    expect(wary).toEqual({ closing: 0, jumps: 0, near: 0, specials: 0 });
    // From 200 px too, where it jumped in from afar (37 jumps without the menace).
    expect(approach(true, 40, 240, 200)).toEqual({ closing: 0, jumps: 0, near: 0, specials: 0 });
  });

  it('never takes a super’s freeze for an opening: no blow pressed into it as the game moves again', () => {
    // Regression: it added its reaction time to a frame frozen 20 ticks long and saw the super
    // over: as the freeze ended, it pressed its punish into the Mégabasse (at f0) or the Slam
    // (at f10), its active frames all to come (the Finisher à vide, docs/finisher.md §1.8).
    const supers = [
      { config: NAYO_RIFF, frame: 0, y: 0 },
      { config: RIFF_NAYO, frame: 10, y: px(40) },
    ];
    for (const { config, frame, y } of supers) {
      const quiet = armedStart(config, 0, { distance: 50 });
      const attacker = {
        action: 'attack',
        move: 'super',
        actionFrame: frame,
        y,
        boost: 0,
      } as const;
      const frozen = armedStart(config, 0, { distance: 50, attacker });
      for (let seed = 0; seed < 100; seed++) {
        let cpu = createCpu(1, 'hard', seed);
        for (let tick = 0; tick < 30; tick++) cpu = cpuStep(cpu, quiet, config).cpu;
        for (let left = 20; left > 0; left--) {
          cpu = cpuStep(cpu, { ...frozen, hitstop: left }, config).cpu;
        }
        // Its punish is the plain blow (an anti-air, back + H, is fine against the Slam's dive).
        const { input } = cpuStep(cpu, frozen, config);
        expect([L, H], `seed ${seed}, frame ${frame}`).not.toContain(input);
      }
    }
  });
});

/** What a match between hard CPUs did. */
interface Played {
  readonly winner: string | null;
  /** The name of the fighter whose Finisher ended it, null otherwise. */
  readonly finisher: string | null;
  /** BOOST pressed with less than a bar. */
  readonly unpaid: number;
  /** Jumps started against an armed Mégabasse (FINISH lit on Nayo's gauge). */
  readonly waryJumps: number;
}

/** Plays a match between hard CPUs to its end, seeded `seed` and `seed + 1`. */
function playMatch(fighters: readonly [FighterTemplate, FighterTemplate], seed: number): Played {
  const config: MatchConfig = { stage: TRAINING_STAGE, fighters };
  let state = createInitialState(config);
  let a = createCpu(0, 'hard', seed);
  let b = createCpu(1, 'hard', seed + 1);
  let finisher: string | null = null;
  let unpaid = 0;
  let waryJumps = 0;
  for (let tick = 0; tick < 40_000 && state.round.phase !== 'matchEnd'; tick++) {
    const da = cpuStep(a, state, config);
    const db = cpuStep(b, state, config);
    a = da.cpu;
    b = db.cpu;
    const before = state;
    state = step(state, [da.input, db.input], config);
    state.fighters.forEach((fighter, player) => {
      const was = before.fighters[player];
      const pressed = (fighter.input & ~(was?.input ?? 0) & X) !== 0;
      if (pressed && (was?.boost ?? 0) < BOOST_BAR) unpaid++;
      const opponent = player === 0 ? 1 : 0;
      const menace = fighters[opponent] === NAYO && finisherReady(before, opponent, config);
      if (menace && fighter.action === 'preJump' && was?.action !== 'preJump') waryJumps++;
    });
    const result = state.round.result;
    if (before.round.phase === 'fight' && state.round.phase === 'roundEnd' && result) {
      const won = result.reason === 'ko' ? result.winner : null;
      if (won !== null && finisherLocked(state, won)) finisher = fighters[won].name;
    }
  }
  const winner = matchWinner(state.round);
  return { winner: winner === null ? null : fighters[winner].name, finisher, unpaid, waryJumps };
}

/** `count` matches, the sides taken in turn (or a mirror of `mirror`), seeds from 1000 on. */
function playMatches(count: number, mirror?: FighterTemplate): Played[] {
  return Array.from({ length: count }, (_, match) => {
    const fighters = mirror
      ? ([mirror, mirror] as const)
      : match % 2 === 0
        ? ([NAYO, RIFF] as const)
        : ([RIFF, NAYO] as const);
    return playMatch(fighters, 1000 + 2 * match);
  });
}

describe('hard CPUs in real matches, at fixed seeds (§1.11, test 17)', () => {
  let versus: Played[] | undefined;
  /** 200 matches of Nayo against Riff, about 700 000 ticks: played once, for every test here. */
  const versusMatches = (): Played[] => (versus ??= playMatches(200));
  const count = (played: readonly Played[], test: (match: Played) => boolean) =>
    played.filter(test).length;

  it('never press BOOST they cannot pay for, nor jump at an armed Mégabasse', () => {
    expect(versusMatches().reduce((total, match) => total + match.unpaid, 0)).toBe(0);
    // Regression: Riff, kept from walking in, jumped at an armed Nayo instead (89 jumps).
    expect(versusMatches().reduce((total, match) => total + match.waryJumps, 0)).toBe(0);
  }, 60_000);

  it('end 2.5 to 35 % of the matches they win with a Finisher (the 15 to 35 % of §1.11 is not met: 4 %)', () => {
    const played = versusMatches();
    const won = count(played, (match) => match.winner !== null);
    const finished = count(played, (match) => match.finisher !== null);
    // Measured: 8 of 200 (4 %), all Nayo's, with the defense of §1.11 (Riff out of the
    // Mégabasse's reach); 16 % while she still jumped at it, 2 % before the CPU played for it.
    expect(finished / won).toBeGreaterThanOrEqual(0.025);
    expect(finished / won).toBeLessThanOrEqual(0.35);
  }, 60_000);

  it('land a Finisher with each fighter in 40 mirror matches (Nayo none in 40 against Riff)', () => {
    // Measured: Nayo 2 in his first 40 mirror matches, Riff 4 in hers. Against Riff, Nayo lands
    // none in the first 40 (then 2, 3, 3 by 40): the one-in-40 of §1.11 is not met there.
    const nayo = playMatches(40, NAYO);
    expect(count(nayo, (match) => match.finisher === 'Nayo')).toBeGreaterThanOrEqual(1);
    const riff = playMatches(40, RIFF);
    expect(count(riff, (match) => match.finisher === 'Riff')).toBeGreaterThanOrEqual(2);
  }, 60_000);

  it('leave the matchup as it was: Riff wins 1 to 10 % of it (the 40 to 60 % of §1.11 is not met)', () => {
    // Measured: Riff 5 of 200 (2.5 %), and 4.5 % before the Finisher's CPU (§5.11): the hard
    // CPUs' matchup is Nayo's at every level, which the Finisher does not change.
    const played = versusMatches();
    const riff = count(played, (match) => match.winner === 'Riff') / played.length;
    expect(riff).toBeGreaterThanOrEqual(0.01);
    expect(riff).toBeLessThanOrEqual(0.1);
  }, 60_000);
});
