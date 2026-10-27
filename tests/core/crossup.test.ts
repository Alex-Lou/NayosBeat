import { describe, expect, it } from 'vitest';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import type { FighterState, GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff, MIRROR_MATCH } from './helpers';

const { Up, Left, Right, Dash } = Input;

type Posture = 'standing' | 'crouching' | 'lying';

interface CrossUp {
  readonly jumper: FighterTemplate;
  readonly target: FighterTemplate;
  readonly posture: Posture;
  /** Farthest distance, center to center in px, from which the jumper lands behind. */
  readonly range: number;
}

/**
 * The farthest distance from which a forward jump lands behind a still opponent, far from the
 * walls (§3.5). The air pushbox is the only setting: this table pins it. Over a lying opponent
 * (whose body stays under the raised air pushbox) the range is the jump's length itself, 70.4 px
 * for Nayo and 72.8 for Riff (§3.1); §3.5's 76 and 78 were measured with the earlier jump speeds
 * (2.4 and 2.8 px/tick), which §3.1 replaced.
 */
const CROSS_UPS: readonly CrossUp[] = [
  { jumper: NAYO, target: NAYO, posture: 'standing', range: 57 },
  { jumper: NAYO, target: NAYO, posture: 'crouching', range: 65 },
  { jumper: NAYO, target: NAYO, posture: 'lying', range: 70 },
  { jumper: NAYO, target: RIFF, posture: 'standing', range: 59 },
  { jumper: NAYO, target: RIFF, posture: 'crouching', range: 65 },
  { jumper: NAYO, target: RIFF, posture: 'lying', range: 70 },
  { jumper: RIFF, target: NAYO, posture: 'standing', range: 51 },
  { jumper: RIFF, target: NAYO, posture: 'crouching', range: 64 },
  { jumper: RIFF, target: NAYO, posture: 'lying', range: 72 },
  { jumper: RIFF, target: RIFF, posture: 'standing', range: 57 },
  { jumper: RIFF, target: RIFF, posture: 'crouching', range: 67 },
  { jumper: RIFF, target: RIFF, posture: 'lying', range: 72 },
];

/** The target holds its posture for the whole jump (a knockdown lasting long enough). */
function posed(posture: Posture): Partial<FighterState> {
  if (posture === 'crouching') return { action: 'crouch', crouching: true };
  if (posture === 'lying') return { action: 'knockdown', stunFrames: 200 };
  return {};
}

/** Whether a forward jump from `distancePx` ends on the other side of the still target. */
function landsBehind(
  jumper: FighterTemplate,
  target: FighterTemplate,
  posture: Posture,
  distancePx: number,
): boolean {
  const config: MatchConfig = { stage: TRAINING_STAGE, fighters: [jumper, target] };
  let state = facingOff(distancePx, config, [{}, posed(posture)]);
  const hold = posture === 'crouching' ? Input.Down : 0;
  for (let tick = 0; tick < 70; tick++) {
    const jump = tick < jumper.preJumpFrames + 1 ? Input.Up | Input.Right : 0;
    state = step(state, [jump, hold], config);
  }
  const [a, b] = state.fighters;
  expect(a.y, 'the jumper has landed').toBe(0);
  return a.x > b.x;
}

describe('cross-ups (§3.5)', () => {
  const named = CROSS_UPS.map((row) => ({
    ...row,
    label: `${row.jumper.name} over ${row.target.name} ${row.posture}`,
  }));

  it.each(named)('$label: behind up to $range px, in front beyond', (row) => {
    const { jumper, target, posture, range } = row;
    expect(landsBehind(jumper, target, posture, range)).toBe(true);
    expect(landsBehind(jumper, target, posture, range + 1)).toBe(false);
  });

  it.each(named)('$label: behind from point blank on, with no gap', (row) => {
    const { jumper, target, posture, range } = row;
    const contact = (jumper.standingPushbox.width + target.standingPushbox.width) / 2;
    for (let distance = Math.ceil(contact / px(1)); distance <= range; distance++) {
      expect(landsBehind(jumper, target, posture, distance), `${distance} px`).toBe(true);
    }
  });

  it('never crosses a standing opponent without the raised air pushbox', () => {
    const grounded = { ...NAYO, airPushbox: { ...NAYO.standingPushbox, lift: 0 } };
    for (let distance = 30; distance <= 80; distance++) {
      expect(landsBehind(grounded, NAYO, 'standing', distance), `${distance} px`).toBe(false);
    }
  });
});

describe('dashing out of a cross-up (§2.5, §2.6, §3.5)', () => {
  /** Player 1's inputs from `p1(tick)`, player 2's from `p2(tick)`: the state after each tick. */
  function play(
    start: GameState,
    ticks: number,
    p1: (tick: number) => InputBits,
    p2: (tick: number) => InputBits,
  ): GameState[] {
    const states: GameState[] = [];
    let state = start;
    for (let tick = 0; tick < ticks; tick++) {
      state = step(state, [p1(tick), p2(tick)], MIRROR_MATCH);
      states.push(state);
    }
    return states;
  }
  const jumpOver = (tick: number): InputBits => (tick < NAYO.preJumpFrames + 1 ? Up | Right : 0);

  it('backdashes away on the wake-up, with back read from where the jumper landed', () => {
    // Player 2 lies down while player 1 jumps over it: its facing still points left.
    const start = facingOff(60, MIRROR_MATCH, [{}, { action: 'knockdown', stunFrames: 50 }]);
    // Player 1 is on its right by then: away is left, pressed with DASH just before waking up.
    const states = play(start, 75, jumpOver, (tick) => (tick === 46 ? Left | Dash : 0));
    const pressed = states[46];
    expect(pressed && pressed.fighters[0].x > pressed.fighters[1].x).toBe(true);
    const dash = states.findIndex((state) => state.fighters[1].move !== null);
    expect(states[dash]?.fighters[1].move).toBe('dashBack');
    const from = states[dash]?.fighters[1].x ?? 0;
    expect(states.at(-1)?.fighters[1].x).toBe(from - px(44));
  });

  it('backdashes away out of a blockstun whose attacker switched sides', () => {
    // Player 2 blocks with player 1 now on its right, facing the old way (left).
    const start = facingOff(40, MIRROR_MATCH, [
      { x: px(500) },
      { x: px(460), facing: -1, action: 'blockstun', stunFrames: 6 },
    ]);
    const states = play(
      start,
      40,
      () => 0,
      (tick) => (tick === 3 ? Left | Dash : 0),
    );
    const dash = states.find((state) => state.fighters[1].move !== null)?.fighters[1];
    expect(dash).toMatchObject({ move: 'dashBack', facing: 1 });
    expect(states.at(-1)?.fighters[1].x).toBe(px(460) - px(44));
  });

  it('dashes toward the opponent tapped twice before landing behind it', () => {
    const jump = play(facingOff(50, MIRROR_MATCH), 50, jumpOver, () => 0);
    const landing = jump.findIndex((state) => state.fighters[0].action === 'landing');
    // Still in the air and facing right, the jumper taps left twice: toward the opponent.
    const taps = [landing - 3, landing - 1];
    const states = play(
      facingOff(50, MIRROR_MATCH),
      70,
      (tick) => (taps.includes(tick) ? Left : jumpOver(tick)),
      () => 0,
    );
    const dash = states.find((state) => state.fighters[0].move !== null)?.fighters[0];
    expect(dash).toMatchObject({ move: 'dashForward', facing: -1 });
  });
});
