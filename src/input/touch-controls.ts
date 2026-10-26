import { Input, type InputBits } from '../core/input';

/** Below this distance from the touch origin, the stick is neutral. */
const STICK_DEADZONE_PX = 12;
/** How far the knob is drawn from the stick center at most. */
const KNOB_TRAVEL_PX = 36;
/** sin(22.5°): splits the circle into 8 equal 45° direction sectors. */
const SECTOR_THRESHOLD = Math.sin(Math.PI / 8);

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

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * On-screen controls for player 1: a floating stick on the left half of the screen
 * (it appears under the thumb) and a jump button on the right. Multi-touch capable.
 */
export class TouchControls {
  private readonly root: HTMLDivElement;
  private readonly stickBase: HTMLDivElement;
  private readonly stickKnob: HTMLDivElement;

  private stickPointer: number | null = null;
  private stickOriginX = 0;
  private stickOriginY = 0;
  private stickBits: InputBits = 0;
  private jumpPointer: number | null = null;

  /** @param onFirstTouch Called once, from inside a user gesture (e.g. to go fullscreen). */
  constructor(
    parent: HTMLElement,
    private onFirstTouch: (() => void) | undefined,
  ) {
    this.root = createElement('div', 'touch-controls');
    const stickZone = createElement('div', 'touch-stick-zone');
    this.stickBase = createElement('div', 'touch-stick-base');
    this.stickKnob = createElement('div', 'touch-stick-knob');
    const jumpButton = createElement('div', 'touch-button');
    jumpButton.textContent = 'SAUT';

    this.stickBase.appendChild(this.stickKnob);
    this.root.append(stickZone, this.stickBase, jumpButton);
    parent.appendChild(this.root);

    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    this.root.addEventListener('pointerdown', this.notifyFirstTouch);

    stickZone.addEventListener('pointerdown', this.onStickDown);
    stickZone.addEventListener('pointermove', this.onStickMove);
    stickZone.addEventListener('pointerup', this.onStickUp);
    stickZone.addEventListener('pointercancel', this.onStickUp);
    stickZone.addEventListener('lostpointercapture', this.onStickUp);

    jumpButton.addEventListener('pointerdown', this.onJumpDown);
    jumpButton.addEventListener('pointerup', this.onJumpUp);
    jumpButton.addEventListener('pointercancel', this.onJumpUp);
    jumpButton.addEventListener('lostpointercapture', this.onJumpUp);
  }

  read(): InputBits {
    return this.stickBits | (this.jumpPointer !== null ? Input.Jump : 0);
  }

  /** Removing the elements also drops every listener attached to them. */
  dispose(): void {
    this.root.remove();
  }

  private readonly notifyFirstTouch = (): void => {
    this.onFirstTouch?.();
    this.onFirstTouch = undefined;
  };

  private readonly onStickDown = (event: PointerEvent): void => {
    if (this.stickPointer !== null) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.stickPointer = event.pointerId;
    this.stickOriginX = event.clientX;
    this.stickOriginY = event.clientY;
    this.stickBase.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    this.stickBase.classList.add('active');
    this.moveKnob(0, 0);
  };

  private readonly onStickMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.stickPointer) return;
    const dx = event.clientX - this.stickOriginX;
    const dy = event.clientY - this.stickOriginY;
    this.stickBits = bitsFromStick(dx, dy, STICK_DEADZONE_PX);
    this.moveKnob(dx, dy);
  };

  private readonly onStickUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.stickPointer) return;
    this.stickPointer = null;
    this.stickBits = 0;
    this.stickBase.classList.remove('active');
  };

  private readonly onJumpDown = (event: PointerEvent): void => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.jumpPointer = event.pointerId;
  };

  private readonly onJumpUp = (event: PointerEvent): void => {
    if (event.pointerId === this.jumpPointer) this.jumpPointer = null;
  };

  private moveKnob(dx: number, dy: number): void {
    const length = Math.hypot(dx, dy);
    const scale = length > KNOB_TRAVEL_PX ? KNOB_TRAVEL_PX / length : 1;
    this.stickKnob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
  }
}

function createElement(tag: 'div', className: string): HTMLDivElement {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}
