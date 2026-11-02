import { backButton, element, helpLine, type MenuFeedback } from './menu';

export interface NameEntryOptions {
  readonly title: string;
  /** What the name is for, above the field. */
  readonly text: string;
  readonly initial: string;
  readonly maxLength: number;
  /** Whether `name` (already trimmed) is valid; the error says why when it is not. */
  readonly isValid: (name: string) => boolean;
  readonly error: string;
  readonly onDone: (name: string) => void;
  readonly onBack: () => void;
  readonly feedback?: (action: MenuFeedback) => void;
}

/**
 * A screen of one text field (the online name, docs/multijoueur.md §7): the menus' look, the field
 * focused, Enter or « Valider » to confirm a valid name, Escape or « Retour » to go back. The
 * field's text is never shown anywhere but in it, nor interpreted.
 */
export class NameEntry {
  private readonly root: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly message: HTMLParagraphElement;

  constructor(
    parent: HTMLElement,
    private readonly options: NameEntryOptions,
  ) {
    this.root = element('div', 'menu');
    const panel = element('div', 'menu-panel');
    panel.appendChild(element('h1', 'menu-title', options.title));
    panel.appendChild(element('p', 'menu-notice', options.text));
    this.input = element('input', 'menu-input');
    this.input.type = 'text';
    this.input.value = options.initial;
    this.input.maxLength = options.maxLength;
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.setAttribute('autocapitalize', 'off');
    this.input.setAttribute('enterkeyhint', 'done');
    this.input.setAttribute('aria-label', options.title);
    this.input.addEventListener('keydown', this.onKeyDown);
    panel.appendChild(this.input);
    this.message = element('p', 'menu-notice menu-input-error');
    panel.appendChild(this.message);
    const done = element('button', 'menu-item selected', 'Valider');
    done.type = 'button';
    done.addEventListener('click', this.confirm);
    panel.appendChild(done);
    panel.appendChild(helpLine('Entrée valider · Echap retour', 'Touche Valider'));
    this.root.appendChild(backButton(options.onBack, options.feedback));
    this.root.appendChild(panel);
    parent.appendChild(this.root);
    this.input.focus();
  }

  dispose(): void {
    this.input.removeEventListener('keydown', this.onKeyDown);
    this.root.remove();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.options.feedback?.('back');
      this.options.onBack();
    }
  };

  private readonly confirm = (): void => {
    const name = this.input.value.trim();
    if (!this.options.isValid(name)) {
      this.message.textContent = this.options.error;
      return;
    }
    this.options.feedback?.('confirm');
    this.options.onDone(name);
  };
}
