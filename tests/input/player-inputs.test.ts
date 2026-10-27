import { describe, expect, it } from 'vitest';
import { Input } from '../../src/core/input';
import { PadButton } from '../../src/input/gamepad';
import { PlayerInputs } from '../../src/input/player-inputs';

function key(type: 'keydown' | 'keyup', code: string): Event {
  return Object.assign(new Event(type, { cancelable: true }), { code });
}

/** A minimal standard-mapping gamepad holding the given buttons. */
function pad(index: number, pressed: number[] = []): Gamepad {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) }));
  return { index, connected: true, buttons, axes: [0, 0, 0, 0] } as unknown as Gamepad;
}

function setup(pads: Gamepad[] = []) {
  const target = new EventTarget();
  const inputs = new PlayerInputs(target as unknown as Window, undefined, pads);
  return { target, inputs };
}

describe('PlayerInputs', () => {
  it('ignores buttons held when a menu closes until they are released', () => {
    const { target, inputs } = setup();
    // J confirmed the pause menu and is still held when the fight resumes.
    target.dispatchEvent(key('keydown', 'KeyJ'));
    inputs.reset([]);
    expect(inputs.read([])[0]).toBe(0);

    target.dispatchEvent(key('keyup', 'KeyJ'));
    expect(inputs.read([])[0]).toBe(0);
    target.dispatchEvent(key('keydown', 'KeyJ'));
    expect(inputs.read([])[0]).toBe(Input.Light);
  });

  it('keeps held directions live across a menu, so a held guard keeps guarding', () => {
    const { target, inputs } = setup();
    target.dispatchEvent(key('keydown', 'KeyA'));
    inputs.reset([]);
    expect(inputs.read([])[0]).toBe(Input.Left);
  });

  it('drops taps made while the game was not reading', () => {
    const { target, inputs } = setup();
    target.dispatchEvent(key('keydown', 'KeyW'));
    target.dispatchEvent(key('keyup', 'KeyW'));
    inputs.reset([]);
    expect(inputs.read([])[0]).toBe(0);
  });

  it('suppresses a gamepad button held at reset until it is released', () => {
    const { inputs } = setup([pad(0)]);
    inputs.reset([pad(0, [PadButton.South])]);
    expect(inputs.read([pad(0, [PadButton.South])])[0]).toBe(0);
    expect(inputs.read([pad(0)])[0]).toBe(0);
    expect(inputs.read([pad(0, [PadButton.South])])[0]).toBe(Input.Jump);
  });

  it('keeps each gamepad bound to its player when another one disconnects', () => {
    const { inputs } = setup([pad(0), pad(1)]);
    // Player 1's pad (index 0) is gone: player 2's pad must not take over player 1.
    const [player1, player2] = inputs.read([pad(1, [PadButton.West])]);
    expect(player1).toBe(0);
    expect(player2).toBe(Input.Light);
  });

  it('binds a pad connected later to the next free player', () => {
    const { inputs } = setup([pad(3)]);
    const [, player2] = inputs.read([pad(3), pad(7, [PadButton.North])]);
    expect(player2).toBe(Input.Heavy);
  });

  it('passes on a dash or grab press from the keyboard, even shorter than a frame', () => {
    const { target, inputs } = setup();
    target.dispatchEvent(key('keydown', 'ShiftLeft'));
    target.dispatchEvent(key('keyup', 'ShiftLeft'));
    target.dispatchEvent(key('keydown', 'Numpad4'));
    target.dispatchEvent(key('keyup', 'Numpad4'));
    expect(inputs.read([])).toEqual([Input.Dash, Input.Grab]);
  });

  it('passes on the dash and grab bumpers of each pad', () => {
    const { inputs } = setup([pad(0), pad(1)]);
    const pads = [pad(0, [PadButton.LeftBumper]), pad(1, [PadButton.RightBumper])];
    expect(inputs.read(pads)).toEqual([Input.Dash, Input.Grab]);
  });

  it('keeps a held dash or grab from a menu until released', () => {
    const { target, inputs } = setup();
    target.dispatchEvent(key('keydown', 'KeyI'));
    inputs.reset([]);
    expect(inputs.read([])[0]).toBe(0);
  });
});
