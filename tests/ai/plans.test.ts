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

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F } = Input;

/** Nayo's `move` just connected on a standing Riff 40 px away (hit unless told). */
function connected(move: MoveId, hit = true): FighterState {
  return makeFighter({
    action: 'attack',
    move,
    actionFrame: 6,
    moveConnected: true,
    flags: hit ? FLAG_MOVE_HIT : 0,
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
