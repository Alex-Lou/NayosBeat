import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assignButton,
  assignKey,
  DEFAULT_BINDINGS,
  DEFAULT_KEYS,
  DEFAULT_PAD,
} from '../../src/input/bindings';
import {
  CONTROLS_KEY,
  ControlsStore,
  DEFAULT_CONTROLS,
  parseControls,
  serializeControls,
  type Controls,
} from '../../src/input/controls-store';
import { PadButton } from '../../src/input/gamepad-buttons';

/** Player 2 lights on B, player 1 jumps on LT: a stored set of controls. */
function custom(): Controls {
  const keys = assignKey(DEFAULT_BINDINGS, 1, 'light', 'KeyB');
  if (!keys.ok) throw new Error('refused');
  const pad = assignButton(keys.bindings, 0, 'jump', PadButton.LeftTrigger);
  if (!pad.ok) throw new Error('refused');
  return { bindings: pad.bindings };
}

/** The stored JSON, with `change` applied to it. */
function stored(change: (value: Record<string, unknown>) => void): string {
  const value = JSON.parse(serializeControls(custom())) as Record<string, unknown>;
  change(value);
  return JSON.stringify(value);
}

/** A page storage holding `kept`, or refusing everything (private mode, full). */
function storage(kept = new Map<string, string>(), refuses = false) {
  const fail = () => {
    throw new Error('QuotaExceededError');
  };
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (refuses ? fail() : (kept.get(key) ?? null)),
    setItem: (key: string, value: string) => (refuses ? fail() : kept.set(key, value)),
  });
  return kept;
}

describe('the stored controls, `nayosbeat.keys.v1` (P24: parse, don’t validate)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('read back what was kept', () => {
    expect(parseControls(serializeControls(custom()))).toEqual(custom());
    expect(JSON.parse(serializeControls(custom()))).toMatchObject({ version: 1 });
  });

  it('play with the defaults when nothing, or something unreadable, is stored', () => {
    expect(parseControls(null)).toEqual(DEFAULT_CONTROLS);
    expect(parseControls('{"version":1,')).toEqual(DEFAULT_CONTROLS);
    expect(parseControls('"keys"')).toEqual(DEFAULT_CONTROLS);
    expect(parseControls('null')).toEqual(DEFAULT_CONTROLS);
  });

  it('play with the defaults on another version, older or newer', () => {
    for (const version of [0, 2, '1', undefined]) {
      expect(parseControls(stored((value) => (value['version'] = version)))).toEqual(
        DEFAULT_CONTROLS,
      );
    }
  });

  it("put back a player's keyboard that is corrupt, and that one only", () => {
    const broken = (keys: unknown) =>
      parseControls(
        stored((value) => {
          (value['keyboard'] as unknown[])[1] = keys;
        }),
      ).bindings;
    const valid = custom().bindings.keyboard[0];
    for (const keys of [
      null,
      { ...DEFAULT_KEYS[1], light: 'KeyB' },
      { ...DEFAULT_KEYS[1], light: ['KeyB', 'KeyB'] },
      { ...DEFAULT_KEYS[1], light: ['KeyB'], heavy: ['KeyB'] },
      { ...DEFAULT_KEYS[1], light: ['NotAKey'] },
      { ...DEFAULT_KEYS[1], dash: undefined },
    ]) {
      const bindings = broken(keys);
      expect(bindings.keyboard[1]).toEqual(DEFAULT_KEYS[1]);
      expect(bindings.keyboard[0]).toEqual(valid);
      // The gamepads are read apart: still the player's.
      expect(bindings.pad[0].jump).toBe(PadButton.LeftTrigger);
    }
  });

  it('never stores Escape, P nor Start for an action: back to the default', () => {
    for (const code of ['Escape', 'KeyP']) {
      const value = stored((controls) => {
        (controls['keyboard'] as Record<string, unknown>[])[0] = {
          ...DEFAULT_KEYS[0],
          light: [code],
        };
      });
      expect(parseControls(value).bindings.keyboard[0]).toEqual(DEFAULT_KEYS[0]);
    }
    const start = stored((controls) => {
      (controls['pad'] as Record<string, unknown>[])[0] = { ...DEFAULT_PAD, jump: PadButton.Start };
    });
    expect(parseControls(start).bindings.pad[0]).toEqual(DEFAULT_PAD);
  });

  it('put both keyboards back when they share a key', () => {
    const shared = stored((value) => {
      (value['keyboard'] as Record<string, unknown>[])[1] = { ...DEFAULT_KEYS[1], light: ['KeyJ'] };
    });
    expect(parseControls(shared).bindings.keyboard).toEqual(DEFAULT_KEYS);
  });

  it("put back a player's gamepad with a button twice", () => {
    const twice = stored((value) => {
      (value['pad'] as Record<string, unknown>[])[1] = { ...DEFAULT_PAD, light: PadButton.South };
    });
    expect(parseControls(twice).bindings.pad[1]).toEqual(DEFAULT_PAD);
    expect(parseControls(twice).bindings.pad[0].jump).toBe(PadButton.LeftTrigger);
  });
});

describe('ControlsStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps a change under its versioned key, and tells who listens', () => {
    const kept = storage();
    const store = new ControlsStore();
    const heard = vi.fn();
    const stop = store.subscribe(heard);
    store.set(custom());
    expect(kept.get(CONTROLS_KEY)).toBe(serializeControls(custom()));
    expect(new ControlsStore().get()).toEqual(custom());
    expect(heard).toHaveBeenCalledWith(custom());
    stop();
    store.set(DEFAULT_CONTROLS);
    expect(heard).toHaveBeenCalledOnce();
    expect(store.listenerCount).toBe(0);
  });

  it('holds a change for the session where the storage refuses it', () => {
    storage(new Map(), true);
    const store = new ControlsStore();
    expect(store.get()).toEqual(DEFAULT_CONTROLS);
    store.set(custom());
    expect(store.get()).toEqual(custom());
  });

  it('reads « Par défaut » as the defaults, stored like any other choice', () => {
    const kept = storage(new Map([[CONTROLS_KEY, serializeControls(custom())]]));
    const store = new ControlsStore();
    store.set(DEFAULT_CONTROLS);
    expect(parseControls(kept.get(CONTROLS_KEY) ?? null)).toEqual(DEFAULT_CONTROLS);
  });
});
