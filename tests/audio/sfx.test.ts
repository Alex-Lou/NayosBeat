import { describe, expect, it } from 'vitest';
import { soundOf } from '../../src/audio/sfx';

type Sound = ReturnType<typeof soundOf>;

/** When the last layer of `sound` ends, in seconds. */
function lengthOf(sound: Sound): number {
  const layers = [...(sound.tones ?? []), ...(sound.noises ?? [])];
  return Math.max(...layers.map((layer) => (layer.delay ?? 0) + layer.duration));
}

describe("the Finisher's siren (docs/finisher.md §1.2)", () => {
  const siren = soundOf('finisherReady');
  const tones = siren.tones ?? [];

  it('lasts 0.8 s at most, square tones only, no noise', () => {
    expect(lengthOf(siren)).toBeLessThanOrEqual(0.8 + 1e-9);
    expect(siren.noises).toBeUndefined();
    expect(tones.length).toBeGreaterThan(0);
    for (const tone of tones) expect(tone.type).toBe('square');
  });

  it("slides from the root up to its fifth: Nayo's do, 262 Hz, to sol, 392 Hz", () => {
    expect(tones[0]?.from).toBe(262);
    expect(tones[tones.length - 1]?.to).toBe(392);
    // Up all along, each pull starting where the one before ended.
    tones.forEach((tone, index) => {
      expect(tone.to).toBeGreaterThanOrEqual(tone.from);
      if (index > 0) expect(tone.from).toBe(tones[index - 1]?.to);
    });
  });

  it('sits 9 dB under a heavy hit', () => {
    const heavy = soundOf('heavyHit').tones?.[0]?.volume ?? 0;
    for (const tone of tones) expect(20 * Math.log10(tone.volume / heavy)).toBeCloseTo(-9, 6);
  });
});
