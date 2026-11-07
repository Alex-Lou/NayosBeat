import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../../src/core/input';
import { ControlsStore, DEFAULT_CONTROLS } from '../../src/input/controls-store';
import { TouchControls } from '../../src/input/touch-controls';
import {
  BUTTON_SIZES,
  CLUSTER_SIZES,
  DEFAULT_TOUCH_LAYOUT,
  fittedButtons,
  fitsZone,
  LABEL_PADDING_PX,
  overlapping,
  parseTouchLayout,
  placedButtons,
  TOUCH_BUTTONS,
  type TouchButton,
  type TouchLayout,
} from '../../src/input/touch-layout';
import { installFakePage, type FakeElement } from '../render/fake-dom';

/** DASH moved above S, at the top of an iPhone SE's button zone. */
const MOVED: TouchLayout = {
  ...DEFAULT_TOUCH_LAYOUT,
  buttons: { ...DEFAULT_TOUCH_LAYOUT.buttons, dash: { right: 177, bottom: 246, size: 100 } },
};

/** The right half of a 667×375 phone, where the buttons live. */
const ZONE = { width: 333, height: 375 };

function store(touch: TouchLayout = DEFAULT_TOUCH_LAYOUT): ControlsStore {
  const kept = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (name: string) => kept.get(name) ?? null,
    setItem: (name: string, value: string) => kept.set(name, value),
  });
  const controls = new ControlsStore();
  controls.set({ ...DEFAULT_CONTROLS, touch });
  return controls;
}

function pointer(type: string, pointerId: number, clientX: number, clientY: number): Event {
  return Object.assign(new Event(type), { pointerId, clientX, clientY });
}

describe('the touch layout as data (P24, « Disposition »)', () => {
  it('places the buttons of always by default', () => {
    expect(placedButtons(DEFAULT_TOUCH_LAYOUT)).toEqual(TOUCH_BUTTONS);
  });

  it('scales the cluster around its corner, a button on top of it, labels with them', () => {
    const layout: TouchLayout = {
      ...DEFAULT_TOUCH_LAYOUT,
      size: 80,
      buttons: { ...DEFAULT_TOUCH_LAYOUT.buttons, boost: { right: 126, bottom: 190, size: 120 } },
    };
    const placed = placedButtons(layout);
    const light = placed.find(({ action }) => action === 'light');
    const boost = placed.find(({ action }) => action === 'boost');
    expect(light?.right).toBeCloseTo(160);
    expect(light?.bottom).toBeCloseTo(41.6);
    expect(light?.diameter).toBeCloseTo(54.4);
    expect(light?.fontSize).toBeCloseTo(9.6);
    expect(boost?.diameter).toBeCloseTo(56 * 0.8 * 1.2);
  });

  it('keeps every label inside its button at every size offered', () => {
    for (const size of CLUSTER_SIZES) {
      for (const own of BUTTON_SIZES) {
        const buttons = Object.fromEntries(
          Object.entries(DEFAULT_TOUCH_LAYOUT.buttons).map(([action, at]) => [
            action,
            { ...at, size: own },
          ]),
        ) as TouchLayout['buttons'];
        const scale = (size / 100) * (own / 100);
        for (const button of placedButtons({ ...DEFAULT_TOUCH_LAYOUT, size, buttons })) {
          const label = button.label.length * button.fontSize;
          expect(label + 2 * LABEL_PADDING_PX * scale).toBeLessThanOrEqual(button.diameter + 1e-9);
        }
      }
    }
  });

  it('tells buttons that overlap, and a cluster that leaves the screen', () => {
    expect(overlapping(placedButtons(DEFAULT_TOUCH_LAYOUT))).toBe(false);
    expect(overlapping(placedButtons(MOVED))).toBe(false);
    const onS = { ...MOVED.buttons, dash: { right: 170, bottom: 130, size: 100 } };
    expect(overlapping(placedButtons({ ...MOVED, buttons: onS }))).toBe(true);
    expect(fitsZone(placedButtons(DEFAULT_TOUCH_LAYOUT), ZONE)).toBe(true);
    // Under the pause button's corner, or past the zone's left edge: no.
    const high = { ...MOVED.buttons, dash: { right: 177, bottom: 300, size: 100 } };
    expect(fitsZone(placedButtons({ ...MOVED, buttons: high }), ZONE)).toBe(false);
    expect(fitsZone(placedButtons({ ...DEFAULT_TOUCH_LAYOUT, size: 120 }), ZONE)).toBe(true);
    expect(
      fitsZone(placedButtons({ ...DEFAULT_TOUCH_LAYOUT, size: 120 }), { width: 300, height: 375 }),
    ).toBe(false);
  });
});

describe('the cluster on a screen smaller than its layout’s (P24, fittedButtons)', () => {
  /** How much `fitted` shrinks `placed` around the corner: the same for every center and size. */
  function shrinkOf(fitted: readonly TouchButton[], placed: readonly TouchButton[]): number {
    const [first] = placed;
    const [shrunk] = fitted;
    if (!first || !shrunk) throw new Error('No button');
    const scale = shrunk.diameter / first.diameter;
    fitted.forEach((button, index) => {
      const before = placed[index];
      expect(button.right).toBeCloseTo((before?.right ?? NaN) * scale, 9);
      expect(button.bottom).toBeCloseTo((before?.bottom ?? NaN) * scale, 9);
      expect(button.diameter).toBeCloseTo((before?.diameter ?? NaN) * scale, 9);
      expect(button.fontSize).toBeCloseTo((before?.fontSize ?? NaN) * scale, 9);
    });
    return scale;
  }

  it('leaves a cluster that fits as it is, and on a zone not measured yet', () => {
    expect(fittedButtons(MOVED, ZONE)).toEqual(placedButtons(MOVED));
    expect(fittedButtons(MOVED, { width: 0, height: 0 })).toEqual(placedButtons(MOVED));
  });

  // The two screens it was made for: the browser's bars back (a lower zone), the phone turned (a
  // narrower one).
  for (const [name, zone] of [
    ['the browser’s bars back', { width: 333, height: 300 }],
    ['the phone turned', { width: 187, height: 667 }],
  ] as const) {
    it(`shrinks it around its corner as « Taille » does, as little as it takes: ${name}`, () => {
      const placed = placedButtons(MOVED);
      expect(fitsZone(placed, zone)).toBe(false);
      const fitted = fittedButtons(MOVED, zone);
      expect(fitsZone(fitted, zone)).toBe(true);
      expect(overlapping(fitted)).toBe(false);
      const scale = shrinkOf(fitted, placed);
      expect(scale).toBeLessThan(1);
      // A step bigger (0.2 %) and it would leave the zone.
      const bigger = placedButtons({ ...MOVED, size: MOVED.size * scale + 0.2 });
      expect(fitsZone(bigger, zone)).toBe(false);
    });
  }

  it('shrinks the cluster the player made bigger the same way', () => {
    const big = { ...DEFAULT_TOUCH_LAYOUT, size: 120 };
    const zone = { width: 300, height: 375 };
    const fitted = fittedButtons(big, zone);
    expect(fitsZone(fitted, zone)).toBe(true);
    expect(shrinkOf(fitted, placedButtons(big))).toBeLessThan(1);
  });
});

describe('parseTouchLayout (P24: parse, don’t validate)', () => {
  it('reads back a layout kept', () => {
    expect(parseTouchLayout(JSON.parse(JSON.stringify(MOVED)))).toEqual(MOVED);
  });

  it('puts back what is missing or corrupt, each part on its own', () => {
    expect(parseTouchLayout(undefined)).toEqual(DEFAULT_TOUCH_LAYOUT);
    expect(parseTouchLayout('big')).toEqual(DEFAULT_TOUCH_LAYOUT);
    expect(parseTouchLayout({ ...MOVED, size: 95 }).size).toBe(100);
    expect(parseTouchLayout({ ...MOVED, opacity: 10 }).opacity).toBe(100);
    const broken = (dash: unknown) =>
      parseTouchLayout({ ...MOVED, buttons: { ...MOVED.buttons, dash } }).buttons;
    for (const dash of [
      null,
      { right: -5, bottom: 50, size: 100 },
      { right: Number.NaN, bottom: 50, size: 100 },
      { right: 177, bottom: 99999, size: 100 },
      { right: 177, bottom: 246, size: 75 },
      { right: '177', bottom: 246, size: 100 },
    ]) {
      expect(broken(dash).dash).toEqual(DEFAULT_TOUCH_LAYOUT.buttons.dash);
      expect(broken(dash).light).toEqual(MOVED.buttons.light);
    }
  });

  it('moves the buttons left where the layout before the d-pad put them, not those moved', () => {
    // A layout kept before the d-pad (D40): SAUT in the corner, PRISE and BOOST in their old
    // places, PRISE made bigger, DASH moved by the player.
    const before = {
      size: 100,
      opacity: 80,
      buttons: {
        ...DEFAULT_TOUCH_LAYOUT.buttons,
        jump: { right: 52, bottom: 52, size: 100 },
        grab: { right: 89, bottom: 126, size: 110 },
        boost: { right: 126, bottom: 190, size: 100 },
        dash: { right: 177, bottom: 246, size: 100 },
      },
    };
    const layout = parseTouchLayout(JSON.parse(JSON.stringify(before)));
    expect(layout.buttons).toEqual({
      ...DEFAULT_TOUCH_LAYOUT.buttons,
      grab: { ...DEFAULT_TOUCH_LAYOUT.buttons.grab, size: 110 },
      dash: { right: 177, bottom: 246, size: 100 },
    });
    expect('jump' in layout.buttons).toBe(false);
    expect(layout.opacity).toBe(80);
    // Moved by the player, PRISE stays where they put it.
    const moved = { ...before.buttons, grab: { right: 300, bottom: 52, size: 100 } };
    expect(parseTouchLayout({ ...before, buttons: moved }).buttons.grab).toEqual(moved.grab);
  });

  it('puts every button back when two overlap', () => {
    const onS = { ...MOVED.buttons, dash: { right: 170, bottom: 130, size: 100 } };
    const layout = parseTouchLayout({ ...MOVED, opacity: 60, buttons: onS });
    expect(layout.buttons).toEqual(DEFAULT_TOUCH_LAYOUT.buttons);
    expect(layout.opacity).toBe(60);
  });
});

describe('TouchControls with a layout (P24)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function setup(controls: ControlsStore) {
    const page = installFakePage();
    const touch = new TouchControls(
      page.body as unknown as HTMLElement,
      undefined,
      undefined,
      controls,
    );
    const zone = page.body.children[0]?.children[1] as FakeElement;
    zone.rect = { left: 333, top: 0, right: 667, bottom: 375 };
    const dash = zone.children[TOUCH_BUTTONS.findIndex(({ action }) => action === 'dash')];
    return { page, touch, zone, dash };
  }

  it('draws a moved button where the player put it, and presses it there', () => {
    const { touch, zone, dash } = setup(store(MOVED));
    expect(dash?.style).toMatchObject({ right: '149px', bottom: '218px', width: '56px' });
    zone.dispatchEvent(pointer('pointerdown', 1, 667 - 177, 375 - 246));
    expect(touch.read()).toBe(Input.Dash);
    // Its old place presses nothing now.
    zone.dispatchEvent(pointer('pointerdown', 2, 667 - 237, 375 - 126));
    expect(touch.read()).toBe(Input.Dash);
  });

  it("fades the cluster to the player's opacity", () => {
    const { zone } = setup(store({ ...DEFAULT_TOUCH_LAYOUT, opacity: 60 }));
    expect(zone.style['opacity']).toBe('0.6');
  });

  it('takes a layout changed under the pause at once, and says it moved', () => {
    const controls = store();
    const { touch, dash } = setup(controls);
    const version = touch.layoutVersion;
    controls.set({ ...DEFAULT_CONTROLS, touch: MOVED });
    expect(dash?.style).toMatchObject({ right: '149px', bottom: '218px' });
    expect(touch.layoutVersion).not.toBe(version);
  });

  it('stops listening to the store once disposed', () => {
    const controls = store();
    const { touch } = setup(controls);
    expect(controls.listenerCount).toBe(1);
    touch.dispose();
    expect(controls.listenerCount).toBe(0);
  });

  // The layout made on a 667×375 screen, played on smaller ones as the page changes size.
  it('shrinks the cluster to a smaller screen as it changes, presses it there, gives it back whole', () => {
    const controls = store(MOVED);
    const { page, touch, zone, dash } = setup(controls);
    const resize = (rect: FakeElement['rect']) => {
      zone.rect = rect;
      page.window.dispatchEvent(new Event('resize'));
    };
    const whole = { right: '149px', bottom: '218px', width: '56px' };
    resize({ left: 333, top: 0, right: 667, bottom: 375 });
    expect(dash?.style).toMatchObject(whole);
    for (const smaller of [
      // The browser's bars back: 75 px lower.
      { left: 333, top: 0, right: 667, bottom: 300 },
      // The phone turned: half of 375 px wide.
      { left: 188, top: 0, right: 375, bottom: 667 },
    ]) {
      const version = touch.layoutVersion;
      resize(smaller);
      const width = parseFloat(dash?.style['width'] ?? '');
      expect(width).toBeLessThan(56);
      // Measured anew by what reads the buttons on the page (touch-cover.ts).
      expect(touch.layoutVersion).not.toBe(version);
      // Pressed where it is drawn now.
      const right = parseFloat(dash?.style['right'] ?? '') + width / 2;
      const bottom = parseFloat(dash?.style['bottom'] ?? '') + width / 2;
      zone.dispatchEvent(pointer('pointerdown', 1, smaller.right - right, smaller.bottom - bottom));
      expect(touch.read()).toBe(Input.Dash);
      zone.dispatchEvent(pointer('pointerup', 1, 0, 0));
      // The player's layout is theirs: never changed.
      expect(controls.get().touch).toEqual(MOVED);
    }
    resize({ left: 333, top: 0, right: 667, bottom: 375 });
    expect(dash?.style).toMatchObject(whole);
  });

  it('lets go of the window once disposed', () => {
    const { page, touch } = setup(store());
    const before = page.window.listenerCount;
    touch.dispose();
    expect(page.window.listenerCount).toBe(before - 1);
  });
});
