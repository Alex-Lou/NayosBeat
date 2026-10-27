import { Input, type InputBits } from '../core/input';

/** Below this distance from the touch origin, the stick is neutral. */
const STICK_DEADZONE_PX = 12;
/** How far the knob goes from the stick center; beyond it, the center follows the thumb. */
const KNOB_TRAVEL_PX = 36;
/** sin(22.5°): splits the circle into 8 equal 45° direction sectors. */
const SECTOR_THRESHOLD = Math.sin(Math.PI / 8);

const BUTTONS = [
  { label: 'L', flag: Input.Light, className: 'touch-light' },
  { label: 'H', flag: Input.Heavy, className: 'touch-heavy' },
  { label: 'SAUT', flag: Input.Jump, className: 'touch-jump' },
  { label: 'S', flag: Input.Special, className: 'touch-special' },
  // Throw shortcut: light + heavy on a single button.
  { label: 'CHOPE', flag: Input.Light | Input.Heavy, className: 'touch-throw' },
] as const;

/** Converts a stick offset (screen coordinates, y pointing down) into direction flags. */
export function bitsFromStick(dx: number, dy: number, deadzone: number): InputBits {
  const length = Math.hypot(dx, dy);
  if (length < deadzone) return 0;

  const nx = dx / length;
  const ny = dy / length;
  let bits = 0;
  if (nx > SECTOR_THRESHOLD) bits |= Input.Right;
  if (nx < -SECTOR_THRESHOLD) bits |= Input.Left;
  if (ny > SECTOR_THRESHOLD) bits |= Input.Down;
  if (ny < -SECTOR_THRESHOLD) bits |= Input.Up;
  return bits;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Drags the stick center behind the finger so it is never more than `radius` away: reversing
 * direction then takes a short move, however far the thumb has drifted. Moves `origin` in
 * place and returns it: a thumb moves dozens of times a second, without a new point each time.
 */
export function followFinger(origin: Point, finger: Readonly<Point>, radius: number): Point {
  const dx = finger.x - origin.x;
  const dy = finger.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length <= radius) return origin;
  const excess = (length - radius) / length;
  origin.x += dx * excess;
  origin.y += dy * excess;
  return origin;
}

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * On-screen controls for player 1: a floating stick on the left half of the screen
 * (it appears under the thumb) and action buttons on the right. Multi-touch capable.
 */
export class TouchControls {
  private readonly root: HTMLDivElement;
  private readonly stickBase: HTMLDivElement;
  private readonly stickKnob: HTMLDivElement;

  private stickPointer: number | null = null;
  /** The stick's center and the thumb on it, updated in place as the thumb moves. */
  private readonly stickOrigin: Point = { x: 0, y: 0 };
  private readonly finger: Point = { x: 0, y: 0 };
  private stickBits: InputBits = 0;
  /** Button flag held by each active pointer. */
  private readonly buttonPointers = new Map<number, number>();
  /** Buttons pressed since the last read, so a tap shorter than a frame is not lost. */
  private tappedBits: InputBits = 0;

  /** @param onFirstTouch Called once, from inside a user gesture (e.g. to go fullscreen). */
  constructor(
    parent: HTMLElement,
    private onFirstTouch: (() => void) | undefined,
  ) {
    this.root = createDiv('touch-controls');
    const stickZone = createDiv('touch-stick-zone');
    this.stickBase = createDiv('touch-stick-base');
    this.stickKnob = createDiv('touch-stick-knob');
    this.stickBase.appendChild(this.stickKnob);
    this.root.append(stickZone, this.stickBase);

    this.root.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    this.root.addEventListener('pointerdown', this.notifyFirstTouch);

    stickZone.addEventListener('pointerdown', this.onStickDown);
    stickZone.addEventListener('pointermove', this.onStickMove);
    stickZone.addEventListener('pointerup', this.onStickUp);
    stickZone.addEventListener('pointercancel', this.onStickUp);
    stickZone.addEventListener('lostpointercapture', this.onStickUp);

    for (const { label, flag, className } of BUTTONS) {
      const button = createDiv(`touch-button ${className}`);
      button.textContent = label;
      button.addEventListener('pointerdown', (event) => {
        this.onButtonDown(event, flag);
      });
      button.addEventListener('pointerup', this.onButtonUp);
      button.addEventListener('pointercancel', this.onButtonUp);
      button.addEventListener('lostpointercapture', this.onButtonUp);
      this.root.appendChild(button);
    }

    parent.appendChild(this.root);
  }

  /** Call once per frame. */
  read(): InputBits {
    let bits = this.stickBits | this.tappedBits;
    for (const flag of this.buttonPointers.values()) bits |= flag;
    this.tappedBits = 0;
    return bits;
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
    this.stickBits = bitsFromStick(dx, dy, STICK_DEADZONE_PX);
    this.moveKnob(dx, dy);
  };

  private readonly onStickUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.stickPointer) return;
    this.stickPointer = null;
    this.stickBits = 0;
    this.stickBase.classList.remove('active');
  };

  private onButtonDown(event: PointerEvent, flag: number): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.buttonPointers.set(event.pointerId, flag);
    this.tappedBits |= flag;
  }

  private readonly onButtonUp = (event: PointerEvent): void => {
    this.buttonPointers.delete(event.pointerId);
  };

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

function createDiv(className: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = className;
  return element;
}
