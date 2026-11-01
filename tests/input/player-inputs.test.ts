import { describe, expect, it, vi } from 'vitest';
import { Input } from '../../src/core/input';
import { PadButton } from '../../src/input/gamepad';
import { PlayerInputs } from '../../src/input/player-inputs';
import { TouchControls } from '../../src/input/touch-controls';
import { TOUCH_BUTTONS } from '../../src/input/touch-layout';
import { installFakePage } from '../render/fake-dom';

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

  it("names each player's own gamepad, to rumble that one alone (P23)", () => {
    const { inputs } = setup([pad(2), pad(5)]);
    const pads = [pad(5), pad(2)];
    expect(inputs.padOf(0, pads)?.index).toBe(2);
    expect(inputs.padOf(1, pads)?.index).toBe(5);
    // Player 1's pad unplugged: nobody else's rumbles for it.
    expect(inputs.padOf(0, [pad(5)])).toBeUndefined();
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

  it('keeps a gamepad press polled between two reads, as a key tapped: once', () => {
    // Slowed down, the fight reads every few frames: the button is pressed and released between.
    const { inputs } = setup([pad(0)]);
    inputs.poll([pad(0)]);
    inputs.poll([pad(0, [PadButton.West])]);
    inputs.poll([pad(0)]);
    expect(inputs.read([pad(0)])[0]).toBe(Input.Light);
    expect(inputs.read([pad(0)])[0]).toBe(0);
  });

  it('shows a gamepad button let go at the next read, polled held or not', () => {
    // Above 60 Hz, frames without a tick come between two reads: a release there must show, or
    // the neutral between the two taps of a dash is lost.
    const { inputs } = setup([pad(0)]);
    inputs.poll([pad(0, [PadButton.West])]);
    expect(inputs.read([pad(0, [PadButton.West])])[0]).toBe(Input.Light);
    inputs.poll([pad(0, [PadButton.West])]);
    inputs.poll([pad(0)]);
    expect(inputs.read([pad(0)])[0]).toBe(0);
  });

  it('forgets the gamepad presses polled while a menu was open', () => {
    const { inputs } = setup([pad(0)]);
    inputs.poll([pad(0, [PadButton.West])]);
    inputs.reset([pad(0)]);
    expect(inputs.read([pad(0)])[0]).toBe(0);
  });

  it('keeps a held dash or grab from a menu until released', () => {
    const { target, inputs } = setup();
    target.dispatchEvent(key('keydown', 'KeyI'));
    inputs.reset([]);
    expect(inputs.read([])[0]).toBe(0);
  });
});

describe('what each player holds, on any frame (docs/finisher.md §1.14)', () => {
  it('reads the buttons held down, not a tap, without taking it from the next read', () => {
    const { target, inputs } = setup();
    target.dispatchEvent(key('keydown', 'KeyJ'));
    expect(inputs.held([])[0]).toBe(Input.Light);
    target.dispatchEvent(key('keyup', 'KeyJ'));
    // Released before any tick read it: no longer held, on every frame until the next read
    // (a frame without a tick would count it towards the skip), but the tap is still there.
    expect(inputs.held([])[0]).toBe(0);
    expect(inputs.held([])[0]).toBe(0);
    expect(inputs.read([])[0]).toBe(Input.Light);
    expect(inputs.held([])[0]).toBe(0);
  });

  it('leaves a tap on the touch controls to the next read', () => {
    const page = installFakePage();
    const touch = new TouchControls(page.body as unknown as HTMLElement, undefined);
    const buttons = page.body.children[0]?.children[2];
    if (!buttons) throw new Error('No button zone');
    buttons.rect = { left: 333, top: 0, right: 667, bottom: 375 };
    const inputs = new PlayerInputs(new EventTarget() as unknown as Window, touch, []);
    const dash = TOUCH_BUTTONS.find((button) => button.flag === Input.Dash);
    if (!dash) throw new Error('No DASH button');
    const at = { pointerId: 1, clientX: 667 - dash.right, clientY: 375 - dash.bottom };
    buttons.dispatchEvent(Object.assign(new Event('pointerdown'), at));
    expect(inputs.held([])[0]).toBe(Input.Dash);
    buttons.dispatchEvent(Object.assign(new Event('pointerup'), at));
    expect(inputs.held([])[0]).toBe(0);
    expect(inputs.read([])[0]).toBe(Input.Dash);
    expect(inputs.read([])[0]).toBe(0);
    vi.unstubAllGlobals();
  });

  it('leaves out a button held across a menu, as a read does', () => {
    const { target, inputs } = setup();
    target.dispatchEvent(key('keydown', 'KeyJ'));
    inputs.reset([]);
    expect(inputs.held([])[0]).toBe(0);
  });
});
