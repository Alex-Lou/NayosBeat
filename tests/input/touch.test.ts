import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { has, Input } from '../../src/core/input';
import type { FighterAction } from '../../src/core/state';
import { TouchControls } from '../../src/input/touch-controls';
import {
  LABEL_PADDING_PX,
  nearestButton,
  TOUCH_BUTTONS,
  TOUCH_SLOP_PX,
  type TouchButton,
} from '../../src/input/touch-layout';
import { bitsFromDpad, FINISHER_BACK_DEGREES, finisherBack } from '../../src/input/touch-dpad';
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
  it('has six buttons in two rows of three, L, H and S where they always were, no SAUT', () => {
    expect(TOUCH_BUTTONS.map((b) => b.label)).toEqual(['L', 'H', 'S', 'PRISE', 'DASH', 'BOOST']);
    // Jumping is the d-pad's up (docs/combat-v2.md §0.2, D40).
    expect(TOUCH_BUTTONS.some((b) => b.flag === Input.Jump)).toBe(false);
    // Bottom row: L, H, PRISE in SAUT's old place.
    expect(byLabel('L')).toMatchObject({ right: 200, bottom: 52, diameter: 68, flag: Input.Light });
    expect(byLabel('H')).toMatchObject({ right: 126, bottom: 52, diameter: 68, flag: Input.Heavy });
    expect(byLabel('PRISE')).toMatchObject({
      right: 52,
      bottom: 52,
      diameter: 60,
      flag: Input.Grab,
    });
    // Top row: DASH, S, BOOST beside S (docs/combos-v3.md §1.8.5), where PRISE was.
    expect(byLabel('DASH')).toMatchObject({ right: 237, bottom: 126, flag: Input.Dash });
    expect(byLabel('S')).toMatchObject({ right: 163, bottom: 126, diameter: 64 });
    expect(byLabel('BOOST')).toMatchObject({
      right: 89,
      bottom: 126,
      diameter: 56,
      flag: Input.Boost,
    });
    expect(gap(byLabel('BOOST'), byLabel('S'))).toBeCloseTo(14, 1);
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
    const grab = byLabel('PRISE');
    expect(nearestButton(grab.right - grab.diameter / 2 - TOUCH_SLOP_PX, grab.bottom)).toBe(
      index('PRISE'),
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

/**
 * The d-pad and button zones of touch controls on a 667×375 screen, measured: the d-pad at its
 * default place, 104 px from the bottom-left corner, 156 px wide.
 */
function zonesOf(body: FakeElement): { pad: FakeElement; dpad: FakeElement; buttons: FakeElement } {
  const [pad, buttons] = body.children[0]?.children ?? [];
  const dpad = pad?.children[0];
  if (!pad || !dpad || !buttons) throw new Error('Touch zones missing');
  buttons.rect = { left: 333, top: 0, right: 667, bottom: 375 };
  dpad.rect = { left: 26, top: 193, right: 182, bottom: 349 };
  return { pad, dpad, buttons };
}

/** A finger on the d-pad zone, `dx`, `dy` CSS px from the pad's center (y pointing down). */
function touchPad(pad: FakeElement, type: string, pointerId: number, dx: number, dy: number): void {
  pad.dispatchEvent(pointer(type, pointerId, 104 + dx, 271 + dy));
}

/** A finger down on the button labelled `label` of a 667×375 screen, in screen coordinates. */
function press(zone: FakeElement, label: string, pointerId: number): void {
  const button = byLabel(label);
  zone.dispatchEvent(pointer('pointerdown', pointerId, 667 - button.right, 375 - button.bottom));
}

describe('TouchControls', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Touch controls on a 667×375 screen, with their d-pad and button zones. */
  function setup() {
    const page = installFakePage();
    const controls = new TouchControls(page.body as unknown as HTMLElement, undefined);
    const { pad, dpad, buttons } = zonesOf(page.body);
    return { controls, pad, dpad, buttons };
  }

  it("dresses the special button, ring and letter, in the fighter's energy color", () => {
    const page = installFakePage();
    new TouchControls(page.body as unknown as HTMLElement, undefined, 0xff3ca0);
    const buttons = page.body.children[0]?.children[1];
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

  it('shows the gauge on the BOOST ring, written to the page only when it changes', () => {
    const { controls, buttons } = setup();
    const boost = buttons.children[TOUCH_BUTTONS.indexOf(byLabel('BOOST'))];
    if (!boost) throw new Error('No BOOST element');
    const setProperty = vi.spyOn(boost.style as unknown as CSSStyleDeclaration, 'setProperty');
    const add = vi.spyOn(boost.classList, 'add');
    controls.showBoost(0);
    expect(boost.style).toMatchObject({ '--boost-bars': '0', '--boost-part': '0' });
    expect(boost.classList.contains('empty')).toBe(true);
    const writes = setProperty.mock.calls.length;
    const added = add.mock.calls.length;
    // Within one twentieth of a bar, nothing moves.
    controls.showBoost(49);
    controls.showBoost(49);
    expect(setProperty.mock.calls.length).toBe(writes);
    expect(add.mock.calls.length).toBe(added);
    controls.showBoost(1050);
    expect(boost.style).toMatchObject({ '--boost-bars': '1', '--boost-part': '0.05' });
    expect(boost.classList.contains('empty')).toBe(false);
    controls.showBoost(3000);
    expect(boost.style).toMatchObject({ '--boost-bars': '3', '--boost-part': '0' });
    expect(boost.classList.contains('full')).toBe(true);
  });

  it('places the buttons from the layout data', () => {
    const { buttons } = setup();
    const special = buttons.children[TOUCH_BUTTONS.indexOf(byLabel('S'))];
    expect(special?.style).toMatchObject({ right: '131px', bottom: '94px', width: '64px' });
  });

  it('never loses a double tap between two reads: the pass through neutral reads once', () => {
    const { controls, pad } = setup();
    touchPad(pad, 'pointerdown', 7, 50, 0);
    expect(controls.read()).toBe(Input.Right);
    // Back to the center and out again, both between two reads (a 30 fps phone).
    touchPad(pad, 'pointermove', 7, 2, 0);
    touchPad(pad, 'pointermove', 7, 50, 0);
    expect(controls.read()).toBe(0);
    expect(controls.read()).toBe(Input.Right);
  });

  it('gives a button pressed in the same read the direction reached through neutral', () => {
    const { controls, pad, buttons } = setup();
    touchPad(pad, 'pointerdown', 7, 50, 0);
    expect(controls.read()).toBe(Input.Right);
    // A quick reversal through the center to back, and DASH, all between two reads: the dash
    // is read with back held, a backdash, not a dash into the attack.
    touchPad(pad, 'pointermove', 7, 2, 0);
    touchPad(pad, 'pointermove', 7, -50, 0);
    press(buttons, 'DASH', 1);
    expect(controls.read()).toBe(Input.Left | Input.Dash);
    expect(controls.read()).toBe(Input.Left | Input.Dash);
  });

  it('reads a lifted thumb as neutral, then the new touch', () => {
    const { controls, pad } = setup();
    touchPad(pad, 'pointerdown', 7, 50, 0);
    expect(controls.read()).toBe(Input.Right);
    touchPad(pad, 'pointerup', 7, 50, 0);
    touchPad(pad, 'pointerdown', 8, 50, 0);
    expect(controls.read()).toBe(0);
    expect(controls.read()).toBe(Input.Right);
  });

  it('reads two arrows at once, under one thumb between them or under two fingers', () => {
    const { controls, pad } = setup();
    // One thumb between → and ↓: the diagonal.
    touchPad(pad, 'pointerdown', 7, 40, 40);
    expect(controls.read()).toBe(Input.Right | Input.Down);
    touchPad(pad, 'pointerup', 7, 40, 40);
    controls.read();
    // Two fingers, one on ↓ and one on →: the same, as a gamepad's cross held with two arrows.
    touchPad(pad, 'pointerdown', 7, 0, 50);
    touchPad(pad, 'pointerdown', 8, 50, 0);
    expect(controls.read()).toBe(Input.Down | Input.Right);
    touchPad(pad, 'pointerup', 8, 50, 0);
    expect(controls.read()).toBe(Input.Down);
  });

  it('keeps reading a thumb slid past the pad, and ignores a touch far from it', () => {
    const { controls, pad } = setup();
    touchPad(pad, 'pointerdown', 7, 50, 0);
    touchPad(pad, 'pointermove', 7, 200, -10);
    expect(controls.read()).toBe(Input.Right);
    touchPad(pad, 'pointerup', 7, 200, -10);
    controls.read();
    // Far from the pad: a thumb resting on the screen, no direction.
    touchPad(pad, 'pointerdown', 8, 200, -150);
    expect(controls.read()).toBe(0);
    touchPad(pad, 'pointermove', 8, 50, 0);
    expect(controls.read()).toBe(0);
  });

  it('lights the arrows held, written only when they change', () => {
    const { pad, dpad } = setup();
    const add = vi.spyOn(dpad.classList, 'add');
    touchPad(pad, 'pointerdown', 7, 40, 40);
    touchPad(pad, 'pointermove', 7, 42, 41);
    expect(['right', 'down', 'up', 'left'].map((name) => dpad.classList.contains(name))).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(add).toHaveBeenCalledTimes(2);
    touchPad(pad, 'pointermove', 7, 50, 0);
    expect(dpad.classList.contains('down')).toBe(false);
    touchPad(pad, 'pointerup', 7, 50, 0);
    expect(dpad.classList.contains('right')).toBe(false);
  });

  it('places the d-pad at the bottom-left, with the cluster’s size', () => {
    const { dpad } = setup();
    expect(dpad.style).toMatchObject({ left: '26px', bottom: '26px', width: '156px' });
  });
});

describe('the BOOST button with FINISH lit (docs/finisher.md §1.2, §1.3, §5.8 test 13)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** The declarations of each rule of the stylesheet, by selector, its comments left out. */
  function rules(): Map<string, Map<string, string>> {
    const css = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const found = new Map<string, Map<string, string>>();
    for (const [, selectors = '', body = ''] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const selector of selectors.split(',').map((part) => part.trim())) {
        const declarations = found.get(selector) ?? new Map<string, string>();
        for (const declaration of body.split(';')) {
          const colon = declaration.indexOf(':');
          if (colon < 0) continue;
          declarations.set(declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim());
        }
        found.set(selector, declarations);
      }
    }
    return found;
  }

  it('changes the fill and the label of .full: the energy, at 35 % behind, nothing pulsing', () => {
    const styles = rules();
    const finisher = styles.get('.touch-boost.finisher');
    const full = styles.get('.touch-boost.full');
    if (!finisher || !full) throw new Error('styles.css styles .full and .finisher');
    // What .full shows, it takes from the button and from BOOST: it changes neither.
    expect(full.has('background')).toBe(false);
    expect(full.has('color')).toBe(false);
    const fill = styles.get('.touch-button')?.get('background');
    const label = styles.get('.touch-boost')?.get('color');
    expect([fill, label]).toEqual(['rgba(255, 255, 255, 0.15)', '#f2f6ff']);
    expect(finisher.get('background')).not.toBe(fill);
    expect(finisher.get('color')).not.toBe(label);
    expect(finisher.get('background')).toMatch(/var\(--boost-energy\) 35%/);
    expect(finisher.get('color')).toBe('var(--boost-energy)');
    for (const property of ['animation', 'transition', 'opacity']) {
      expect(finisher.has(property), property).toBe(false);
    }
  });

  /** Touch controls on a 667×375 screen, and their BOOST button. */
  function setup() {
    const page = installFakePage();
    const controls = new TouchControls(page.body as unknown as HTMLElement, undefined, 0xff3ca0);
    const { pad, buttons } = zonesOf(page.body);
    const boost = buttons.children[TOUCH_BUTTONS.indexOf(byLabel('BOOST'))];
    if (!boost) throw new Error('No BOOST element');
    return { controls, pad, buttons, boost };
  }

  it('wears .finisher when ready only, written only when it changes, no button added', () => {
    const { controls, buttons, boost } = setup();
    const add = vi.spyOn(boost.classList, 'add');
    const remove = vi.spyOn(boost.classList, 'remove');
    controls.showBoost(3000);
    controls.showFinisher('blocked', 1, 'idle');
    expect(boost.classList.contains('full')).toBe(true);
    expect(boost.classList.contains('finisher')).toBe(false);
    controls.showFinisher('ready', 1, 'idle');
    controls.showFinisher('ready', -1, 'walkBack');
    expect(boost.classList.contains('finisher')).toBe(true);
    expect(add.mock.calls.filter(([name]) => name === 'finisher')).toHaveLength(1);
    controls.showFinisher('off', 1, 'idle');
    expect(boost.classList.contains('finisher')).toBe(false);
    expect(remove.mock.calls.filter(([name]) => name === 'finisher')).toHaveLength(1);
    // Its label keeps its text, the cluster its six buttons (touch layout, above).
    expect(boost.textContent).toBe('BOOST');
    expect(buttons.children).toHaveLength(6);
    expect(TOUCH_BUTTONS).toHaveLength(6);
  });

  /** The d-pad held `degrees` under the horizontal, 50 px out, toward `side` (-1: left). */
  function hold(pad: FakeElement, degrees: number, side: -1 | 1): void {
    const angle = (degrees * Math.PI) / 180;
    touchPad(pad, 'pointerdown', 7, side * 50 * Math.cos(angle), 50 * Math.sin(angle));
  }

  /** What the read of a BOOST press gives, the d-pad `degrees` down toward `side`. */
  function boostWith(
    signal: 'ready' | 'blocked' | 'off',
    facing: 1 | -1,
    degrees: number,
    side: -1 | 1,
    action: FighterAction = 'crouch',
  ) {
    const { controls, pad, buttons } = setup();
    controls.showFinisher(signal, facing, action);
    hold(pad, degrees, side);
    expect(controls.read()).toBe(
      (side < 0 ? Input.Left : Input.Right) | (degrees > 20 ? Input.Down : 0),
    );
    press(buttons, 'BOOST', 1);
    return { first: controls.read(), next: controls.read() };
  }

  it('reads back down to 35° under the horizontal as BOOST is pressed with FINISH lit', () => {
    for (const degrees of [25, 30, 34.5]) {
      expect(boostWith('ready', 1, degrees, -1).first, `${degrees}°`).toBe(
        Input.Left | Input.Boost,
      );
      // Facing left, the back is on the right.
      expect(boostWith('ready', -1, degrees, 1).first, `${degrees}°`).toBe(
        Input.Right | Input.Boost,
      );
    }
    // A clear down-back stays one: the anti-air's Remix.
    for (const degrees of [35.5, 40, 45]) {
      expect(boostWith('ready', 1, degrees, -1).first, `${degrees}°`).toBe(
        Input.Left | Input.Down | Input.Boost,
      );
    }
  });

  it('reads the d-pad as ever otherwise: FINISH unlit, forward, or BOOST held on', () => {
    for (const signal of ['blocked', 'off'] as const) {
      expect(boostWith(signal, 1, 30, -1).first, signal).toBe(
        Input.Left | Input.Down | Input.Boost,
      );
    }
    // The forward side: down-forward + BOOST stays the Remix it gives.
    expect(boostWith('ready', 1, 30, 1).first).toBe(Input.Right | Input.Down | Input.Boost);
    // Only the read of the press: held on, the thumb reads as it is.
    expect(boostWith('ready', 1, 30, -1).next).toBe(Input.Left | Input.Down | Input.Boost);
  });

  it('keeps the crouch guard in blockstun and a tech, where the press is only buffered', () => {
    // There the guard reads the d-pad on the ticks of the press: down stays, a low blow is parried.
    for (const action of ['blockstun', 'tech'] as const) {
      expect(boostWith('ready', 1, 30, -1, action).first, action).toBe(
        Input.Left | Input.Down | Input.Boost,
      );
    }
    // Wherever the press lets the super go at once, back reads down to 35°, guard included.
    for (const action of ['idle', 'crouch', 'walkBack', 'guard'] as const) {
      expect(boostWith('ready', 1, 30, -1, action).first, action).toBe(Input.Left | Input.Boost);
    }
    // The button still wears FINISH in blockstun, and the read comes back with the stun's end.
    const { controls, pad, buttons, boost } = setup();
    controls.showBoost(3000);
    controls.showFinisher('ready', 1, 'blockstun');
    expect(boost.classList.contains('finisher')).toBe(true);
    hold(pad, 30, -1);
    press(buttons, 'BOOST', 1);
    expect(controls.read()).toBe(Input.Left | Input.Down | Input.Boost);
    controls.showFinisher('ready', 1, 'crouch');
    press(buttons, 'BOOST', 2);
    expect(controls.read()).toBe(Input.Left | Input.Boost);
  });
});

describe('finisherBack (docs/finisher.md §1.3)', () => {
  const at = (degrees: number, side: -1 | 1): [number, number] => {
    const angle = (degrees * Math.PI) / 180;
    return [side * 30 * Math.cos(angle), 30 * Math.sin(angle)];
  };

  it('drops down from the back diagonal up to 35°, nothing else', () => {
    expect(FINISHER_BACK_DEGREES).toBe(35);
    const downBack = Input.Left | Input.Down;
    expect(finisherBack(downBack, ...at(30, -1), Input.Left)).toBe(Input.Left);
    expect(finisherBack(downBack, ...at(40, -1), Input.Left)).toBe(downBack);
    // The back is the other way, or not given (FINISH unlit): untouched.
    expect(finisherBack(downBack, ...at(30, -1), Input.Right)).toBe(downBack);
    expect(finisherBack(downBack, ...at(30, -1), 0)).toBe(downBack);
    // Back alone, down alone, up-back: untouched.
    expect(finisherBack(Input.Left, ...at(10, -1), Input.Left)).toBe(Input.Left);
    expect(finisherBack(Input.Down, 0, 30, Input.Left)).toBe(Input.Down);
    expect(finisherBack(Input.Left | Input.Up, -25, -15, Input.Left)).toBe(Input.Left | Input.Up);
  });

  it('agrees with the d-pad on what it reads down-back', () => {
    for (let degrees = 0; degrees <= 90; degrees += 0.5) {
      const [dx, dy] = at(degrees, -1);
      const bits = bitsFromDpad(dx, dy, 78, 0);
      const read = finisherBack(bits, dx, dy, Input.Left);
      const back = degrees <= FINISHER_BACK_DEGREES;
      expect(has(read, Input.Down), `${degrees}°`).toBe(has(bits, Input.Down) && !back);
      // Back stays back wherever the d-pad read it.
      expect(has(read, Input.Left)).toBe(has(bits, Input.Left));
    }
  });
});
