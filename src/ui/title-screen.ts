import { connectedGamepads } from '../input/gamepad';
import { isTouchDevice } from '../input/touch-controls';
import { element } from './menu';
import { titleLogo } from './title-logo';

/**
 * Why some effects are missing, said on the title (the first screen of every launch), never
 * during a fight: the browser draws without WebGL (render-mode.ts). In the pixel font: no
 * capital accented letter.
 */
export const SIMPLE_MODE_NOTICE =
  "Mode simplifié : ton navigateur n'offre pas l'accélération graphique.";

/**
 * Title screen: any key, click, tap or gamepad button continues. `simplified`: the game is
 * drawn without WebGL, which it tells under the prompt. The key art is the MenuBackdrop behind
 * it (app.ts).
 */
export class TitleScreen {
  private readonly root: HTMLDivElement;
  private frameRequest = 0;
  private done = false;
  /**
   * A gamepad button already held when the screen appears (the "back" press that brought the
   * player here) must be released first: only a new press continues.
   */
  private padHeld = anyPadButtonHeld();

  constructor(
    parent: HTMLElement,
    private readonly onStart: () => void,
    simplified: boolean,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'menu title-screen';

    // The poster on the club's wall: the logo, its O a vinyl turning.
    const poster = element('div', 'title-poster');
    poster.append(
      element('p', 'title-kicker', 'Sound Clash'),
      titleLogo('title-logo'),
      element('p', 'title-tagline', 'Le tournoi clandestin'),
    );

    // What to press, told in the player's language: a touch screen has no key.
    const prompt = element('p', 'title-prompt');
    const arrow = element('span', 'title-prompt-arrow', '▶');
    arrow.setAttribute('aria-hidden', 'true');
    prompt.append(arrow, isTouchDevice() ? "Touche l'écran" : 'Appuie sur une touche');
    const bottom = element('div', 'title-bottom');
    bottom.appendChild(prompt);
    if (simplified) {
      bottom.appendChild(element('p', 'title-notice', SIMPLE_MODE_NOTICE));
    }

    this.root.append(poster, bottom);
    parent.appendChild(this.root);

    window.addEventListener('keydown', this.start);
    // `click`, not `pointerdown`: the click that follows a press would otherwise land on the
    // menu item appearing under the finger and select it.
    this.root.addEventListener('click', this.start);
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  }

  dispose(): void {
    this.done = true;
    window.removeEventListener('keydown', this.start);
    cancelAnimationFrame(this.frameRequest);
    this.root.remove();
  }

  private readonly start = (event?: Event): void => {
    // A key held down (the one that came back here) repeats: only a new press continues.
    if (this.done || (event instanceof KeyboardEvent && event.repeat)) return;
    this.onStart();
  };

  /**
   * Browsers do not count gamepad presses as user gestures: starting with a gamepad works,
   * but sound and fullscreen wait for the first key, click or touch.
   */
  private readonly pollGamepads = (): void => {
    if (this.done) return;
    const held = anyPadButtonHeld();
    if (held && !this.padHeld) {
      this.start();
      return;
    }
    this.padHeld = held;
    this.frameRequest = requestAnimationFrame(this.pollGamepads);
  };
}

function anyPadButtonHeld(): boolean {
  return connectedGamepads().some((pad) => pad.buttons.some((button) => button.pressed));
}
