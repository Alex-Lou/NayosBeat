import { describe, expect, it } from 'vitest';
import { STAGE_LAYERS, STAGE_SCALE } from '../../src/art/stage-layers';
import { STAGE_MAPS } from '../../src/art/stages';
import { fogged } from '../../tools/stage/kit/fog';
import { luminanceOf, rgba } from '../../tools/stage/kit/grade';

/** The places the fog falls on (docs/art/brume.md). */
const FOGGY = ['rue', 'gym', 'dock', 'rooftop'];

describe('the fog (docs/art/brume.md)', () => {
  it('swallows the distance more than the near, and leaves the lights as bright', () => {
    const base = [rgba('#000000'), rgba('#6d4357'), rgba('#504851'), rgba('#f0b064')];
    const fog = rgba('#2a2740');
    const shown = fogged(base, {
      color: fog,
      far: [[1]],
      lit: new Set([3]),
      depth: 0.6,
      near: 0.15,
    });
    const toward = (slot: number) =>
      Math.abs(luminanceOf(shown[slot] ?? fog) - luminanceOf(fog)) /
      Math.abs(luminanceOf(base[slot] ?? fog) - luminanceOf(fog));
    expect(toward(1)).toBeLessThan(toward(2));
    expect(shown[3]).toEqual(base[3]);
    expect(shown[0]).toEqual(base[0]);
  });

  it('falls on its places at midnight, its banks of mist drifting only in it', () => {
    for (const name of FOGGY) {
      const map = STAGE_MAPS.find((each) => each.name === name);
      if (!map) throw new Error(name);
      const fog = map.variants.find(({ atmosphere }) => atmosphere.weather === 'fog');
      expect(fog?.atmosphere.moment, name).toBe('midnight');
      for (const { atmosphere, art } of map.variants) {
        const mist = (art.props?.props ?? []).filter(({ name: prop }) => prop.startsWith('mist'));
        // A sheltered place shows the fog at its window only: no bank drifts under its roof.
        const banks = map.sheltered ? 0 : 2;
        expect(mist.length, `${name} ${atmosphere.weather}`).toBe(
          atmosphere.weather === 'fog' ? banks : 0,
        );
      }
    }
  });

  it('drifts its banks in and out past both ends of their layer, never on the floor', () => {
    for (const name of FOGGY) {
      const fog = STAGE_MAPS.find((each) => each.name === name)?.variants.find(
        ({ atmosphere }) => atmosphere.weather === 'fog',
      );
      const banks = (fog?.art.props?.props ?? []).filter(({ name: prop }) =>
        prop.startsWith('mist'),
      );
      for (const { name: bank, layer, frames, drift } of banks) {
        // The floor is in front of the fighters: no mist there.
        expect(['far', 'mid'], bank).toContain(layer);
        if (!drift) throw new Error(bank);
        const width = STAGE_LAYERS[layer].width * STAGE_SCALE;
        const shown = frames.filter((frame) => frame !== null);
        const left = Math.min(...shown.map(({ x }) => x));
        const right = Math.max(...shown.map(({ x, width: w }) => x + w));
        const [start, end] =
          drift.to < drift.from ? [drift.from, drift.to] : [drift.to, drift.from];
        expect(left + start, `${name} ${bank}`).toBeGreaterThanOrEqual(width);
        expect(right + end, `${name} ${bank}`).toBeLessThanOrEqual(0);
      }
    }
  });
});
