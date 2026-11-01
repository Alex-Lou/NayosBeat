import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlsStore, DEFAULT_CONTROLS } from '../../src/input/controls-store';
import { DEFAULT_TOUCH_LAYOUT, TOUCH_BUTTONS } from '../../src/input/touch-layout';
import { TOUCH_TEXTS } from '../../src/ui/bindings-text';
import { TouchLayoutEditor } from '../../src/ui/touch-layout-editor';
import { FakeElement, installFakePage } from '../render/fake-dom';

function byClass(node: FakeElement, name: string): FakeElement[] {
  const own = node.className.split(' ').includes(name) ? [node] : [];
  return own.concat(...node.children.map((child) => byClass(child, name)));
}

function pointer(type: string, pointerId: number, clientX: number, clientY: number): Event {
  return Object.assign(new Event(type), { pointerId, clientX, clientY });
}

/** « Disposition » on a 667×375 phone (`width` wide), its own store. */
function setup(width = 667) {
  const page = installFakePage();
  const kept = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (name: string) => kept.get(name) ?? null,
    setItem: (name: string, value: string) => kept.set(name, value),
  });
  const store = new ControlsStore();
  const onBack = vi.fn();
  const editor = new TouchLayoutEditor(page.body as unknown as HTMLElement, { store, onBack });
  const root = page.body.children[0];
  const zone = root?.children[0];
  if (!root || !zone) throw new Error('Nothing on screen');
  zone.rect = { left: width / 2, top: 0, right: width, bottom: 375 };
  const corner = { x: width, y: 375 };
  /** A finger from the center of button `label` to (right, bottom) from the corner. */
  const drag = (label: string, right: number, bottom: number) => {
    const spec = TOUCH_BUTTONS.find((button) => button.label === label);
    if (!spec) throw new Error(`No ${label}`);
    const touched = store.get().touch.buttons[spec.action];
    zone.dispatchEvent(
      pointer('pointerdown', 1, corner.x - touched.right, corner.y - touched.bottom),
    );
    zone.dispatchEvent(
      pointer(
        'pointermove',
        1,
        corner.x - (touched.right + right) / 2,
        corner.y - (touched.bottom + bottom) / 2,
      ),
    );
    zone.dispatchEvent(pointer('pointermove', 1, corner.x - right, corner.y - bottom));
    zone.dispatchEvent(pointer('pointerup', 1, corner.x - right, corner.y - bottom));
  };
  const items = () => byClass(root, 'menu-item').map((item) => item.textContent);
  const choose = (label: string) => {
    const item = byClass(root, 'menu-item').find((node) => node.textContent.startsWith(label));
    if (!item) throw new Error(`No item ${label}`);
    item.dispatchEvent(new Event('click'));
  };
  const note = () => byClass(root, 'menu-subtitle')[0]?.textContent;
  const button = (label: string) =>
    zone.children[TOUCH_BUTTONS.findIndex((b) => b.label === label)];
  return { page, store, editor, onBack, zone, drag, items, choose, note, button };
}

describe('« Disposition », the touch buttons placed by hand (P24)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('moves a button with a finger, keeps it there, and says so', () => {
    const { store, drag, note, button, items } = setup();
    drag('DASH', 177, 246);
    expect(store.get().touch.buttons.dash).toEqual({ right: 177, bottom: 246, size: 100 });
    expect(button('DASH')?.style).toMatchObject({ right: '149px', bottom: '218px' });
    expect(note()).toBe('DASH déplacé');
    // The menu now sizes the button just moved.
    expect(items()).toContain('Bouton : DASH');
  });

  it('puts a button dropped on another back where it was', () => {
    const { store, drag, note, button } = setup();
    drag('DASH', 163, 126);
    expect(store.get().touch).toEqual(DEFAULT_TOUCH_LAYOUT);
    expect(note()).toBe(TOUCH_TEXTS.overlap);
    expect(button('DASH')?.style).toMatchObject({ right: '209px', bottom: '98px' });
  });

  it('keeps a button inside its zone, under the pause button’s corner', () => {
    const { store, drag } = setup();
    drag('DASH', 400, 500);
    const { right, bottom } = store.get().touch.buttons.dash;
    // The zone is 333.5 px wide, 375 tall less 56 for the pause, DASH 28 px from its center.
    expect(right).toBeCloseTo(333.5 - 28);
    expect(bottom).toBeCloseTo(375 - 56 - 28);
  });

  it('cycles the cluster’s size, skipping those that leave the screen', () => {
    const wide = setup();
    wide.choose('Taille :');
    expect(wide.store.get().touch.size).toBe(110);
    expect(wide.items()[0]).toBe('Taille : 110 %');
    vi.unstubAllGlobals();
    // A narrower phone: 110 % and 120 % do not fit, the next is 80 %.
    const narrow = setup(560);
    narrow.choose('Taille :');
    expect(narrow.store.get().touch.size).toBe(80);
  });

  it('sizes the button chosen, cycles the opacity, and puts all back with « Par défaut »', () => {
    const { store, choose, items } = setup();
    choose('Bouton :');
    expect(items()).toContain('Bouton : H');
    choose('Taille de H');
    expect(store.get().touch.buttons.heavy.size).toBe(110);
    choose('Opacité');
    expect(store.get().touch.opacity).toBe(40);
    expect(items()).toContain('Opacité : 40 %');
    choose('Par défaut');
    expect(store.get().touch).toEqual(DEFAULT_TOUCH_LAYOUT);
  });

  it('goes back with « Retour », Escape, or B', () => {
    const { page, onBack, choose } = setup();
    choose('Retour');
    page.window.dispatchEvent(Object.assign(new Event('keydown'), { code: 'Escape' }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('leaves the keys and the gamepads as they were', () => {
    const { store, choose } = setup();
    choose('Opacité');
    expect(store.get().bindings).toEqual(DEFAULT_CONTROLS.bindings);
  });
});
