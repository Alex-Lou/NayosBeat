import type { FinisherState } from '../core/finisher';
import { has, Input, type InputBits } from '../core/input';
import { BOOST_BAR, BOOST_MAX } from '../core/rules';
import type { Facing, FighterAction } from '../core/state';
import { controlsStore, type ControlsStore } from './controls-store';
import { bitsFromDpad, finisherBack } from './touch-dpad';
import {
  BOOST_RING_PX,
  dpadOf,
  DPAD_SLOP_PX,
  fittedButtons,
  nearestButton,
  TOUCH_BUTTONS,
  type TouchButton,
  type TouchLayout,
} from './touch-layout';

/** The d-pad's arrows, lit while held: their class and their direction. */
const ARROWS = [
  ['up', Input.Up],
  ['down', Input.Down],
  ['left', Input.Left],
  ['right', Input.Right],
] as const;
/**
 * The stuns in which the guard reads the stick held, on every tick (core/combat.ts,
 * BLOCKING_ACTIONS), while a BOOST press is only buffered: there, the 35° read would take down
 * off the crouch guard on the ticks of the press, and let a low blow through.
 */
const GUARDING_STUNS: ReadonlySet<FighterAction> = new Set(['blockstun', 'tech']);
/** The arc filling on the BOOST button's ring moves by a twentieth of a bar, as the HUD's. */
const RING_STEPS = 20;
/**
 * A button fades under a fighter and comes back once nobody has been under it this long, and never
 * changes sooner than this after its last change: the cluster's fill swings about ΔL 0.10 over
 * more than the flash surface (docs/flashs.md §1.1), so a fade and its return are two seconds
 * apart at least, never a flicker, and a fighter dancing at a button's edge keeps it faded.
 */
export const COVER_HOLD_MS = 1000;

/** A finger on the d-pad: where it is from the pad's center, and the directions it gives. */
interface PadFinger {
  dx: number;
  dy: number;
  bits: InputBits;
}

/** A round button on the page, in CSS pixels. */
export interface ButtonCircle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * On-screen controls for player 1: a d-pad fixed at the bottom-left (`touch-dpad.ts`) and the
 * buttons of `touch-layout.ts` on the right. Multi-touch capable: as on a gamepad's cross, two
 * arrows held at once read together, under one thumb between them or under two fingers.
 *
 * Devices are read once per displayed frame: at 30 fps a thumb can leave the pad and come
 * back between two reads. A press is kept until read (`tappedBits`), and so is a pass through
 * neutral (`passedNeutral`): a double tap is never lost.
 */
export class TouchControls {
  private readonly root: HTMLDivElement;
  /** The left half: a touch near the pad lands on it (DPAD_SLOP_PX), the rest is ignored. */
  private readonly dpadZone: HTMLDivElement;
  private readonly dpad: HTMLDivElement;
  private readonly buttonZone: HTMLDivElement;
  private readonly buttons: readonly HTMLDivElement[];
  /**
   * The buttons where the player's layout puts them, shrunk if this screen is smaller than the
   * layout's (`fittedButtons`): drawn and touched.
   */
  private placed: readonly TouchButton[];
  /** The player's layout as the store keeps it: never changed here. */
  private layout: TouchLayout;
  /** Counts the layouts taken: what measured the buttons measures them again when it moves. */
  private layoutCount = 0;
  private readonly unsubscribe: () => void;

  /** Each finger on the d-pad, by pointer; their directions read together (`padBits`). */
  private readonly padFingers = new Map<number, PadFinger>();
  /** The d-pad's center on the page and its radius, measured as a finger lands on it. */
  private padX = 0;
  private padY = 0;
  private padRadius = 0;
  private stickBits: InputBits = 0;
  /** The pad went back to neutral since the last read: the next read says so once. */
  private passedNeutral = false;
  /** Index (in TOUCH_BUTTONS) of the button held by each active pointer. */
  private readonly buttonPointers = new Map<number, number>();
  /** How many pointers hold each button: its pressed look changes only when this does. */
  private readonly holders: number[] = TOUCH_BUTTONS.map(() => 0);
  /** Buttons pressed since the last read, so a tap shorter than a frame is not lost. */
  private tappedBits: InputBits = 0;
  /** The BOOST button, and the gauge its ring shows (-1: not shown yet). */
  private readonly boostButton: HTMLDivElement | undefined;
  private shownBars = -1;
  private shownPart = -1;
  /** FINISH lit for player 1: the button wears it, and the fighter's back (Left or Right). */
  private finisher = false;
  private finisherBack: InputBits = 0;
  /**
   * Each button faded (`setCovered`), since when, and when a fighter was last under it; the d-pad
   * last (`buttonCircles`).
   */
  private readonly covers = [...TOUCH_BUTTONS, undefined].map(() => ({
    faded: false,
    fadedSince: -Infinity,
    coveredAt: -Infinity,
  }));

  /**
   * @param onFirstTouch Called once, from inside a user gesture (e.g. to go fullscreen).
   * @param energy Player 1's energy color: the special button wears it.
   * @param store The player's layout (« Disposition »): changed under the pause, it applies at once.
   */
  constructor(
    parent: HTMLElement,
    private onFirstTouch: (() => void) | undefined,
    energy?: number,
    store: ControlsStore = controlsStore,
  ) {
    this.root = createDiv('touch-controls');
    const dpadZone = createDiv('touch-dpad-zone');
    this.dpadZone = dpadZone;
    this.dpad = createDpad();
    dpadZone.appendChild(this.dpad);
    this.buttonZone = createDiv('touch-button-zone');
    this.placed = TOUCH_BUTTONS;
    this.buttons = TOUCH_BUTTONS.map((spec) => {
      const button = createDiv(`touch-button ${spec.className}`);
      button.textContent = spec.label;
      if (energy !== undefined && spec.flag === Input.Special) {
        // Its ring and its letter: the stylesheet's cyan is Nayo's, never Riff's magenta.
        const color = `#${energy.toString(16).padStart(6, '0')}`;
        button.style.borderColor = color;
        button.style.color = color;
      }
      if (energy !== undefined && spec.flag === Input.Boost) {
        // The arc of the bar filling on its ring.
        button.style.setProperty('--boost-energy', `#${energy.toString(16).padStart(6, '0')}`);
      }
      return button;
    });
    this.boostButton = this.buttons[TOUCH_BUTTONS.findIndex((spec) => spec.flag === Input.Boost)];
    this.buttonZone.append(...this.buttons);
    this.layout = store.get().touch;
    this.unsubscribe = store.subscribe(({ touch }) => {
      this.layout = touch;
      this.place();
    });
    this.root.append(dpadZone, this.buttonZone);

    this.root.addEventListener('contextmenu', preventDefault);
    this.root.addEventListener('pointerdown', this.notifyFirstTouch);

    dpadZone.addEventListener('pointerdown', this.onPadDown);
    dpadZone.addEventListener('pointermove', this.onPadMove);
    dpadZone.addEventListener('pointerup', this.onPadUp);
    dpadZone.addEventListener('pointercancel', this.onPadUp);
    dpadZone.addEventListener('lostpointercapture', this.onPadUp);

    // One listener for every button: the nearest center wins where two touch zones overlap.
    this.buttonZone.addEventListener('pointerdown', this.onButtonDown);
    this.buttonZone.addEventListener('pointerup', this.onButtonUp);
    this.buttonZone.addEventListener('pointercancel', this.onButtonUp);
    this.buttonZone.addEventListener('lostpointercapture', this.onButtonUp);

    parent.appendChild(this.root);
    // On the page, the zone has its size: the buttons fit in it, and again whenever it changes
    // (the browser's bars, fullscreen, a turn).
    this.place();
    window.addEventListener('resize', this.place);
  }

  /** Call once per frame. */
  read(): InputBits {
    // No latch on a read with a fresh button press: the button takes the stick's direction
    // (back + DASH is a backdash, → + S the forward special), and it outranks a double tap on
    // that tick anyway.
    const latched = this.passedNeutral && this.tappedBits === 0;
    let stick = latched ? 0 : this.stickBits;
    // BOOST pressed with FINISH lit: a thumb a little low on the back side still reads back, on
    // the read of the press, whose directions the core keeps with the command.
    if (this.finisherBack !== 0 && has(this.tappedBits, Input.Boost)) {
      stick = 0;
      for (const { dx, dy, bits } of this.padFingers.values()) {
        stick |= finisherBack(bits, dx, dy, this.finisherBack);
      }
    }
    const bits = stick | this.tappedBits | this.buttonsHeld();
    this.passedNeutral = false;
    this.tappedBits = 0;
    return bits;
  }

  /**
   * The pad and the buttons a finger holds right now, nothing reset: no tap, no pass through
   * neutral taken from the next read.
   */
  heldBits(): InputBits {
    return this.stickBits | this.buttonsHeld();
  }

  private buttonsHeld(): InputBits {
    let bits = 0;
    for (let index = 0; index < this.holders.length; index++) {
      if ((this.holders[index] ?? 0) > 0) bits |= TOUCH_BUTTONS[index]?.flag ?? 0;
    }
    return bits;
  }

  /**
   * Player 1's Boost gauge on the ring of the BOOST button (docs/combos-v3.md §1.8.5): one arc
   * per bar, the full ones white, the one filling by twentieths of a bar; the button greyed under
   * a bar, lit at three, when the super is ready. Written to the page only when it changes.
   */
  showBoost(boost: number): void {
    const button = this.boostButton;
    if (!button) return;
    const bars = Math.floor(Math.min(boost, BOOST_MAX) / BOOST_BAR);
    const full = bars * BOOST_BAR >= BOOST_MAX;
    const part = full ? 0 : Math.floor(((boost % BOOST_BAR) * RING_STEPS) / BOOST_BAR);
    if (bars !== this.shownBars) {
      button.style.setProperty('--boost-bars', String(bars));
      toggle(button, 'empty', bars < 1);
      toggle(button, 'full', full);
      this.shownBars = bars;
    }
    if (part !== this.shownPart) {
      button.style.setProperty('--boost-part', String(part / RING_STEPS));
      this.shownPart = part;
    }
  }

  /**
   * Player 1's Finisher signal (docs/finisher.md §1.2), its fighter facing `facing`, doing
   * `action`: ready, the BOOST button wears its steady mark (`.finisher`: its fill and its label
   * in the energy, nothing pulsing; blocked, it stays `.full`), and back reads down to 35° under
   * the horizontal as BOOST is pressed (§1.3), but not in blockstun or a tech, where the press is
   * only buffered and the guard reads the stick held (GUARDING_STUNS). Written to the page only
   * when it changes.
   */
  showFinisher(signal: FinisherState, facing: Facing, action: FighterAction): void {
    const ready = signal === 'ready';
    const back = facing === 1 ? Input.Left : Input.Right;
    this.finisherBack = ready && !GUARDING_STUNS.has(action) ? back : 0;
    if (ready === this.finisher || !this.boostButton) return;
    toggle(this.boostButton, 'finisher', ready);
    this.finisher = ready;
  }

  /**
   * Places the buttons where the layout puts them on this screen (`fittedButtons`), and the
   * cluster's opacity: the layout is data, nothing of it duplicated in the stylesheet.
   */
  private readonly place = (): void => {
    const { layout } = this;
    const zone = this.buttonZone.getBoundingClientRect();
    const size = { width: zone.right - zone.left, height: zone.bottom - zone.top };
    this.placed = fittedButtons(layout, size);
    this.placed.forEach((spec, index) => {
      const button = this.buttons[index];
      if (button) placeButton(button, spec);
    });
    placeDpad(this.dpad, dpadOf(layout));
    const opacity = layout.opacity === 100 ? '' : String(layout.opacity / 100);
    this.buttonZone.style.opacity = opacity;
    this.dpadZone.style.opacity = opacity;
    this.layoutCount++;
  };

  /** Changes each time the buttons move (`buttonCircles` measures them anew). */
  get layoutVersion(): number {
    return this.layoutCount;
  }

  /**
   * Where each button is on the page (TOUCH_BUTTONS' order), round, BOOST with its ring; the
   * d-pad last.
   */
  buttonCircles(): ButtonCircle[] {
    return [...this.buttons, this.dpad].map((button, index) => {
      const rect = button.getBoundingClientRect();
      const ring = TOUCH_BUTTONS[index]?.flag === Input.Boost ? BOOST_RING_PX : 0;
      return {
        x: (rect.left + rect.right) / 2,
        y: (rect.top + rect.bottom) / 2,
        radius: (rect.right - rect.left) / 2 + ring,
      };
    });
  }

  /**
   * Which buttons a fighter is under (`src/render/touch-cover.ts`, `buttonCircles`' order: the
   * d-pad last), at `now` in milliseconds: each fades on its own (`.covered`, less when pressed),
   * and comes back after COVER_HOLD_MS with nobody under it; never twice in COVER_HOLD_MS.
   */
  setCovered(covered: readonly boolean[], now: number): void {
    this.covers.forEach((cover, index) => {
      if (covered[index]) cover.coveredAt = now;
      const fade = now - cover.coveredAt < COVER_HOLD_MS;
      const button = this.buttons[index] ?? this.dpad;
      if (fade === cover.faded || now - cover.fadedSince < COVER_HOLD_MS) return;
      toggle(button, 'covered', fade);
      cover.faded = fade;
      cover.fadedSince = now;
    });
  }

  /** Removing the elements also drops every listener attached to them. */
  dispose(): void {
    this.unsubscribe();
    window.removeEventListener('resize', this.place);
    this.root.remove();
    this.buttonPointers.clear();
    this.padFingers.clear();
  }

  private readonly notifyFirstTouch = (): void => {
    this.onFirstTouch?.();
    this.onFirstTouch = undefined;
  };

  private readonly onPadDown = (event: PointerEvent): void => {
    const rect = this.dpad.getBoundingClientRect();
    this.padX = (rect.left + rect.right) / 2;
    this.padY = (rect.top + rect.bottom) / 2;
    this.padRadius = (rect.right - rect.left) / 2;
    const dx = event.clientX - this.padX;
    const dy = event.clientY - this.padY;
    // Far from the pad, a touch is a thumb resting on the screen, not a direction.
    if (Math.hypot(dx, dy) > this.padRadius + DPAD_SLOP_PX) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.padFingers.set(event.pointerId, { dx, dy, bits: bitsFromDpad(dx, dy, this.padRadius, 0) });
    this.updatePad();
  };

  /** A finger held on the pad slides: it reads anew, past the pad's edge as well. */
  private readonly onPadMove = (event: PointerEvent): void => {
    const finger = this.padFingers.get(event.pointerId);
    if (!finger) return;
    finger.dx = event.clientX - this.padX;
    finger.dy = event.clientY - this.padY;
    finger.bits = bitsFromDpad(finger.dx, finger.dy, this.padRadius, finger.bits);
    this.updatePad();
  };

  private readonly onPadUp = (event: PointerEvent): void => {
    if (!this.padFingers.delete(event.pointerId)) return;
    this.updatePad();
  };

  /**
   * Every finger's directions together, as a gamepad's cross held with two arrows (opposites are
   * the core's to resolve, `cleanSocd`); the arrows lit, set on change only.
   */
  private updatePad(): void {
    let bits = 0;
    for (const finger of this.padFingers.values()) bits |= finger.bits;
    if (bits === this.stickBits) return;
    for (const [name, flag] of ARROWS) {
      if (has(bits, flag) !== has(this.stickBits, flag)) toggle(this.dpad, name, has(bits, flag));
    }
    this.setStick(bits);
  }

  private setStick(bits: InputBits): void {
    if (bits === 0 && this.stickBits !== 0) this.passedNeutral = true;
    this.stickBits = bits;
  }

  private readonly onButtonDown = (event: PointerEvent): void => {
    // The layout is measured from the safe area's bottom-right corner, which the zone hugs.
    const zone = this.buttonZone.getBoundingClientRect();
    const index = nearestButton(
      zone.right - event.clientX,
      zone.bottom - event.clientY,
      this.placed,
    );
    const flag = TOUCH_BUTTONS[index]?.flag;
    if (flag === undefined) return;
    this.buttonZone.setPointerCapture(event.pointerId);
    this.buttonPointers.set(event.pointerId, index);
    this.tappedBits |= flag;
    this.hold(index, 1);
  };

  private readonly onButtonUp = (event: PointerEvent): void => {
    const index = this.buttonPointers.get(event.pointerId);
    if (index === undefined) return;
    this.buttonPointers.delete(event.pointerId);
    this.hold(index, -1);
  };

  /** One more (or one less) pointer on a button: its pressed look follows, set on change only. */
  private hold(index: number, change: 1 | -1): void {
    const before = this.holders[index] ?? 0;
    const after = before + change;
    this.holders[index] = after;
    const classes = this.buttons[index]?.classList;
    if (!classes || before > 0 === after > 0) return;
    if (after > 0) classes.add('pressed');
    else classes.remove('pressed');
  }
}

/** A touch button's place and size on the page, from the corner of its zone. */
export function placeButton(button: HTMLElement, spec: TouchButton): void {
  button.style.right = `${spec.right - spec.diameter / 2}px`;
  button.style.bottom = `${spec.bottom - spec.diameter / 2}px`;
  button.style.width = `${spec.diameter}px`;
  button.style.height = `${spec.diameter}px`;
  button.style.fontSize = `${spec.fontSize}px`;
}

/** The d-pad's look: a round base and its four arrows (styles.css, `.touch-dpad`). */
export function createDpad(): HTMLDivElement {
  const dpad = createDiv('touch-dpad');
  for (const [name] of ARROWS) dpad.appendChild(createDiv(`touch-dpad-arrow ${name}`));
  return dpad;
}

/** The d-pad's place and size on the page, from the bottom-left corner of its zone. */
export function placeDpad(
  dpad: HTMLElement,
  spec: { readonly left: number; readonly bottom: number; readonly diameter: number },
): void {
  dpad.style.left = `${spec.left - spec.diameter / 2}px`;
  dpad.style.bottom = `${spec.bottom - spec.diameter / 2}px`;
  dpad.style.width = `${spec.diameter}px`;
  dpad.style.height = `${spec.diameter}px`;
}

function toggle(element: HTMLElement, className: string, on: boolean): void {
  if (on) element.classList.add(className);
  else element.classList.remove(className);
}

function createDiv(className: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = className;
  return element;
}

function preventDefault(event: Event): void {
  event.preventDefault();
}
