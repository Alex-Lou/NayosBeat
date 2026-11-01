import { element } from './menu';

/** The card's fade as the fight shows (styles.css, `.fight-card.leaving`). */
export const CARD_FADE_MS = 150;

/**
 * Who fights whom, between the last menu and the fight's first frame
 * (docs/polish/AUDIT-ET-PLAN.md, L16): on the menus' background, instead of a black screen while
 * the fight loads its art and builds. It fades as the fight shows.
 */
export class FightCard {
  private readonly root: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(parent: HTMLElement, title: string) {
    this.root = element('div', 'menu fight-card');
    // In a panel, as big as the menus' titles (`--ui-scale`).
    const panel = element('div', 'menu-panel');
    panel.appendChild(element('h1', 'menu-title', title));
    this.root.appendChild(panel);
    parent.appendChild(this.root);
  }

  /** The fight shows: the card fades, then goes. */
  leave(): void {
    if (this.timer !== undefined) return;
    this.root.classList.add('leaving');
    this.timer = setTimeout(() => {
      this.root.remove();
    }, CARD_FADE_MS);
  }

  /** Another screen shows first: the card goes at once. */
  dispose(): void {
    clearTimeout(this.timer);
    this.root.remove();
  }
}
