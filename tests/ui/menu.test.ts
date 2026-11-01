import { afterEach, describe, expect, it, vi } from 'vitest';
import { Menu, type MenuOptions } from '../../src/ui/menu';
import { installFakePage, type FakeElement } from '../render/fake-dom';

/** The elements under `node` that have the class `name`, in page order. */
function byClass(node: FakeElement, name: string): FakeElement[] {
  const own = node.className.split(' ').includes(name) ? [node] : [];
  return own.concat(...node.children.map((child) => byClass(child, name)));
}

/** A menu of two choices on a fake page. */
function setup(options: Partial<MenuOptions> = {}) {
  const page = installFakePage();
  const feedback = vi.fn();
  const menu = new Menu(page.body as unknown as HTMLElement, {
    title: 'Mode',
    items: [
      { label: 'Combat', onSelect: vi.fn() },
      { label: 'Entraînement', onSelect: vi.fn() },
    ],
    feedback,
    ...options,
  });
  const [root] = page.body.children;
  if (!root) throw new Error('No menu');
  return { page, menu, root, feedback };
}

describe('Menu, for a touch screen (docs/polish/AUDIT-ET-PLAN.md, L21)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers « Retour » when it has a way back: it goes back as Escape does', () => {
    const onBack = vi.fn();
    const { root, feedback } = setup({ onBack });
    const [back, ...others] = byClass(root, 'menu-back');
    expect(others).toHaveLength(0);
    expect(back?.textContent).toBe('‹ Retour');
    back?.dispatchEvent(new Event('click'));
    expect(onBack).toHaveBeenCalledOnce();
    expect(feedback).toHaveBeenLastCalledWith('back');
  });

  it('has no « Retour » without a way back', () => {
    const { root } = setup();
    expect(byClass(root, 'menu-back')).toHaveLength(0);
  });

  it('names its keys, and what to touch instead', () => {
    const { root } = setup();
    expect(byClass(root, 'menu-help-keys')[0]?.textContent).toContain('Echap / B retour');
    expect(byClass(root, 'menu-help-touch')[0]?.textContent).toBe('Touche un choix');
  });

  it('removes « Retour » with itself', () => {
    const { page, menu } = setup({ onBack: vi.fn() });
    menu.dispose();
    expect(page.body.children).toHaveLength(0);
  });
});
