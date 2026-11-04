import { afterEach, describe, expect, it, vi } from 'vitest';
import { TitleScreen } from '../../src/ui/title-screen';
import { installFakePage } from '../render/fake-dom';

function setup() {
  const page = installFakePage();
  const onStart = vi.fn();
  const title = new TitleScreen(page.body as unknown as HTMLElement, onStart, false);
  const press = (code: string) => {
    page.window.dispatchEvent(
      Object.assign(new Event('keydown'), { code, repeat: false, preventDefault: () => undefined }),
    );
  };
  const button = () => page.body.children[0]?.children[1]?.children[0];
  return { page, onStart, title, press, button };
}

describe('the title screen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('waits for the player: an ordinary key does not leave it', () => {
    const { onStart, title, press } = setup();
    press('KeyA');
    expect(onStart).not.toHaveBeenCalled();
    title.dispose();
  });

  it('enters with the button, or with Enter / A', () => {
    const clicked = setup();
    clicked.button()?.dispatchEvent(new Event('click'));
    expect(clicked.onStart).toHaveBeenCalledOnce();
    clicked.title.dispose();

    const keyed = setup();
    keyed.press('Enter');
    expect(keyed.onStart).toHaveBeenCalledOnce();
    keyed.title.dispose();
  });
});
