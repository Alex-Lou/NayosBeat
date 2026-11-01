import { isPressed, PadButton } from './gamepad';

const PAUSE_KEYS: ReadonlySet<string> = new Set(['Escape', 'KeyP']);
/** Matches the CSS rule showing the "rotate your phone" hint over the game. */
const PORTRAIT_PHONE = '(orientation: portrait) and (pointer: coarse)';

/**
 * Pause requests during a fight: Escape or P, a gamepad's Start button, the on-screen pause
 * button, or the game becoming unplayable for a moment (tab hidden, window left, phone
 * locked or turned to portrait, the picture lost with the GPU).
 */
export class PauseInput {
  private requested = false;
  private readonly button: HTMLButtonElement;
  private readonly portrait: MediaQueryList;
  /** Starts as "held" so a Start press that opened the fight does not pause it at once. */
  private startHeld = true;

  constructor(parent: HTMLElement) {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'pause-button';
    this.button.textContent = 'II';
    this.button.setAttribute('aria-label', 'Pause');
    this.button.addEventListener('click', this.request);
    parent.appendChild(this.button);

    this.portrait = window.matchMedia(PORTRAIT_PHONE);
    this.portrait.addEventListener('change', this.onOrientationChange);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('blur', this.request);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  /**
   * Returns true once per pause request, and on every call while the fight cannot be seen
   * (`blind`: the browser took the GPU away, a lost WebGL context): a fight resumed or started
   * again before the picture is back pauses at once, no tick played unseen. Call once per frame
   * with the connected gamepads.
   */
  consume(pads: readonly Gamepad[], blind: boolean): boolean {
    const startHeld = pads.some((pad) => isPressed(pad, PadButton.Start));
    if (startHeld && !this.startHeld) this.request();
    this.startHeld = startHeld;

    const requested = this.requested || blind;
    this.requested = false;
    return requested;
  }

  /**
   * Forgets pending requests, e.g. when the pause menu closes: the key or button that closed
   * it must not pause again. Start must be released before it can pause again.
   */
  reset(): void {
    this.requested = false;
    this.startHeld = true;
  }

  dispose(): void {
    this.portrait.removeEventListener('change', this.onOrientationChange);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('blur', this.request);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.button.remove();
  }

  private readonly request = (): void => {
    this.requested = true;
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!PAUSE_KEYS.has(event.code) || event.repeat) return;
    event.preventDefault();
    this.request();
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.request();
  };

  private readonly onOrientationChange = (event: MediaQueryListEvent): void => {
    if (event.matches) this.request();
  };
}
