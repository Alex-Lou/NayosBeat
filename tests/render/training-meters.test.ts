import { describe, expect, it } from 'vitest';
import { Input, type InputBits } from '../../src/core/input';
import { step } from '../../src/core/step';
import { EMPTY_METER, QUIET_TICKS, trackFrames, type Cell } from '../../src/render/frame-meter';
import {
  buttonsOf,
  directionOf,
  HISTORY_LINES,
  MAX_LINE_TICKS,
  nextHistory,
  type InputLine,
} from '../../src/render/input-history';
import { facingOff, MIRROR_MATCH } from '../core/helpers';

const NAYO = MIRROR_MATCH.fighters[0];

describe('input history (docs/polish/AUDIT-ET-PLAN.md, lot 13)', () => {
  /** The history after holding each input of `inputs` one tick. */
  function played(inputs: readonly InputBits[]): readonly InputLine[] {
    return inputs.reduce<readonly InputLine[]>((history, bits) => nextHistory(history, bits), []);
  }

  it('writes one line per change, newest first, with the ticks it was held', () => {
    const down = Input.Down;
    const downForward = Input.Down | Input.Right;
    const special = Input.Right | Input.Special;
    const history = played([down, down, down, downForward, downForward, special, 0]);
    expect(history).toEqual([
      { bits: 0, ticks: 1 },
      { bits: special, ticks: 1 },
      { bits: downForward, ticks: 2 },
      { bits: down, ticks: 3 },
    ]);
  });

  it('keeps 12 lines, and counts a held line up to 99', () => {
    const many = played(Array.from({ length: 30 }, (_, tick) => (tick % 2 ? Input.Light : 0)));
    expect(many).toHaveLength(HISTORY_LINES);
    const held = played(Array.from({ length: 150 }, () => Input.Down));
    expect(held).toEqual([{ bits: Input.Down, ticks: MAX_LINE_TICKS }]);
  });

  it('reads the direction as on a keypad, and names the buttons as the touch buttons do', () => {
    expect(directionOf(0)).toBe(5);
    expect(directionOf(Input.Down | Input.Right)).toBe(3);
    expect(directionOf(Input.Up | Input.Left)).toBe(7);
    expect(directionOf(Input.Right)).toBe(6);
    expect(buttonsOf(Input.Light | Input.Heavy)).toBe('L H');
    expect(buttonsOf(Input.Grab | Input.Down)).toBe('PRISE');
    expect(buttonsOf(Input.Down)).toBe('');
  });
});

describe('frame meter (docs/polish/AUDIT-ET-PLAN.md, lot 13)', () => {
  /** Player 1 (Nayo) presses `command` once on a guarding player 2: the meter afterwards. */
  function exchange(command: InputBits, guard: InputBits) {
    let state = facingOff(30, MIRROR_MATCH);
    let meter = EMPTY_METER;
    for (let tick = 0; tick < 120; tick++) {
      state = step(state, [tick === 0 ? command : 0, guard], MIRROR_MATCH);
      meter = trackFrames(meter, state, MIRROR_MATCH);
    }
    return meter;
  }

  const count = (cells: readonly Cell[], kind: Cell) =>
    cells.filter((cell) => cell === kind).length;
  /** The first cell from which the fighter stays free. */
  const freeFrom = (cells: readonly Cell[]) =>
    cells.length - [...cells].reverse().findIndex((cell) => cell !== 'free');

  it('draws a blocked Uppercut as its frame data: 3 startup, 8 active, 28 recovery, 12 + 1 stun', () => {
    const { cells } = exchange(Input.Down | Input.Special, Input.Down | Input.Right);
    const move = NAYO.moves.specialAntiAir;
    expect(count(cells[0], 'startup')).toBe(move.startup);
    expect(count(cells[0], 'active')).toBe(move.active);
    expect(count(cells[0], 'recovery')).toBe(move.recovery);
    // The tick of the contact, then its blockstun.
    expect(count(cells[1], 'stun')).toBe(move.blockstun + 1);
  });

  it('shows the advantage as the gap between both fighters freed: 23 ticks behind', () => {
    const { cells } = exchange(Input.Down | Input.Special, Input.Down | Input.Right);
    expect(freeFrom(cells[1]) - freeFrom(cells[0])).toBe(-23);
  });

  it('keeps the exchange on screen once both fighters are free a while', () => {
    const meter = exchange(Input.Light, Input.Down | Input.Right);
    expect(meter.quiet).toBe(QUIET_TICKS);
    expect(meter.cells[0].slice(-QUIET_TICKS).every((cell) => cell === 'free')).toBe(true);
    expect(meter.cells[0]).toContain('active');
  });

  it('starts empty and draws nothing while nobody acts', () => {
    let state = facingOff(200, MIRROR_MATCH);
    let meter = EMPTY_METER;
    for (let tick = 0; tick < 30; tick++) {
      state = step(state, [0, 0], MIRROR_MATCH);
      meter = trackFrames(meter, state, MIRROR_MATCH);
    }
    expect(meter).toBe(EMPTY_METER);
  });
});
