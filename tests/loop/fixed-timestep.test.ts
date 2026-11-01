import { describe, expect, it } from 'vitest';
import { FixedTimestep } from '../../src/loop/fixed-timestep';

const TICK_MS = 1000 / 60;

describe('FixedTimestep', () => {
  it('runs one tick per 60 Hz frame', () => {
    const timestep = new FixedTimestep(TICK_MS, 5);
    const ticks = Array.from({ length: 60 }, () => timestep.advance(TICK_MS));
    expect(ticks.every((t) => t === 1)).toBe(true);
  });

  it('keeps 60 ticks per second on a 144 Hz display', () => {
    const timestep = new FixedTimestep(TICK_MS, 5);
    let total = 0;
    for (let i = 0; i < 144; i++) total += timestep.advance(1000 / 144);
    expect(total).toBe(60);
  });

  it('runs two ticks per 30 Hz frame', () => {
    const timestep = new FixedTimestep(TICK_MS, 5);
    expect(timestep.advance(1000 / 30)).toBe(2);
  });

  it('carries the remainder over to the next frame', () => {
    const timestep = new FixedTimestep(10, 5);
    expect(timestep.advance(15)).toBe(1);
    expect(timestep.advance(5)).toBe(1);
  });

  it('caps ticks and drops the backlog after a long stall', () => {
    const timestep = new FixedTimestep(TICK_MS, 5);
    expect(timestep.advance(2000)).toBe(5);
    expect(timestep.advance(TICK_MS)).toBe(1);
  });

  it('drops the backlog back to 0 until rephased', () => {
    const timestep = new FixedTimestep(TICK_MS, 5);
    expect(timestep.advance(2000)).toBe(5);
    expect(timestep.advance(TICK_MS / 2)).toBe(0);
  });

  it('puts the leftover time at its phase, and a dropped backlog back on it', () => {
    const timestep = new FixedTimestep(TICK_MS, 5);
    timestep.advance(TICK_MS * 0.9);
    // The 0.9 tick left over is forgotten: half a tick, then 0.4 more, then 0.1.
    timestep.rephase(TICK_MS / 2);
    expect(timestep.advance(TICK_MS * 0.4)).toBe(0);
    expect(timestep.advance(TICK_MS * 0.1)).toBe(1);
    expect(timestep.advance(2000)).toBe(5);
    expect(timestep.advance(TICK_MS / 2)).toBe(1);
  });

  it('refuses a phase outside one tick', () => {
    const timestep = new FixedTimestep(TICK_MS, 5);
    expect(() => {
      timestep.rephase(-1);
    }).toThrow(RangeError);
    expect(() => {
      timestep.rephase(TICK_MS);
    }).toThrow(RangeError);
  });

  it('ignores zero, negative and non-finite deltas', () => {
    const timestep = new FixedTimestep(TICK_MS, 5);
    expect(timestep.advance(0)).toBe(0);
    expect(timestep.advance(-16)).toBe(0);
    expect(timestep.advance(Number.NaN)).toBe(0);
    expect(timestep.advance(TICK_MS)).toBe(1);
  });

  it('rejects invalid configuration', () => {
    expect(() => new FixedTimestep(0, 5)).toThrow(RangeError);
    expect(() => new FixedTimestep(TICK_MS, 0)).toThrow(RangeError);
    expect(() => new FixedTimestep(TICK_MS, 1.5)).toThrow(RangeError);
  });
});
