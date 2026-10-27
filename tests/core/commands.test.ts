import { describe, expect, it } from 'vitest';
import { pressedButton, readInput, type Command } from '../../src/core/commands';
import { px } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import {
  DASH_TAP_WINDOW,
  DIRECTION_HISTORY_FRAMES,
  INPUT_BUFFER_FRAMES,
} from '../../src/core/rules';
import type { FighterState } from '../../src/core/state';
import { makeFighter, repeat } from './helpers';

const { Up, Down, Left, Right, Light, Heavy, Special, Jump, Grab, Dash } = Input;

/** Where the opponent stands unless told: in front of the fighter, on the side it faces. */
function ahead(fighter: FighterState): number {
  return fighter.x + fighter.facing * px(100);
}

/** The opponent of the default fighter (`makeFighter()`), in front of it. */
const OPPONENT = ahead(makeFighter());

/** Reads one input per tick; returns the commands pressed, with the tick of each. */
function commandsOf(
  inputs: readonly InputBits[],
  fighter: FighterState = makeFighter(),
  hitstop: readonly boolean[] = [],
  opponentX = ahead(fighter),
): [number, Command][] {
  const commands: [number, Command][] = [];
  let current = fighter;
  inputs.forEach((input, tick) => {
    current = readInput(current, input, !(hitstop[tick] ?? false), opponentX);
    // A press refills the buffer: that is how a command shows.
    if (current.bufferFrames === INPUT_BUFFER_FRAMES && current.bufferedCommand) {
      commands.push([tick, current.bufferedCommand]);
    }
  });
  return commands;
}

/** A tap of `direction`, `gap` neutral ticks, then a second tap, each held `hold` ticks. */
function doubleTap(direction: InputBits, gap: number, hold = 1): InputBits[] {
  return [...repeat(direction, hold), ...repeat(0, gap), ...repeat(direction, hold), 0];
}

describe('pressedButton', () => {
  it('reads each attack button', () => {
    expect(pressedButton(Light, Light)).toBe('light');
    expect(pressedButton(Heavy, Heavy)).toBe('heavy');
    expect(pressedButton(Special, Special)).toBe('special');
  });

  it('reads light + heavy as a grab, even when one of them was already held', () => {
    expect(pressedButton(Light | Heavy, Light | Heavy)).toBe('grab');
    expect(pressedButton(Heavy, Light | Heavy)).toBe('grab');
  });

  it('prefers the special, then the heavy, on the same tick', () => {
    expect(pressedButton(Light | Special, Light | Special)).toBe('special');
    expect(pressedButton(Heavy | Special, Heavy | Special)).toBe('special');
  });

  it('only counts new presses', () => {
    expect(pressedButton(0, Light)).toBeNull();
    expect(pressedButton(Jump | Right, Jump | Right)).toBeNull();
  });

  it('reads the grab button as a grab, before everything else on the same tick', () => {
    expect(pressedButton(Grab, Grab)).toBe('grab');
    expect(pressedButton(Grab | Special | Heavy, Grab | Special | Heavy)).toBe('grab');
    expect(pressedButton(0, Grab)).toBeNull();
  });
});

describe('same-tick priority (§2.5)', () => {
  it('reads grab > special > heavy > light > dash > jump', () => {
    const order: [InputBits, Command][] = [
      [Grab | Special | Heavy | Dash | Jump, 'grab'],
      [Special | Heavy | Dash | Jump, 'special'],
      [Heavy | Dash | Jump, 'heavy'],
      [Light | Dash | Jump, 'light'],
      [Dash | Jump, 'dash'],
      [Jump, 'jump'],
    ];
    for (const [input, command] of order) expect(commandsOf([input])).toEqual([[0, command]]);
  });
});

describe('dash button', () => {
  it('dashes toward the opponent, held direction aside', () => {
    for (const held of [0, Right, Up, Down, Down | Right]) {
      expect(commandsOf([held | Dash])).toEqual([[0, 'dash']]);
    }
  });

  it('backdashes with back held, on either side', () => {
    expect(commandsOf([Left | Dash])).toEqual([[0, 'backdash']]);
    expect(commandsOf([Down | Left | Dash])).toEqual([[0, 'backdash']]);
    expect(commandsOf([Right | Dash], makeFighter({ facing: -1 }))).toEqual([[0, 'backdash']]);
    expect(commandsOf([Left | Dash], makeFighter({ facing: -1 }))).toEqual([[0, 'dash']]);
  });

  it("reads back from the opponent's real side, not from a facing left over by a cross-up", () => {
    // Still facing right, as after a knockdown or a blockstun, the opponent now on the left.
    const crossedUp = makeFighter({ facing: 1, action: 'knockdown' });
    const onTheLeft = px(360);
    expect(commandsOf([Right | Dash], crossedUp, [], onTheLeft)).toEqual([[0, 'backdash']]);
    expect(commandsOf([Left | Dash], crossedUp, [], onTheLeft)).toEqual([[0, 'dash']]);
    expect(commandsOf([Dash], crossedUp, [], onTheLeft)).toEqual([[0, 'dash']]);
  });

  it('dashes on the press only, not while held', () => {
    expect(commandsOf(repeat(Dash, 20))).toEqual([[0, 'dash']]);
  });
});

describe('double tap (§2.6)', () => {
  it('dashes with a second tap up to 12 ticks after the first', () => {
    // Second press 12 ticks after the first: 11 neutral ticks in between.
    expect(commandsOf(doubleTap(Right, DASH_TAP_WINDOW - 1))).toEqual([[DASH_TAP_WINDOW, 'dash']]);
    expect(commandsOf(doubleTap(Right, 1))).toEqual([[2, 'dash']]);
  });

  it('does not dash 13 ticks after the first tap', () => {
    expect(commandsOf(doubleTap(Right, DASH_TAP_WINDOW))).toEqual([]);
  });

  it('counts the window from the first press, not from its release', () => {
    expect(commandsOf(doubleTap(Right, 3, 6))).toEqual([[9, 'dash']]);
    expect(commandsOf(doubleTap(Right, 3, 10))).toEqual([]);
    // Walking a long time, letting go, then tapping: no dash.
    expect(commandsOf([...repeat(Right, 60), 0, Right, 0])).toEqual([]);
  });

  it('backdashes with a double tap away from the opponent', () => {
    expect(commandsOf(doubleTap(Left, 2))).toEqual([[3, 'backdash']]);
    expect(commandsOf(doubleTap(Right, 2), makeFighter({ facing: -1 }))).toEqual([[3, 'backdash']]);
  });

  it("reads the tap's side against the opponent's real side after a cross-up", () => {
    const crossedUp = makeFighter({ facing: 1, action: 'air', y: px(20) });
    const onTheLeft = px(360);
    expect(commandsOf(doubleTap(Left, 2), crossedUp, [], onTheLeft)).toEqual([[3, 'dash']]);
    expect(commandsOf(doubleTap(Right, 2), crossedUp, [], onTheLeft)).toEqual([[3, 'backdash']]);
  });

  it('needs a tick without any direction between the two taps', () => {
    expect(commandsOf([Right, Right, Right])).toEqual([]);
    expect(commandsOf([Right, Down | Right, Right])).toEqual([]);
    expect(commandsOf([Right, Down, Right])).toEqual([]);
  });

  it('never dashes on a quarter circle, twice in a row, nor on → ↗ →', () => {
    const quarterCircle = [Down, Down | Right, Right];
    expect(commandsOf([...quarterCircle, 0])).toEqual([]);
    expect(commandsOf([...quarterCircle, ...quarterCircle, 0])).toEqual([]);
    // Up just pressed is a jump: only the dashes are looked at.
    const dashes = commandsOf([Right, Up | Right, Right, 0]).filter(([, c]) => c !== 'jump');
    expect(dashes).toEqual([]);
  });

  it('does not mix the two sides', () => {
    expect(commandsOf([Right, 0, Left, 0, Right, 0])).toEqual([]);
  });

  it('dashes once per double tap: a third tap starts over', () => {
    expect(commandsOf([Right, 0, Right, 0, Right, 0])).toEqual([[2, 'dash']]);
    expect(commandsOf([Right, 0, Right, 0, Right, 0, Right, 0])).toEqual([
      [2, 'dash'],
      [6, 'dash'],
    ]);
  });

  it('does not age during hitstop, and still sees the taps made in it', () => {
    const inputs = doubleTap(Right, 20);
    const frozen = inputs.map((_, tick) => tick >= 1 && tick <= 20);
    expect(commandsOf(inputs, makeFighter(), frozen)).toEqual([[21, 'dash']]);
  });

  it('keeps its state in three fields, bounded', () => {
    let fighter = makeFighter();
    for (let i = 0; i < 500; i++)
      fighter = readInput(fighter, i % 3 === 0 ? Right : 0, true, OPPONENT);
    expect(fighter.tapFrames).toBeLessThanOrEqual(DASH_TAP_WINDOW + 1);
    fighter = makeFighter();
    for (let i = 0; i < 500; i++) fighter = readInput(fighter, Right, true, OPPONENT);
    expect(fighter).toMatchObject({ tapDirection: 1, tapFrames: DASH_TAP_WINDOW + 1 });
  });
});

describe('jump command', () => {
  it('is pressed with the jump button or up, once per press', () => {
    expect(commandsOf([Jump, Jump, 0])).toEqual([[0, 'jump']]);
    expect(commandsOf([Up, Up, Up | Right])).toEqual([[0, 'jump']]);
    expect(commandsOf([Right, Up | Right])).toEqual([[1, 'jump']]);
  });
});

describe('readInput', () => {
  it('buffers a press with the direction, motion and side it was made with', () => {
    const fighter = makeFighter({ directionHistory: [Down, Down | Right] });
    const read = readInput(fighter, Right | Light, true, OPPONENT);
    expect(read).toMatchObject({
      input: Right | Light,
      bufferedCommand: 'light',
      bufferFrames: INPUT_BUFFER_FRAMES,
      bufferedInput: Right | Light,
      bufferedMotion: 'quarterCircleForward',
      bufferedFacing: 1,
    });
  });

  it('forgets the press once the buffer runs out, but not during hitstop', () => {
    let fighter = readInput(makeFighter(), Light, true, OPPONENT);
    for (let i = 0; i < 20; i++) fighter = readInput(fighter, Light, false, OPPONENT);
    expect(fighter.bufferedCommand).toBe('light');
    for (let i = 0; i < INPUT_BUFFER_FRAMES; i++)
      fighter = readInput(fighter, Light, true, OPPONENT);
    expect(fighter.bufferedCommand).toBeNull();
  });

  it('keeps the last ticks of directions only, without the buttons', () => {
    let fighter = makeFighter();
    for (let i = 0; i < DIRECTION_HISTORY_FRAMES; i++)
      fighter = readInput(fighter, Down, true, OPPONENT);
    fighter = readInput(fighter, Right | Light, true, OPPONENT);
    expect(fighter.directionHistory).toHaveLength(DIRECTION_HISTORY_FRAMES);
    expect(fighter.directionHistory.at(-1)).toBe(Right);
    expect(fighter.directionHistory.at(-2)).toBe(Down);
  });
});
