import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MatchConfig, TrainingStart } from '../../src/core/config';
import { toPx } from '../../src/core/constants';
import { createInitialState } from '../../src/core/state';
import { COVER_HOLD_MS, TouchControls } from '../../src/input/touch-controls';
import type { Framing } from '../../src/render/camera-framing';
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

describe('touch buttons over a fighter (docs/polish/AUDIT-ET-PLAN.md, P21)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * A 16:9 phone: the canvas over the whole 640×360 screen, every button in the right quarter
   * (560 to 640, under the HUD), as the cluster covers it.
   */
  function phone() {
    const page = installFakePage();
    const touch = new TouchControls(page.body as unknown as HTMLElement, undefined);
    const zone = page.body.children[0]?.children[2];
    if (!zone) throw new Error('Button zone missing');
    for (const button of zone.children)
      button.rect = { left: 560, top: 160, right: 640, bottom: 360 };
    const canvas = document.createElement('canvas') as unknown as FakeElement;
    canvas.rect = { left: 0, top: 0, right: 640, bottom: 360 };
    const cover = new TouchCover(canvas as unknown as HTMLElement, touch, TRAINING, GROUND_Y);
    /** Training started at `start`, seen whole, at `now` milliseconds. */
    const show = (start: TrainingStart, now: number) => {
      const state = createInitialState({ ...TRAINING, trainingStart: start });
      cover.update(state, wholeView(state.cameraX), now);
    };
    return { page, zone, canvas, cover, show };
  }

  it('fade while a fighter is under them, and leave it at the center', () => {
    const { zone, show } = phone();
    show('center', 0);
    expect(zone.classList.contains('covered')).toBe(false);
    // The dummy against the right wall: under the thumbs.
    show('rightCorner', 10);
    expect(zone.classList.contains('covered')).toBe(true);
  });

  it('change at most once a second, a fade and never a flicker', () => {
    const { zone, show } = phone();
    show('rightCorner', 0);
    show('center', COVER_HOLD_MS - 1);
    expect(zone.classList.contains('covered')).toBe(true);
    show('center', COVER_HOLD_MS);
    expect(zone.classList.contains('covered')).toBe(false);
    show('rightCorner', COVER_HOLD_MS + 1);
    expect(zone.classList.contains('covered')).toBe(false);
  });

  it('stay faded while fighters dance at their edge, and come back a second after they leave', () => {
    const { zone, show } = phone();
    show('rightCorner', 0);
    show('center', 400);
    show('rightCorner', 1500);
    show('center', 2000);
    expect(zone.classList.contains('covered')).toBe(true);
    show('center', 2499);
    expect(zone.classList.contains('covered')).toBe(true);
    show('center', 2500);
    expect(zone.classList.contains('covered')).toBe(false);
  });

  it('measure the page again after a resize (a turn, fullscreen)', () => {
    const { page, zone, canvas, show } = phone();
    show('rightCorner', 0);
    expect(zone.classList.contains('covered')).toBe(true);
    // The canvas now ends where the buttons start: nothing of the fight under them.
    canvas.rect = { left: 0, top: 0, right: 560, bottom: 315 };
    show('rightCorner', COVER_HOLD_MS);
    expect(zone.classList.contains('covered')).toBe(true);
    page.window.dispatchEvent(new Event('resize'));
    show('rightCorner', 2 * COVER_HOLD_MS);
    expect(zone.classList.contains('covered')).toBe(false);
  });

  it('let go of the window when the fight ends', () => {
    const { page, cover } = phone();
    const before = page.window.listenerCount;
    cover.dispose();
    expect(page.window.listenerCount).toBe(before - 1);
  });
});
