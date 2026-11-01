/**
 * Synthesized sound effects (Web Audio): no audio files to download, tiny and instant.
 * Browsers only allow audio after a user gesture, so `unlock()` must be called from one. The
 * fight's sounds go through the `fight` bus (a gain, then a low-pass), the menus' straight to
 * the master: the Finisher's scene silences and muffles the fight (docs/finisher.md §1.14), never
 * the menus. The master goes through a soft clipper (`softClip`), and the sounds playing at once
 * are bounded (`VOICES`): sounds stacked in one tick never clip nor pile up without end
 * (docs/polish/AUDIT-ET-PLAN.md, P13).
 */

export type SoundName =
  | 'lightHit'
  | 'heavyHit'
  | 'block'
  | 'ko'
  | 'swing'
  | 'heavySwing'
  | 'dash'
  | 'projectile'
  | 'jump'
  | 'land'
  | 'grab'
  | 'pummel'
  | 'throw'
  | 'fall'
  | 'tech'
  | 'remix'
  | 'rewind'
  | 'super'
  | 'finisherReady'
  | 'round'
  | 'fight'
  | 'menuMove'
  | 'menuConfirm'
  | 'menuBack';

const MASTER_VOLUME = 0.5;

/**
 * The volumes of « Options » (docs/polish/AUDIT-ET-PLAN.md, P16), in percent: the effects (every
 * sound of the fight and the menus) and the music, apart.
 */
export interface Volumes {
  readonly effects: number;
  readonly music: number;
}
/** The steps the volumes take, in the order they cycle. */
export const VOLUME_STEPS = [100, 75, 50, 25, 0] as const;
/** Where they are kept, versioned (a format the page's storage keeps is a contract). */
const AUDIO_KEY = 'nayosbeat.audio.v1';
/** Before the volumes: the sound on or off, read once to carry the choice over. */
const LEGACY_KEY = 'nayosbeat.sound';
/** The music, when there is some, under the effects (P13). */
const MUSIC_DB = -14;

/** The volume after `percent`, as the option cycles. */
export function nextVolume(percent: number): number {
  const index = VOLUME_STEPS.findIndex((step) => step === percent);
  return VOLUME_STEPS[(index + 1) % VOLUME_STEPS.length] ?? 100;
}

/**
 * The volumes kept (`stored`, JSON), read with tolerance: a value off the steps goes to the
 * nearest, a missing or unreadable one to 100. Never kept yet: the sound's old choice, off
 * becoming 0. Pure.
 */
export function volumesOf(stored: string | null, legacy: string | null): Volumes {
  const step = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value)
      ? VOLUME_STEPS.reduce((best, candidate) =>
          Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
        )
      : 100;
  if (stored === null) return { effects: legacy === 'off' ? 0 : 100, music: 100 };
  try {
    const parsed = JSON.parse(stored) as Partial<Record<keyof Volumes, unknown>> | null;
    return { effects: step(parsed?.effects), music: step(parsed?.music) };
  } catch {
    return { effects: 100, music: 100 };
  }
}

/** A volume in percent as a gain: squared, closer to what the ear hears than a straight line. */
function gainOf(percent: number): number {
  return (percent / 100) ** 2;
}

/** The sounds of the menus: they play on the master, past the `fight` bus. */
const MENU_SOUNDS: ReadonlySet<SoundName> = new Set(['menuMove', 'menuConfirm', 'menuBack']);

/**
 * How many sounds play at once (docs/polish/AUDIT-ET-PLAN.md, P13): the fight's, and the menus'
 * counted apart. Past it, a new sound takes the place of the oldest of the least important ones.
 */
export const VOICES = { fight: 12, menu: 4 } as const;

/**
 * How much each sound matters when the voices are all taken: 0 is never cut (the KO, the super,
 * the announcements), then the heavy blows, then the light ones, then what only accompanies a move.
 */
export const PRIORITIES: Readonly<Record<SoundName, 0 | 1 | 2 | 3>> = {
  ko: 0,
  super: 0,
  finisherReady: 0,
  round: 0,
  fight: 0,
  heavyHit: 1,
  grab: 1,
  fall: 1,
  pummel: 1,
  throw: 1,
  remix: 1,
  rewind: 1,
  lightHit: 2,
  block: 2,
  tech: 2,
  projectile: 2,
  menuMove: 2,
  menuConfirm: 2,
  menuBack: 2,
  swing: 3,
  heavySwing: 3,
  dash: 3,
  jump: 3,
  land: 3,
};

/** A sound cut to make room fades in this time constant, then stops: no click. */
const STEAL_FADE_S = 0.002;
const STEAL_STOP_S = 0.01;

/**
 * The soft clipper on the master (P13): the same signal up to |x| = KNEE (-3 dBFS), then bent
 * towards 1 by a tanh, never a hard edge. Sounds below the knee play exactly as they would without.
 */
export const KNEE = 0.7;

/** The clipper's response at `x`, -1 to 1. */
export function softClip(x: number): number {
  const size = Math.abs(x);
  if (size <= KNEE) return x;
  return Math.sign(x) * (KNEE + (1 - KNEE) * Math.tanh((size - KNEE) / (1 - KNEE)));
}

/** The clipper as a WaveShaper's curve: odd, so that 0 maps to 0 exactly. */
function softClipCurve(points = 4097): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(points);
  for (let i = 0; i < points; i++) curve[i] = softClip((2 * i) / (points - 1) - 1);
  return curve;
}

/** A sound playing: what it is, how much it matters, its own gain to cut it, its sources. */
interface Voice {
  readonly pool: keyof typeof VOICES;
  readonly priority: number;
  readonly gain: GainNode;
  readonly sources: AudioScheduledSourceNode[];
  /** When its last layer ends, in the context's time. */
  readonly end: number;
}
/** Where a sound plays: through the `fight` bus, or past it, straight on the effects' volume. */
export type Bus = 'fight' | 'master';
/** The `fight` bus at rest: whole, its low-pass open (above anything a sound here plays). */
export const FIGHT_BUS_OPEN = { gain: 1, cutoff: 20000 } as const;

/** The square of a heavy hit: the reference the Finisher's siren sits under. */
const HEAVY_HIT_VOLUME = 0.35;
/** The siren of a Finisher ready (docs/finisher.md §1.2): 9 dB under a heavy hit. */
const SIREN_VOLUME = HEAVY_HIT_VOLUME * 10 ** (-9 / 20);

interface Tone {
  readonly type: OscillatorType;
  readonly from: number;
  readonly to: number;
  readonly duration: number;
  readonly volume: number;
  readonly delay?: number;
}

interface Noise {
  readonly duration: number;
  readonly volume: number;
  /** Low-pass cutoff in Hz: lower sounds duller and heavier. */
  readonly cutoff: number;
  readonly delay?: number;
}

/** Each sound is a few short tones and/or noise bursts. */
const SOUNDS: Readonly<Record<SoundName, { tones?: readonly Tone[]; noises?: readonly Noise[] }>> =
  {
    lightHit: {
      noises: [{ duration: 0.06, volume: 0.5, cutoff: 3500 }],
      tones: [{ type: 'square', from: 220, to: 90, duration: 0.06, volume: 0.25 }],
    },
    heavyHit: {
      noises: [{ duration: 0.14, volume: 0.7, cutoff: 1800 }],
      tones: [{ type: 'square', from: 160, to: 45, duration: 0.14, volume: HEAVY_HIT_VOLUME }],
    },
    block: {
      noises: [{ duration: 0.04, volume: 0.25, cutoff: 6000 }],
      tones: [{ type: 'triangle', from: 900, to: 700, duration: 0.05, volume: 0.25 }],
    },
    ko: {
      noises: [{ duration: 0.5, volume: 0.8, cutoff: 900 }],
      tones: [
        { type: 'sawtooth', from: 180, to: 30, duration: 0.6, volume: 0.35 },
        { type: 'square', from: 440, to: 110, duration: 0.4, volume: 0.15, delay: 0.05 },
      ],
    },
    swing: { noises: [{ duration: 0.05, volume: 0.12, cutoff: 2500 }] },
    heavySwing: { noises: [{ duration: 0.09, volume: 0.18, cutoff: 1500 }] },
    // A sole scuffing the floor: duller and longer than a swing.
    dash: { noises: [{ duration: 0.08, volume: 0.16, cutoff: 900 }] },
    projectile: {
      tones: [{ type: 'square', from: 300, to: 900, duration: 0.18, volume: 0.15 }],
    },
    jump: { tones: [{ type: 'square', from: 260, to: 520, duration: 0.08, volume: 0.08 }] },
    land: { noises: [{ duration: 0.05, volume: 0.15, cutoff: 600 }] },
    // The hold (docs/combat-v2.md §4.5). The grab: leather and cloth, a dull grip.
    grab: {
      noises: [{ duration: 0.09, volume: 0.35, cutoff: 1200 }],
      tones: [{ type: 'triangle', from: 140, to: 90, duration: 0.07, volume: 0.2 }],
    },
    // A knee or a headbutt in the hold: muffled, a body blow.
    pummel: {
      noises: [{ duration: 0.07, volume: 0.45, cutoff: 700 }],
      tones: [{ type: 'square', from: 120, to: 55, duration: 0.08, volume: 0.25 }],
    },
    // A throw lets go: the rush of air (the fall makes the impact).
    throw: {
      noises: [{ duration: 0.22, volume: 0.22, cutoff: 1800 }],
      tones: [{ type: 'sine', from: 260, to: 520, duration: 0.2, volume: 0.06 }],
    },
    // A body hitting the floor on its back.
    fall: {
      noises: [{ duration: 0.16, volume: 0.6, cutoff: 500 }],
      tones: [{ type: 'square', from: 90, to: 40, duration: 0.16, volume: 0.3 }],
    },
    // Broken free: two slaps, the hands knocked away.
    tech: {
      noises: [
        { duration: 0.035, volume: 0.45, cutoff: 5000 },
        { duration: 0.035, volume: 0.4, cutoff: 4200, delay: 0.07 },
      ],
    },
    // The Boost (docs/combos-v3.md §1.8.7). A Remix: the bass boost, a low saturated sweep up.
    remix: {
      noises: [{ duration: 0.12, volume: 0.2, cutoff: 700 }],
      tones: [
        { type: 'sawtooth', from: 55, to: 165, duration: 0.26, volume: 0.28 },
        { type: 'square', from: 41, to: 82, duration: 0.26, volume: 0.16 },
      ],
    },
    // The Rewind: a record wound back, a scratch that falls.
    rewind: {
      noises: [{ duration: 0.16, volume: 0.18, cutoff: 3200 }],
      tones: [
        { type: 'sawtooth', from: 1100, to: 140, duration: 0.24, volume: 0.13 },
        { type: 'sawtooth', from: 700, to: 90, duration: 0.18, volume: 0.08, delay: 0.06 },
      ],
    },
    // The super, as its flash freezes the game: the sub-drop, the bass falling through the floor.
    super: {
      noises: [{ duration: 0.4, volume: 0.45, cutoff: 400 }],
      tones: [
        { type: 'sine', from: 180, to: 28, duration: 0.95, volume: 0.5 },
        { type: 'square', from: 90, to: 24, duration: 0.7, volume: 0.18 },
      ],
    },
    // The Finisher ready (docs/finisher.md §1.2): a dub siren, the sound systems' own, from the
    // root up to its fifth in 0.8 s, Nayo's do to sol (`play`'s pitch takes it to Riff's mi and
    // si). A stand-in made of plain tones: three pulls up, the fifth held. The low-pass at 2 kHz
    // and the 6 Hz vibrato wait for the engine of the Finisher's sounds (§5.4).
    finisherReady: {
      tones: [
        { type: 'square', from: 262, to: 320, duration: 0.24, volume: SIREN_VOLUME },
        { type: 'square', from: 320, to: 392, duration: 0.24, volume: SIREN_VOLUME, delay: 0.24 },
        { type: 'square', from: 392, to: 392, duration: 0.32, volume: SIREN_VOLUME, delay: 0.48 },
      ],
    },
    round: { tones: [{ type: 'square', from: 523, to: 523, duration: 0.15, volume: 0.15 }] },
    fight: {
      tones: [
        { type: 'square', from: 659, to: 659, duration: 0.1, volume: 0.15 },
        { type: 'square', from: 880, to: 880, duration: 0.2, volume: 0.15, delay: 0.1 },
      ],
    },
    menuMove: { tones: [{ type: 'square', from: 700, to: 700, duration: 0.03, volume: 0.06 }] },
    menuConfirm: {
      tones: [{ type: 'square', from: 600, to: 1200, duration: 0.08, volume: 0.08 }],
    },
    menuBack: { tones: [{ type: 'square', from: 500, to: 300, duration: 0.08, volume: 0.08 }] },
  };

/** The layers of the sound `name`, its tones and its noise bursts, as `play` plays them. */
export function soundOf(name: SoundName): {
  readonly tones?: readonly Tone[];
  readonly noises?: readonly Noise[];
} {
  return SOUNDS[name];
}

/** The bus every sound of the fight goes through: its gain, then its low-pass, then the master. */
interface FightBus {
  readonly gain: GainNode;
  readonly filter: BiquadFilterNode;
  /** What it was last set to: a frame that changes nothing schedules nothing. */
  shown: { gain: number; cutoff: number };
}

export class Sfx {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  /** The volume of the effects, before the master: every sound goes through it. */
  private effects: GainNode | undefined;
  /** The music's bus, before the master: where the music will play (none yet). */
  private music: GainNode | undefined;
  private fightBus: FightBus | undefined;
  private noiseBuffer: AudioBuffer | undefined;
  private levels: Volumes = loadVolumes();
  /** The sounds playing, oldest first. */
  private voices: Voice[] = [];

  get volumes(): Volumes {
    return this.levels;
  }

  /** Where the music plays, once the context is up: under the effects, its volume applied. */
  get musicBus(): AudioNode | undefined {
    return this.music;
  }

  /** Creates or resumes the audio context. Call from a user gesture (click, key, touch). */
  unlock(): void {
    if (!this.context) {
      if (typeof AudioContext === 'undefined') return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = MASTER_VOLUME;
      const clipper = this.context.createWaveShaper();
      clipper.curve = softClipCurve();
      this.master.connect(clipper).connect(this.context.destination);
      this.effects = this.context.createGain();
      this.effects.connect(this.master);
      this.music = this.context.createGain();
      this.music.connect(this.master);
      this.applyVolumes();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      gain.connect(filter).connect(this.effects);
      this.fightBus = { gain, filter, shown: { gain: Number.NaN, cutoff: Number.NaN } };
      this.setFightBus(FIGHT_BUS_OPEN.gain, FIGHT_BUS_OPEN.cutoff);
      this.noiseBuffer = createNoise(this.context);
    }
    // `suspended` before the first gesture; `interrupted` on iOS after a call or a lock.
    if (this.context.state !== 'running') {
      this.context.resume().catch(() => {
        // Still locked: the next user gesture will try again.
      });
    }
  }

  /** One of the volumes, in percent (`VOLUME_STEPS`): kept, and heard at once. */
  setVolume(kind: keyof Volumes, percent: number): void {
    this.levels = { ...this.levels, [kind]: percent };
    saveVolumes(this.levels);
    this.applyVolumes();
  }

  private applyVolumes(): void {
    const { context, effects, music } = this;
    if (!context || !effects || !music) return;
    const now = context.currentTime;
    effects.gain.setValueAtTime(gainOf(this.levels.effects), now);
    music.gain.setValueAtTime(gainOf(this.levels.music) * 10 ** (MUSIC_DB / 20), now);
  }

  /**
   * Keeps the sound alive for the page's life (docs/polish/AUDIT-ET-PLAN.md, P15): every press
   * and touch is a gesture the context may start or resume from, in a fight too, not only on the
   * menus; and back on screen, a context iOS left « running » yet mute (WebKit bug 283419) is
   * suspended then resumed. The game has one Sfx: these listeners live as long as the page.
   */
  listenTo(page: Window, document: Document): void {
    page.addEventListener('pointerdown', this.onGesture, true);
    page.addEventListener('keydown', this.onGesture, true);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private readonly onGesture = (): void => {
    this.unlock();
  };

  private readonly onVisibility = (event: Event): void => {
    const { context } = this;
    const visible = (event.target as Document | null)?.visibilityState === 'visible';
    if (!context || !visible) return;
    context
      .suspend()
      .then(() => context.resume())
      .catch(() => {
        // Still locked: the next gesture will try again.
      });
  };

  /**
   * `pitch` multiplies the frequencies of its tones (a fighter's siren in its own key); `bus`:
   * where it plays, the menus' on the master and the fight's through its bus unless told (a sound
   * the Finisher's scene plays under the bus it silenced).
   */
  play(name: SoundName, pitch = 1, bus: Bus = MENU_SOUNDS.has(name) ? 'master' : 'fight'): void {
    const { context, effects } = this;
    if (this.levels.effects === 0 || !context || !effects || context.state !== 'running') return;
    const now = context.currentTime;
    const pool = MENU_SOUNDS.has(name) ? 'menu' : 'fight';
    const priority = PRIORITIES[name];
    if (!this.makeRoom(pool, priority, now)) return;
    // Its own gain, whole: the voice can be cut without touching its layers.
    const gain = context.createGain();
    gain.connect(bus === 'fight' ? (this.fightBus?.gain ?? effects) : effects);
    const sound = SOUNDS[name];
    const sources: AudioScheduledSourceNode[] = [];
    let end = now;
    for (const tone of sound.tones ?? []) {
      sources.push(playTone(context, gain, tone, now, pitch));
      end = Math.max(end, now + (tone.delay ?? 0) + tone.duration);
    }
    const buffer = this.noiseBuffer;
    if (buffer)
      for (const noise of sound.noises ?? []) {
        sources.push(playNoise(context, gain, buffer, noise, now));
        end = Math.max(end, now + (noise.delay ?? 0) + noise.duration);
      }
    this.voices.push({ pool, priority, gain, sources, end });
  }

  /**
   * Room for a sound of `priority` in `pool` at `now`: the voices over forgotten, then, all of them
   * taken, the oldest of the least important cut, if it matters no more than the newcomer. False:
   * the newcomer matters least, it does not play. A sound of priority 0 always plays.
   */
  private makeRoom(pool: keyof typeof VOICES, priority: number, now: number): boolean {
    this.voices = this.voices.filter((voice) => voice.end > now);
    const playing = this.voices.filter((voice) => voice.pool === pool);
    if (playing.length < VOICES[pool]) return true;
    const least = Math.max(...playing.map((voice) => voice.priority));
    const victim = playing.find((voice) => voice.priority === least && least > 0);
    if (!victim || least < priority) return priority === 0;
    victim.gain.gain.setTargetAtTime(0, now, STEAL_FADE_S);
    for (const source of victim.sources) source.stop(now + STEAL_STOP_S);
    this.voices.splice(this.voices.indexOf(victim), 1);
    return true;
  }

  /**
   * The `fight` bus from now on (docs/finisher.md §1.14): its `gain` (0 to 1) and its low-pass
   * `cutoff` (Hz). The Finisher's scene sets it every frame, never a ramp scheduled ahead: the
   * pause freezes it where it is, and the pause menu, on the master, keeps its sounds.
   */
  setFightBus(gain: number, cutoff: number): void {
    const { context, fightBus } = this;
    if (!context || !fightBus) return;
    const { shown } = fightBus;
    if (shown.gain === gain && shown.cutoff === cutoff) return;
    const now = context.currentTime;
    fightBus.gain.gain.setValueAtTime(gain, now);
    fightBus.filter.frequency.setValueAtTime(cutoff, now);
    fightBus.shown = { gain, cutoff };
  }

  /** The `fight` bus whole again and open: the scene skipped, over, or the fight left. */
  resetFightBus(): void {
    this.setFightBus(FIGHT_BUS_OPEN.gain, FIGHT_BUS_OPEN.cutoff);
  }
}

function playTone(
  context: AudioContext,
  output: AudioNode,
  tone: Tone,
  now: number,
  pitch: number,
): OscillatorNode {
  const start = now + (tone.delay ?? 0);
  const end = start + tone.duration;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(tone.from * pitch, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone.to * pitch), end);
  gain.gain.setValueAtTime(tone.volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain).connect(output);
  oscillator.start(start);
  // Stopped nodes are released by the browser: nothing to clean up.
  oscillator.stop(end);
  return oscillator;
}

function playNoise(
  context: AudioContext,
  output: AudioNode,
  buffer: AudioBuffer,
  noise: Noise,
  now: number,
): AudioBufferSourceNode {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const start = now + (noise.delay ?? 0);
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = noise.cutoff;
  gain.gain.setValueAtTime(noise.volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + noise.duration);
  source.connect(filter).connect(gain).connect(output);
  source.start(start);
  source.stop(start + noise.duration);
  return source;
}

/** Half a second of white noise, shared by every noise burst. */
function createNoise(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.5), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** The preference is a convenience: storage may be unavailable (private mode), that is fine. */
function loadVolumes(): Volumes {
  try {
    return volumesOf(localStorage.getItem(AUDIO_KEY), localStorage.getItem(LEGACY_KEY));
  } catch {
    return { effects: 100, music: 100 };
  }
}

function saveVolumes(volumes: Volumes): void {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(volumes));
  } catch {
    // Not persisted: the setting still applies for this session.
  }
}
