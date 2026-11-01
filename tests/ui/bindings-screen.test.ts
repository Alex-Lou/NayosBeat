import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KEYS, DEFAULT_PAD } from '../../src/input/bindings';
import { ControlsStore, DEFAULT_CONTROLS } from '../../src/input/controls-store';
import { DEFAULT_TOUCH_LAYOUT } from '../../src/input/touch-layout';
import { PadButton } from '../../src/input/gamepad-buttons';
import { relativeLuminance } from '../../src/render/luminance';
import {
  BindingsScreen,
  layoutName,
  type BindingsTab,
  type PadLike,
} from '../../src/ui/bindings-screen';
import { LISTEN_SECONDS } from '../../src/ui/bindings-text';
import { FakeElement, installFakePage } from '../render/fake-dom';

/** The elements under `node` that have the class `name`, in page order. */
function byClass(node: FakeElement, name: string): FakeElement[] {
  const own = node.className.split(' ').includes(name) ? [node] : [];
  return own.concat(...node.children.map((child) => byClass(child, name)));
}

/** Whether `node` has the class `name`, written with its others or added since. */
function has(node: FakeElement | undefined, name: string): boolean {
  return !!node && (node.className.split(' ').includes(name) || node.classList.contains(name));
}

/** A standard-mapping gamepad holding `pressed`. */
function pad(pressed: number[] = [], mapping = 'standard'): PadLike {
  const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) }));
  return { index: 0, mapping, buttons };
}

/** The screen on a fake page, its own store, the gamepads `pads.now`. */
function setup(initialTab: BindingsTab = 'keys1') {
  const page = installFakePage();
  const kept = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (name: string) => kept.get(name) ?? null,
    setItem: (name: string, value: string) => kept.set(name, value),
  });
  const store = new ControlsStore();
  const pads: { now: PadLike[] } = { now: [] };
  const onBack = vi.fn();
  const feedback = vi.fn();
  const screen = new BindingsScreen(page.body as unknown as HTMLElement, {
    tabs: ['keys1', 'keys2', 'pad1', 'pad2'],
    initialTab,
    store,
    onBack,
    feedback,
    pads: () => pads.now,
  });
  const root = () => {
    const [node] = page.body.children;
    if (!node) throw new Error('Nothing on screen');
    return node;
  };
  /** A key event at the window, as the browser sends it. */
  const send = (type: 'keydown' | 'keyup', code: string, repeat = false, key = '') => {
    const event = Object.assign(new Event(type, { cancelable: true }), { code, repeat, key });
    page.window.dispatchEvent(event);
    return event;
  };
  const tap = (code: string, key = '') => {
    const down = send('keydown', code, false, key);
    send('keyup', code);
    return down;
  };
  const status = () => byClass(root(), 'bindings-status')[0]?.text ?? '';
  const cell = (label: string) => {
    const found = byClass(root(), 'bindings-cell').find((node) => node.text.includes(label));
    if (!found) throw new Error(`No cell ${label}`);
    return found;
  };
  const drawnKey = (code: string) => {
    const found = byClass(root(), 'kb-key').find((node) => node.dataset['code'] === code);
    if (!found) throw new Error(`No key ${code}`);
    return found;
  };
  /** Goes to the cell `index` (0: the first action) from the tabs, with the arrows. */
  const goTo = (index: number) => {
    tap('Enter');
    for (let at = 0; at < index; at++) tap('ArrowRight');
  };
  return {
    page,
    store,
    pads,
    screen,
    onBack,
    feedback,
    root,
    send,
    tap,
    status,
    cell,
    drawnKey,
    goTo,
  };
}

const LIGHT = 5;

describe('the « Touches » screen, keyboard (P24)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('lights the action chosen on the drawn keyboard, its key reading on it', () => {
    const { goTo, drawnKey, cell } = setup();
    goTo(LIGHT);
    expect(has(cell('Léger'), 'selected')).toBe(true);
    expect(has(drawnKey('KeyJ'), 'chosen')).toBe(true);
    expect(has(drawnKey('KeyJ'), 'act-light')).toBe(true);
    expect(drawnKey('KeyJ').text).toContain('J');
    expect(has(drawnKey('KeyK'), 'chosen')).toBe(false);
    // The other player's keys, and the pause's, drawn apart.
    expect(has(drawnKey('Numpad1'), 'kb-other')).toBe(true);
    expect(has(drawnKey('KeyP'), 'kb-fixed')).toBe(true);
  });

  it('takes the next key pressed, keeps it, and draws it lit', () => {
    const { goTo, tap, store, status, drawnKey, cell, screen, root } = setup();
    goTo(LIGHT);
    tap('Enter');
    expect(screen.listeningFor).toBe('light');
    expect(status()).toContain('appuie sur une touche');
    // Shown, even below a screen grown past its height.
    expect(byClass(root(), 'bindings-status')[0]?.scrolledIntoView).toBe(1);
    tap('KeyB', 'b');
    expect(screen.listeningFor).toBeUndefined();
    expect(store.get().bindings.keyboard[0].light).toEqual(['KeyB']);
    expect(status()).toBe('Léger : B');
    expect(has(drawnKey('KeyB'), 'act-light')).toBe(true);
    expect(has(drawnKey('KeyJ'), 'kb-free')).toBe(true);
    expect(cell('Léger').text).toContain('B');
  });

  it('lets nothing it hears reach the page: not the key, its repeats, nor its release', () => {
    const { page, goTo, send, tap, screen } = setup();
    goTo(LIGHT);
    tap('Enter');
    // The fight under the pause, the next menu: they listen after the screen.
    const heard = vi.fn();
    page.window.addEventListener('keydown', heard);
    page.window.addEventListener('keyup', heard);
    const down = send('keydown', 'KeyB');
    expect(down.defaultPrevented).toBe(true);
    // Taken, then held: its repeats and its release stay here too.
    send('keydown', 'KeyB', true);
    send('keyup', 'KeyB');
    expect(heard).not.toHaveBeenCalled();
    expect(screen.listeningFor).toBeUndefined();
    // Released: the page hears the keys again.
    send('keydown', 'KeyN');
    expect(heard).toHaveBeenCalledOnce();
  });

  it('never reads the key it takes as a choice of its own: Enter taken does not confirm', () => {
    const { goTo, tap, send, store, screen } = setup('keys2');
    goTo(LIGHT);
    tap('Enter');
    send('keydown', 'Enter');
    send('keydown', 'Enter', true);
    expect(store.get().bindings.keyboard[1].light).toEqual(['Enter']);
    // Read by the screen's own choices, it would have started waiting again.
    expect(screen.listeningFor).toBeUndefined();
    send('keyup', 'Enter');
    tap('Enter');
    expect(screen.listeningFor).toBe('light');
  });

  it('never moves the cursor with the repeats of the arrow it took', () => {
    const { goTo, tap, send, cell, screen } = setup('keys2');
    // Player 2's up, taken again on ↑: held, its repeats would climb to the tabs.
    goTo(0);
    tap('Enter');
    send('keydown', 'ArrowUp');
    send('keydown', 'ArrowUp', true);
    send('keydown', 'ArrowUp', true);
    expect(screen.listeningFor).toBeUndefined();
    expect(has(cell('Haut'), 'selected')).toBe(true);
    send('keyup', 'ArrowUp');
    tap('ArrowUp');
    expect(has(cell('Haut'), 'selected')).toBe(false);
  });

  it('refuses a key another action has, says which, and waits for another', () => {
    const { goTo, tap, store, status, screen } = setup();
    goTo(LIGHT);
    tap('Enter');
    tap('KeyK');
    expect(status()).toContain('La touche K sert déjà à Lourd');
    expect(screen.listeningFor).toBe('light');
    expect(store.get().bindings.keyboard[0]).toEqual(DEFAULT_KEYS[0]);
    tap('KeyB');
    expect(store.get().bindings.keyboard[0].light).toEqual(['KeyB']);
  });

  it("refuses P, and the other player's keys", () => {
    const { goTo, tap, store, status } = setup();
    goTo(LIGHT);
    tap('Enter');
    tap('KeyP');
    expect(status()).toContain('P met le combat en pause : elle reste fixe');
    tap('Numpad1');
    expect(status()).toContain('La touche Pavé 1 est au joueur 2');
    expect(store.get().bindings.keyboard).toEqual(DEFAULT_KEYS);
  });

  it('gives up on Escape, which stays the pause: nothing changes, nothing goes back', () => {
    const { goTo, tap, store, status, screen, onBack } = setup();
    goTo(LIGHT);
    tap('Enter');
    tap('Escape');
    expect(screen.listeningFor).toBeUndefined();
    expect(status()).toContain('Annulé');
    expect(store.get().bindings.keyboard).toEqual(DEFAULT_KEYS);
    expect(onBack).not.toHaveBeenCalled();
    tap('Escape');
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('keeps the keys it reads: the menu « Retour » opens never takes Escape a second time', () => {
    // In a browser the screen hears a key in the window's capture phase; the options' menu it
    // opens on Escape listens in the bubble phase of that same press, and would go back again
    // (to the main menu) unless the screen stops it. Node has no phases: the stop is what is seen.
    const { page, onBack } = setup();
    const stop = vi.fn();
    const escape = Object.assign(new Event('keydown', { cancelable: true }), {
      code: 'Escape',
      repeat: false,
      stopImmediatePropagation: stop,
    });
    page.window.dispatchEvent(escape);
    expect(onBack).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalled();
  });

  it('gives up on Start', () => {
    const { page, goTo, tap, pads, screen, status } = setup();
    goTo(LIGHT);
    tap('Enter');
    pads.now = [pad([PadButton.Start])];
    page.runFrames();
    expect(screen.listeningFor).toBeUndefined();
    expect(status()).toContain('Annulé');
  });

  it(`gives the hand back after ${LISTEN_SECONDS} seconds`, () => {
    vi.useFakeTimers();
    const { goTo, tap, screen, status } = setup();
    goTo(LIGHT);
    tap('Enter');
    vi.advanceTimersByTime(1000);
    expect(status()).toContain(`(${LISTEN_SECONDS - 1} s)`);
    vi.advanceTimersByTime((LISTEN_SECONDS - 1) * 1000);
    expect(screen.listeningFor).toBeUndefined();
    expect(status()).toContain('Temps écoulé');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('puts the keys back with « Par défaut »', () => {
    const { goTo, tap, store, status, cell } = setup();
    goTo(LIGHT);
    tap('Enter');
    tap('KeyB');
    cell('Par défaut').dispatchEvent(new Event('click'));
    expect(store.get().bindings.keyboard[0]).toEqual(DEFAULT_KEYS[0]);
    expect(status()).toBe('Touches du joueur 1 remises par défaut');
  });

  it('switches player and device with the arrows on the tabs', () => {
    const { tap, root, drawnKey } = setup();
    tap('ArrowRight');
    const active = () => byClass(root(), 'bindings-tab').find((tab) => has(tab, 'active'))?.text;
    expect(active()).toBe('Clavier J2');
    expect(has(drawnKey('KeyJ'), 'kb-other')).toBe(true);
    tap('ArrowRight');
    expect(active()).toBe('Manette J1');
    expect(byClass(root(), 'pad')).toHaveLength(1);
  });
});

describe('the « Touches » screen, gamepad (P24)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('takes the next fresh button, not the one that confirmed', () => {
    const { page, tap, pads, store, screen, status } = setup('pad1');
    // Jump, the first action, chosen and confirmed with A, still held.
    tap('Enter');
    pads.now = [pad([PadButton.South])];
    tap('Enter');
    page.runFrames();
    expect(screen.listeningFor).toBe('jump');
    pads.now = [pad([PadButton.South, PadButton.LeftTrigger])];
    page.runFrames();
    expect(store.get().bindings.pad[0].jump).toBe(PadButton.LeftTrigger);
    expect(store.get().bindings.pad[1]).toEqual(DEFAULT_PAD);
    expect(status()).toBe('Saut : LT (L2)');
  });

  it('refuses the d-pad and a button another action has', () => {
    const { page, tap, pads, store, status } = setup('pad1');
    tap('Enter');
    tap('Enter');
    pads.now = [pad([PadButton.DpadUp])];
    page.runFrames();
    expect(status()).toContain('La croix sert aux directions');
    pads.now = [pad([PadButton.West])];
    page.runFrames();
    expect(status()).toContain('Le bouton X (Carré) sert déjà à Léger');
    expect(store.get().bindings.pad[0]).toEqual(DEFAULT_PAD);
  });

  it('draws a generic pad, its buttons wearing their actions, and warns of a non-standard one', () => {
    const { root, pads, tap } = setup('pad1');
    const button = (index: number) =>
      byClass(root(), 'pad-button').find((node) => node.dataset['button'] === String(index));
    expect(button(PadButton.South)?.text).toBe('SAUT');
    expect(button(PadButton.RightTrigger)?.text).toBe('BOOST');
    expect(has(button(PadButton.Start), 'pad-fixed')).toBe(true);
    expect(
      byClass(root(), 'bindings-note')
        .map((note) => note.text)
        .join(),
    ).not.toContain('standard');
    pads.now = [pad([], '')];
    tap('ArrowRight');
    tap('ArrowLeft');
    expect(
      byClass(root(), 'bindings-note')
        .map((note) => note.text)
        .join(),
    ).toContain("n'a pas la disposition standard");
  });
});

describe('the « Touches » screen, touch tab (P24)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the cluster as placed, opens « Disposition », and puts it back with « Par défaut »', () => {
    const page = installFakePage();
    const kept = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (name: string) => kept.get(name) ?? null,
      setItem: (name: string, value: string) => kept.set(name, value),
    });
    const store = new ControlsStore();
    const moved = {
      ...DEFAULT_TOUCH_LAYOUT,
      opacity: 60,
      buttons: { ...DEFAULT_TOUCH_LAYOUT.buttons, dash: { right: 177, bottom: 246, size: 100 } },
    };
    store.set({ ...DEFAULT_CONTROLS, touch: moved });
    const onTouchLayout = vi.fn();
    new BindingsScreen(page.body as unknown as HTMLElement, {
      tabs: ['touch', 'keys1'],
      store,
      onBack: () => undefined,
      onTouchLayout,
      pads: () => [],
    });
    const root = page.body.children[0] as FakeElement;
    const zone = byClass(root, 'touch-mini-zone')[0];
    expect(zone?.style['opacity']).toBe('0.6');
    expect(zone?.children.find((button) => button.textContent === 'DASH')?.style).toMatchObject({
      right: '149px',
    });
    const cell = (label: string) =>
      byClass(root, 'bindings-cell').find((node) => node.text === label);
    cell('Disposition')?.dispatchEvent(new Event('click'));
    expect(onTouchLayout).toHaveBeenCalledOnce();
    cell('Par défaut')?.dispatchEvent(new Event('click'));
    expect(store.get().touch).toEqual(DEFAULT_TOUCH_LAYOUT);
    expect(store.get().bindings).toEqual(DEFAULT_CONTROLS.bindings);
  });
});

describe('layoutName', () => {
  it("names a writing key from the character it gives, in the pixel font's capitals", () => {
    expect(layoutName('KeyW', 'w')).toBe('W');
    expect(layoutName('KeyQ', 'a')).toBe('A');
    expect(layoutName('Quote', 'ù')).toBe('ù');
    expect(layoutName('Digit2', 'é')).toBe('é');
    expect(layoutName('Numpad1', '1')).toBeUndefined();
    expect(layoutName('KeyW', 'ш')).toBeUndefined();
  });
});

describe('the colors of the actions (P24, WCAG 1.4.3)', () => {
  it('carry the dark ink at 4.5:1 at least, the key name on a lit key', () => {
    const css = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');
    const ink = relativeLuminance(0x11111f);
    const colors = [...css.matchAll(/--act-[a-z]+: #([0-9a-f]{6});/g)].map((match) =>
      Number.parseInt(match[1] ?? '', 16),
    );
    expect(colors).toHaveLength(11);
    for (const color of colors) {
      expect((relativeLuminance(color) + 0.05) / (ink + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
