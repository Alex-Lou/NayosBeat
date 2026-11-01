import { afterEach, describe, expect, it, vi } from 'vitest';
import { CARD_FADE_MS, FightCard } from '../../src/ui/fight-card';
import { installFakePage } from '../render/fake-dom';

describe('FightCard (docs/polish/AUDIT-ET-PLAN.md, L16)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function setup() {
    vi.useFakeTimers();
    const page = installFakePage();
    const card = new FightCard(page.body as unknown as HTMLElement, 'Nayo contre Riff');
    const [root] = page.body.children;
    if (!root) throw new Error('No card');
    return { page, card, root };
  }

  it("says who fights whom, on the menus' background, instead of a black screen", () => {
    const { root } = setup();
    expect(root.className).toBe('menu fight-card');
    expect(root.children[0]?.children[0]?.textContent).toBe('Nayo contre Riff');
  });

  it('fades as the fight shows, then goes', () => {
    const { page, card, root } = setup();
    card.leave();
    expect(root.classList.contains('leaving')).toBe(true);
    vi.advanceTimersByTime(CARD_FADE_MS - 1);
    expect(page.body.children).toHaveLength(1);
    // Told twice, it fades once.
    card.leave();
    vi.advanceTimersByTime(1);
    expect(page.body.children).toHaveLength(0);
  });

  it('goes at once when another screen shows first, its fade forgotten', () => {
    const { page, card } = setup();
    card.leave();
    card.dispose();
    expect(page.body.children).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
