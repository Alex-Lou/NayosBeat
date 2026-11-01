import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { relativeLuminance } from '../../src/render/luminance';
import { Menu, type MenuOptions } from '../../src/ui/menu';
import { FakeElement, installFakePage } from '../render/fake-dom';

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

  it('keeps the item chosen with the keys in view, not the one under the pointer', () => {
    const { page, root } = setup({ initialIndex: 1 });
    const [first, second] = byClass(root, 'menu-item');
    if (!first || !second) throw new Error('Items missing');
    // Opening on it: shown.
    expect(second.scrolledIntoView).toBe(1);
    page.window.dispatchEvent(Object.assign(new Event('keydown'), { code: 'ArrowUp' }));
    expect(first.scrolledIntoView).toBe(1);
    second.dispatchEvent(new Event('pointerenter'));
    expect(second.classList.contains('selected')).toBe(true);
    expect(second.scrolledIntoView).toBe(1);
  });

  it("writes its help readable, at least 4.5:1 on the menus' background (P22, WCAG 1.4.3)", () => {
    const css = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');
    const hex = (rule: RegExp) => Number.parseInt(rule.exec(css)?.[1] ?? '', 16);
    const help = relativeLuminance(hex(/\.menu-help \{[^}]*?color: #([0-9a-f]{6})/));
    const background = relativeLuminance(hex(/\.menu \{[^}]*?background: #([0-9a-f]{6})/));
    expect((help + 0.05) / (background + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it('opens a page to read on its top, its choices under it', () => {
    const content = new FakeElement('div') as unknown as HTMLElement;
    const { root } = setup({ initialIndex: 1, content });
    expect(byClass(root, 'menu-item').map((item) => item.scrolledIntoView)).toEqual([0, 0]);
  });

  it('chooses with left and right too when its items are a row of tabs, and says so (L23)', () => {
    const press = (page: { window: EventTarget }, code: string) =>
      page.window.dispatchEvent(Object.assign(new Event('keydown'), { code }));
    const tabs = setup({ row: true });
    expect(byClass(tabs.root, 'menu-help-keys')[0]?.textContent).toMatch(/^Flèches choisir/);
    press(tabs.page, 'ArrowRight');
    expect(byClass(tabs.root, 'menu-item')[1]?.classList.contains('selected')).toBe(true);
    press(tabs.page, 'ArrowLeft');
    expect(byClass(tabs.root, 'menu-item')[0]?.classList.contains('selected')).toBe(true);
    tabs.menu.dispose();
    // A vertical list: nothing to the sides.
    const list = setup();
    expect(byClass(list.root, 'menu-help-keys')[0]?.textContent).toMatch(/^↑↓ choisir/);
    press(list.page, 'ArrowRight');
    expect(byClass(list.root, 'menu-item')[0]?.classList.contains('selected')).toBe(true);
  });

  it('removes « Retour » with itself', () => {
    const { page, menu } = setup({ onBack: vi.fn() });
    menu.dispose();
    expect(page.body.children).toHaveLength(0);
  });
});
