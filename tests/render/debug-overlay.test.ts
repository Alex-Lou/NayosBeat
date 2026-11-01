import { afterEach, describe, expect, it, vi } from 'vitest';
import { DebugOverlay } from '../../src/render/debug-overlay';
import { installFakePage } from './fake-dom';

const FRAME_MS = 1000 / 60;

/** The overlay's text once frames of 1/60 s have moved the visual clock on by `steps`, each. */
function shown(steps: readonly number[]): string {
  const page = installFakePage();
  const overlay = new DebugOverlay(page.body as unknown as HTMLElement);
  for (const step of steps) {
    overlay.record(
      { frameMs: FRAME_MS, steps: step, cadenceHz: 60, ticks: step, tickTimeMs: 0 },
      () => '',
    );
  }
  return page.body.children[0]?.textContent ?? '';
}

describe('DebugOverlay, « hors cadence » (docs/qualite-adaptative.md §7)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the cadence, and no frame off it when every frame moves one step', () => {
    const text = shown(Array<number>(120).fill(1));
    expect(text).toContain('cadence 60 Hz');
    expect(text).toContain('hors cadence  0 (0.00 %)');
  });

  it('counts the frames of a stutter: none, then two steps, where one and one were due', () => {
    const stutter = [...Array<number>(10).fill(1), 0, 2];
    // Ten stutters, each breaking the cadence twice (it lags, then leaps), then a regular second.
    const steps = [
      ...Array.from({ length: 10 }, () => stutter).flat(),
      ...Array<number>(60).fill(1),
    ];
    expect(shown(steps)).toMatch(/hors cadence {2}20 \(1[0-9]\.[0-9]{2} %\)/);
  });
});
