import { afterEach, describe, expect, it, vi } from 'vitest';
import { PauseInput } from '../../src/input/pause-input';
import { installFakePage } from '../render/fake-dom';

/**
 * The fight pauses before any tick of a frame its PauseInput asks it to (FightScene.update):
 * while the picture is lost with the GPU, it asks on every frame (docs/qualite-adaptative.md
 * §2.3), so that no tick is played unseen and the player resumes once it is back.
 */
describe('the pause on a lost picture', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function pauseInput(): PauseInput {
    const page = installFakePage();
    return new PauseInput(page.body as unknown as HTMLElement);
  }

  it('pauses on the first frame the picture is lost', () => {
    const pause = pauseInput();
    expect(pause.consume([], false)).toBe(false);
    expect(pause.consume([], true)).toBe(true);
    pause.dispose();
  });

  it('pauses again at once when the player resumes before it is back, never after', () => {
    const pause = pauseInput();
    expect(pause.consume([], true)).toBe(true);
    // « Reprendre » while still blind: the fight pauses again on its next frame.
    pause.reset();
    expect(pause.consume([], true)).toBe(true);
    // Back: the player resumes from the pause, and plays.
    pause.reset();
    for (let frame = 0; frame < 60; frame++) expect(pause.consume([], false)).toBe(false);
    pause.dispose();
  });

  it('pauses a new fight started while it is lost, from its first frame', () => {
    // « Recommencer » makes a new PauseInput: the loss is read anew on every frame.
    expect(pauseInput().consume([], true)).toBe(true);
  });

  it('still pauses once per request otherwise', () => {
    const pause = pauseInput();
    window.dispatchEvent(new Event('blur'));
    expect(pause.consume([], false)).toBe(true);
    expect(pause.consume([], false)).toBe(false);
    pause.dispose();
  });
});
