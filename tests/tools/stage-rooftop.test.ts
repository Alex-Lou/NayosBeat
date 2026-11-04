import { describe, expect, it } from 'vitest';
import { STAGE_LAYERS, STAGE_SCALE } from '../../src/art/stage-layers';
import { STAGE_COLORS } from '../../src/art/rooftop/colors';
import { STAGE_PROPS } from '../../src/art/rooftop/props';
import { drawRooftop } from '../../tools/stage/rooftop';
import { ROOFTOP_ATMOSPHERES } from '../../tools/stage/rooftop/atmospheres';
import { BLIMP_CYCLE, PASS, PASS_AT } from '../../tools/stage/rooftop/far';
import { overhead } from '../../tools/stage/rooftop/mid';
import {
  BEAM,
  BEAM_DROP,
  CONCRETE,
  MEMBRANE,
  PALETTE,
  REFLECT_VIOLET,
  REFLECT_YELLOW,
  WET,
  WET_PAVER,
} from '../../tools/stage/rooftop/palette';
import { stageContract } from './stage-contract';

function propNamed(name: string) {
  const prop = STAGE_PROPS.find((each) => each.name === name);
  if (!prop) throw new Error(name);
  return prop;
}

function totalOf(timeline: readonly (readonly [number, number])[]): number {
  return timeline.reduce((sum, [, steps]) => sum + steps, 0);
}

function frameAt(name: string, step: number): number {
  const { timeline } = propNamed(name);
  let left = step % totalOf(timeline);
  for (const [frame, steps] of timeline) {
    if (left < steps) return frame;
    left -= steps;
  }
  throw new Error(name);
}

describe("the code's Rooftop Rain (docs/art/decor-rooftop.md)", { timeout: 60_000 }, () => {
  stageContract({ name: 'rooftop', drawn: drawRooftop(), palette: PALETTE, colors: STAGE_COLORS });

  it('hides its puddles, their reflections and the rain in the beam but under the rain', () => {
    const hidden: [readonly number[], readonly number[]][] = [
      [WET, MEMBRANE],
      [WET_PAVER, CONCRETE],
      [REFLECT_VIOLET, MEMBRANE],
      [REFLECT_YELLOW, MEMBRANE],
      [BEAM_DROP, BEAM],
    ];
    for (const { atmosphere, palette } of ROOFTOP_ATMOSPHERES) {
      const name = `${atmosphere.moment}-${atmosphere.weather}`;
      for (const [wet, dry] of hidden) {
        const same = wet.every((slot, step) => {
          const [a, b] = [palette[slot], palette[dry[step] ?? 0]];
          return a?.r === b?.r && a?.g === b?.g && a?.b === b?.b;
        });
        expect(same, name).toBe(atmosphere.weather !== 'rain');
      }
    }
  });

  it('offers its two rains, at midnight and at dusk, and its fog', () => {
    expect(Object.keys(STAGE_COLORS).sort()).toEqual([
      'dusk-rain',
      'midnight-clear',
      'midnight-fog',
      'midnight-rain',
    ]);
  });

  it('flies its gliders in and out past both ends of the far layer, never popping in sight', () => {
    const width = STAGE_LAYERS.far.width * STAGE_SCALE;
    const gliders = STAGE_PROPS.filter(({ drift }) => drift);
    expect(gliders.map(({ name }) => name).sort()).toEqual([
      'blimp',
      'car0',
      'car1',
      'car2',
      'car3',
      'car4',
      'mist0',
      'mist1',
    ]);
    for (const { name, frames, drift } of gliders) {
      if (!drift) continue;
      const shown = frames.filter((frame) => frame !== null);
      const left = Math.min(...shown.map(({ x }) => x));
      const right = Math.max(...shown.map(({ x, width: w }) => x + w));
      const [start, end] = drift.to < drift.from ? [drift.from, drift.to] : [drift.to, drift.from];
      expect(left + start, name).toBeGreaterThanOrEqual(width);
      expect(right + end, name).toBeLessThanOrEqual(0);
    }
  });

  it('shows the blimp only while it glides, its beam swept slowly (each angle 20 steps at least)', () => {
    const blimp = propNamed('blimp');
    expect(totalOf(blimp.timeline)).toBe(BLIMP_CYCLE);
    expect(blimp.drift).toMatchObject({ start: PASS_AT, steps: PASS });
    for (let step = 0; step < BLIMP_CYCLE; step++) {
      const passing = step >= PASS_AT && step < PASS_AT + PASS;
      expect(frameAt('blimp', step) !== 0, `step ${step}`).toBe(passing);
    }
    for (const [, steps] of blimp.timeline) expect(steps).toBeGreaterThanOrEqual(20);
  });

  it('quivers the mast in step with the blimp overhead; its light holds each state 20 steps', () => {
    const mast = propNamed('mast');
    expect(totalOf(mast.timeline)).toBe(BLIMP_CYCLE);
    let quivered = false;
    let run = 0;
    let shown = -1;
    for (let step = 0; step < BLIMP_CYCLE; step++) {
      const frame = frameAt('mast', step);
      const bent = frame % 3 !== 0;
      if (bent) quivered = true;
      expect(!bent || overhead(step), `step ${step}`).toBe(true);
      const lit = frame < 3 ? 1 : 0;
      if (lit === shown) run += 1;
      else {
        if (shown !== -1) expect(run, `step ${step}`).toBeGreaterThanOrEqual(20);
        shown = lit;
        run = 1;
      }
    }
    expect(quivered).toBe(true);
    expect(overhead(PASS_AT - 1) || overhead(PASS_AT + PASS)).toBe(false);
  });
});
