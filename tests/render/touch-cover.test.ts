import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MatchConfig, TrainingStart } from '../../src/core/config';
import { toPx } from '../../src/core/constants';
import { createInitialState, type GameState } from '../../src/core/state';
import { COVER_HOLD_MS, TouchControls } from '../../src/input/touch-controls';
import { TOUCH_BUTTONS } from '../../src/input/touch-layout';
import { frameAround, MAX_CLOSE_UP, type Framing } from '../../src/render/camera-framing';
import { GROUND_Y } from '../../src/render/greybox-stage';
import { bodyOnScreen, onPage, TouchCover } from '../../src/render/touch-cover';
import { VIEW_SIZE } from '../../src/render/view';
import { MATCH } from '../core/helpers';
import { installFakePage, type FakeElement } from './fake-dom';

const TRAINING: MatchConfig = { ...MATCH, training: true };

/** The fight seen whole (no close up), as the simulation's camera frames it. */
function wholeView(cameraX: number): Framing {
  return { closeUp: 1, left: toPx(cameraX) - VIEW_SIZE.width / 2, top: 0 };
}

describe('a fighter on screen (touch-cover.ts)', () => {
  it('draws its body around it, its feet on the ground, wider in a close up', () => {
    const state = createInitialState(TRAINING);
    const nayo = state.fighters[0];
    const framing = wholeView(state.cameraX);
    const body = bodyOnScreen(nayo, TRAINING.fighters[0], framing, GROUND_Y);
    const x = toPx(nayo.x) - framing.left;
    expect(body.left).toBeLessThan(x);
    expect(body.right).toBeGreaterThan(x);
    expect(body.bottom).toBe(GROUND_Y);
    expect(body.top).toBeLessThan(GROUND_Y - 40);
    const close = bodyOnScreen(nayo, TRAINING.fighters[0], { ...framing, closeUp: 2 }, GROUND_Y);
    expect(close.right - close.left).toBeCloseTo(2 * (body.right - body.left));
  });

  it('puts a rectangle of the view where the canvas shows it on the page', () => {
    const canvas = { left: 10, top: 15, right: 650, bottom: 375 };
    expect(onPage({ left: 0, top: 0, right: 480, bottom: 270 }, canvas)).toEqual(canvas);
    expect(onPage({ left: 240, top: 135, right: 240, bottom: 135 }, canvas)).toEqual({
      left: 330,
      top: 195,
      right: 330,
      bottom: 195,
    });
  });
});

describe('touch buttons over a fighter, each on its own (docs/polish/AUDIT-ET-PLAN.md, P21)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** The fight framed as its first frame frames it: as close as it gets, the fighters centered. */
  function firstFrame(state: GameState): Framing {
    const [a, b] = state.fighters;
    const viewLeft = toPx(state.cameraX) - VIEW_SIZE.width / 2;
    return frameAround((toPx(a.x) + toPx(b.x)) / 2, MAX_CLOSE_UP, viewLeft, GROUND_Y);
  }

  /**
   * A phone of `width`×`height` CSS px in landscape: the canvas from its left edge, 16:9, the
   * buttons where touch-layout.ts puts them from the bottom right corner.
   */
  function phone(width = 667, height = 375) {
    const page = installFakePage();
    const touch = new TouchControls(page.body as unknown as HTMLElement, undefined);
    const zone = page.body.children[0]?.children[2];
    if (!zone) throw new Error('Button zone missing');
    TOUCH_BUTTONS.forEach((spec, index) => {
      const button = zone.children[index];
      if (!button) throw new Error(`Button ${spec.label} missing`);
      const [x, y, r] = [width - spec.right, height - spec.bottom, spec.diameter / 2];
      button.rect = { left: x - r, top: y - r, right: x + r, bottom: y + r };
    });
    const canvas = document.createElement('canvas') as unknown as FakeElement;
    canvas.rect = { left: 0, top: 0, right: Math.min(width, (height * 16) / 9), bottom: height };
    const cover = new TouchCover(canvas as unknown as HTMLElement, touch, TRAINING, GROUND_Y);
    /** Training started at `start`, as its first frame shows it, at `now` milliseconds. */
    const show = (start: TrainingStart, now: number) => {
      const state = createInitialState({ ...TRAINING, trainingStart: start });
      cover.update(state, firstFrame(state), now);
    };
    /** The faded buttons, by label. */
    const faded = () =>
      TOUCH_BUTTONS.filter((_, index) => zone.children[index]?.classList.contains('covered')).map(
        (spec) => spec.label,
      );
    /** Fighters under these buttons, at `now`. */
    const under = (labels: readonly string[], now: number) => {
      touch.setCovered(
        TOUCH_BUTTONS.map((spec) => labels.includes(spec.label)),
        now,
      );
    };
    return { page, canvas, cover, show, faded, under };
  }

  it('fade on a 16:9 phone over Riff at the start, the others staying as they are', () => {
    const { show, faded } = phone(667, 375);
    show('center', 0);
    expect(faded()).toEqual(expect.arrayContaining(['S', 'H']));
    // Over nobody: full.
    expect(faded()).not.toContain('SAUT');
    expect(faded()).not.toContain('DASH');
  });

  it('leave a wider phone alone at the start, and fade over a fighter cornered under them', () => {
    const { show, faded } = phone(844, 390);
    show('center', 0);
    expect(faded()).toEqual([]);
    const { show: cornered, faded: then } = phone(844, 390);
    cornered('rightCorner', 0);
    expect(then().length).toBeGreaterThan(0);
    expect(then().length).toBeLessThan(TOUCH_BUTTONS.length);
  });

  it('fade the next button at once as a fighter slides onto it, and never flicker the first', () => {
    const { faded, under } = phone();
    // On L until 299 ms, on H from 300 ms.
    under(['L'], 0);
    under(['L'], 299);
    under(['H'], 300);
    expect(faded()).toEqual(['L', 'H']);
    // L comes back a second after the fighter was last on it, once.
    under(['H'], 299 + COVER_HOLD_MS - 1);
    expect(faded()).toEqual(['L', 'H']);
    under(['H'], 299 + COVER_HOLD_MS);
    expect(faded()).toEqual(['H']);
    // Back on L at once: L waits its second before fading again.
    under(['L', 'H'], 300 + COVER_HOLD_MS);
    expect(faded()).toEqual(['H']);
    under(['L', 'H'], 299 + 2 * COVER_HOLD_MS);
    expect(faded()).toEqual(['L', 'H']);
  });

  it('measure the page again after a resize (a turn, fullscreen)', () => {
    const { page, canvas, show, faded } = phone(844, 390);
    show('rightCorner', 0);
    expect(faded().length).toBeGreaterThan(0);
    // The canvas now ends where the buttons start: nothing of the fight under them.
    canvas.rect = { left: 0, top: 0, right: 400, bottom: 225 };
    show('rightCorner', COVER_HOLD_MS);
    expect(faded().length).toBeGreaterThan(0);
    page.window.dispatchEvent(new Event('resize'));
    show('rightCorner', 2 * COVER_HOLD_MS);
    expect(faded()).toEqual([]);
  });

  it('let go of the window when the fight ends', () => {
    const { page, cover } = phone();
    const before = page.window.listenerCount;
    cover.dispose();
    expect(page.window.listenerCount).toBe(before - 1);
  });
});
