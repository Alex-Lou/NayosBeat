import { connectedGamepads } from '../input/gamepad';

/** Title screen: any key, click, tap or gamepad button continues. */
export class TitleScreen {
  private readonly root: HTMLDivElement;
  private frameRequest = 0;
  private done = false;

  constructor(
    parent: HTMLElement,
    private readonly onStart: () => void,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'menu title-screen';

    const title = document.createElement('h1');
    title.className = 'title-logo';
    title.textContent = 'NAYOSBEAT';
    const prompt = document.createElement('p');
    prompt.className = 'title-prompt';
    prompt.textContent = 'Appuie sur une touche';
    this.root.append(title, prompt);
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

  private readonly start = (): void => {
    if (this.done) return;
    this.onStart();
  };

  /**
   * Browsers do not count gamepad presses as user gestures: starting with a gamepad works,
   * but sound and fullscreen wait for the first key, click or touch.
   */
  private readonly pollGamepads = (): void => {
    if (this.done) return;
    const pressed = connectedGamepads().some((pad) => pad.buttons.some((button) => button.pressed));
    if (pressed) this.start();
    else this.frameRequest = requestAnimationFrame(this.pollGamepads);
  };
}
