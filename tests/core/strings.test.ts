import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/core/commands';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { DIRECTIONS, Input, type InputBits } from '../../src/core/input';
import { PHRASE_MOVE_IDS, type MoveId } from '../../src/core/move-data';
import { branchDirOf, branchMove, moveDuration, moveOf } from '../../src/core/moves';
import { FLAG_MOVE_HIT, type Contact, type Facing } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { playCombo, startsMove, unbroken, type ComboRun } from './combo-helpers';
import { expectMirrored, facingOff } from './helpers';
import { play } from './hold-helpers';

/**
 * The strings (docs/combos-v3.md §1.4), the phrase (§1.2) and the cancel ladder (§1.3): what a
 * button and a direction give once a move has hit or been blocked, and what keeps every string
 * finite. Row 5 of the command table (docs/combat-v2.md §2.8) now reads: L in a cancel gives the
 * string of the direction held.
 */

const { Up, Down, Left, Right, Light: L, Heavy: H, Special: S } = Input;

const NAYO_VS_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const RIFF_VS_NAYO: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };

/** `bits` as held by a fighter facing `facing` (written facing right). */
function held(bits: InputBits, facing: Facing): InputBits {
  if (facing === 1) return bits;
  const left = bits & Left ? Right : 0;
  const right = bits & Right ? Left : 0;
  return (bits & ~(Left | Right)) | left | right;
}

type Row = readonly [during: MoveId, command: Command, held: InputBits, gives: MoveId | null];

/** Each fighter's strings, written facing right; null: the command table and `cancelInto`. */
const STRINGS: readonly (readonly [FighterTemplate, readonly Row[]])[] = [
  [
    NAYO,
    [
      ['standLight', 'light', 0, 'chainLight'],
      ['standLight', 'light', Right, 'chainLight'],
      ['standLight', 'light', Left, 'jabRepeat'],
      ['standLight', 'light', Down, 'crouchLight'],
      ['standLight', 'light', Down | Left, 'crouchLight'],
      ['standLight', 'heavy', 0, null],
      ['jabRepeat', 'light', Left, 'chainLight'],
      ['jabRepeat', 'heavy', Right, 'standHeavy'],
      ['jabRepeat', 'heavy', Down, 'crouchHeavy'],
      ['jabRepeat', 'heavy', Left, 'chainLaunch'],
      ['chainLight', 'light', 0, 'lightFinisher'],
      ['chainLight', 'light', Down | Right, 'lightFinisher'],
      ['chainLight', 'light', Left, 'lightFinisher'],
      ['chainLight', 'heavy', 0, 'standHeavy'],
      ['chainLight', 'heavy', Right, 'chainHigh'],
      ['chainLight', 'heavy', Down, 'crouchHeavy'],
      ['chainLight', 'heavy', Left, 'chainLaunch'],
      ['forwardLight', 'light', Left, 'chainLight'],
      ['forwardLight', 'light', Down, null],
      ['standHeavy', 'heavy', 0, 'chainHeavy'],
      ['standHeavy', 'heavy', Right, 'chainHeavy'],
      ['standHeavy', 'heavy', Down, 'crouchHeavy'],
      ['standHeavy', 'heavy', Left, 'chainLaunch'],
      ['standHeavy', 'light', 0, null],
      ['chainHeavy', 'heavy', 0, null],
      ['standLight', 'special', 0, null],
    ],
  ],
  [
    RIFF,
    [
      ['standLight', 'light', Left, 'chainLight'],
      ['standLight', 'light', Down, null],
      ['chainLight', 'heavy', Right, 'chainHigh'],
      ['chainLight', 'heavy', Left, 'chainLaunch'],
      ['standHeavy', 'heavy', 0, 'chainHeavy'],
      ['standHeavy', 'heavy', Left, 'backHeavy'],
      ['forwardLight', 'light', Right, 'chainLight'],
    ],
  ],
];

describe('strings (combos-v3 §1.4)', () => {
  for (const [template, rows] of STRINGS) {
    for (const [during, command, input, gives] of rows) {
      it(`${template.name}: ${command} with ${input} held during ${during}: ${String(gives)}`, () => {
        // Read relative to the side faced when it was pressed: the same either way.
        for (const facing of [1, -1] as const) {
          const move = moveOf(template, during);
          expect(branchMove(command, held(input, facing), facing, move)).toBe(gives);
        }
      });
    }
  }

  it('read down first, then forward, then back; up never chooses', () => {
    expect(branchDirOf(Down | Right, 1)).toBe('down');
    expect(branchDirOf(Up | Right, 1)).toBe('forward');
    expect(branchDirOf(Up | Left, 1)).toBe('back');
    expect(branchDirOf(Up | Left, -1)).toBe('forward');
    expect(branchDirOf(Up, 1)).toBe('neutral');
  });

  it('pass over `cancelInto`: the Cross cancels into specials only, its strings into normals', () => {
    expect(moveOf(NAYO, 'chainLight').cancelInto).toEqual(['special']);
    const route = playCombo(facingOff(40, NAYO_VS_RIFF), NAYO_VS_RIFF, [L, L, H]);
    expect(route.hits.map((hit) => hit.move)).toEqual(['standLight', 'chainLight', 'standHeavy']);
  });

  it('give way to a fresh motion: during the Direct, ↓↘→ + L throws the Vinyle', () => {
    const motion = [L, Down, Down | Right, Right | L];
    const states = play(facingOff(40, NAYO_VS_RIFF), 30, (t) => [motion[t] ?? 0, 0], NAYO_VS_RIFF);
    const moves = states.map(({ fighters }) => fighters[0].move);
    expect(moves).toContain('special');
    expect(moves).not.toContain('chainLight');
  });

  it('only once the move has touched: a jab in the air does not chain', () => {
    const whiffed = playCombo(facingOff(200, NAYO_VS_RIFF), NAYO_VS_RIFF, [L, Left | L]);
    expect(whiffed.states.some(({ fighters }) => fighters[0].move === 'jabRepeat')).toBe(false);
  });

  it('play the same on both sides: L, ←L, ←L, ←L floors with the Mise au tapis', () => {
    const steps = [L, Left | L, Left | L, Left | L];
    const route = playCombo(facingOff(40, NAYO_VS_RIFF), NAYO_VS_RIFF, steps);
    expect(route.hits.map((hit) => hit.move)).toEqual([
      'standLight',
      'jabRepeat',
      'chainLight',
      'lightFinisher',
    ]);
    expectMirrored(route.inputs, NAYO_VS_RIFF, 40);
  });
});

/**
 * The moves player 1 started as a cancel, in order: before the move playing reached its last
 * frame (a move buffered past it comes out from neutral, a new phrase).
 */
function cancels(route: ComboRun, template: FighterTemplate): MoveId[] {
  const moves: MoveId[] = [];
  route.states.forEach((state, tick) => {
    const before = route.states[tick - 1]?.fighters[0];
    const now = state.fighters[0];
    if (!before?.move || before.action !== 'attack' || !now.move) return;
    const last = moveDuration(moveOf(template, before.move)) - 1;
    if (startsMove(before, now) && before.actionFrame < last) moves.push(now.move);
  });
  return moves;
}

/** Player 1 plays `steps` from `distance` px: the moves it cancelled into. */
function cancelled(steps: readonly InputBits[], config: MatchConfig, distance: number): MoveId[] {
  const route = playCombo(facingOff(distance, config), config, steps);
  return cancels(route, config.fighters[0]);
}

describe('the phrase (combos-v3 §1.2)', () => {
  it('indexes the normals in one integer mask: 31 at most', () => {
    expect(PHRASE_MOVE_IDS.length).toBeLessThanOrEqual(31);
  });

  it('Riff: ↓L, →L, ↓L, →L cancels into the next two, the Toprock never twice', () => {
    const steps = [Down | L, Right | L, Down | L, Right | L];
    expect(cancelled(steps, RIFF_VS_NAYO, 36)).toEqual(['forwardLight', 'crouchLight']);
  });

  it('Nayo: ↓L, →L, ↓L refuses the third: the Jab chassé cancels into the Cross or a special', () => {
    expect(cancelled([Down | L, Right | L, Down | L], NAYO_VS_RIFF, 34)).toEqual(['forwardLight']);
  });

  it('H, H, H refuses the third H; ↓L, ↓L, ↓L the third ↓L', () => {
    expect(cancelled([H, H, H], NAYO_VS_RIFF, 40)).toEqual(['chainHeavy']);
    expect(cancelled([Down | L, Down | L, Down | L], NAYO_VS_RIFF, 34)).toEqual(['crouchLight']);
  });

  it('starts over with a link: ←H ⇢ L, L, L plays the Direct and the Cross again in the air', () => {
    const route = playCombo(facingOff(30, NAYO_VS_RIFF), NAYO_VS_RIFF, [Left | H, L, L, L]);
    expect(route.hits.map((hit) => hit.move)).toEqual([
      'backHeavy',
      'standLight',
      'chainLight',
      'lightFinisher',
    ]);
    expect(unbroken(route)).toBe(true);
  });
});

describe('the cancel ladder (combos-v3 §1.3)', () => {
  it('marks the move that hit, not the one blocked, until the next one starts', () => {
    const hit = playCombo(facingOff(40, NAYO_VS_RIFF), NAYO_VS_RIFF, [L]);
    const landed = hit.states.find((state) => state.contacts.length > 0);
    expect((landed?.fighters[0].flags ?? 0) & FLAG_MOVE_HIT).toBe(FLAG_MOVE_HIT);
    const blocked = playCombo(facingOff(40, NAYO_VS_RIFF), NAYO_VS_RIFF, [L], () => Right);
    const guarded = blocked.states.find((state) => state.contacts.length > 0);
    expect(guarded?.contacts[0]?.kind).toBe('block');
    expect((guarded?.fighters[0].flags ?? 0) & FLAG_MOVE_HIT).toBe(0);
    const next = playCombo(facingOff(40, NAYO_VS_RIFF), NAYO_VS_RIFF, [L, L]);
    const cross = next.states.find(({ fighters }) => fighters[0].move === 'chainLight');
    expect((cross?.fighters[0].flags ?? 0) & FLAG_MOVE_HIT).toBe(0);
  });

  it('never goes down: a special that hit cancels into no normal, nor another special', () => {
    for (const after of [L, H, S, Down | S]) {
      expect(cancelled([Right | S, after], NAYO_VS_RIFF, 50)).toEqual([]);
    }
  });
});

/**
 * Player 1 plays L, L, then `third`, on a player 2 who guards (crouching if `low`) and, once the
 * third blow starts, mashes `reply`: the first blow that hits after the guarded ones.
 */
function afterGuard(
  config: MatchConfig,
  third: InputBits,
  low: boolean,
  reply: InputBits,
): Contact | null {
  let state = facingOff(40, config);
  const steps = [L, L, third];
  let next = 0;
  for (let tick = 0; tick < 160; tick++) {
    const input = steps[next];
    const attack = input === undefined ? 0 : tick % 2 === 0 ? input : input & DIRECTIONS;
    const out = state.fighters[0].move === 'chainHigh' || state.fighters[0].move === 'crouchHeavy';
    const guarding = state.fighters[1].action === 'blockstun' || !out;
    const guard = guarding ? Right | (low ? Down : 0) : tick % 2 === 0 ? reply : reply & DIRECTIONS;
    const before = state.fighters[0];
    state = step(state, [attack, guard], config);
    if (input !== undefined && startsMove(before, state.fighters[0])) next++;
    const hit = state.contacts.find((contact) => contact.kind === 'hit');
    if (hit) return hit;
  }
  return null;
}

describe('the Marteau after a Cross guarded (combos-v3 §0.4, 8)', () => {
  const NAYO_MIRROR: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, NAYO] };

  it('beats a mashed jab: a CONTRE on it', () => {
    expect(afterGuard(NAYO_VS_RIFF, Right | H, false, L)).toMatchObject({
      by: 0,
      move: 'chainHigh',
      counter: 'counter',
    });
    expect(afterGuard(NAYO_MIRROR, Right | H, false, L)).toMatchObject({
      by: 0,
      move: 'chainHigh',
    });
  });

  it('loses to an invincible reversal: the Uppercut goes through its gap of 2 ticks', () => {
    expect(afterGuard(NAYO_MIRROR, Right | H, false, Down | S)).toMatchObject({
      by: 1,
      move: 'specialAntiAir',
      counter: 'counter',
    });
  });

  it('the Balayage after it is a true string: nothing gets out of the guard', () => {
    expect(afterGuard(NAYO_MIRROR, Down | H, true, Down | S)).toBeNull();
  });
});
