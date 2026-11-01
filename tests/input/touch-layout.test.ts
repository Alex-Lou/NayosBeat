import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../../src/core/input';
import { ControlsStore, DEFAULT_CONTROLS } from '../../src/input/controls-store';
import { TouchControls } from '../../src/input/touch-controls';
import {
  BUTTON_SIZES,
  CLUSTER_SIZES,
  DEFAULT_TOUCH_LAYOUT,
  fitsZone,
  LABEL_PADDING_PX,
  overlapping,
  parseTouchLayout,
  placedButtons,
  TOUCH_BUTTONS,
  type TouchLayout,
} from '../../src/input/touch-layout';
import { installFakePage, type FakeElement } from '../render/fake-dom';

/** DASH moved above BOOST, at the top of an iPhone SE's button zone. */
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
    const zone = page.body.children[0]?.children[2] as FakeElement;
    zone.rect = { left: 333, top: 0, right: 667, bottom: 375 };
    const dash = zone.children[TOUCH_BUTTONS.findIndex(({ action }) => action === 'dash')];
    return { touch, zone, dash };
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
});
