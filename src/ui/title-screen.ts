import { connectedGamepads } from '../input/gamepad';

/**
 * Why some effects are missing, said on the title (the first screen of every launch), never
 * during a fight: the browser draws without WebGL (render-mode.ts). In the pixel font: no
 * capital accented letter.
 */
export const SIMPLE_MODE_NOTICE =
  "Mode simplifié : ton navigateur n'offre pas l'accélération graphique.";

/**
 * Title screen: any key, click, tap or gamepad button continues. `simplified`: the game is
 * drawn without WebGL, which it tells under the prompt.
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

    // The logo, its O a vinyl turning (Nayo's record, title-vinyl.png): read whole.
    const title = document.createElement('h1');
    title.className = 'title-logo';
    title.setAttribute('aria-label', 'NAYOSBEAT');
    const vinyl = document.createElement('span');
    vinyl.className = 'title-vinyl';
    title.append(logoPart('NAY'), vinyl, logoPart('SBEAT'));
    const prompt = document.createElement('p');
    prompt.className = 'title-prompt';
    prompt.textContent = 'Appuie sur une touche';
    const version = document.createElement('p');
    version.className = 'title-version';
    version.textContent = `Version du ${buildDate()}`;
    this.root.append(title, prompt, version);
    if (simplified) {
      const notice = document.createElement('p');
      notice.className = 'title-notice';
      notice.textContent = SIMPLE_MODE_NOTICE;
      this.root.append(notice);
    }
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

/** The build's date and time, in the player's time zone ("26/10/2026 23:41"). */
function buildDate(): string {
  const date = new Date(__BUILD_DATE__);
  return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Letters of the logo around its vinyl, hidden from screen readers (the title has its label). */
function logoPart(text: string): HTMLSpanElement {
  const part = document.createElement('span');
  part.textContent = text;
  part.setAttribute('aria-hidden', 'true');
  return part;
}
