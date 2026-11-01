import { describe, expect, it } from 'vitest';
import { Input, type InputBits } from '../../src/core/input';
import type { MoveData } from '../../src/core/move-data';
import { step } from '../../src/core/step';
import {
  advantageText,
  NO_ADVANTAGE,
  trackAdvantage,
  type Advantage,
} from '../../src/render/advantage-meter';
import { facingOff, MIRROR_MATCH } from '../core/helpers';

const NAYO = MIRROR_MATCH.fighters[0];

/** The advantage on block that the frame data gives, the blow landing on its first active tick. */
function onBlock(move: MoveData): number {
  return move.blockstun - (move.active - 1 + move.recovery);
}

/**
 * Player 1 (Nayo, on the left) presses `command` once; player 2 holds `guard` (back, or down
 * and back) and blocks it. The meter as it stands once the exchange closes.
 */
function blocked(command: InputBits, guard: InputBits, distancePx = 30): Advantage {
  let state = facingOff(distancePx, MIRROR_MATCH);
  let meter = NO_ADVANTAGE;
  for (let tick = 0; tick < 120 && meter.last === null; tick++) {
    state = step(state, [tick === 0 ? command : 0, guard], MIRROR_MATCH);
    meter = trackAdvantage(meter, state);
  }
  return meter;
}

describe('advantage meter (docs/polish/AUDIT-ET-PLAN.md, P19)', () => {
  const BACK = Input.Right;
  const LOW = Input.Down | Input.Right;

  it('reads the frame data of a blocked blow, plus or minus', () => {
    const cases: [string, InputBits, InputBits, MoveData][] = [
      ['Direct', Input.Light, LOW, NAYO.moves.standLight],
      ['Crochet', Input.Heavy, LOW, NAYO.moves.standHeavy],
      ['Coup bas', Input.Down | Input.Light, LOW, NAYO.moves.crouchLight],
      ['Balayage', Input.Down | Input.Heavy, LOW, NAYO.moves.crouchHeavy],
      ['Uppercut', Input.Down | Input.Special, LOW, NAYO.moves.specialAntiAir],
    ];
    for (const [name, command, guard, move] of cases) {
      expect(blocked(command, guard).last, name).toBe(onBlock(move));
    }
  });

  it('says « -23 » after a blocked Uppercut, « +1 » after a blocked Direct', () => {
    expect(advantageText(blocked(Input.Down | Input.Special, LOW).last ?? 0)).toBe(
      'Avantage : -23',
    );
    expect(advantageText(blocked(Input.Light, BACK).last ?? 0)).toBe('Avantage : +1');
  });

  it('measures nothing while no blow has landed or been blocked', () => {
    let state = facingOff(200, MIRROR_MATCH);
    let meter = NO_ADVANTAGE;
    for (let tick = 0; tick < 60; tick++) {
      state = step(state, [tick === 0 ? Input.Light : 0, 0], MIRROR_MATCH);
      meter = trackAdvantage(meter, state);
    }
    expect(meter).toEqual(NO_ADVANTAGE);
  });

  it('writes its sign, never resting on its color alone', () => {
    expect(advantageText(0)).toBe('Avantage : ±0');
    expect(advantageText(5)).toBe('Avantage : +5');
    expect(advantageText(-8)).toBe('Avantage : -8');
  });
});
