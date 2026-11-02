import { describe, expect, it } from 'vitest';
import {
  LATE_MS,
  LATE_SHARE,
  LightGovernor,
  tierCeiling,
  WARMUP,
  WINDOW,
} from '../../src/render/light-quality';

describe("the lights' and filters' tier at the start (docs/qualite-adaptative.md, État)", () => {
  it('has none with Canvas, whatever the address asks', () => {
    expect(tierCeiling('simple', '?lumieres=haut', {})).toBe('off');
  });

  it('starts full on a device that says nothing, lean on a small or software one', () => {
    expect(tierCeiling('full', '', {})).toBe('full');
    expect(tierCeiling('full', '', { memory: 8, maxTextureSize: 16384, gpu: 'Apple GPU' })).toBe(
      'full',
    );
    expect(tierCeiling('full', '', { memory: 2 })).toBe('lean');
    expect(tierCeiling('full', '', { maxTextureSize: 2048 })).toBe('lean');
    expect(tierCeiling('full', '', { gpu: 'ANGLE (Google, SwiftShader Device)' })).toBe('lean');
    expect(tierCeiling('full', '', { gpu: 'llvmpipe (LLVM 15.0.7, 256 bits)' })).toBe('lean');
  });

  it('takes the ceiling the address forces', () => {
    expect(tierCeiling('full', '?lumieres=moyen', {})).toBe('lean');
    expect(tierCeiling('full', '?lumieres=non', {})).toBe('off');
    expect(tierCeiling('full', '?lumieres=haut', { memory: 1 })).toBe('full');
  });
});

describe('the governor: down fast in a fight, never back up in the session', () => {
  /** `count` frames of `ms` each; returns whether the tier went down on any. */
  const play = (governor: LightGovernor, count: number, ms: number) => {
    let down = false;
    for (let i = 0; i < count; i++) down = governor.frame(ms) || down;
    return down;
  };
  const late = LATE_MS + 8;

  it('keeps its tier while the frames come on time, a few late ones included', () => {
    const governor = new LightGovernor('full');
    play(governor, WARMUP, 16.7);
    for (let window = 0; window < 10; window++) {
      play(governor, Math.ceil(WINDOW * LATE_SHARE) - 1, late);
      play(governor, WINDOW - Math.ceil(WINDOW * LATE_SHARE) + 1, 16.7);
    }
    expect(governor.tier).toBe('full');
  });

  it("ignores the fight's start: the intro, the shaders made", () => {
    const governor = new LightGovernor('full');
    expect(play(governor, WARMUP, 200)).toBe(false);
    expect(governor.tier).toBe('full');
  });

  it('steps down a window at a time while frames are late: lean, then off, and stays', () => {
    const governor = new LightGovernor('full');
    play(governor, WARMUP, 16.7);
    expect(play(governor, WINDOW, late)).toBe(true);
    expect(governor.tier).toBe('lean');
    play(governor, WINDOW, late);
    expect(governor.tier).toBe('off');
    expect(play(governor, WINDOW * 3, late)).toBe(false);
  });

  it('keeps a step down as the ceiling of the next fights', () => {
    const governor = new LightGovernor('full');
    play(governor, WARMUP + WINDOW, late);
    expect(governor.tier).toBe('lean');
    governor.restart();
    play(governor, WARMUP + WINDOW * 20, 16.7);
    expect(governor.tier).toBe('lean');
  });
});
