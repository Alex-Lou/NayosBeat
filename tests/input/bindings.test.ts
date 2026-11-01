import { describe, expect, it } from 'vitest';
import { Input } from '../../src/core/input';
import {
  ACTIONS,
  assignButton,
  assignKey,
  DEFAULT_BINDINGS,
  DEFAULT_KEYS,
  DEFAULT_PAD,
  isAssignableKey,
  keyFlags,
  resetKeys,
  resetPad,
  type Assigned,
  type Bindings,
} from '../../src/input/bindings';
import { PadButton } from '../../src/input/gamepad-buttons';
import { KEY_NAMES } from '../../src/input/key-names';
import { PLAYER1_KEYS, PLAYER2_KEYS } from '../../src/input/keyboard';
import { DRAWN_KEYS } from '../../src/ui/keyboard-drawing';

/** The bindings of an accepted change; fails the test on a refusal. */
function accepted(result: Assigned): Bindings {
  if (!result.ok) throw new Error(`Refused: ${result.refusal.kind}`);
  return result.bindings;
}

describe('the bindings as data (P24)', () => {
  it('give the keyboard its keys of always', () => {
    expect(PLAYER1_KEYS).toMatchObject({ KeyW: Input.Up, Space: Input.Jump, KeyO: Input.Boost });
    expect(PLAYER2_KEYS).toMatchObject({ Numpad1: Input.Light, Period: Input.Light });
    expect(keyFlags(DEFAULT_KEYS[1])['ArrowUp']).toBe(Input.Up);
  });

  it('draw and name every key a player may take, and no pause key', () => {
    const drawn = new Set(DRAWN_KEYS.map(({ code }) => code));
    const assignable = Object.keys(KEY_NAMES).filter(isAssignableKey);
    expect(assignable.filter((code) => !drawn.has(code))).toEqual([]);
    expect(assignable).not.toContain('KeyP');
    expect(assignable).not.toContain('Escape');
    // Every default key can be taken back.
    for (const keys of DEFAULT_KEYS) {
      for (const action of ACTIONS)
        for (const code of keys[action]) expect(isAssignableKey(code)).toBe(true);
    }
  });
});

describe('assignKey (P24: conflicts refused, Escape and P fixed)', () => {
  it('gives an action the key pressed, alone: the keys it had are let go', () => {
    const bindings = accepted(assignKey(DEFAULT_BINDINGS, 1, 'light', 'KeyB'));
    expect(bindings.keyboard[1].light).toEqual(['KeyB']);
    expect(bindings.keyboard[0]).toBe(DEFAULT_BINDINGS.keyboard[0]);
    expect(keyFlags(bindings.keyboard[1])['Numpad1']).toBeUndefined();
  });

  it('refuses a key another action of the same player has, and says which', () => {
    expect(assignKey(DEFAULT_BINDINGS, 0, 'light', 'KeyK')).toEqual({
      ok: false,
      refusal: { kind: 'taken', action: 'heavy' },
    });
  });

  it("refuses the other player's keys, both ways", () => {
    expect(assignKey(DEFAULT_BINDINGS, 1, 'light', 'KeyJ')).toEqual({
      ok: false,
      refusal: { kind: 'other', player: 0 },
    });
    expect(assignKey(DEFAULT_BINDINGS, 0, 'light', 'Numpad1')).toEqual({
      ok: false,
      refusal: { kind: 'other', player: 1 },
    });
  });

  it('keeps Escape and P for the pause', () => {
    for (const code of ['Escape', 'KeyP']) {
      expect(assignKey(DEFAULT_BINDINGS, 0, 'light', code)).toEqual({
        ok: false,
        refusal: { kind: 'fixed' },
      });
    }
  });

  it('refuses the keys of the browser and the system', () => {
    for (const code of ['Tab', 'ControlLeft', 'AltLeft', 'MetaLeft', 'F5', 'Backspace']) {
      expect(assignKey(DEFAULT_BINDINGS, 0, 'light', code)).toEqual({
        ok: false,
        refusal: { kind: 'unavailable' },
      });
    }
  });

  it('takes again the key an action already has', () => {
    expect(accepted(assignKey(DEFAULT_BINDINGS, 0, 'light', 'KeyJ')).keyboard[0].light).toEqual([
      'KeyJ',
    ]);
  });
});

describe('assignButton (P24: Start and the d-pad fixed)', () => {
  it('gives an action the button pressed', () => {
    const bindings = accepted(assignButton(DEFAULT_BINDINGS, 0, 'boost', PadButton.LeftTrigger));
    expect(bindings.pad[0].boost).toBe(PadButton.LeftTrigger);
    expect(bindings.pad[1]).toBe(DEFAULT_PAD);
  });

  it("refuses a button another action has, each player's pad on its own", () => {
    expect(assignButton(DEFAULT_BINDINGS, 0, 'light', PadButton.North)).toEqual({
      ok: false,
      refusal: { kind: 'taken', action: 'heavy' },
    });
    const moved = accepted(assignButton(DEFAULT_BINDINGS, 1, 'boost', PadButton.LeftTrigger));
    expect(accepted(assignButton(moved, 0, 'grab', PadButton.LeftTrigger)).pad[0].grab).toBe(
      PadButton.LeftTrigger,
    );
  });

  it('keeps Start for the pause, the d-pad for the directions, and Home', () => {
    const refusal = (button: number) => {
      const result = assignButton(DEFAULT_BINDINGS, 0, 'jump', button);
      return result.ok ? undefined : result.refusal.kind;
    };
    expect(refusal(PadButton.Start)).toBe('fixed');
    expect(refusal(PadButton.DpadUp)).toBe('directions');
    expect(refusal(PadButton.DpadRight)).toBe('directions');
    expect(refusal(PadButton.Home)).toBe('unavailable');
  });
});

describe('reset (P24)', () => {
  it("puts a player's keys back, the other player's untouched", () => {
    let bindings = accepted(assignKey(DEFAULT_BINDINGS, 0, 'light', 'KeyB'));
    bindings = accepted(assignKey(bindings, 1, 'light', 'KeyN'));
    const back = accepted(resetKeys(bindings, 0));
    expect(back.keyboard[0]).toEqual(DEFAULT_KEYS[0]);
    expect(back.keyboard[1].light).toEqual(['KeyN']);
  });

  it('refuses when the other player holds one of those keys now', () => {
    // Player 1 lets J go, player 2 takes it: player 1's « Par défaut » would share it.
    let bindings = accepted(assignKey(DEFAULT_BINDINGS, 0, 'light', 'KeyB'));
    bindings = accepted(assignKey(bindings, 1, 'light', 'KeyJ'));
    expect(resetKeys(bindings, 0)).toEqual({ ok: false, refusal: { kind: 'other', player: 1 } });
  });

  it("puts a player's gamepad back", () => {
    const bindings = accepted(assignButton(DEFAULT_BINDINGS, 1, 'jump', PadButton.Select));
    expect(resetPad(bindings, 1).pad[1]).toEqual(DEFAULT_PAD);
  });
});
