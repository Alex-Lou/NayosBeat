import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../../src/core/input';
import { step } from '../../src/core/step';
import { assignButton, assignKey, DEFAULT_BINDINGS, type Bindings } from '../../src/input/bindings';
import { ControlsStore, DEFAULT_CONTROLS } from '../../src/input/controls-store';
import { PadButton } from '../../src/input/gamepad-buttons';
import { KeyboardInput, PLAYER1_KEYS, PLAYER2_KEYS } from '../../src/input/keyboard';
import { PlayerInputs } from '../../src/input/player-inputs';
import { fightState, MATCH } from '../core/helpers';

function key(type: 'keydown' | 'keyup', code: string): Event {
  return Object.assign(new Event(type, { cancelable: true }), { code });
}

/** A standard-mapping gamepad holding `pressed`. */
function pad(index: number, pressed: number[] = []): Gamepad {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) }));
  return { index, connected: true, buttons, axes: [0, 0, 0, 0] } as unknown as Gamepad;
}

/** Player 2 lights on B, player 1 jumps on LT. */
function remapped(): Bindings {
  const keys = assignKey(DEFAULT_BINDINGS, 1, 'light', 'KeyB');
  if (!keys.ok) throw new Error('refused');
  const button = assignButton(keys.bindings, 0, 'jump', PadButton.LeftTrigger);
  if (!button.ok) throw new Error('refused');
  return button.bindings;
}

/** A store of the page, its storage `kept`. */
function store(bindings?: Bindings): ControlsStore {
  const kept = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (name: string) => kept.get(name) ?? null,
    setItem: (name: string, value: string) => kept.set(name, value),
  });
  const controls = new ControlsStore();
  if (bindings) controls.set({ ...DEFAULT_CONTROLS, bindings });
  return controls;
}

describe('a remapped key in a fight (P24)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('acts as the action it was given, and the old key no longer does', () => {
    const target = new EventTarget();
    const inputs = new PlayerInputs(target as unknown as Window, undefined, [], store(remapped()));
    target.dispatchEvent(key('keydown', 'KeyB'));
    expect(inputs.read([])[1]).toBe(Input.Light);
    target.dispatchEvent(key('keyup', 'KeyB'));
    target.dispatchEvent(key('keydown', 'Numpad1'));
    expect(inputs.read([])[1]).toBe(0);
  });

  it('reaches the core as the same bits: the fighter attacks', () => {
    const target = new EventTarget();
    const inputs = new PlayerInputs(target as unknown as Window, undefined, [], store(remapped()));
    let state = fightState(MATCH);
    target.dispatchEvent(key('keydown', 'KeyB'));
    state = step(state, inputs.read([]), MATCH);
    expect(state.fighters[1].action).toBe('attack');
    expect(state.fighters[1].move).toBe('standLight');
  });

  it("applies a gamepad's remapped button, and leaves the other player's pad alone", () => {
    const inputs = new PlayerInputs(
      new EventTarget() as unknown as Window,
      undefined,
      [],
      store(remapped()),
    );
    const pads = [pad(0, [PadButton.LeftTrigger]), pad(1, [PadButton.LeftTrigger])];
    expect(inputs.read(pads)).toEqual([Input.Jump, 0]);
    expect(inputs.read([pad(0, [PadButton.South]), pad(1, [PadButton.South])])).toEqual([
      0,
      Input.Jump,
    ]);
  });

  it('takes the keys changed under the pause, as the fight resumes', () => {
    const controls = store();
    const target = new EventTarget();
    const inputs = new PlayerInputs(target as unknown as Window, undefined, [], controls);
    controls.set({ ...DEFAULT_CONTROLS, bindings: remapped() });
    inputs.reset([]);
    target.dispatchEvent(key('keydown', 'KeyB'));
    expect(inputs.read([])[1]).toBe(Input.Light);
  });

  it('stops listening to the store once disposed', () => {
    const controls = store();
    const inputs = new PlayerInputs(
      new EventTarget() as unknown as Window,
      undefined,
      [],
      controls,
    );
    expect(controls.listenerCount).toBe(1);
    inputs.dispose();
    expect(controls.listenerCount).toBe(0);
    controls.set(DEFAULT_CONTROLS);
  });
});

describe('KeyboardInput.setBindings', () => {
  it('lets go of the keys held: one no longer bound would stay held for ever', () => {
    const target = new EventTarget();
    const keyboard = new KeyboardInput(target as unknown as Window, [PLAYER1_KEYS, PLAYER2_KEYS]);
    target.dispatchEvent(key('keydown', 'KeyD'));
    keyboard.setBindings([{}, PLAYER2_KEYS]);
    // Its key-up is no longer heard: without the release, D would hold right for ever.
    target.dispatchEvent(key('keyup', 'KeyD'));
    keyboard.setBindings([PLAYER1_KEYS, PLAYER2_KEYS]);
    expect(keyboard.read(0)).toBe(0);
  });
});
