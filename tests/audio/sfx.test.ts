import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FIGHT_BUS_OPEN,
  KNEE,
  PRIORITIES,
  Sfx,
  softClip,
  soundOf,
  VOICES,
  type SoundName,
} from '../../src/audio/sfx';

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

/** A Web Audio graph that keeps who is connected to whom, every value set, every stop. */
function fakeAudio() {
  const nodes: FakeNode[] = [];
  class FakeParam {
    value = 0;
    readonly set: number[] = [];
    /** The targets of `setTargetAtTime`: a voice cut. */
    readonly targets: number[] = [];
    setValueAtTime(value: number): void {
      this.value = value;
      this.set.push(value);
    }
    exponentialRampToValueAtTime(): void {
      // A sound's own envelope.
    }
    setTargetAtTime(value: number): void {
      this.targets.push(value);
    }
  }
  class FakeNode {
    readonly to: FakeNode[] = [];
    readonly gain = new FakeParam();
    readonly frequency = new FakeParam();
    type = '';
    buffer: unknown = null;
    curve: Float32Array | null = null;
    /** When it was told to stop, last. */
    stoppedAt = Number.NaN;
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
    stop(at: number): void {
      this.stoppedAt = at;
    }
  }
  class FakeContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    readonly calls: string[] = [];
    readonly destination = new FakeNode('destination');
    createGain = () => new FakeNode('gain');
    createBiquadFilter = () => new FakeNode('filter');
    createWaveShaper = () => new FakeNode('shaper');
    createOscillator = () => new FakeNode('oscillator');
    createBufferSource = () => new FakeNode('source');
    createBuffer = () => ({ getChannelData: () => new Float32Array(16) });
    resume = () => {
      this.calls.push('resume');
      return Promise.resolve();
    };
    suspend = () => {
      this.calls.push('suspend');
      return Promise.resolve();
    };
  }
  /** A Sfx on this graph, unlocked: its context, its master, its clipper, its fight bus. */
  const unlocked = () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined });
    const contexts: FakeContext[] = [];
    vi.stubGlobal(
      'AudioContext',
      class extends FakeContext {
        constructor() {
          super();
          contexts.push(this);
        }
      },
    );
    const sfx = new Sfx();
    sfx.unlock();
    const [context] = contexts;
    if (!context) throw new Error('No context');
    const shaper = nodes.find((node) => node.kind === 'shaper');
    const master = nodes.find((node) => node.to.includes(shaper as FakeNode));
    const filter = nodes.find((node) => node.kind === 'filter');
    const bus = nodes.find((node) => node.to.includes(filter as FakeNode));
    if (!shaper || !master || !filter || !bus) throw new Error('Graph missing');
    return { sfx, context, master, shaper, bus, filter };
  };
  /**
   * The voice gains of the sounds played from node `from` on: their own gains, which feed a node
   * made before them (the bus, the master), where their layers feed them.
   */
  const voicesFrom = (from: number) =>
    nodes
      .slice(from)
      .filter(
        (node) => node.kind === 'gain' && node.to.every((next) => nodes.indexOf(next) < from),
      );
  return { nodes, unlocked, voicesFrom };
}

describe("the fight's bus (docs/finisher.md §1.14)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('plays the fight through its bus, a gain then a low-pass, and the menus on the master', () => {
    const { nodes, unlocked, voicesFrom } = fakeAudio();
    const { sfx, master, bus, filter } = unlocked();
    expect(bus.to).toEqual([filter]);
    expect(filter.to).toEqual([master]);
    const fight = nodes.length;
    sfx.play('heavyHit');
    expect(voicesFrom(fight).map((voice) => voice.to)).toEqual([[bus]]);
    const menu = nodes.length;
    sfx.play('menuMove');
    expect(voicesFrom(menu).map((voice) => voice.to)).toEqual([[master]]);
    // A sound the scene plays under the bus it silenced: straight on the master.
    const under = nodes.length;
    sfx.play('block', 1, 'master');
    expect(voicesFrom(under).map((voice) => voice.to)).toEqual([[master]]);
  });

  it('is set frame by frame, schedules nothing for a frame that changes nothing, and comes back whole', () => {
    const { unlocked } = fakeAudio();
    const { sfx, bus, filter } = unlocked();
    sfx.setFightBus(0, 400);
    sfx.setFightBus(0, 400);
    expect(bus.gain.set.at(-1)).toBe(0);
    expect(filter.frequency.set.at(-1)).toBe(400);
    expect(bus.gain.set).toHaveLength(2);
    sfx.resetFightBus();
    expect(bus.gain.value).toBe(FIGHT_BUS_OPEN.gain);
    expect(filter.frequency.value).toBe(FIGHT_BUS_OPEN.cutoff);
  });
});

describe('the master, never clipping (docs/polish/AUDIT-ET-PLAN.md, P13)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leaves every level under the knee as it is, and bends the louder ones under 1', () => {
    for (const x of [0, 0.01, 0.3, -0.5, KNEE, -KNEE]) expect(softClip(x)).toBe(x);
    let previous = KNEE;
    for (const x of [0.75, 0.8, 0.9, 1]) {
      // Still rising, never flat, never past 1.
      expect(softClip(x)).toBeGreaterThan(previous);
      expect(softClip(x)).toBeLessThan(1);
      expect(softClip(-x)).toBe(-softClip(x));
      previous = softClip(x);
    }
  });

  it('puts the clipper between the master and the speakers, its curve odd, 0 to 0', () => {
    const { unlocked } = fakeAudio();
    const { context, master, shaper } = unlocked();
    expect(master.to).toEqual([shaper]);
    expect(shaper.to).toEqual([context.destination]);
    const curve = shaper.curve ?? new Float32Array();
    expect(curve.length % 2).toBe(1);
    expect(curve[(curve.length - 1) / 2]).toBe(0);
    expect(curve[0]).toBeCloseTo(-softClip(1), 6);
  });
});

describe('the voices, bounded (docs/polish/AUDIT-ET-PLAN.md, P13)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gives every sound a priority, the KO and the super never cut', () => {
    expect(PRIORITIES.ko).toBe(0);
    expect(PRIORITIES.super).toBe(0);
    expect(PRIORITIES.heavyHit).toBeLessThan(PRIORITIES.lightHit);
    expect(PRIORITIES.lightHit).toBeLessThan(PRIORITIES.swing);
  });

  it('cuts the oldest of the least important for a newcomer, softly, once all are taken', () => {
    const { nodes, unlocked, voicesFrom } = fakeAudio();
    const { sfx, context } = unlocked();
    const from = nodes.length;
    sfx.play('swing');
    for (let i = 1; i < VOICES.fight; i++) sfx.play('lightHit');
    const [swing] = voicesFrom(from);
    if (!swing) throw new Error('No swing');
    context.currentTime = 0.01;
    sfx.play('heavyHit');
    // The swing, least important, cut without a click: faded, then stopped 10 ms later.
    expect(swing.gain.targets).toEqual([0]);
    const sources = nodes.filter(
      (node) => (node.kind === 'oscillator' || node.kind === 'source') && reaches(node, swing),
    );
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) expect(source.stoppedAt).toBeCloseTo(0.02, 9);
  });

  it('does not play a newcomer that matters less than every sound playing, but always a KO', () => {
    const { nodes, unlocked, voicesFrom } = fakeAudio();
    const { sfx } = unlocked();
    for (let i = 0; i < VOICES.fight; i++) sfx.play('heavyHit');
    const swing = nodes.length;
    sfx.play('swing');
    expect(voicesFrom(swing)).toHaveLength(0);
    const ko = nodes.length;
    sfx.play('ko');
    expect(voicesFrom(ko)).toHaveLength(1);
  });

  it('counts the menus apart, and forgets the sounds that are over', () => {
    const { nodes, unlocked, voicesFrom } = fakeAudio();
    const { sfx, context } = unlocked();
    for (let i = 0; i < VOICES.fight; i++) sfx.play('heavyHit');
    const menu = nodes.length;
    sfx.play('menuMove');
    expect(voicesFrom(menu)).toHaveLength(1);
    // Every heavy hit over: room again, nothing cut.
    context.currentTime = 1;
    const later = nodes.length;
    sfx.play('swing');
    expect(voicesFrom(later)).toHaveLength(1);
    expect(nodes.every((node) => node.gain.targets.length === 0)).toBe(true);
  });
});

describe('the sound kept alive (docs/polish/AUDIT-ET-PLAN.md, P15)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts or resumes on any press or touch of the page, in a fight too', () => {
    const { unlocked } = fakeAudio();
    const { sfx, context } = unlocked();
    const page = new EventTarget();
    sfx.listenTo(page as Window, new EventTarget() as Document);
    context.state = 'suspended';
    page.dispatchEvent(new Event('keydown'));
    page.dispatchEvent(new Event('pointerdown'));
    expect(context.calls.filter((call) => call === 'resume').length).toBeGreaterThanOrEqual(2);
  });

  it('wakes a context back on screen, suspended then resumed (WebKit 283419)', async () => {
    const { unlocked } = fakeAudio();
    const { sfx, context } = unlocked();
    const document = Object.assign(new EventTarget(), { visibilityState: 'hidden' });
    sfx.listenTo(new EventTarget() as Window, document as unknown as Document);
    context.calls.length = 0;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(context.calls).toEqual([]);
    document.visibilityState = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    await Promise.resolve();
    expect(context.calls).toEqual(['suspend', 'resume']);
  });
});

/** Whether `node` feeds `target`, through any number of nodes. */
function reaches(node: { to: readonly unknown[] }, target: unknown): boolean {
  return node.to.some(
    (next) => next === target || reaches(next as { to: readonly unknown[] }, target),
  );
}

// Every sound has a priority: none left out when a sound is added.
const ALL: readonly SoundName[] = Object.keys(PRIORITIES) as SoundName[];
describe('the priorities', () => {
  it('cover every sound', () => {
    for (const name of ALL) expect(soundOf(name)).toBeDefined();
  });
});
