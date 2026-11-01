import { describe, expect, it } from 'vitest';
import { planFor, playString, startString } from '../../src/ai/plans';
import type { CpuLevel } from '../../src/ai/profiles';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import type { MoveId } from '../../src/core/move-data';
import { FLAG_MOVE_HIT, type FighterState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { playCpuMatches } from '../core/cpu-match';
import { makeFighter } from '../core/helpers';

/**
 * The CPU's strings and juggles (docs/combos-v3.md §6.4): the plans each level draws after a
 * move that connected, how a plan is played step by step, and that the strings and the juggles
 * do come out in matches between hard CPUs.
 */

const { Light: L, Heavy: H, Special: S, Boost: X, Dash: R, Down: D, Left: B, Right: F } = Input;

/** Nayo's `move` just connected on a standing Riff 40 px away (hit unless told), `boost` held. */
function connected(move: MoveId, hit = true, boost = 0): FighterState {
  return makeFighter({
    action: 'attack',
    move,
    actionFrame: 6,
    moveConnected: true,
    flags: hit ? FLAG_MOVE_HIT : 0,
    boost,
  });
}

const RIFF_HIT = makeFighter({ x: makeFighter().x + 4000, action: 'hitstun', stunTotal: 14 });

/** Every plan `level` draws for `me` over many seeds, by its steps. */
function drawn(me: FighterState, level: CpuLevel, opponent = RIFF_HIT): Set<string> {
  const plans = new Set<string>();
  for (let seed = 0; seed < 200; seed++) {
    plans.add(planFor(me, opponent, NAYO, level, seed * 7919).steps.join(' '));
  }
  return plans;
}

const written = (steps: readonly InputBits[]): string => steps.join(' ');

describe('the plans (§6.4)', () => {
  it('easy plays the beginner routes alone after the Direct: L, L, L and L, L → →S', () => {
    expect(drawn(connected('standLight'), 'easy')).toEqual(
      new Set([written([L, L]), written([L, F | S])]),
    );
  });

  it('normal adds the strings, hard the juggles too', () => {
    const normal = drawn(connected('standLight'), 'normal');
    const hard = drawn(connected('standLight'), 'hard');
    expect(normal).toContain(written([L, H, H, F | S]));
    expect(normal).not.toContain(written([L, B | H, L, L, F | H, L, L, L]));
    expect(hard).toContain(written([L, B | H, L, L, F | H, L, L, L]));
  });

  it('a Direct blocked ends high or low, at random: the 50/50 without a motion', () => {
    expect(drawn(connected('standLight', false), 'hard')).toEqual(
      new Set([written([L, F | H]), written([L, D | H])]),
    );
  });

  it('the Crochet as a CONTRE folds the opponent: the whole phrase follows', () => {
    const folded = makeFighter({ ...RIFF_HIT, stunTotal: NAYO.moves.standHeavy.hitstun + 16 });
    expect(drawn(connected('standHeavy'), 'hard', folded)).toContain(written([L, L, H, H, F | S]));
    expect(drawn(connected('standHeavy'), 'hard')).not.toContain(written([L, L, H, H, F | S]));
  });

  it('with no plan: the special if the move cancels into one, as before, else nothing', () => {
    expect(planFor(connected('forwardHeavy'), RIFF_HIT, NAYO, 'hard', 1).steps).toEqual([]);
    const stranger = { ...RIFF, name: 'Inconnue' };
    const jab = { ...connected('standLight'), facing: 1 as const };
    expect(planFor(jab, RIFF_HIT, stranger, 'hard', 1).steps).toEqual([S]);
  });
});

describe('the plans that spend the gauge (§6.4)', () => {
  const spends = (plan: string) => plan.split(' ').some((step) => (Number(step) & (X | R)) !== 0);

  it('come only with the bars they spend: normal the Remixes, hard the Rewind and super too', () => {
    expect([...drawn(connected('standLight'), 'hard')].filter(spends)).toEqual([]);
    const normal = drawn(connected('standLight', true, 1000), 'normal');
    expect(normal).toContain(written([L, H, H, X]));
    expect([...normal].filter(spends)).toEqual([written([L, H, H, X])]);
    const hard = drawn(connected('standLight', true, 1000), 'hard');
    expect(hard).toContain(written([L, H, R, L, L, H, H, F | S]));
    expect(hard).toContain(written([L, H, H, F | X, L, D | S]));
    expect(hard).not.toContain(written([L, H, H, B | X]));
    expect(drawn(connected('standLight', true, 3000), 'hard')).toContain(written([L, H, H, B | X]));
  });

  it('hard keeps two bars for its super: it spends no single one then', () => {
    const saving = [...drawn(connected('standLight', true, 2500), 'hard')].filter(spends);
    expect(saving).toEqual([]);
    expect([...drawn(connected('standLight', true, 2500), 'normal')].filter(spends)).not.toEqual(
      [],
    );
  });

  it('the Rewind only while the sequence has not spent it, a second super never', () => {
    const rewound = { ...connected('standLight', true, 1000), flags: FLAG_MOVE_HIT | 1 };
    expect(drawn(rewound, 'hard')).not.toContain(written([L, H, R, L, L, H, H, F | S]));
    const superDone = { ...connected('standLight', true, 3000), flags: FLAG_MOVE_HIT | 2 };
    expect(drawn(superDone, 'hard')).not.toContain(written([L, H, H, B | X]));
  });
});

describe('a plan played (§6.4)', () => {
  it('presses each step again every other tick until its move comes out, turned to the side', () => {
    const facingLeft = { ...connected('standLight'), facing: -1 as const };
    let play = startString([B | L, L], facingLeft);
    const inputs: InputBits[] = [];
    for (let tick = 0; tick < 4; tick++) {
      const { input, next } = playString(play, facingLeft, RIFF_HIT);
      inputs.push(input);
      if (!next) throw new Error('The plan stopped');
      play = next;
    }
    // Back is to the right, facing left: the press, then its direction held.
    expect(inputs).toEqual([Input.Right | L, Input.Right, Input.Right | L, Input.Right]);
    // Its move comes out, then connects: the next step.
    const repeat = { ...facingLeft, move: 'jabRepeat' as const, actionFrame: 0 };
    const out = playString(play, repeat, RIFF_HIT).next;
    if (!out) throw new Error('The plan stopped');
    const landed = { ...repeat, actionFrame: 6, moveConnected: true };
    expect(playString(out, landed, RIFF_HIT).input).toBe(L);
  });

  it('is given up once the CPU is hit, or once its last move is out', () => {
    const play = startString([L], connected('standLight'));
    expect(playString(play, makeFighter({ action: 'hitstun' }), RIFF_HIT).next).toBeNull();
    const cross = { ...connected('standLight'), move: 'chainLight' as const, actionFrame: 0 };
    expect(playString(play, cross, RIFF_HIT).next).toBeNull();
  });

  it('follows up nothing until the move connects, and gives up once it missed', () => {
    const cross = { ...connected('standLight'), move: 'chainLight' as const, actionFrame: 0 };
    const out = playString(startString([L, H, H], connected('standLight')), cross, RIFF_HIT);
    if (!out.next) throw new Error('The plan stopped');
    // The Cross on its way, not connected yet: nothing pressed, nothing buffered from a whiff.
    const coming = { ...cross, actionFrame: 5, moveConnected: false };
    const waiting = playString(out.next, coming, RIFF_HIT);
    expect(waiting.input).toBe(0);
    if (!waiting.next) throw new Error('The plan stopped');
    // It ended without touching: the combo dropped, the CPU decides again.
    const free = makeFighter({ action: 'idle' });
    expect(playString(waiting.next, free, RIFF_HIT).next).toBeNull();
  });

  it('follows the Rewind at once: it cancels without contact', () => {
    const play = startString([R, L], connected('standHeavy'));
    const rewind = { ...connected('standHeavy'), move: 'boostCancel' as const, actionFrame: 0 };
    const out = playString(play, rewind, RIFF_HIT).next;
    if (!out) throw new Error('The plan stopped');
    const stepping = { ...rewind, actionFrame: 1, moveConnected: false };
    expect(playString(out, stepping, RIFF_HIT).input).toBe(L);
  });

  it('plays a link only while the opponent still reels from the blow', () => {
    // The Remontant landed, Nayo is free again: the phrase in the air, if the body is still up.
    const play = startString([L, L, L], connected('backHeavy'));
    const free = makeFighter({ action: 'idle' });
    const flying = { ...RIFF_HIT, action: 'airHit' as const };
    expect(playString(play, free, flying).input).toBe(L);
    const landed = { ...RIFF_HIT, action: 'idle' as const };
    expect(playString(play, free, landed).next).toBeNull();
  });
});

describe('the gauge in a match', () => {
  it('hard CPUs spend every Boost move of both fighters, never a press they cannot pay for', () => {
    const spent: [Set<MoveId>, Set<MoveId>] = [new Set(), new Set()];
    for (const fighters of [
      [NAYO, RIFF],
      [RIFF, NAYO],
    ] as const) {
      const config: MatchConfig = { stage: TRAINING_STAGE, fighters };
      let before: readonly FighterState[] | null = null;
      playCpuMatches(200_000, config, ['hard', 'hard'], (state) => {
        state.fighters.forEach((fighter, player) => {
          const template = fighters[player === 0 ? 0 : 1];
          const move = fighter.move ? template.moves[fighter.move] : undefined;
          if (fighter.move && move?.boostCost) spent[template === NAYO ? 0 : 1].add(fighter.move);
          // BOOST newly pressed: the gauge pays for a Remix at least.
          const was = before?.[player];
          const pressed = (fighter.input & ~(was?.input ?? 0) & X) !== 0;
          if (pressed)
            expect(was?.boost ?? 0, `${template.name} pressed BOOST`).toBeGreaterThanOrEqual(1000);
        });
        before = state.fighters;
      });
    }
    const all = [
      'specialBoost',
      'specialForwardBoost',
      'specialAntiAirBoost',
      'boostCancel',
      'super',
    ] as const;
    expect([...spent[0]].sort()).toEqual([...all].sort());
    expect([...spent[1]].sort()).toEqual([...all].sort());
  });

  it('hard CPUs build 1.2 to 3 bars a round, each fighter 40 to 60 % of it (combos-v3 §6.2)', () => {
    // What each fighter's gauge gained, in points, and the rounds played, both sides in turn.
    const built = new Map([
      [NAYO, 0],
      [RIFF, 0],
    ]);
    let rounds = 0;
    for (const fighters of [
      [NAYO, RIFF],
      [RIFF, NAYO],
    ] as const) {
      const config: MatchConfig = { stage: TRAINING_STAGE, fighters };
      let before: readonly FighterState[] | null = null;
      let phase = '';
      playCpuMatches(300_000, config, ['hard', 'hard'], (state) => {
        state.fighters.forEach((fighter, player) => {
          const gained = fighter.boost - (before?.[player]?.boost ?? fighter.boost);
          const template = fighters[player === 0 ? 0 : 1];
          if (gained > 0) built.set(template, (built.get(template) ?? 0) + gained);
        });
        if (state.round.phase === 'roundEnd' && phase !== 'roundEnd') rounds++;
        phase = state.round.phase;
        before = state.fighters;
      });
    }
    const nayo = built.get(NAYO) ?? 0;
    const riff = built.get(RIFF) ?? 0;
    const bars = (nayo + riff) / 2 / 1000 / rounds;
    expect(rounds).toBeGreaterThan(100);
    expect(bars).toBeGreaterThanOrEqual(1.2);
    expect(bars).toBeLessThanOrEqual(3);
    const share = nayo / (nayo + riff);
    expect(share).toBeGreaterThanOrEqual(0.4);
    expect(share).toBeLessThanOrEqual(0.6);
    // 600 000 ticks of play: about 2 s here, more on a loaded CI runner.
  }, 30_000);
});

describe('the strings in a match', () => {
  it('hard CPUs play every string and juggle of both fighters', () => {
    const config: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
    const played: [Set<MoveId>, Set<MoveId>] = [new Set(), new Set()];
    let airborne = 0;
    // Long enough for the routes drawn only up close (the Double direct's, within 46 px), while
    // most of a CPU's Directs land from farther.
    playCpuMatches(100_000, config, ['hard', 'hard'], (state) => {
      state.fighters.forEach((fighter, player) => {
        if (fighter.move) played[player === 0 ? 0 : 1].add(fighter.move);
      });
      if (state.contacts.some((contact) => contact.kind === 'hit')) {
        airborne += state.fighters.filter((fighter) => fighter.juggle > 0).length;
      }
    });
    for (const move of ['jabRepeat', 'chainHeavy', 'chainHigh', 'chainLaunch'] as const) {
      expect(played[0].has(move), `Nayo's ${move}`).toBe(true);
    }
    for (const move of ['chainHeavy', 'chainHigh', 'chainLaunch'] as const) {
      expect(played[1].has(move), `Riff's ${move}`).toBe(true);
    }
    expect(airborne).toBeGreaterThan(0);
  });
});
