import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  comfortOf,
  FLASH_LABELS,
  hudComfortOf,
  loadComfort,
  markNoticeSeen,
  nextMode,
  noticeSeen,
  saveComfort,
  SHAKE_LABELS,
} from '../../src/app/comfort';

/** A page storage standing in for the browser's, or one that refuses (private mode). */
function storage(refuses = false): Map<string, string> {
  const kept = new Map<string, string>();
  const fail = () => {
    throw new Error('SecurityError');
  };
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (refuses ? fail() : (kept.get(key) ?? null)),
    setItem: (key: string, value: string) => (refuses ? fail() : kept.set(key, value)),
  });
  return kept;
}

describe("the player's comfort options (docs/flashs.md §4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows the system when nothing was chosen: less motion, the flashes reduced, still', () => {
    const none = { flashes: null, shake: null };
    expect(comfortOf(none, false)).toEqual({ flashes: 'normal', shake: 'normal' });
    expect(comfortOf(none, true)).toEqual({ flashes: 'reduced', shake: 'off' });
  });

  it('keeps what was chosen over the system, and ignores what it cannot read', () => {
    expect(comfortOf({ flashes: 'normal', shake: 'reduced' }, true)).toEqual({
      flashes: 'normal',
      shake: 'reduced',
    });
    expect(comfortOf({ flashes: 'strobe', shake: 'on' }, false)).toEqual({
      flashes: 'normal',
      shake: 'normal',
    });
  });

  it('stores only the option changed: the other goes on following the system', () => {
    const kept = storage();
    saveComfort({ flashes: 'off' });
    expect([...kept]).toEqual([['nayosbeat.flashes', 'off']]);
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    expect(loadComfort()).toEqual({ flashes: 'off', shake: 'off' });
  });

  it('holds for the session when the storage refuses, reading and writing', () => {
    storage(true);
    vi.stubGlobal('window', {});
    expect(() => {
      saveComfort({ shake: 'off' });
      markNoticeSeen();
    }).not.toThrow();
    expect(loadComfort()).toEqual({ flashes: 'normal', shake: 'normal' });
    expect(noticeSeen()).toBe(false);
  });

  it('remembers the notice of the first launch', () => {
    storage();
    expect(noticeSeen()).toBe(false);
    markNoticeSeen();
    expect(noticeSeen()).toBe(true);
  });

  it('cycles each option normal, reduced, off, and says what each does', () => {
    expect([nextMode('normal'), nextMode('reduced'), nextMode('off')]).toEqual([
      'reduced',
      'off',
      'normal',
    ]);
    for (const labels of [FLASH_LABELS, SHAKE_LABELS]) {
      for (const { label, hint } of Object.values(labels)) {
        expect(label.length).toBeGreaterThan(3);
        expect(hint.length).toBeGreaterThan(20);
      }
    }
  });

  it('gives the HUD its two flags: the flashes by « Effets de flash », the motion by the shake', () => {
    expect(hudComfortOf({ flashes: 'normal', shake: 'normal' })).toEqual({
      flashes: true,
      motion: true,
    });
    expect(hudComfortOf({ flashes: 'reduced', shake: 'normal' })).toEqual({
      flashes: false,
      motion: true,
    });
    expect(hudComfortOf({ flashes: 'normal', shake: 'reduced' })).toEqual({
      flashes: true,
      motion: true,
    });
    expect(hudComfortOf({ flashes: 'off', shake: 'off' })).toEqual({
      flashes: false,
      motion: false,
    });
  });
});
