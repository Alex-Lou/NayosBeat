import { connectedGamepads, isPressed, PadButton } from '../input/gamepad';
import { isTouchDevice } from '../input/touch-controls';
import { element, MENU_KEYS } from './menu';
import { titleLogo } from './title-logo';

/**
 * Why some effects are missing, said on the title (the first screen of every launch), never
 * during a fight: the browser draws without WebGL (render-mode.ts). In the pixel font: no
 * capital accented letter.
 */
export const SIMPLE_MODE_NOTICE =
  "Mode simplifié : ton navigateur n'offre pas l'accélération graphique.";

/**
 * Title screen: the player enters when they want, with the button, Enter / A, or a click on it.
 * `simplified`: the game is drawn without WebGL, which it tells under the button. The key art
 * is the MenuBackdrop behind it (app.ts).
 */
export class TitleScreen {
  private readonly root: HTMLDivElement;
  private frameRequest = 0;
  private done = false;
  /** A confirm button already held when the screen appears must be released first. */
  private padHeld = confirmHeld();

  constructor(
    parent: HTMLElement,
    private readonly onStart: () => void,
    simplified: boolean,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'menu title-screen';

    const poster = element('div', 'title-poster');
    poster.append(
      element('p', 'title-kicker', 'Sound Clash'),
      titleLogo('title-logo'),
      element('p', 'title-tagline', 'Le tournoi clandestin'),
    );

    const enter = element('button', 'title-enter');
    enter.type = 'button';
    enter.tabIndex = -1;
    const arrow = element('span', 'title-enter-arrow', '▶');
    arrow.setAttribute('aria-hidden', 'true');
    const hint = element('span', 'title-enter-hint', isTouchDevice() ? 'Touche' : 'Entrée / A');
    hint.setAttribute('aria-hidden', 'true');
    enter.append(arrow, element('span', 'title-enter-label', 'Entrer'), hint);
    enter.addEventListener('click', this.start);

    const bottom = element('div', 'title-bottom');
    bottom.appendChild(enter);
    if (simplified) bottom.appendChild(element('p', 'title-notice', SIMPLE_MODE_NOTICE));

    this.root.append(poster, bottom);
    parent.appendChild(this.root);

    window.addEventListener('keydown', this.onKeyDown);
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  }

  dispose(): void {
    this.done = true;
    window.removeEventListener('keydown', this.onKeyDown);
    cancelAnimationFrame(this.frameRequest);
    this.root.remove();
  }

  private readonly start = (): void => {
    if (this.done) return;
    this.done = true;
    this.onStart();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || MENU_KEYS[event.code] !== 'confirm') return;
    event.preventDefault();
    this.start();
  };

  /**
   * Browsers do not count gamepad presses as user gestures: starting with a gamepad works,
   * but sound and fullscreen wait for the first key, click or touch.
   */
  private readonly pollGamepads = (): void => {
    if (this.done) return;
    const held = confirmHeld();
    if (held && !this.padHeld) {
      this.start();
      return;
    }
    this.padHeld = held;
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  };
}

/** A gamepad's confirm button: South (A / Cross) or Start. */
function confirmHeld(): boolean {
  return connectedGamepads().some(
    (pad) => isPressed(pad, PadButton.South) || isPressed(pad, PadButton.Start),
  );
}
