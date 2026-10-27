import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { expectMirrored, MIRROR_MATCH, type TickInputs } from './helpers';

const { Up, Down, Left, Right, Light, Heavy, Grab, Dash } = Input;

const RIFF_MIRROR: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, RIFF] };

/** `ticks` ticks of inputs, each pair given by `inputs(tick)`. */
function script(ticks: number, inputs: (tick: number) => TickInputs): TickInputs[] {
  return Array.from({ length: ticks }, (_, tick) => inputs(tick));
}

/** `button` pressed on the ticks listed, nothing otherwise. */
function on(ticks: readonly number[], button: InputBits, tick: number): InputBits {
  return ticks.includes(tick) ? button : 0;
}

/** Whether player `player` performed `move` at some point. */
function performed(states: readonly GameState[], player: 0 | 1, move: string): boolean {
  return states.some((state) => state.fighters[player].move === move);
}

/**
 * Each new mechanic of §3, played as written and in a mirror (§14.7): the side a player starts
 * on never earns them a sub-pixel, a frame or a point of health. The dash curves move by odd
 * sub-pixels, so contacts split odd overlaps: what the even walk speeds never showed.
 */
describe('P1/P2 symmetry of the movement v2 (§14.7)', () => {
  it('dash: five dashes pushing an idle opponent', () => {
    const presses = [0, 20, 40, 60, 80];
    const states = expectMirrored(
      script(110, (tick) => [on(presses, Dash, tick), 0]),
      MIRROR_MATCH,
      30,
    );
    expect(performed(states, 0, 'dashForward')).toBe(true);
  });

  it('backdash: out of the way of a dash coming in', () => {
    const states = expectMirrored(
      script(40, (tick) => [on([0], Left | Dash, tick), on([0], Dash, tick)]),
      MIRROR_MATCH,
      40,
    );
    expect(performed(states, 0, 'dashBack')).toBe(true);
    expect(performed(states, 1, 'dashForward')).toBe(true);
  });

  it('double tap: a dash into the opponent from two taps', () => {
    const states = expectMirrored(
      script(30, (tick) => [on([0, 2], Right, tick), 0]),
      MIRROR_MATCH,
      30,
    );
    expect(performed(states, 0, 'dashForward')).toBe(true);
  });

  it("footwork: Riff's dash cancelled into a jab that glides into the opponent", () => {
    const states = expectMirrored(
      script(40, (tick) => [on([0], Dash, tick) | on([8], Light, tick), 0]),
      RIFF_MIRROR,
      80,
    );
    expect(performed(states, 0, 'standLight')).toBe(true);
    expect(states.some((state) => state.fighters[1].action === 'hitstun')).toBe(true);
  });

  it('proximity guard: holding back stops in the guard, then blocks', () => {
    const states = expectMirrored(
      script(40, (tick) => [Left, on([0], Heavy, tick)]),
      MIRROR_MATCH,
      45,
    );
    const actions = states.map((state) => state.fighters[0].action);
    expect(actions).toContain('guard');
    expect(actions).toContain('blockstun');
  });

  it('cross-up: a jump over a crouching opponent, who backdashes once it has landed', () => {
    const states = expectMirrored(
      script(70, (tick) => [tick < 5 ? Up | Right : 0, Down | on([40], Left | Dash, tick)]),
      MIRROR_MATCH,
      50,
    );
    const landed = states[39];
    expect(landed && landed.fighters[0].x > landed.fighters[1].x).toBe(true);
    expect(performed(states, 1, 'dashBack')).toBe(true);
  });

  it('throw protection: a grab on the wake-up whiffs', () => {
    // Pressed so that its 3 active ticks (from frame 5, §4.3) fall in the protection.
    const states = expectMirrored(
      script(30, (tick) => [on([6, 7, 8], Grab, tick), 0]),
      MIRROR_MATCH,
      30,
      [{}, { action: 'knockdown', stunFrames: 10 }],
    );
    expect(performed(states, 0, 'grab')).toBe(true);
    expect(states.at(-1)?.fighters[1].health).toBe(MIRROR_MATCH.fighters[1].maxHealth);
  });
});
