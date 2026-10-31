import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { createInitialState, type GameState, type RoundState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { FlashBudget, type FlashMode } from '../../src/render/flash-budget';
import { Hud } from '../../src/render/hud';
import { FX_DARK } from '../../src/render/veils';
import { fakeScene } from './hud-fakes';

const CONFIG: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const DARK = `#${FX_DARK.toString(16)}`;

/** The HUD of a fight whose flashes are `mode`, at the closest framing, and what it draws. */
function hudOf(mode: FlashMode) {
  const { scene, graphics, texts } = fakeScene();
  const budget = new FlashBudget(mode);
  const comfort = { flashes: mode === 'normal', motion: true };
  const hud = new Hud(scene, CONFIG, [0x30e8ff, 0xff3ca0], comfort, budget);
  return { hud, budget, graphics, texts };
}

/** The fight on tick `frame`, its round `round`, the fighters' health `health`. */
function stateAt(frame: number, round: Partial<RoundState>, health = [1000, 1000]): GameState {
  const start = createInitialState(CONFIG);
  const [a, b] = start.fighters;
  return {
    ...start,
    frame,
    round: { ...start.round, phase: 'fight', ...round },
    fighters: [
      { ...a, health: health[0] ?? 0 },
      { ...b, health: health[1] ?? 0 },
    ],
  };
}

const KO: Partial<RoundState> = { phase: 'roundEnd', result: { winner: 0, reason: 'ko' } };

describe('the HUD asks the flash budget for what it lights (docs/flashs.md §4)', () => {
  it('writes an announcement white when it makes no flash, dark when the budget refuses it', () => {
    const lit = hudOf('normal');
    lit.hud.update(stateAt(1, KO));
    const white = lit.texts.find((text) => text.text === 'K.O.');
    expect(white?.style.color).toBe('#ffffff');
    // With the flashes off, its white letters would flash on their own: dark.
    const off = hudOf('off');
    off.hud.update(stateAt(1, KO));
    expect(off.texts.find((text) => text.text === 'K.O.')?.style.color).toBe(DARK);
    // Back to white for the next one the budget lets light.
    const reduced = hudOf('reduced');
    reduced.hud.update(stateAt(1, { phase: 'intro', phaseFrame: 0 }));
    expect(reduced.texts.find((text) => text.text === 'ROUND 1')?.style.color).toBe('#ffffff');
    reduced.budget.advance(10);
    reduced.hud.update(stateAt(2, KO));
    expect(reduced.texts.find((text) => text.text === 'K.O.')?.style.color).toBe(DARK);
  });

  it('lights the white of a hit on a bar only when the budget lets it', () => {
    const white = (mode: FlashMode, spent: boolean) => {
      const { hud, budget, graphics } = hudOf(mode);
      for (let frame = 0; frame <= 60; frame++) hud.update(stateAt(frame, {}));
      if (spent) {
        // A flash just counted, and something lit that the blow's white would add up with.
        budget.request(5000);
        budget.advance(3);
        budget.show(1000);
      }
      hud.update(stateAt(61, {}, [500, 1000]));
      return graphics.some((view) => view.spans.some((span) => span.color === 0xffffff));
    };
    expect(white('normal', false)).toBe(true);
    expect(white('normal', true)).toBe(false);
    expect(white('reduced', false)).toBe(false);
  });

  it('breaks the gauges of a fighter still when the feedback says no room is left', () => {
    /** How many more see-through spans (the shards, fading) the HUD shows after the KO. */
    const shards = (still: boolean) => {
      const { hud, graphics } = hudOf('off');
      const faded = () =>
        graphics.reduce(
          (count, view) => count + view.spans.filter((span) => (span.alpha ?? 1) < 1).length,
          0,
        );
      for (let frame = 0; frame <= 60; frame++) hud.update(stateAt(frame, {}, [1000, 100]));
      const before = faded();
      hud.knockOut(1, 'finisher', still);
      hud.update(stateAt(61, KO, [1000, 0]));
      hud.update(stateAt(63, KO, [1000, 0]));
      return faded() - before;
    };
    expect(shards(false)).toBeGreaterThan(40);
    expect(shards(true)).toBe(0);
  });
});
