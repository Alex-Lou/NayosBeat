import { describe, expect, it } from 'vitest';
import { cpuStep, createCpu, type CpuBehavior, type CpuState } from '../../src/ai/cpu';
import { nextRandom } from '../../src/ai/rng';
import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import type { FighterAction, GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { playCpuMatches } from '../core/cpu-match';
import { facingOff, fightState, MATCH, MIRROR_MATCH } from '../core/helpers';

/** Plays `ticks` ticks with player 2 driven by the CPU and player 1 by `player1`. */
function playAgainstCpu(
  behavior: CpuBehavior,
  ticks: number,
  player1: (frame: number) => InputBits = () => 0,
  start: GameState = fightState(),
  config: MatchConfig = MATCH,
  seed = 42,
): { state: GameState; cpu: CpuState; inputs: InputBits[] } {
  let state = start;
  let cpu = createCpu(1, behavior, seed);
  const inputs: InputBits[] = [];
  for (let frame = 0; frame < ticks; frame++) {
    const decision = cpuStep(cpu, state, config);
    cpu = decision.cpu;
    inputs.push(decision.input);
    state = step(state, [player1(frame), decision.input], config);
  }
  return { state, cpu, inputs };
}

/** Two CPUs fight each other. */
function cpuVersusCpu(levelA: CpuBehavior, levelB: CpuBehavior, ticks: number, seed: number) {
  let state = fightState();
  let a = createCpu(0, levelA, seed);
  let b = createCpu(1, levelB, seed + 1);
  for (let i = 0; i < ticks && state.round.phase !== 'matchEnd'; i++) {
    const da = cpuStep(a, state, MATCH);
    const db = cpuStep(b, state, MATCH);
    a = da.cpu;
    b = db.cpu;
    state = step(state, [da.input, db.input], MATCH);
  }
  return state;
}

describe('rng', () => {
  it('is deterministic and stays in [0, 1)', () => {
    let seed = 7;
    const values: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const [value, next] = nextRandom(seed);
      values.push(value);
      seed = next;
    }
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(nextRandom(7)).toEqual(nextRandom(7));
    expect(new Set(values).size).toBeGreaterThan(990);
  });
});

/** Not in neutral: sent flying, down, hit or blocking. */
const STUNNED: ReadonlySet<FighterAction> = new Set<FighterAction>([
  'knockdown',
  'airHit',
  'hitstun',
  'blockstun',
]);

describe('cpu', () => {
  it('makes the same decisions for the same seed', () => {
    expect(playAgainstCpu('normal', 1500).inputs).toEqual(playAgainstCpu('normal', 1500).inputs);
  });

  it('plays differently with another seed', () => {
    const a = playAgainstCpu('normal', 1500, () => 0, fightState(), MATCH, 1).inputs;
    const b = playAgainstCpu('normal', 1500, () => 0, fightState(), MATCH, 2).inputs;
    expect(a).not.toEqual(b);
  });

  it('does nothing outside the fight phase', () => {
    const intro = { ...fightState(), round: { ...fightState().round, phase: 'intro' as const } };
    expect(cpuStep(createCpu(1, 'hard', 1), intro, MATCH).input).toBe(0);
  });

  it('attacks an idle opponent', () => {
    const { state } = playAgainstCpu('normal', 1800);
    expect(state.fighters[0].health).toBeLessThan(MATCH.fighters[0].maxHealth);
  });

  it('finishes a match against another CPU', () => {
    const state = cpuVersusCpu('hard', 'hard', 99 * 60 * 3 + 2000, 11);
    expect(state.round.phase).toBe('matchEnd');
  });

  it('never gets stuck with the command table of combat v2: it attacks every 3 s at most', () => {
    // §13.4: in neutral (out of a hold, a knockdown, a stun, the round's end), each CPU starts a
    // move: the time it spends hit or blocking is the opponent's pressure, not its stalling.
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const quiet: [number, number] = [0, 0];
      const longest: [number, number] = [0, 0];
      playCpuMatches(6000, MATCH, [level, level], (state) => {
        for (const player of [0, 1] as const) {
          const fighter = state.fighters[player];
          const busy =
            fighter.move !== null || state.hold !== null || state.round.phase !== 'fight';
          const down = STUNNED.has(fighter.action);
          quiet[player] = busy || down ? 0 : quiet[player] + 1;
          longest[player] = Math.max(longest[player], quiet[player]);
        }
      });
      expect(Math.max(...longest), level).toBeLessThan(180);
    }
  });

  it('beats an easy CPU more often when set to hard', () => {
    let hardWins = 0;
    for (let seed = 0; seed < 6; seed++) {
      const state = cpuVersusCpu('hard', 'easy', 99 * 60 * 3 + 2000, seed * 100);
      if (state.round.wins[0] > state.round.wins[1]) hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(4);
  });
});

describe('cpu perception: it guards on what it saw, with its reaction time', () => {
  /**
   * Player 1 starts its Overhand (19 ticks of startup) while the CPU is still blocking. The CPU
   * first watches 30 quiet ticks, as in a match: a CPU that has seen nothing yet sees tick 0.
   */
  function overheadOnBlock(level: CpuBehavior, seed: number) {
    const start = facingOff(40, MATCH, [
      { action: 'attack', move: 'forwardHeavy', actionFrame: 0 },
      { action: 'blockstun', stunFrames: 30, stunTotal: 30 },
    ]);
    const quiet = facingOff(40, MATCH, [{}, { action: 'blockstun', stunFrames: 30 }]);
    let cpu = createCpu(1, level, seed);
    for (let tick = 0; tick < 30; tick++) cpu = cpuStep(cpu, quiet, MATCH).cpu;
    let state = start;
    const inputs: InputBits[] = [];
    for (let tick = 0; tick < 30; tick++) {
      const decision = cpuStep(cpu, state, MATCH);
      cpu = decision.cpu;
      inputs.push(decision.input);
      state = step(state, [0, decision.input], MATCH);
    }
    return { state, inputs };
  }

  it('an overhead it has not seen yet catches the easy CPU in its low guard', () => {
    // Regression: it read the live attacker, standing at tick 0 of any overhead, at every level.
    let hits = 0;
    for (let seed = 0; seed < 50; seed++) {
      const { state } = overheadOnBlock('easy', seed);
      if (state.fighters[1].health < MATCH.fighters[1].maxHealth) hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(40);
  });

  it('never stands up for an overhead before its reaction time', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      for (let seed = 0; seed < 20; seed++) {
        const { inputs } = overheadOnBlock(level, seed);
        const firstStand = inputs.findIndex((input) => (input & Input.Down) === 0);
        if (firstStand >= 0)
          expect(firstStand, `${level}, seed ${seed}`).toBeGreaterThanOrEqual(12);
      }
    }
  });

  it('the hard CPU still blocks a 19-tick overhead it sees coming', () => {
    let blocked = 0;
    for (let seed = 0; seed < 50; seed++) {
      const { state } = overheadOnBlock('hard', seed);
      if (state.fighters[1].health === MATCH.fighters[1].maxHealth) blocked++;
    }
    expect(blocked).toBeGreaterThanOrEqual(40);
  });
});

describe('cpu punish', () => {
  /** How often, over 100 seeds, the CPU hurts player 1 while its move still recovers. */
  function punishRate(
    level: CpuBehavior,
    move: string,
    frame: number,
    blockstun: number,
    at: number,
  ) {
    let punished = 0;
    for (let seed = 0; seed < 100; seed++) {
      const start = facingOff(at, MATCH, [
        { action: 'attack', move: move as never, actionFrame: frame, moveConnected: blockstun > 0 },
        blockstun > 0 ? { action: 'blockstun', stunFrames: blockstun, stunTotal: blockstun } : {},
      ]);
      let state = start;
      let cpu = createCpu(1, level, seed * 7919 + 3);
      for (let tick = 0; tick < 45 && state.fighters[0].action === 'attack'; tick++) {
        const decision = cpuStep(cpu, state, MATCH);
        cpu = decision.cpu;
        state = step(state, [0, decision.input], MATCH);
      }
      if (state.fighters[0].health < start.fighters[0].health) punished++;
    }
    return punished;
  }

  it('the hard CPU punishes a blocked Uppercut (−23) and a blocked sweep (−8)', () => {
    expect(punishRate('hard', 'specialAntiAir', 11, 12, 34)).toBeGreaterThanOrEqual(80);
    expect(punishRate('hard', 'crouchHeavy', 12, 14, 34)).toBeGreaterThanOrEqual(80);
  });

  it('punishes more often the higher its level', () => {
    const [easy, normal, hard] = (['easy', 'normal', 'hard'] as const).map((level) =>
      punishRate(level, 'crouchHeavy', 12, 14, 34),
    );
    expect(easy).toBeLessThan(normal ?? 0);
    expect(normal).toBeLessThan(hard ?? 0);
  });

  it('never punishes a move that is safe on block (the Direct, +1)', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      expect(punishRate(level, 'standLight', 6, 10, 34), level).toBe(0);
    }
  });

  it('the hard CPU punishes a whiffed Uppercut in its reach', () => {
    expect(punishRate('hard', 'specialAntiAir', 11, 0, 40)).toBeGreaterThanOrEqual(60);
  });
});

describe('training dummies', () => {
  it('the standing dummy never presses anything', () => {
    const { inputs } = playAgainstCpu('dummyStand', 300, (f) => (f % 30 === 0 ? Input.Light : 0));
    expect(inputs.every((i) => i === 0)).toBe(true);
  });

  it('the blocking dummy blocks a standing heavy', () => {
    const start = facingOff(40, MIRROR_MATCH);
    const { state } = playAgainstCpu(
      'dummyBlock',
      40,
      (f) => (f === 0 ? Input.Heavy : 0),
      start,
      MIRROR_MATCH,
    );
    expect(state.fighters[1].health).toBe(MIRROR_MATCH.fighters[1].maxHealth);
  });

  it('the blocking dummy crouch-blocks a sweep', () => {
    const start = facingOff(40, MIRROR_MATCH);
    const { state } = playAgainstCpu(
      'dummyBlock',
      40,
      (f) => (f === 0 ? Input.Down | Input.Heavy : f < 20 ? Input.Down : 0),
      start,
      MIRROR_MATCH,
    );
    expect(state.fighters[1].health).toBe(MIRROR_MATCH.fighters[1].maxHealth);
  });
});

describe('cpu movement', () => {
  /** Every move both CPUs start over a few hard matches. */
  function movesUsed(seeds: number): Set<string> {
    const used = new Set<string>();
    for (let seed = 0; seed < seeds; seed++) {
      let state = fightState();
      let a = createCpu(0, 'hard', seed);
      let b = createCpu(1, 'hard', seed + 1);
      for (let i = 0; i < 99 * 60 && state.round.phase !== 'matchEnd'; i++) {
        const da = cpuStep(a, state, MATCH);
        const db = cpuStep(b, state, MATCH);
        a = da.cpu;
        b = db.cpu;
        state = step(state, [da.input, db.input], MATCH);
        for (const fighter of state.fighters) if (fighter.move) used.add(fighter.move);
      }
    }
    return used;
  }

  it('dashes in and backdashes out of pressure, with the buttons', () => {
    const used = movesUsed(4);
    expect(used.has('dashForward')).toBe(true);
    expect(used.has('dashBack')).toBe(true);
    expect(used.has('grab')).toBe(true);
    // Its holds: knees, then a throw.
    expect(used.has('pummel')).toBe(true);
    expect(used.has('throwForward') || used.has('throwBack')).toBe(true);
  });

  it('backdashes away from the attacker after blocking a cross-up', () => {
    // The CPU (player 2) ends a blockstun with player 1 now on its right: it still faces left.
    const start = facingOff(30, MIRROR_MATCH, [
      { x: px(490) },
      { x: px(460), facing: -1, action: 'blockstun', stunFrames: 0 },
    ]);
    // A seed whose first draw backdashes at every level.
    const seed = Array.from({ length: 100 }, (_, s) => s).find((s) => nextRandom(s)[0] < 0.05);
    if (seed === undefined) throw new Error('No seed draws low enough');
    const { state } = playAgainstCpu('hard', 1, () => 0, start, MIRROR_MATCH, seed);
    expect(state.fighters[1]).toMatchObject({ move: 'dashBack', facing: 1 });
  });

  it('does not take a dash for an attack', () => {
    // The opponent dashes in from mid range: a blocking dummy has nothing to block.
    const start = facingOff(150, MIRROR_MATCH);
    const { inputs } = playAgainstCpu(
      'dummyBlock',
      16,
      (f) => (f === 0 ? Input.Dash : 0),
      start,
      MIRROR_MATCH,
    );
    expect(inputs.every((input) => input === 0)).toBe(true);
  });
});
