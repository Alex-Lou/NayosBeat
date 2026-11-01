import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIGHT_BUS_OPEN, Sfx, soundOf } from '../../src/audio/sfx';

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

describe("the fight's bus (docs/finisher.md §1.14)", () => {
  /** A Web Audio graph that keeps who is connected to whom, and every value set. */
  function fakeAudio() {
    const nodes: FakeNode[] = [];
    class FakeParam {
      value = 0;
      readonly set: number[] = [];
      setValueAtTime(value: number): void {
        this.value = value;
        this.set.push(value);
      }
      exponentialRampToValueAtTime(): void {
        // A sound's own envelope.
      }
    }
    class FakeNode {
      readonly to: FakeNode[] = [];
      readonly gain = new FakeParam();
      readonly frequency = new FakeParam();
      type = '';
      buffer: unknown = null;
      constructor(readonly kind: string) {
        nodes.push(this);
      }
      connect(node: FakeNode): FakeNode {
        this.to.push(node);
        return node;
      }
      start(): void {
        // Played.
      }
      stop(): void {
        // Released by the browser.
      }
    }
    class FakeContext {
      state = 'running';
      currentTime = 0;
      sampleRate = 8000;
      readonly destination = new FakeNode('destination');
      createGain = () => new FakeNode('gain');
      createBiquadFilter = () => new FakeNode('filter');
      createOscillator = () => new FakeNode('oscillator');
      createBufferSource = () => new FakeNode('source');
      createBuffer = () => ({ getChannelData: () => new Float32Array(16) });
      resume = () => Promise.resolve();
    }
    return { nodes, FakeContext };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('plays the fight through its bus, a gain then a low-pass, and the menus on the master', () => {
    const { nodes, FakeContext } = fakeAudio();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    vi.stubGlobal('AudioContext', FakeContext);
    const sfx = new Sfx();
    sfx.unlock();
    const [master, bus, filter] = nodes.filter((node) => node.kind !== 'destination');
    expect([master?.kind, bus?.kind, filter?.kind]).toEqual(['gain', 'gain', 'filter']);
    expect(bus?.to).toEqual([filter]);
    expect(filter?.to).toEqual([master]);
    const before = nodes.length;
    sfx.play('heavyHit');
    const fight = nodes.slice(before).filter((node) => node.kind === 'gain');
    expect(fight.every((node) => node.to[0] === bus)).toBe(true);
    const menu = nodes.length;
    sfx.play('menuMove');
    expect(
      nodes
        .slice(menu)
        .filter((n) => n.kind === 'gain')
        .every((n) => n.to[0] === master),
    ).toBe(true);
    // A sound the scene plays under the bus it silenced: straight on the master.
    const under = nodes.length;
    sfx.play('block', 1, 'master');
    expect(
      nodes
        .slice(under)
        .filter((n) => n.kind === 'gain')
        .every((n) => n.to[0] === master),
    ).toBe(true);
  });

  it('is set frame by frame, schedules nothing for a frame that changes nothing, and comes back whole', () => {
    const { nodes, FakeContext } = fakeAudio();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    vi.stubGlobal('AudioContext', FakeContext);
    const sfx = new Sfx();
    sfx.unlock();
    const [, bus, filter] = nodes.filter((node) => node.kind !== 'destination');
    sfx.setFightBus(0, 400);
    sfx.setFightBus(0, 400);
    expect(bus?.gain.set.at(-1)).toBe(0);
    expect(filter?.frequency.set.at(-1)).toBe(400);
    expect(bus?.gain.set).toHaveLength(2);
    sfx.resetFightBus();
    expect(bus?.gain.value).toBe(FIGHT_BUS_OPEN.gain);
    expect(filter?.frequency.value).toBe(FIGHT_BUS_OPEN.cutoff);
  });
});
