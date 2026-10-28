import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../../src/core/input';
import { TouchControls } from '../../src/input/touch-controls';
import {
  LABEL_PADDING_PX,
  nearestButton,
  TOUCH_BUTTONS,
  TOUCH_SLOP_PX,
  type TouchButton,
} from '../../src/input/touch-layout';
import { installFakePage, type FakeElement } from '../render/fake-dom';

/** Landscape phones: an iPhone SE (no notch) and an iPhone 12 (notch and home bar). */
const SCREENS = [
  { name: '667×375', width: 667, height: 375, insetRight: 0, insetBottom: 0 },
  { name: '844×390', width: 844, height: 390, insetRight: 47, insetBottom: 21 },
];
/** The pause button, in the top right corner (styles.css). */
const PAUSE = { right: 4 + 32, bottom: 4 + 24 };

function byLabel(label: string): TouchButton {
  const button = TOUCH_BUTTONS.find((b) => b.label === label);
  if (!button) throw new Error(`No ${label} button`);
  return button;
}

const gap = (a: TouchButton, b: TouchButton): number =>
  Math.hypot(a.right - b.right, a.bottom - b.bottom) - (a.diameter + b.diameter) / 2;

describe('touch layout (§2.4)', () => {
  it('has the six buttons, L, H, SAUT and S where they always were', () => {
    expect(TOUCH_BUTTONS.map((b) => b.label)).toEqual(['L', 'H', 'SAUT', 'S', 'PRISE', 'DASH']);
    expect(byLabel('L')).toMatchObject({ right: 200, bottom: 52, diameter: 68, flag: Input.Light });
    expect(byLabel('H')).toMatchObject({ right: 126, bottom: 52, diameter: 68, flag: Input.Heavy });
    expect(byLabel('SAUT')).toMatchObject({
      right: 52,
      bottom: 52,
      diameter: 60,
      flag: Input.Jump,
    });
    expect(byLabel('S')).toMatchObject({ right: 163, bottom: 126, diameter: 64 });
    expect(byLabel('PRISE')).toMatchObject({ right: 89, bottom: 126, flag: Input.Grab });
    expect(byLabel('DASH')).toMatchObject({ right: 237, bottom: 126, flag: Input.Dash });
  });

  it('leaves 6 to 16 px between each button and its nearest neighbor', () => {
    for (const button of TOUCH_BUTTONS) {
      const nearest = Math.min(
        ...TOUCH_BUTTONS.filter((b) => b !== button).map((b) => gap(button, b)),
      );
      expect(nearest, button.label).toBeGreaterThanOrEqual(6);
      expect(nearest, button.label).toBeLessThanOrEqual(16);
    }
  });

  it.each(SCREENS)('shows no overlap on a $name screen, all in the right half', (screen) => {
    for (const button of TOUCH_BUTTONS) {
      const radius = button.diameter / 2;
      const x = screen.width - screen.insetRight - button.right;
      const y = screen.height - screen.insetBottom - button.bottom;
      expect(x - radius, button.label).toBeGreaterThanOrEqual(screen.width / 2);
      expect(x + radius, button.label).toBeLessThanOrEqual(screen.width);
      expect(y - radius, button.label).toBeGreaterThanOrEqual(0);
      expect(y + radius, button.label).toBeLessThanOrEqual(screen.height);
      // Clear of the pause button.
      const pauseLeft = screen.width - screen.insetRight - PAUSE.right;
      expect(x + radius < pauseLeft || y - radius > PAUSE.bottom, button.label).toBe(true);
    }
    for (const a of TOUCH_BUTTONS) {
      for (const b of TOUCH_BUTTONS) if (a !== b) expect(gap(a, b)).toBeGreaterThan(0);
    }
  });

  it('keeps every button within reach of the thumb on the smallest phone', () => {
    const farthest = Math.max(...TOUCH_BUTTONS.map((b) => b.right + b.diameter / 2));
    expect(farthest).toBe(265);
  });

  it('fits each label inside its button', () => {
    for (const button of TOUCH_BUTTONS) {
      // The pixel font is monospaced: each glyph is as wide as the font size.
      const width = button.label.length * button.fontSize;
      expect(width, button.label).toBeLessThanOrEqual(button.diameter - 2 * LABEL_PADDING_PX);
    }
  });

  it('gives every button a touch zone of at least 48 px', () => {
    for (const button of TOUCH_BUTTONS) {
      expect(button.diameter + 2 * TOUCH_SLOP_PX, button.label).toBeGreaterThanOrEqual(48);
    }
  });
});

describe('nearestButton', () => {
  const index = (label: string) => TOUCH_BUTTONS.indexOf(byLabel(label));

  it('presses the button under the finger', () => {
    for (const button of TOUCH_BUTTONS) {
      expect(nearestButton(button.right, button.bottom)).toBe(TOUCH_BUTTONS.indexOf(button));
    }
  });

  it('counts a touch a little outside the visible circle', () => {
    const jump = byLabel('SAUT');
    expect(nearestButton(jump.right - jump.diameter / 2 - TOUCH_SLOP_PX, jump.bottom)).toBe(
      index('SAUT'),
    );
  });

  it('lets the nearest center win where two touch zones overlap', () => {
    // Between L (200) and H (126), 2 px nearer to H's center.
    expect(nearestButton(162, 52)).toBe(index('H'));
    expect(nearestButton(164, 52)).toBe(index('L'));
  });

  it('presses nothing far from every button', () => {
    expect(nearestButton(300, 300)).toBe(-1);
    expect(nearestButton(10, 200)).toBe(-1);
  });
});

/** A pointer event of the fake page. */
function pointer(type: string, pointerId: number, clientX: number, clientY: number): Event {
  return Object.assign(new Event(type), { pointerId, clientX, clientY });
}

describe('TouchControls', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Touch controls on a 667×375 screen, with their stick and button zones. */
  function setup() {
    const page = installFakePage();
    const controls = new TouchControls(page.body as unknown as HTMLElement, undefined);
    const [root] = page.body.children;
    const [stick, , buttons] = root?.children ?? [];
    if (!stick || !buttons) throw new Error('Touch zones missing');
    buttons.rect = { left: 333, top: 0, right: 667, bottom: 375 };
    return { controls, stick, buttons };
  }

  /** A finger down on the button labelled `label`, in screen coordinates. */
  function press(zone: FakeElement, label: string, pointerId: number): void {
    const button = byLabel(label);
    zone.dispatchEvent(pointer('pointerdown', pointerId, 667 - button.right, 375 - button.bottom));
  }

  it("dresses the special button, ring and letter, in the fighter's energy color", () => {
    const page = installFakePage();
    new TouchControls(page.body as unknown as HTMLElement, undefined, 0xff3ca0);
    const buttons = page.body.children[0]?.children[2];
    const special = buttons?.children[TOUCH_BUTTONS.findIndex((b) => b.flag === Input.Special)];
    expect(special?.style).toMatchObject({ borderColor: '#ff3ca0', color: '#ff3ca0' });
  });

  it('presses the nearest button with one listener for them all', () => {
    const { controls, buttons } = setup();
    press(buttons, 'DASH', 1);
    expect(controls.read()).toBe(Input.Dash);
    press(buttons, 'PRISE', 2);
    expect(controls.read()).toBe(Input.Dash | Input.Grab);
    buttons.dispatchEvent(pointer('pointerup', 1, 0, 0));
    expect(controls.read()).toBe(Input.Grab);
  });

  it('keeps a tap shorter than a frame for one read', () => {
    const { controls, buttons } = setup();
    press(buttons, 'DASH', 1);
    buttons.dispatchEvent(pointer('pointerup', 1, 0, 0));
    expect(controls.read()).toBe(Input.Dash);
    expect(controls.read()).toBe(0);
  });

  it('shows a button pressed while a finger holds it, set only when that changes', () => {
    const { buttons } = setup();
    const dash = buttons.children[TOUCH_BUTTONS.indexOf(byLabel('DASH'))];
    if (!dash) throw new Error('No DASH element');
    const add = vi.spyOn(dash.classList, 'add');
    press(buttons, 'DASH', 1);
    press(buttons, 'DASH', 2);
    expect(dash.classList.contains('pressed')).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    buttons.dispatchEvent(pointer('pointerup', 1, 0, 0));
    expect(dash.classList.contains('pressed')).toBe(true);
    buttons.dispatchEvent(pointer('pointerup', 2, 0, 0));
    expect(dash.classList.contains('pressed')).toBe(false);
  });

  it('places the buttons from the layout data', () => {
    const { buttons } = setup();
    const special = buttons.children[TOUCH_BUTTONS.indexOf(byLabel('S'))];
    expect(special?.style).toMatchObject({ right: '131px', bottom: '94px', width: '64px' });
  });

  it('never loses a double tap between two reads: the pass through neutral reads once', () => {
    const { controls, stick } = setup();
    stick.dispatchEvent(pointer('pointerdown', 7, 100, 200));
    stick.dispatchEvent(pointer('pointermove', 7, 130, 200));
    expect(controls.read()).toBe(Input.Right);
    // Back to the center and out again, both between two reads (a 30 fps phone).
    stick.dispatchEvent(pointer('pointermove', 7, 101, 200));
    stick.dispatchEvent(pointer('pointermove', 7, 130, 200));
    expect(controls.read()).toBe(0);
    expect(controls.read()).toBe(Input.Right);
  });

  it('gives a button pressed in the same read the direction reached through neutral', () => {
    const { controls, stick, buttons } = setup();
    stick.dispatchEvent(pointer('pointerdown', 7, 100, 200));
    stick.dispatchEvent(pointer('pointermove', 7, 130, 200));
    expect(controls.read()).toBe(Input.Right);
    // A quick reversal through the center to back, and DASH, all between two reads: the dash
    // is read with back held, a backdash, not a dash into the attack.
    stick.dispatchEvent(pointer('pointermove', 7, 101, 200));
    stick.dispatchEvent(pointer('pointermove', 7, 70, 200));
    press(buttons, 'DASH', 1);
    expect(controls.read()).toBe(Input.Left | Input.Dash);
    expect(controls.read()).toBe(Input.Left | Input.Dash);
  });

  it('reads a lifted thumb as neutral, then the new touch', () => {
    const { controls, stick } = setup();
    stick.dispatchEvent(pointer('pointerdown', 7, 100, 200));
    stick.dispatchEvent(pointer('pointermove', 7, 130, 200));
    expect(controls.read()).toBe(Input.Right);
    stick.dispatchEvent(pointer('pointerup', 7, 130, 200));
    stick.dispatchEvent(pointer('pointerdown', 8, 100, 200));
    stick.dispatchEvent(pointer('pointermove', 8, 130, 200));
    expect(controls.read()).toBe(0);
    expect(controls.read()).toBe(Input.Right);
  });
});
