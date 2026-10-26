const PAUSE_KEYS: ReadonlySet<string> = new Set(['Escape', 'KeyP']);
const START_BUTTON = 9;

/**
 * Pause requests during a fight: Escape or P, a gamepad's Start button, the on-screen pause
 * button, or the page being hidden (tab switch, phone locked).
 */
export class PauseInput {
  private requested = false;
  private readonly button: HTMLButtonElement;
  private startHeld = true;

  constructor(parent: HTMLElement) {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'pause-button';
    this.button.textContent = 'II';
    this.button.setAttribute('aria-label', 'Pause');
    this.button.addEventListener('click', this.request);
    parent.appendChild(this.button);

    window.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  /** Returns true once per pause request. Call once per frame. */
  consume(): boolean {
    this.pollStartButton();
    const requested = this.requested;
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
    window.removeEventListener('keydown', this.onKeyDown);
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

  /** Edge-triggered; starts as "held" so a Start press that opened the fight is ignored. */
  private pollStartButton(): void {
    if (typeof navigator.getGamepads !== 'function') return;
    const held = navigator
      .getGamepads()
      .some((pad) => pad?.connected === true && pad.buttons[START_BUTTON]?.pressed === true);
    if (held && !this.startHeld) this.request();
    this.startHeld = held;
  }
}
