import { describe, expect, it } from 'vitest';
import { stageArtOf } from '../../src/art/stage-layers';
import { STAGE_MAPS } from '../../src/art/stages';
import { selectStages, thumbOf } from '../../src/app/select-stages';

const FILES = { './far.png': 'far.png', './mid.png': 'mid.png', './floor.png': 'floor.png' };

describe('the places of the « Lieu » screen', () => {
  it('shows each stage as the fight opens on it: every layer centered, as its parallax puts it', () => {
    const art = stageArtOf(FILES, [0x2a2030]);
    if (!art) throw new Error('a stage');
    // The view is 480 × 270: the far layer (600) 60 px over each side, the floor (960) 240.
    expect(thumbOf(art)).toEqual([
      { url: 'far.png', x: -0.125, y: 0, width: 1.25, height: 1 },
      { url: 'mid.png', x: -0.25, y: 0, width: 1.5, height: 1 },
      { url: 'floor.png', x: -0.5, y: 230 / 270, width: 2, height: 40 / 270 },
    ]);
  });

  it('offers every stage drawn, in its order, by its name, in its base atmosphere', () => {
    const places = selectStages();
    expect(places.map(({ id }) => id)).toEqual(STAGE_MAPS.map(({ name }) => name));
    for (const [index, place] of places.entries()) {
      const map = STAGE_MAPS[index];
      expect(place.name).toBe(map?.title);
      expect(place.thumb.map(({ url }) => url)).toEqual(
        map?.variants[0]?.art.layers.map(({ url }) => url),
      );
    }
    // A stage whose images are missing is not offered.
    expect(selectStages([{ name: 'x', title: 'X', description: '', variants: [] }])).toEqual([]);
  });
});
