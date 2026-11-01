import type { FinisherState } from '../core/finisher';
import { has, Input, type InputBits } from '../core/input';
import { BOOST_BAR, BOOST_MAX } from '../core/rules';
import type { Facing, FighterAction } from '../core/state';
import { nearestButton, TOUCH_BUTTONS } from './touch-layout';
import { bitsFromStick, finisherBack, followFinger, type Point } from './touch-stick';

/** How far the knob goes from the stick center; beyond it, the center follows the thumb. */
const KNOB_TRAVEL_PX = 36;
/**
 * The stuns in which the guard reads the stick held, on every tick (core/combat.ts,
 * BLOCKING_ACTIONS), while a BOOST press is only buffered: there, the 35° read would take down
 * off the crouch guard on the ticks of the press, and let a low blow through.
 */
const GUARDING_STUNS: ReadonlySet<FighterAction> = new Set(['blockstun', 'tech']);
/** The arc filling on the BOOST button's ring moves by a twentieth of a bar, as the HUD's. */
const RING_STEPS = 20;

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * On-screen controls for player 1: a floating stick on the left half of the screen (it appears
 * under the thumb) and the buttons of `touch-layout.ts` on the right. Multi-touch capable.
 *
 * Devices are read once per displayed frame: at 30 fps a thumb can leave the stick and come
 * back between two reads. A press is kept until read (`tappedBits`), and so is a pass through
 * neutral (`passedNeutral`): a double tap is never lost.
 */
export class TouchControls {
  private readonly root: HTMLDivElement;
  private readonly stickBase: HTMLDivElement;
  private readonly stickKnob: HTMLDivElement;
  /** A faint ring where the left thumb goes, until it first touches the stick's half. */
  private stickGhost: HTMLDivElement | undefined;
  private readonly buttonZone: HTMLDivElement;
  private readonly buttons: readonly HTMLDivElement[];

  private stickPointer: number | null = null;
  /** The stick's center and the thumb on it, updated in place as the thumb moves. */
  private readonly stickOrigin: Point = { x: 0, y: 0 };
  private readonly finger: Point = { x: 0, y: 0 };
  private stickBits: InputBits = 0;
  /** The stick went back to neutral since the last read: the next read says so once. */
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
   * @param onFirstTouch Called once, from inside a user gesture (e.g. to go fullscreen).
   * @param energy Player 1's energy color: the special button wears it.
   */
  constructor(
    parent: HTMLElement,
    private onFirstTouch: (() => void) | undefined,
    energy?: number,
  ) {
    this.root = createDiv('touch-controls');
    const stickZone = createDiv('touch-stick-zone');
    this.stickBase = createDiv('touch-stick-base');
    this.stickKnob = createDiv('touch-stick-knob');
    this.stickBase.appendChild(this.stickKnob);
    // The stick floats under the thumb, invisible at rest: this ring says where it lives.
    this.stickGhost = createDiv('touch-stick-ghost');
    stickZone.appendChild(this.stickGhost);
    this.buttonZone = createDiv('touch-button-zone');
    this.buttons = TOUCH_BUTTONS.map((spec) => {
      const button = createDiv(`touch-button ${spec.className}`);
      button.textContent = spec.label;
      // The layout is data: placed from its numbers, nothing duplicated in the stylesheet.
      button.style.right = `${spec.right - spec.diameter / 2}px`;
      button.style.bottom = `${spec.bottom - spec.diameter / 2}px`;
      button.style.width = `${spec.diameter}px`;
      button.style.height = `${spec.diameter}px`;
      button.style.fontSize = `${spec.fontSize}px`;
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
    this.root.append(stickZone, this.stickBase, this.buttonZone);

    this.root.addEventListener('contextmenu', preventDefault);
    this.root.addEventListener('pointerdown', this.notifyFirstTouch);

    stickZone.addEventListener('pointerdown', this.onStickDown);
    stickZone.addEventListener('pointermove', this.onStickMove);
    stickZone.addEventListener('pointerup', this.onStickUp);
    stickZone.addEventListener('pointercancel', this.onStickUp);
    stickZone.addEventListener('lostpointercapture', this.onStickUp);

    // One listener for every button: the nearest center wins where two touch zones overlap.
    this.buttonZone.addEventListener('pointerdown', this.onButtonDown);
    this.buttonZone.addEventListener('pointerup', this.onButtonUp);
    this.buttonZone.addEventListener('pointercancel', this.onButtonUp);
    this.buttonZone.addEventListener('lostpointercapture', this.onButtonUp);

    parent.appendChild(this.root);
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
      const { finger, stickOrigin: origin } = this;
      stick = finisherBack(stick, finger.x - origin.x, finger.y - origin.y, this.finisherBack);
    }
    const bits = stick | this.tappedBits | this.buttonsHeld();
    this.passedNeutral = false;
    this.tappedBits = 0;
    return bits;
  }

  /**
   * The stick and the buttons a finger holds right now, nothing reset: no tap, no pass through
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

  /** Removing the elements also drops every listener attached to them. */
  dispose(): void {
    this.root.remove();
    this.buttonPointers.clear();
  }

  private readonly notifyFirstTouch = (): void => {
    this.onFirstTouch?.();
    this.onFirstTouch = undefined;
  };

  private readonly onStickDown = (event: PointerEvent): void => {
    if (this.stickPointer !== null) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.stickPointer = event.pointerId;
    this.stickOrigin.x = event.clientX;
    this.stickOrigin.y = event.clientY;
    this.stickGhost?.remove();
    this.stickGhost = undefined;
    this.placeBase();
    this.stickBase.classList.add('active');
    this.moveKnob(0, 0);
  };

  private readonly onStickMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.stickPointer) return;
    const { finger, stickOrigin: origin } = this;
    finger.x = event.clientX;
    finger.y = event.clientY;
    const { x, y } = origin;
    followFinger(origin, finger, KNOB_TRAVEL_PX);
    if (origin.x !== x || origin.y !== y) this.placeBase();
    const dx = finger.x - origin.x;
    const dy = finger.y - origin.y;
    this.setStick(bitsFromStick(dx, dy, this.stickBits));
    this.moveKnob(dx, dy);
  };

  private readonly onStickUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.stickPointer) return;
    this.stickPointer = null;
    this.setStick(0);
    this.stickBase.classList.remove('active');
  };

  private setStick(bits: InputBits): void {
    if (bits === 0 && this.stickBits !== 0) this.passedNeutral = true;
    this.stickBits = bits;
  }

  private readonly onButtonDown = (event: PointerEvent): void => {
    // The layout is measured from the safe area's bottom-right corner, which the zone hugs.
    const zone = this.buttonZone.getBoundingClientRect();
    const index = nearestButton(zone.right - event.clientX, zone.bottom - event.clientY);
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

  private placeBase(): void {
    const { x, y } = this.stickOrigin;
    this.stickBase.style.transform = `translate(${x}px, ${y}px)`;
  }

  private moveKnob(dx: number, dy: number): void {
    const length = Math.hypot(dx, dy);
    const scale = length > KNOB_TRAVEL_PX ? KNOB_TRAVEL_PX / length : 1;
    this.stickKnob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  }
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
