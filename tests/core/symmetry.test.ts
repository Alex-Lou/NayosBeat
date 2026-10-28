import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { DIRECTIONS, Input, type InputBits } from '../../src/core/input';
import { moveDuration } from '../../src/core/moves';
import type { GameState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { contactsBy, NAYO_VS_RIFF } from './exchange-helpers';
import { expectMirrored, MIRROR_MATCH, type TickInputs } from './helpers';

const { Up, Down, Left, Right, Light, Heavy, Special, Grab, Dash } = Input;

const RIFF_MIRROR: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, RIFF] };
const RIFF_VS_NAYO: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };

/** `ticks` ticks of inputs, each pair given by `inputs(tick)`. */
function script(ticks: number, inputs: (tick: number) => TickInputs): TickInputs[] {
  return Array.from({ length: ticks }, (_, tick) => inputs(tick));
}

/** `button` pressed on the ticks listed, nothing otherwise. */
function on(ticks: readonly number[], button: InputBits, tick: number): InputBits {
  return ticks.includes(tick) ? button : 0;
}

/**
 * `input` pressed again every other tick from `from` (its direction held between), the way a
 * player keeps a combo going; nothing before.
 */
function mash(input: InputBits, from: number, tick: number): InputBits {
  if (tick < from) return 0;
  return (tick - from) % 2 === 0 ? input : input & DIRECTIONS;
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

/**
 * Each new mechanic of the moves v2 (docs/combat-v2.md §7, §5.5), played as written and in a
 * mirror (§14.7): the direction moves read the side faced, the moves' own hurtboxes and the
 * leap's height are placed by it, the juggle, the chip and the reactions land the same.
 */
describe('P1/P2 symmetry of the moves v2 (§14.7)', () => {
  it('L, L, L: the chain into its finisher', () => {
    const states = expectMirrored(
      script(60, (tick) => [tick < 30 ? mash(Light, 0, tick) : 0, 0]),
      MIRROR_MATCH,
      30,
    );
    expect(performed(states, 0, 'lightFinisher')).toBe(true);
  });

  it('← + H launches, the Uppercut juggles', () => {
    const states = expectMirrored(
      script(90, (tick) => [tick === 0 ? Left | Heavy : mash(Down | Special, 1, tick), 0]),
      NAYO_VS_RIFF,
      30,
    );
    expect(states.some((state) => state.fighters[1].juggle > 0)).toBe(true);
    expect(contactsBy(states, 0).map((contact) => contact.move)).toEqual([
      'backHeavy',
      'specialAntiAir',
    ]);
  });

  it('Glissade: under the Vinyle along her low body, then a PUNITION that trips', () => {
    const states = expectMirrored(
      script(80, (tick) => [on([0], Special, tick), on([12], Special, tick)]),
      NAYO_VS_RIFF,
      110,
    );
    expect(contactsBy(states, 0)).toEqual([]);
    expect(contactsBy(states, 1)).toMatchObject([{ move: 'special', counter: 'punish' }]);
    expect(states.some((state) => state.fighters[0].reaction === 'trip')).toBe(true);
  });

  it("Saut de l'ange: over the Balayage, then onto Nayo recovering", () => {
    const states = expectMirrored(
      script(80, (tick) => [on([4], Down | Heavy, tick), on([0], Left | Special, tick)]),
      NAYO_VS_RIFF,
      60,
    );
    expect(contactsBy(states, 0)).toEqual([]);
    expect(contactsBy(states, 1)).toMatchObject([{ move: 'specialForward', kind: 'hit' }]);
  });

  it('Retourné and Genou montant: a low passes under the boxes that lift her off the floor', () => {
    // Timed so the Coup bas is out on the Retourné's frames 7-8, the Balayage on the Genou's 8-10.
    const retourne = expectMirrored(
      script(40, (tick) => [on([3], Down | Light, tick), on([0], Right | Heavy, tick)]),
      NAYO_VS_RIFF,
      40,
    );
    expect(performed(retourne, 0, 'crouchLight')).toBe(true);
    expect(contactsBy(retourne, 0)).toEqual([]);
    const genou = expectMirrored(
      script(50, (tick) => [on([0], Down | Heavy, tick), on([1], Down | Special, tick)]),
      NAYO_VS_RIFF,
      60,
    );
    expect(performed(genou, 1, 'specialAntiAir')).toBe(true);
    expect(contactsBy(genou, 0)).toEqual([]);
  });

  it('Genou montant: invincible to a jump-in', () => {
    const states = expectMirrored(
      script(70, (tick) => [
        on([16], Down | Special, tick),
        tick < 6 ? Up | Left : on([10], Heavy, tick),
      ]),
      RIFF_MIRROR,
      80,
    );
    expect(contactsBy(states, 0)).toMatchObject([{ move: 'specialAntiAir', counter: 'counter' }]);
    expect(contactsBy(states, 1)).toEqual([]);
  });

  it('chip: a blocked Pied fendu takes 11', () => {
    const states = expectMirrored(
      script(60, (tick) => [on([0], Right | Special, tick), Right]),
      NAYO_VS_RIFF,
      50,
    );
    expect(contactsBy(states, 0)).toMatchObject([{ kind: 'block', damage: 11 }]);
  });

  it('a light never cancels into a normal that steps in: ↓L, then → + L waits', () => {
    const states = expectMirrored(
      script(60, (tick) => [tick === 0 ? Down | Light : mash(Right | Light, 1, tick), 0]),
      RIFF_VS_NAYO,
      36,
    );
    const toprock = states.findIndex((state) => state.fighters[0].move === 'forwardLight');
    expect(states[toprock - 1]?.fighters[0]).toMatchObject({
      move: 'crouchLight',
      actionFrame: moveDuration(RIFF.moves.crouchLight) - 1,
    });
  });
});
