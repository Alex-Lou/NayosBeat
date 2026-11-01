import { describe, expect, it } from 'vitest';
import { MAX_SHAKE, Shake, SHAKE_STEP, TRAUMA, TRAUMA_DECAY } from '../../src/render/shake';

/** The camera's offsets, frame by frame, after a kick of `trauma` toward `away`. */
function run(trauma: number, away: 1 | -1 = 1, frames = 60, seed = 1) {
  const shake = new Shake(1, seed);
  shake.kick(trauma, away);
  return Array.from({ length: frames }, () => {
    shake.update();
    return { x: shake.x, y: shake.y };
  });
}

describe('the screen shake (docs/flashs.md §1.3)', () => {
  it('peaks at its trauma squared: 8 px for an Ultime, about 6 for a plain KO, 3 for a heavy blow', () => {
    const peak = (trauma: number) => Math.max(...run(trauma).map(({ x }) => Math.abs(x)));
    expect(peak(TRAUMA.ko.ultimate)).toBeLessThanOrEqual(MAX_SHAKE);
    expect(peak(TRAUMA.ko.ultimate)).toBeGreaterThanOrEqual(MAX_SHAKE - 1);
    expect(peak(TRAUMA.ko.plain)).toBeLessThan(peak(TRAUMA.ko.ultimate));
    expect(peak(TRAUMA.ko.plain)).toBeGreaterThanOrEqual(5);
    expect(peak(TRAUMA.heavy)).toBeLessThanOrEqual(Math.ceil(MAX_SHAKE * TRAUMA.heavy ** 2));
    expect(peak(TRAUMA.heavy)).toBeGreaterThanOrEqual(2);
    expect(peak(TRAUMA.throw)).toBeLessThanOrEqual(2);
  });

  it('jolts the picture with the blow first: the scroll goes the other way', () => {
    const first = (away: 1 | -1) => run(1, away).find(({ x }) => x !== 0)?.x ?? 0;
    expect(first(1)).toBeLessThan(0);
    expect(first(-1)).toBeGreaterThan(0);
  });

  it('turns back no more than 7.5 times a second: never a jitter from one frame to the next', () => {
    const xs = [0, ...run(1).map(({ x }) => x)];
    let heading = 0;
    let turned = -SHAKE_STEP;
    for (let frame = 1; frame < xs.length; frame++) {
      const step = Math.sign((xs[frame] ?? 0) - (xs[frame - 1] ?? 0));
      if (step === 0) continue;
      if (heading !== 0 && step !== heading) {
        expect(frame - turned, `frame ${frame}`).toBeGreaterThanOrEqual(SHAKE_STEP - 1);
        turned = frame;
      }
      heading = step;
    }
  });

  it('dies out, the strongest kick winning over a weaker one', () => {
    const settle = Math.ceil(1 / TRAUMA_DECAY);
    expect(run(1, 1, settle + 1).at(-1)).toEqual({ x: 0, y: 0 });
    // A throw during a KO's shake changes nothing of it.
    const shake = new Shake(1);
    shake.kick(1);
    const xs = Array.from({ length: 20 }, (_, frame) => {
      if (frame === 4) shake.kick(TRAUMA.throw, -1);
      shake.update();
      return { x: shake.x, y: shake.y };
    });
    expect(xs).toEqual(run(1, 1, 20));
  });

  it('shakes half as far reduced, at once', () => {
    const peak = (strength: number) => {
      const shake = new Shake(strength);
      shake.kick(1, 1);
      return Math.max(
        ...Array.from({ length: 40 }, () => {
          shake.update();
          return Math.abs(shake.x);
        }),
      );
    };
    expect(peak(0.5)).toBeGreaterThanOrEqual(Math.floor(peak(1) / 2));
    expect(peak(0.5)).toBeLessThanOrEqual(Math.ceil(peak(1) / 2));
    const switched = new Shake(1);
    switched.kick(1, 1);
    for (let frame = 0; frame < 4; frame++) switched.update();
    expect(switched.x).not.toBe(0);
    switched.strength = 0;
    switched.update();
    expect([switched.x, switched.y]).toEqual([0, 0]);
  });

  it('plays the same for the same events, and keeps still when switched off', () => {
    expect(run(0.9, 1, 40, 7)).toEqual(run(0.9, 1, 40, 7));
    const still = new Shake(0);
    still.kick(1, 1);
    for (let frame = 0; frame < 10; frame++) {
      still.update();
      expect([still.x, still.y]).toEqual([0, 0]);
    }
  });
});

describe("the Finisher's shake (docs/finisher.md §4.4)", () => {
  /** The offsets after a kick along `axis` at `zoom`. */
  const along = (axis: 'x' | 'y', zoom: number, trauma = 1) => {
    const shake = new Shake(1, 1);
    shake.kick(trauma, 1, axis, zoom);
    return Array.from({ length: 60 }, () => {
      shake.update();
      return { x: shake.x, y: shake.y };
    });
  };

  it('goes along one axis only: Nayo’s along the floor, Riff’s from the sky, down first', () => {
    const sideways = along('x', 1);
    expect(sideways.every(({ y }) => y === 0)).toBe(true);
    expect(Math.max(...sideways.map(({ x }) => Math.abs(x)))).toBeGreaterThanOrEqual(MAX_SHAKE - 1);
    const down = along('y', 1);
    expect(down.every(({ x }) => x === 0)).toBe(true);
    expect(Math.max(...down.map(({ y }) => Math.abs(y)))).toBeGreaterThanOrEqual(MAX_SHAKE - 1);
    // The picture first drops (the scroll goes up).
    expect(down.find(({ y }) => y !== 0)?.y).toBeLessThan(0);
  });

  it('divides its offset by the zoom, not its trauma: the force of a KO on the screen at ×2', () => {
    const peak = (zoom: number, trauma = 1) =>
      Math.max(...along('x', zoom, trauma).map(({ x }) => Math.abs(x)));
    expect(peak(2)).toBeLessThanOrEqual(MAX_SHAKE / 2);
    expect(peak(2)).toBeGreaterThanOrEqual(MAX_SHAKE / 2 - 1);
    // Its contact, 0.6: about 2.9 px of the view at ×2, 1.4 of the world.
    expect(peak(2, TRAUMA.ko.finale)).toBeLessThanOrEqual(Math.ceil((MAX_SHAKE * 0.36) / 2));
    expect(TRAUMA.finaleLanding).toBe(1);
  });
});
