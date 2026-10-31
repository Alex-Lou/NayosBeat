import { MAX_CLOSE_UP } from './camera-framing';

/**
 * How many flashes the fight may show (docs/flashs.md §4): one budget for both players, on the
 * visual clock (steps of 1/60 s: FightScene's `visualClock`, which the KO's slow motion does not
 * slow and the pause stops), on what the screen shows at the camera's zoom. A flash is a change
 * of WCAG relative luminance of ΔL ≥ 0.1 (docs/flashs.md §1.1) over the mode's area or more,
 * everything that lights up within FLASH_MERGE frames of each other added up: a trade, a blow
 * and its word, the rings of a super and its last blow. Pure: the effects ask it before they
 * light up, and play their muted look when it says no.
 */

/** The player's « Effets de flash » (src/app/comfort.ts). */
export type FlashMode = 'normal' | 'reduced' | 'off';

/** What lights up within this many frames of each other adds up: one flash, not two. */
export const FLASH_MERGE = 2;
/**
 * The share of the mode's area the budget lets light without a slot: the rest is for what a
 * browser draws beyond the measures (the antialiased edges of the letters, of the sparks).
 */
export const FLASH_MARGIN = 0.9;
/**
 * A piece that waits is tried on PLACE_TRIES frames this far apart, until one fits: past what
 * merges with it, and even, so a 30 Hz screen (2 frames a display) shows it on the frame it is
 * kept for.
 */
export const PLACE_STEP = 4;
const PLACE_TRIES = 4;
/** The sliding windows: one second, and five (IRIS: never 4 s at 2 to 3 flashes a second). */
export const SECOND = 60;
export const FIVE_SECONDS = 300;

export interface FlashRules {
  /**
   * From this many px² of the view (480×270) lit at ΔL ≥ 0.1, it is a flash. Normal: 1 200 world
   * px² at the closest framing (×1.45), 70 % of the W3C's area; reduced and off: a 27" screen at
   * 50 cm (docs/flashs.md §1.1).
   */
  readonly area: number;
  /** Counted flashes an ordinary effect may join in any SECOND: the last slot stays for a climax. */
  readonly ordinary: number;
  /** Counted flashes in any SECOND, a climax's included. */
  readonly perSecond: number;
  /** Counted flashes in any FIVE_SECONDS; an ordinary effect leaves the last one to a climax. */
  readonly perFiveSeconds: number;
  /** Frames at least from a counted flash to an ordinary one (BT.1702-3: 334 ms). */
  readonly gap: number;
}

export const FLASH_RULES: Readonly<Record<FlashMode, FlashRules>> = {
  normal: { area: 2520, ordinary: 2, perSecond: 3, perFiveSeconds: 8, gap: 21 },
  reduced: { area: 1100, ordinary: 1, perSecond: 2, perFiveSeconds: 4, gap: SECOND },
  off: { area: 1100, ordinary: 0, perSecond: 0, perFiveSeconds: 0, gap: Infinity },
};

export type FlashAnswer = 'lit' | 'muted';

/** Something lit at its peak on frame `frame`: world px² at ΔL ≥ 0.1. */
interface Onset {
  readonly frame: number;
  readonly area: number;
}

export class FlashBudget {
  private now = 0;
  /** The camera's close-up this frame: world px² show this many times larger. */
  private scale = MAX_CLOSE_UP ** 2;
  /** Starts of the counted flashes of the last FIVE_SECONDS, oldest first. */
  private readonly starts: number[] = [];
  /** What lit up in the last FLASH_MERGE frames, and what will (a word that waits, a stamp). */
  private onsets: Onset[] = [];

  constructor(private flashMode: FlashMode) {}

  get mode(): FlashMode {
    return this.flashMode;
  }

  /** A new choice in the options, from now on (the flashes already counted still count). */
  setMode(mode: FlashMode): void {
    this.flashMode = mode;
  }

  /** The fight camera's close-up this frame (camera-framing.ts). */
  setZoom(closeUp: number): void {
    this.scale = closeUp ** 2;
  }

  /** World px² that show as `view` px² of the view at this frame's zoom (a piece of the HUD). */
  toWorld(view: number): number {
    return view / this.scale;
  }

  /** Advances the visual clock by `frames` steps of 1/60 s. */
  advance(frames: number): void {
    this.now += frames;
    while ((this.starts[0] ?? Infinity) <= this.now - FIVE_SECONDS) this.starts.shift();
    if (this.onsets.some((onset) => onset.frame < this.now - FLASH_MERGE)) {
      this.onsets = this.onsets.filter((onset) => onset.frame >= this.now - FLASH_MERGE);
    }
  }

  /**
   * An effect lighting `area` world px² (ΔL ≥ 0.1, at its peak) asks to show now. If it makes no
   * new flash with what lights around it (`fits`), it is lit; otherwise it is a flash that takes
   * a slot if the rules leave one (a `climax`, a KO or the last blow of a super, may take the
   * last), and is muted if not: then nothing of it is kept, its muted look shows what it lights.
   */
  request(area: number, climax = false): FlashAnswer {
    if (area <= 0) return 'lit';
    if (!this.fits(area)) {
      if (!this.slotFor(climax)) return 'muted';
      this.starts.push(this.now);
    }
    this.show(area);
    return 'lit';
  }

  /**
   * Whether `area` more world px² lit `delay` frames from now makes no new flash. Each flash that
   * could start with it (on its frame, or on one of the next FLASH_MERGE where something else
   * lights) adds up what lights in its window, before and after now: what lit just before, what
   * waits to light (a word, a stamp). It must stay under the mode's area (with FLASH_MARGIN), or
   * merge with a flash counted (within FLASH_MERGE frames after it).
   */
  fits(area: number, delay = 0): boolean {
    const at = this.now + delay;
    const limit = (FLASH_RULES[this.flashMode].area * FLASH_MARGIN) / this.scale;
    for (let end = at; end <= at + FLASH_MERGE; end++) {
      if (end !== at && !this.onsets.some((onset) => onset.frame === end)) continue;
      if (this.merges(end)) continue;
      if (this.litUpTo(end) + area >= limit) return false;
    }
    return true;
  }

  /** Shows `area` now if it fits (it makes no flash), and says whether it does. */
  admit(area: number): boolean {
    if (area <= 0) return true;
    if (!this.fits(area)) return false;
    this.show(area);
    return true;
  }

  /**
   * Keeps `area` for the first frame it fits from `delay` frames on, by steps of PLACE_STEP (a
   * piece that waits: a muted blow's word, its stamp); returns that delay, or null if none fits.
   */
  place(area: number, delay: number): number | null {
    if (area <= 0) return delay;
    for (let tries = 0, wait = delay; tries < PLACE_TRIES; tries++, wait += PLACE_STEP) {
      if (this.fits(area, wait)) {
        this.show(area, wait);
        return wait;
      }
    }
    return null;
  }

  /**
   * Keeps what lights up without asking (what `admit` or `fits` let show, a muted spark), or will
   * in `delay` frames.
   */
  show(area: number, delay = 0): void {
    if (area > 0) this.onsets.push({ frame: this.now + delay, area });
  }

  /** World px² lit in the FLASH_MERGE + 1 frames that end on `end`. */
  private litUpTo(end: number): number {
    let lit = 0;
    for (const onset of this.onsets) {
      if (onset.frame <= end && onset.frame >= end - FLASH_MERGE) lit += onset.area;
    }
    return lit;
  }

  /** Whether what lights on `frame` lights with a flash counted: within FLASH_MERGE after it. */
  private merges(frame: number): boolean {
    return this.starts.some((start) => frame >= start && frame - start <= FLASH_MERGE);
  }

  /** Whether a counted flash may start now. */
  private slotFor(climax: boolean): boolean {
    const rules = FLASH_RULES[this.flashMode];
    const last = this.starts[this.starts.length - 1];
    const inSecond = this.starts.filter((start) => start > this.now - SECOND).length;
    if (climax) return inSecond < rules.perSecond && this.starts.length < rules.perFiveSeconds;
    const spaced = last === undefined || this.now - last >= rules.gap;
    return spaced && inSecond < rules.ordinary && this.starts.length < rules.perFiveSeconds - 1;
  }
}

/**
 * The look of a clip of front effects (a fighter's `fx` strip: docs/flashs.md §4): lit until one
 * of its frames would flash without a slot, dark from that frame to the clip's end. It never
 * turns lit again within the clip: the dark taking over from a frame under the threshold makes no
 * flash, the other way round would. Dark all along when the mode shows no flash. Each new frame
 * asks for what it lights anew: what the frame before had lit already is no new flash.
 */
export class FxGate {
  private clip: string | null = null;
  private index = -1;
  private frame = -1;
  private dark = false;

  /**
   * `clip`: the strip shown (null: none), at `index` in its clip, showing `frame` of the strip;
   * `area(from)`: the world px² it lights that frame `from` of the strip did not (-1: none, at the
   * clip's start). Returns whether it is drawn dark. Each new frame asks once.
   */
  show(
    budget: FlashBudget,
    clip: string | null,
    index: number,
    frame: number,
    area: (from: number) => number,
  ): boolean {
    if (clip === null) {
      this.clip = null;
      return false;
    }
    if (clip !== this.clip || index < this.index) {
      this.clip = clip;
      this.frame = -1;
      this.dark = budget.mode === 'off';
    }
    this.index = index;
    if (frame !== this.frame) {
      // Dark, it asks no more: it shows the frame before lit only while it is lit.
      if (!this.dark) this.dark = budget.request(area(this.frame)) === 'muted';
      this.frame = frame;
    }
    return this.dark;
  }
}
