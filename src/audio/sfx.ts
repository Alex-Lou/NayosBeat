/**
 * Synthesized sound effects (Web Audio): no audio files to download, tiny and instant.
 * Browsers only allow audio after a user gesture, so `unlock()` must be called from one.
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
  | 'round'
  | 'fight'
  | 'menuMove'
  | 'menuConfirm'
  | 'menuBack';

const STORAGE_KEY = 'nayosbeat.sound';
const MASTER_VOLUME = 0.5;

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
      tones: [{ type: 'square', from: 160, to: 45, duration: 0.14, volume: 0.35 }],
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

export class Sfx {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private noiseBuffer: AudioBuffer | undefined;
  private enabled = loadEnabled();

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Creates or resumes the audio context. Call from a user gesture (click, key, touch). */
  unlock(): void {
    if (!this.context) {
      if (typeof AudioContext === 'undefined') return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = MASTER_VOLUME;
      this.master.connect(this.context.destination);
      this.noiseBuffer = createNoise(this.context);
    }
    // `suspended` before the first gesture; `interrupted` on iOS after a call or a lock.
    if (this.context.state !== 'running') {
      this.context.resume().catch(() => {
        // Still locked: the next user gesture will try again.
      });
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    saveEnabled(enabled);
  }

  play(name: SoundName): void {
    const { context, master } = this;
    if (!this.enabled || !context || !master || context.state !== 'running') return;
    const sound = SOUNDS[name];
    const now = context.currentTime;
    for (const tone of sound.tones ?? []) playTone(context, master, tone, now);
    const buffer = this.noiseBuffer;
    if (buffer)
      for (const noise of sound.noises ?? []) playNoise(context, master, buffer, noise, now);
  }
}

function playTone(context: AudioContext, output: AudioNode, tone: Tone, now: number): void {
  const start = now + (tone.delay ?? 0);
  const end = start + tone.duration;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(tone.from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone.to), end);
  gain.gain.setValueAtTime(tone.volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain).connect(output);
  oscillator.start(start);
  // Stopped nodes are released by the browser: nothing to clean up.
  oscillator.stop(end);
}

function playNoise(
  context: AudioContext,
  output: AudioNode,
  buffer: AudioBuffer,
  noise: Noise,
  now: number,
): void {
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
}

/** Half a second of white noise, shared by every noise burst. */
function createNoise(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.5), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** The preference is a convenience: storage may be unavailable (private mode), that is fine. */
function loadEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function saveEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Not persisted: the setting still applies for this session.
  }
}
