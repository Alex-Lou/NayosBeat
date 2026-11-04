import { describe, expect, it } from 'vitest';
import { STAGE_COLORS } from '../../src/art/dock/colors';
import { STAGE_PROPS } from '../../src/art/dock/props';
import { drawDock } from '../../tools/stage/dock';
import { DOCK_ATMOSPHERES } from '../../tools/stage/dock/atmospheres';
import { BASS_AT, BASS_CYCLE } from '../../tools/stage/dock/mid';
import { ASPHALT, CONCRETE, PALETTE, WET, WET_ASPHALT } from '../../tools/stage/dock/palette';
import { stageContract } from './stage-contract';

const SHAKEN = [
  'crowd0',
  'crowd1',
  'crowd2',
  'club',
  'sleeper',
  'shutter0',
  'shutter1',
  'ripple',
  'puddle3',
  'can',
  'rust',
  'bouncer0',
  'bouncer1',
  'cat',
];

function frameAt(name: string, step: number): number {
  const timeline = STAGE_PROPS.find((prop) => prop.name === name)?.timeline ?? [];
  const total = timeline.reduce((sum, [, steps]) => sum + steps, 0);
  let left = step % total;
  for (const [frame, steps] of timeline) {
    if (left < steps) return frame;
    left -= steps;
  }
  throw new Error(name);
}

describe("the code's Loading Dock (docs/art/decor-dock.md)", { timeout: 60_000 }, () => {
  stageContract({ name: 'dock', drawn: drawDock(), palette: PALETTE, colors: STAGE_COLORS });

  it('hides its puddles but under the rain: dry, they are the ground itself, tone for tone', () => {
    for (const { atmosphere, palette } of DOCK_ATMOSPHERES) {
      const same = (wet: readonly number[], dry: readonly number[]) =>
        wet.every((slot, step) => {
          const [a, b] = [palette[slot], palette[dry[step] ?? 0]];
          return a?.r === b?.r && a?.g === b?.g && a?.b === b?.b;
        });
      const rain = atmosphere.weather === 'rain';
      expect(same(WET, CONCRETE), `${atmosphere.moment}-${atmosphere.weather}`).toBe(!rain);
      expect(same(WET_ASPHALT, ASPHALT), `${atmosphere.moment}-${atmosphere.weather}`).toBe(!rain);
    }
  });

  it('shakes in step with the bass: every prop it moves loops over the same cycle', () => {
    for (const name of SHAKEN) {
      const prop = STAGE_PROPS.find((each) => each.name === name);
      expect(prop, name).toBeDefined();
      expect(
        prop?.timeline.reduce((sum, [, steps]) => sum + steps, 0),
        name,
      ).toBe(BASS_CYCLE);
    }
    const train = STAGE_PROPS.find((each) => each.name === 'train');
    expect(train?.drift).toBeDefined();
    expect(train?.timeline.reduce((sum, [, steps]) => sum + steps, 0)).toBe(BASS_CYCLE);
  });

  it('hits them all at once: the bass changes every one of them on its first beat', () => {
    for (const name of SHAKEN) {
      const before = new Set(
        Array.from({ length: 15 }, (_, step) => frameAt(name, BASS_AT - 15 + step)),
      );
      const hit = Array.from({ length: 15 }, (_, step) => frameAt(name, BASS_AT + step));
      expect(
        hit.some((frame) => !before.has(frame)),
        name,
      ).toBe(true);
    }
  });
});
