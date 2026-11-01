import { describe, expect, it } from 'vitest';
import {
  STAGE_LAYER_NAMES,
  STAGE_LAYERS,
  STAGE_SCALE,
  stageArtOf,
  type StageProp,
} from '../../src/art/stage-layers';
import { ART_SCALE } from '../../src/art/types';
import { toPx } from '../../src/core/constants';
import { TRAINING_STAGE } from '../../src/data/stages';
import { GREYBOX, GROUND_Y } from '../../src/render/greybox-stage';
import { VIEW_SIZE } from '../../src/render/view';

describe('the stage layers', () => {
  const stageWidth = toPx(TRAINING_STAGE.width);

  it('are each as wide as the camera sees of them, from one end of the stage to the other', () => {
    for (const name of STAGE_LAYER_NAMES) {
      const { width, scroll } = STAGE_LAYERS[name];
      expect(width, name).toBe(VIEW_SIZE.width + (stageWidth - VIEW_SIZE.width) * scroll);
    }
    expect(STAGE_LAYERS.floor.width).toBe(stageWidth);
  });

  it('put the floor where the fighters stand, as tall as the grey box ground', () => {
    expect(STAGE_LAYERS.floor.y).toBe(GROUND_Y);
    expect(STAGE_LAYERS.floor.y + STAGE_LAYERS.floor.height).toBe(VIEW_SIZE.height);
    expect(STAGE_LAYERS.floor.height).toBe(GREYBOX.groundHeight);
    for (const name of ['far', 'mid'] as const) {
      expect(STAGE_LAYERS[name]).toMatchObject({ y: 0, height: VIEW_SIZE.height });
    }
  });

  it('are drawn as finely as the fighters: one grain of pixel on screen', () => {
    expect(STAGE_SCALE).toBe(ART_SCALE);
  });

  it('go back to front, the farther the slower', () => {
    const scrolls = STAGE_LAYER_NAMES.map((name) => STAGE_LAYERS[name].scroll);
    expect(scrolls).toEqual([...scrolls].sort((a, b) => a - b));
  });
});

describe('the stage drawn', () => {
  const colors = [0x101018, 0x303040];

  it('is none until its far layer and its floor are there: the grey box', () => {
    expect(stageArtOf({}, [])).toBeUndefined();
    expect(stageArtOf({ './far.png': 'far.png', './mid.png': 'mid.png' }, colors)).toBeUndefined();
  });

  it('shows its layers back to front, the middle one if drawn, with their large colors', () => {
    const art = stageArtOf({ './floor.png': 'floor.png', './far.png': 'far.png' }, colors);
    expect(art?.layers.map(({ name, url, scroll }) => [name, url, scroll])).toEqual([
      ['far', 'far.png', 0.25],
      ['floor', 'floor.png', 1],
    ]);
    expect(art?.colors).toEqual(colors);
    const full = stageArtOf(
      { './floor.png': 'floor.png', './far.png': 'far.png', './mid.png': 'mid.png' },
      colors,
    );
    expect(full?.layers.map(({ name }) => name)).toEqual(['far', 'mid', 'floor']);
  });

  it('cannot be without its large colors (npm run sprites writes both)', () => {
    expect(() => stageArtOf({ './floor.png': 'floor.png', './far.png': 'far.png' }, [])).toThrow(
      'npm run sprites',
    );
  });
});

describe('the stage props', () => {
  const colors = [0x101018];
  const files = { './floor.png': 'floor.png', './far.png': 'far.png', './mid.png': 'mid.png' };
  const prop: StageProp = {
    name: 'queue',
    layer: 'mid',
    frames: [null, { x: 0, y: 0, width: 2, height: 2, sheetX: 0, sheetY: 0 }],
    timeline: [
      [0, 30],
      [1, 30],
    ],
  };

  it('come with their sheet, on the layers shown', () => {
    const art = stageArtOf({ ...files, './props.png': 'props.png' }, colors, [prop]);
    expect(art?.props).toEqual({ url: 'props.png', props: [prop] });
    const withoutMid = { './floor.png': 'floor.png', './far.png': 'far.png', './props.png': 'p' };
    expect(stageArtOf(withoutMid, colors, [prop])?.props).toBeUndefined();
  });

  it('fail early when their sheet is missing or their timeline is wrong', () => {
    expect(() => stageArtOf(files, colors, [prop])).toThrow('props.png');
    const sheet = { ...files, './props.png': 'props.png' };
    expect(() => stageArtOf(sheet, colors, [{ ...prop, timeline: [[2, 30]] }])).toThrow(
      'Stage prop queue: no frame 2 (2 frames)',
    );
    expect(() => stageArtOf(sheet, colors, [{ ...prop, timeline: [[1, 0]] }])).toThrow(
      'lasts 0 steps',
    );
    expect(() => stageArtOf(sheet, colors, [{ ...prop, timeline: [] }])).toThrow('empty timeline');
  });
});
