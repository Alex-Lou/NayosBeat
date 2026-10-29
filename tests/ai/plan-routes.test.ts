import { describe, expect, it } from 'vitest';
import { cpuStep, createCpu, type CpuState } from '../../src/ai/cpu';
import { PLANS, plansFor, startString, type Plan } from '../../src/ai/plans';
import type { MatchConfig } from '../../src/core/config';
import { DIRECTIONS, Input, type InputBits } from '../../src/core/input';
import type { MoveId } from '../../src/core/move-data';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { startsMove } from '../core/combo-helpers';
import { facingOff } from '../core/helpers';

/**
 * Every CPU plan (docs/combos-v3.md §6.4) played on the engine, at every distance its opening
 * lands from and its `when` allows: player 0 lands the plan's `after` move, then plays the plan
 * the way the CPU does (`cpuStep`, the plan forced), and each step's move must come out and
 * connect. A plan that would drop at some distance needs a `maxDistancePx`. And a plan that
 * drops all the same is given up after the one blow that missed.
 */

const { Light: L, Heavy: H, Down: D, Left: B, Right: F } = Input;

/** The input of each move a plan starts after, facing right. */
const OPENINGS: Readonly<Partial<Record<MoveId, InputBits>>> = {
  standLight: L,
  forwardLight: F | L,
  crouchLight: D | L,
  standHeavy: H,
  backHeavy: B | H,
};

/** Ticks given to the opening to connect, and to the plan to play out. */
const OPENING_TICKS = 60;
const PLAN_TICKS = 400;
/** Ticks left to the last step's move to connect, once the plan is over. */
const SETTLE_TICKS = 60;
/** Farther than any blow reaches. */
const MAX_DISTANCE = 90;

/**
 * What the opponent (player 1, on the right, facing left) does for the plan's `when`: it starts
 * a blow to be caught in (a CONTRE), crouches, guards (back is right), or stands still.
 */
function opponentFor({ when }: Plan): (tick: number) => InputBits {
  if (when.counter) return (tick) => (tick === 4 ? H : 0);
  if (when.crouching) return () => D;
  if (!when.hit) return () => F;
  return () => 0;
}

/** How a plan played out: its steps' moves that came out, and those that connected. */
interface PlanRun {
  readonly came: number;
  readonly connected: number;
}

/**
 * Plays `plan` of player 0 from `distancePx`; null when its opening does not connect, or the plan
 * does not apply there (unless `forced`).
 */
function playPlan(
  plan: Plan,
  config: MatchConfig,
  distancePx: number,
  forced = false,
): PlanRun | null {
  const opponent = opponentFor(plan);
  const opening = OPENINGS[plan.after];
  if (opening === undefined) throw new Error(`No opening for ${plan.after}`);
  // With the gauge the plan spends, no more.
  let state: GameState = facingOff(distancePx, config, [{ boost: plan.when.minBoost ?? 0 }, {}]);
  let tick = 0;
  let came = 0;
  let connected = 0;
  let counted = true;
  const advance = (input: InputBits): void => {
    const was = state.fighters[0];
    state = step(state, [input, opponent(tick)], config);
    tick++;
    const now = state.fighters[0];
    if (startsMove(was, now)) {
      came++;
      counted = false;
      // The Rewind strikes nothing: it connects the steps around it.
      if (now.move && config.fighters[0].moves[now.move]?.kind === 'movement') {
        connected++;
        counted = true;
      }
    }
    // Its blow, or its projectile, hit or was blocked.
    if (!counted && (now.moveConnected || state.contacts.some((contact) => contact.by === 0))) {
      connected++;
      counted = true;
    }
  };
  // The opening, pressed until it connects and the game moves again.
  for (let pressed = 0; ; pressed++) {
    const me = state.fighters[0];
    if (me.move === plan.after && me.moveConnected && state.hitstop === 0) break;
    if (pressed >= OPENING_TICKS) return null;
    advance(me.move === plan.after ? 0 : pressed % 2 === 0 ? opening : opening & DIRECTIONS);
  }
  const [me, them] = state.fighters;
  if (!forced && !plansFor(me, them, config.fighters[0]).includes(plan)) return null;
  came = 0;
  connected = 0;
  let cpu: CpuState = {
    ...createCpu(0, 'hard', 1),
    cancelHandled: true,
    string: startString(plan.steps, me),
  };
  for (let i = 0; i < PLAN_TICKS && cpu.string; i++) {
    const decision = cpuStep(cpu, state, config);
    cpu = decision.cpu;
    // Once the plan is over, what the CPU decides next is not the plan's.
    advance(cpu.string ? decision.input : 0);
  }
  for (let i = 0; i < SETTLE_TICKS; i++) advance(0);
  return { came, connected };
}

const MATCHES: readonly MatchConfig[] = [
  { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] },
  { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] },
];

describe('every plan, at every distance it is drawn from', () => {
  for (const config of MATCHES) {
    const { name } = config.fighters[0];
    (PLANS[name] ?? []).forEach((plan, index) => {
      it(`${name}'s plan ${index} after the ${plan.after}: every step comes out and connects`, () => {
        const distances: number[] = [];
        for (let distance = 1; distance <= MAX_DISTANCE; distance++) {
          const run = playPlan(plan, config, distance);
          if (!run) continue;
          distances.push(distance);
          const whole = { came: plan.steps.length, connected: plan.steps.length };
          expect(run, `at ${distance} px`).toEqual(whole);
        }
        expect(distances.length, 'drawn at some distance').toBeGreaterThan(0);
      });
    });
  }
});

describe('a plan that drops', () => {
  it('is given up after the blow that missed: the Quatre temps from 50 px', () => {
    const [config] = MATCHES;
    const quatreTemps = PLANS['Nayo']?.find((plan) => plan.steps.length === 8);
    if (!config || !quatreTemps) throw new Error('No Quatre temps');
    // The Cross comes out and lands; the Remontant chassé comes out and misses: nothing more.
    expect(playPlan(quatreTemps, config, 50, true)).toEqual({ came: 2, connected: 1 });
  });
});
