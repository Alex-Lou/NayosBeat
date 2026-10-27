import { describe, expect, it } from 'vitest';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import type { FighterState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff } from './helpers';

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
