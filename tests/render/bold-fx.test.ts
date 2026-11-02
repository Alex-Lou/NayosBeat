import { describe, expect, it, vi } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { BOLD_DELTA, BoldFx, hotArea, QUAKE, SHOCK } from '../../src/render/bold-fx';
import type { FlashBudget } from '../../src/render/flash-budget';
import { hitStyleOf } from '../../src/render/hit-styles';
import { luminanceDelta } from '../../src/render/luminance';
import { PLATINE, signatureOf } from '../../src/render/signatures';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { playCombo } from '../core/combo-helpers';
import { facingOff } from '../core/helpers';
import { recordedLiveScene, type Fake } from './live-fakes';

vi.mock('phaser', () => ({ default: {} }));

const { Special: S, Left: B, Boost: X } = Input;
const NR: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const RN: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };
const CYAN = hitStyleOf('nayo').energy;
const MAGENTA = hitStyleOf('riff').energy;

/** Plays `steps` from `distance` px apart, the bold shapes on a faked scene, frame by frame. */
function played(
  config: MatchConfig,
  steps: InputBits[],
  options: { grant?: boolean; calm?: boolean; boost?: boolean; by?: 0 | 1 } = {},
) {
  const live = recordedLiveScene();
  const admit = vi.fn<(area: number) => boolean>(() => options.grant ?? true);
  const budget = { mode: 'normal', admit } as unknown as FlashBudget;
  const nayo = config.fighters[0] === NAYO ? 0 : 1;
  const bold = new BoldFx(live.scene, config, {
    groundY: 230,
    signatures: nayo === 0 ? [signatureOf('nayo'), null] : [null, signatureOf('nayo')],
    energies: nayo === 0 ? [CYAN, MAGENTA] : [MAGENTA, CYAN],
    budget,
    stage: FIGHT_STAGE_COLORS,
  });
  bold.calm = options.calm ?? false;
  const start = facingOff(
    80,
    config,
    options.boost ? [{ boost: 3000 }, { boost: 3000 }] : [{}, {}],
  );
  const frames: { action: number; move: string | null; calls: [string, unknown[]][] }[] = [];
  const [graphics] = live.graphics;
  for (const state of playCombo(start, config, steps, () => 0, options.by ?? nayo).states) {
    bold.tick(state);
    (graphics as Fake).calls.length = 0;
    bold.update(1);
    const fighter = state.fighters[nayo];
    frames.push({
      action: fighter.actionFrame,
      move: fighter.move,
      calls: [...(graphics as Fake).calls],
    });
  }
  return { frames, admit, bold, graphics: graphics as Fake };
}

/** The colors a frame strokes and fills with. */
const colorsOf = (calls: [string, unknown[]][]) =>
  calls
    .filter(([name]) => name === 'lineStyle' || name === 'fillStyle')
    .map(([, args]) => args[1] ?? args[0]);

describe("Nayo's bold shapes (docs/art/nayo-vivante.md §4)", () => {
  it("draws the Vinyle's shockwave as the disc leaves the hand, and asks once for its hot line", () => {
    const { frames, admit } = played(NR, [S]);
    const first = frames.findIndex(({ calls }) => calls.some(([name]) => name === 'strokeEllipse'));
    expect(frames[first]?.move).toBe('special');
    expect(frames[first]?.action).toBe(12);
    expect(admit).toHaveBeenCalledWith(hotArea(SHOCK.to, SHOCK.ratio));
  });

  it('trails speed lines behind the disc in flight, none once it is gone', () => {
    const { frames } = played(NR, [S]);
    const lined = frames.map(({ calls }) => calls.some(([name]) => name === 'lineBetween'));
    expect(lined.filter(Boolean).length).toBeGreaterThan(5);
    expect(lined.at(-1)).toBe(false);
  });

  it("quakes the floor on each of the Mégabasse's drops of bass, the last in platine and bigger", () => {
    const { admit, frames } = played(NR, [B | X], { boost: true });
    const areas = admit.mock.calls.map(([area]) => area);
    expect(areas).toEqual([
      hotArea(QUAKE.to, QUAKE.ratio),
      hotArea(QUAKE.to * 1.1, QUAKE.ratio),
      hotArea(QUAKE.to * 1.3, QUAKE.ratio),
    ]);
    expect(frames.some(({ calls }) => calls.some(([name]) => name === 'fillTriangle'))).toBe(true);
  });

  it('draws nothing for a fighter without a signature', () => {
    const { frames, admit } = played(RN, [S], { by: 0 });
    // Nayo stands still as player 2: only Riff moves.
    expect(admit).not.toHaveBeenCalled();
    const drawn = ({ calls }: { calls: [string, unknown[]][] }) =>
      calls.some(([name]) => name !== 'clear');
    expect(frames.some(drawn)).toBe(false);
  });

  it('draws their bodies in tones that change no large color of the stage by BOLD_DELTA', () => {
    const { frames } = played(NR, [B | X], { boost: true, grant: false });
    const tones = new Set(frames.flatMap(({ calls }) => colorsOf(calls)) as number[]);
    expect(tones.size).toBeGreaterThan(1);
    for (const tone of tones) {
      for (const backdrop of FIGHT_STAGE_COLORS) {
        // Their ink darkens a little: it lights nothing.
        expect(luminanceDelta(tone, backdrop, 1)).toBeLessThan(0.1);
        if (tone !== 0x0c0614) expect(luminanceDelta(tone, backdrop, 1)).toBeLessThan(BOLD_DELTA);
      }
    }
  });

  it('draws the hot line only when granted, and never calm', () => {
    const hot = (calls: [string, unknown[]][]) =>
      colorsOf(calls).some((color) => color === CYAN || color === 0xffffff || color === PLATINE);
    expect(played(NR, [S]).frames.some(({ calls }) => hot(calls))).toBe(true);
    expect(played(NR, [S], { grant: false }).frames.some(({ calls }) => hot(calls))).toBe(false);
    const calm = played(NR, [S], { calm: true });
    expect(calm.admit).not.toHaveBeenCalled();
    expect(calm.frames.some(({ calls }) => hot(calls))).toBe(false);
  });

  it("counts a hot line's length at least as long as it is drawn", () => {
    for (const ratio of [SHOCK.ratio, QUAKE.ratio]) {
      const width = 200;
      const a = width / 2;
      const b = (width * ratio) / 2;
      let perimeter = 0;
      for (let i = 0; i < 2000; i++) {
        const t0 = (2 * Math.PI * i) / 2000;
        const t1 = (2 * Math.PI * (i + 1)) / 2000;
        perimeter += Math.hypot(
          a * (Math.cos(t1) - Math.cos(t0)),
          b * (Math.sin(t1) - Math.sin(t0)),
        );
      }
      expect(hotArea(width, ratio)).toBeGreaterThanOrEqual(perimeter * 0.999);
    }
  });

  it("drops what was on the go in the Finisher's scene, never asking after it", () => {
    const live = recordedLiveScene();
    const admit = vi.fn(() => true);
    const bold = new BoldFx(live.scene, NR, {
      groundY: 230,
      signatures: [signatureOf('nayo'), null],
      energies: [CYAN, MAGENTA],
      budget: { mode: 'normal', admit } as unknown as FlashBudget,
      stage: FIGHT_STAGE_COLORS,
    });
    const states = playCombo(facingOff(80, NR), NR, [S]).states;
    for (const state of states) {
      bold.tick(state);
      bold.update(1, state.fighters[0].actionFrame >= 12);
    }
    expect(admit).not.toHaveBeenCalled();
  });
});
