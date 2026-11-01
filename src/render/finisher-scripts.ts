import type { StagingMode } from '../app/comfort';
import type { Colorway } from '../art';
import type { ClipId } from '../art/types';
import { FIGHT_BUS_OPEN, type Bus, type SoundName } from '../audio/sfx';
import type { FighterId } from '../data/roster';
import type { ShakeAxis } from './shake';

/**
 * The Finisher's scripts (docs/finisher.md §1.14, §2, §3): what each fighter's scene shows and
 * when, as pure data and pure functions of the frame. One director plays them (finisher-scene.ts).
 * Frames are those of the visual clock (1/60 s), counted from the lock (its first contact) or
 * from the KO (`t0`, the frame its last blow lands on).
 */

/** The scene in full, or its short version (§1.14). */
export type StagingVersion = 'full' | 'short';

/** The Finisher's card (§2.7, §3.7): its words, against its rival its own, its lettering. */
export interface CardScript {
  readonly text: string;
  readonly rival: { readonly fighter: FighterId; readonly text: string } | null;
  /** Nayo's neon tube, Riff's letters cut out of paper. */
  readonly style: 'neon' | 'cutout';
}

/** A sound the scene plays, `at` frames after its moment, through the fight's bus or not. */
export interface Cue {
  readonly moment: 'ko' | 'release' | 'cardEnd';
  readonly at: number;
  readonly sound: SoundName;
  readonly bus?: Bus;
  /** Only against this fighter (the rival's second needle skip). */
  readonly against?: FighterId;
}

export interface FinisherScript {
  readonly fighter: FighterId;
  /** The stamp of its name, in the place of the super's on the lock. */
  readonly name: string;
  /** Its tilt, radians (Riff's −6°); the stamps' own otherwise. */
  readonly nameTilt?: number;
  /** The stamps of the super's blows in order, a count (Nayo's UN, DEUX, TROIS); or none. */
  readonly count: readonly string[];
  /**
   * Frames the full version holds after each blow but the last, without a tick: the count on
   * quarter notes (30 frames apart) instead of its natural eighths (16 ticks). 0: none.
   */
  readonly stretch: number;
  /** After the KO: the victim flies through the silence (Nayo), or the image holds (Riff). */
  readonly silence: 'flight' | 'hold';
  /** When the camera sets off for the close up: on the charge before the last blow, or the KO. */
  readonly zoomFrom: 'charge' | 'ko';
  /** The flat over the stage, behind the fighters, by the winner's colorway (§2.5, §3.5). */
  readonly flats: Readonly<Record<Colorway, number>>;
  /** When the flat leaves: on the release (Riff), or once the card is over (Nayo). */
  readonly flatLeaves: 'release' | 'cardEnd';
  readonly card: CardScript;
  /** The one axis its shakes go along (§4.4): Nayo's along the floor, Riff's from the sky. */
  readonly shake: ShakeAxis;
  /**
   * What only this one draws: the cold light on the winner, the crowd, the needle, the shards,
   * the power cut one frame before the card ends (the stage down to 40 %).
   */
  readonly cone: boolean;
  readonly crowd: boolean;
  readonly needle: boolean;
  readonly shards: boolean;
  readonly powerCut: boolean;
  /**
   * The fight's bus (§2.8, §3.8): from this many frames after the KO, it falls silent over
   * `fade` frames (Nayo's brake; Riff's needle cuts it); `muffled`, the headphones close over it
   * with the card (Nayo). A victim that flies through the silence sets it later (`hushFrom`).
   */
  readonly hush: { readonly from: number; readonly fade: number; readonly muffled: boolean };
  /** Its sounds, with the moment each is played at. */
  readonly cues: readonly Cue[];
}

/** Where a script's times come from: the KO's freeze, and the victim's flight after it (ticks). */
export interface Measure {
  /** Ticks of the core's freeze after the KO (22). */
  readonly freeze: number;
  /** Ticks the victim flies once the freeze is over, until it lands (Nayo's victim: 23). */
  readonly flight: number;
}

/**
 * When everything after the KO happens, in frames after it: the release (Nayo's QUATRE, Riff's
 * reprise), the victim's flight (from when, how many frames each of its ticks holds), its
 * touchdown, the card.
 */
export interface Timeline extends Measure {
  readonly version: StagingVersion;
  readonly release: number;
  readonly flightFrom: number;
  /** Frames each tick of the flight holds: 1, 2 or 3, never a fraction (D23). */
  readonly flightPace: number;
  readonly touchdown: number;
  readonly card: { readonly from: number; readonly enter: number; readonly still: number };
  /** The card is gone: the scene's last frame before the fast-forward. */
  readonly end: number;
}

/** The core's freeze is played this fast under a held image: it shows nothing that moves. */
export const FREEZE_TICKS_PER_FRAME = 5;
/** Frames Nayo's impact holds at least before the victim flies (§2.3). */
const LEAST_HOLD = 8;
/** Nayo's beats: quarter notes, then the count's natural eighths in the short version. */
const BEAT = 30;
const EIGHTH = 16;
/** Riff's reprise: a beat and a half after her KO, on her offbeat (§3.3). */
const OFFBEAT = 45;
/** The card's moves, in frames (§1.14): in, still, out; still for less in the short version. */
export const CARD_ENTER = 4;
export const CARD_LEAVE = 8;
const CARD_STILL = { full: 60, short: 36 } as const;
/** From the release to the card. */
const CARD_AFTER = { full: 30, short: 12 } as const;
/** The silhouettes come in this many frames, and leave in these from the release. */
export const SILHOUETTE_IN = 6;
export const SILHOUETTE_OUT = 12;
/** The flat rises in these (fades in, the screen kept still), and leaves in these. */
const FLAT_IN = 8;
const FLAT_STILL_IN = 12;
const FLAT_OUT = 12;
/** The headphones close over the fight's bus (§2.8): from 8 kHz to 400 Hz in 20 frames. */
const MUFFLE = { from: 8000, to: 400, frames: 20 } as const;

/** Nayo's « Le Quatre » (§2): he counts on the beat, and the other falls on the four. */
export const NAYO_SCRIPT: FinisherScript = {
  fighter: 'nayo',
  name: 'LE QUATRE',
  count: ['UN', 'DEUX', 'TROIS'],
  stretch: 14,
  silence: 'flight',
  zoomFrom: 'charge',
  flats: { main: 0x0e3a46, alt: 0x3a0e2e },
  flatLeaves: 'cardEnd',
  card: { text: 'QUATRE.', rival: null, style: 'neon' },
  shake: 'x',
  cone: true,
  crowd: false,
  needle: false,
  shards: false,
  powerCut: false,
  // TROIS sounds whole (its stand-in, heavyHit: 140 ms, 8.4 frames), then the brake: the bus
  // falls over 6 frames, silent as the victim flies (t0 + 14 in full, §2.3; `hushFrom`).
  hush: { from: 9, fade: 6, muffled: true },
  // Stand-ins from today's sounds until the Finisher's own (docs/finisher.md §2.8, PR 4): TROIS's
  // blow, the fall on QUATRE and three strokes of a bell, 15 frames apart.
  cues: [
    { moment: 'ko', at: 0, sound: 'heavyHit' },
    { moment: 'release', at: 0, sound: 'fall' },
    { moment: 'release', at: 0, sound: 'round' },
    { moment: 'release', at: 15, sound: 'round' },
    { moment: 'release', at: 30, sound: 'round' },
  ],
};

/** Frames after Riff's KO the needle skips (§3.3: t = 66), and again against her rival (84). */
export const NEEDLE_AT = 18;
export const RIVAL_NEEDLE_AT = 36;
/** Frames the needle's scratch takes to cross the flat. */
export const NEEDLE_FRAMES = 6;

/** Riff's « Larsen » (§3): the needle skips, a silence, then the whole room jumps on her beat. */
export const RIFF_SCRIPT: FinisherScript = {
  fighter: 'riff',
  name: 'LARSEN !',
  nameTilt: (-6 * Math.PI) / 180,
  count: [],
  stretch: 0,
  silence: 'hold',
  zoomFrom: 'ko',
  flats: { main: 0x4c0b44, alt: 0x6a420c },
  flatLeaves: 'release',
  card: {
    text: 'SUR MON TEMPS.',
    rival: { fighter: 'nayo', text: "T'AS RATÉ UN TEMPS." },
    style: 'cutout',
  },
  shake: 'y',
  cone: false,
  crowd: true,
  needle: true,
  shards: true,
  powerCut: true,
  // The needle skips 18 frames after the KO; the bus falls silent on the frame after it, the
  // needle itself played on the master, past the cut (§3.8).
  hush: { from: NEEDLE_AT + 1, fade: 0, muffled: false },
  // Stand-ins until her own sounds (§3.8, PR 4): the stomp, the needle (a record wound back),
  // the chain under the silenced bus (a short metal click), the room landing on her beat with a
  // chord, and the power cut one frame before the card ends (a bass falling).
  cues: [
    { moment: 'ko', at: 0, sound: 'heavyHit' },
    { moment: 'ko', at: NEEDLE_AT, sound: 'rewind', bus: 'master' },
    { moment: 'ko', at: 30, sound: 'block', bus: 'master' },
    { moment: 'ko', at: RIVAL_NEEDLE_AT, sound: 'rewind', bus: 'master', against: 'nayo' },
    { moment: 'release', at: 0, sound: 'fall' },
    { moment: 'release', at: 0, sound: 'remix' },
    { moment: 'cardEnd', at: -1, sound: 'super' },
  ],
};

const SCRIPTS: Readonly<Record<FighterId, FinisherScript>> = {
  nayo: NAYO_SCRIPT,
  riff: RIFF_SCRIPT,
};

export function scriptOf(fighter: FighterId): FinisherScript {
  return SCRIPTS[fighter];
}

/**
 * Which version plays (§1.14): short from the fighter's second Finisher of the session (`seen`),
 * with « Mise en scène : courte », and always in training; in full otherwise.
 */
export function versionOf(mode: StagingMode, training: boolean, seen: boolean): StagingVersion {
  return mode === 'short' || training || seen ? 'short' : 'full';
}

/**
 * The timeline of `script` after its KO, from what the core measures (§1.14, §2.3, §3.3). Nayo
 * lands on a beat: the first one t0 + 30k (k ≥ 2) that leaves the impact held LEAST_HOLD frames
 * at least before the victim flies at 1/2 (23 ticks: t0 + 60); short, the first t0 + 16k (k ≥ 3)
 * likewise, the flight at ×1 (t0 + 48). Riff's reprise falls on her offbeat, t0 + 45, the
 * victim flying at 1/3 from it (at ×1 short). The card follows the release: 30 frames later in
 * full (4 in, 60 still, 8 out), 12 short (4, 36, 8).
 */
export function timelineOf(
  script: FinisherScript,
  version: StagingVersion,
  measure: Measure,
): Timeline {
  const { flight } = measure;
  const full = version === 'full';
  const pace = script.silence === 'flight' ? (full ? 2 : 1) : full ? 3 : 1;
  let release: number;
  let flightFrom: number;
  if (script.silence === 'flight') {
    const beat = full ? BEAT : EIGHTH;
    let k = full ? 2 : 3;
    while (beat * k - pace * flight < LEAST_HOLD) k++;
    release = beat * k;
    flightFrom = release - pace * flight;
  } else {
    release = OFFBEAT;
    flightFrom = OFFBEAT;
  }
  const from = release + CARD_AFTER[version];
  const still = CARD_STILL[version];
  return {
    ...measure,
    version,
    release,
    flightFrom,
    flightPace: pace,
    touchdown: flightFrom + pace * flight,
    card: { from, enter: CARD_ENTER, still },
    end: from + CARD_ENTER + still + CARD_LEAVE,
  };
}

/**
 * The ticks the scene plays on frame `k` after the KO (§1.14): the core's freeze first, under a
 * held image, FREEZE_TICKS_PER_FRAME a frame at most; then nothing until the flight; one tick
 * every `flightPace` frames through it, each held exactly that long; then one a frame. Never a
 * fraction of a tick: D23 holds.
 */
export function ticksAfterKo(timeline: Timeline, k: number): number {
  if (k <= 0) return 0;
  const left = timeline.freeze - FREEZE_TICKS_PER_FRAME * (k - 1);
  if (left > 0) return Math.min(FREEZE_TICKS_PER_FRAME, left);
  if (k <= timeline.flightFrom) return 0;
  const into = k - timeline.flightFrom;
  if (into <= timeline.flightPace * timeline.flight)
    return into % timeline.flightPace === 0 ? 1 : 0;
  return 1;
}

/** Riff's power cut (§3.3): the stage falls to 40 % in 4 frames, a fall only, held to the end. */
export const POWER_CUT = { dark: 0.6, frames: 4 } as const;

/** How far the power is cut `k` frames after the KO (0 to POWER_CUT.dark): from the card's end − 1. */
export function powerCutOf(script: FinisherScript, timeline: Timeline, k: number): number {
  const from = timeline.end - 1;
  if (!script.powerCut || k < from) return 0;
  return POWER_CUT.dark * Math.min(1, (k - from + 1) / POWER_CUT.frames);
}

/** Eased in, fast then slower: 0 to 1 over `frames` frames from `from`. */
export function easeOut(k: number, from: number, frames: number): number {
  if (frames <= 0) return k >= from ? 1 : 0;
  const t = Math.min(1, Math.max(0, (k - from) / frames));
  return 1 - (1 - t) ** 2;
}

/** Eased both ways: 0 to 1 over `frames` frames from `from`. */
export function easeInOut(k: number, from: number, frames: number): number {
  const t = Math.min(1, Math.max(0, (k - from) / frames));
  return t * t * (3 - 2 * t);
}

/**
 * How opaque the flat is (0 to 1), `sinceLock` frames after the lock and `k` after the KO (null
 * before it): it rises with the lock (fades in, the screen kept `still`), and leaves on the
 * release (Riff) or once the card is over (Nayo).
 */
export function flatAlpha(
  script: FinisherScript,
  timeline: Timeline | null,
  sinceLock: number,
  k: number | null,
  still: boolean,
): number {
  const rise = Math.min(1, (sinceLock + 1) / (still ? FLAT_STILL_IN : FLAT_IN));
  if (timeline === null || k === null) return Math.max(0, rise);
  const leaves = script.flatLeaves === 'release' ? timeline.release : timeline.end;
  return Math.max(0, Math.min(rise, 1 - (k - leaves) / FLAT_OUT));
}

/** How far the fighters have turned into silhouettes, `k` frames after the KO (0 to 1). */
export function silhouetteOf(timeline: Timeline, k: number): number {
  if (k < 0) return 0;
  const rise = Math.min(1, (k + 1) / SILHOUETTE_IN);
  return Math.max(0, Math.min(rise, 1 - (k - timeline.release + 1) / SILHOUETTE_OUT));
}

/**
 * The frame after the KO the fight's bus starts falling silent: where the victim flies through
 * the silence (Nayo), `fade` frames before the flight, so that the bus is silent from its first
 * frame (§2.3: the silence is the flight), never before `hush.from` (TROIS has sounded); at
 * `hush.from` otherwise (the needle).
 */
function hushFrom(script: FinisherScript, timeline: Timeline): number {
  const { hush } = script;
  if (script.silence !== 'flight') return hush.from;
  return Math.max(hush.from, timeline.flightFrom - hush.fade + 1);
}

/**
 * The fight's bus `k` frames after the KO (§1.14, §2.8, §3.8): silenced after the brake or the
 * needle, whole again on the release; the headphones closing over it with Nayo's card.
 */
export function busOf(
  script: FinisherScript,
  timeline: Timeline,
  k: number,
): { readonly gain: number; readonly cutoff: number } {
  const { hush } = script;
  const from = hushFrom(script, timeline);
  let gain: number = FIGHT_BUS_OPEN.gain;
  if (k >= from && k < timeline.release) {
    gain = hush.fade > 0 ? Math.max(0, 1 - (k - from + 1) / hush.fade) : 0;
  }
  let cutoff: number = FIGHT_BUS_OPEN.cutoff;
  const muffle = timeline.card.from;
  if (hush.muffled && k >= muffle) {
    const t = Math.min(1, (k - muffle) / MUFFLE.frames);
    cutoff = MUFFLE.from * (MUFFLE.to / MUFFLE.from) ** t;
  }
  return { gain, cutoff };
}

/** The card `k` frames after the KO: how far it has come in (0 to 1), and how opaque it is. */
export function cardOf(
  timeline: Timeline,
  k: number,
): { readonly shown: boolean; readonly entered: number; readonly alpha: number } {
  const { from, enter, still } = timeline.card;
  if (k < from || k >= timeline.end) return { shown: false, entered: 0, alpha: 0 };
  const entered = Math.min(1, (k - from + 1) / enter);
  const leaving = k - (from + enter + still);
  const alpha = leaving < 0 ? 1 : Math.max(0, 1 - leaving / CARD_LEAVE);
  return { shown: alpha > 0, entered, alpha };
}

/** What the scene imposes on the winner's drawing: a clip on its own clock, lifted (world px). */
export interface StagedPose {
  readonly clip: ClipId;
  readonly tick: number;
  readonly lift: number;
}

/**
 * What the scene imposes on a fighter's drawing this frame (§1.14, §5.2): its pose (null: the
 * game's), how far it has turned into its silhouette (0 to 1: black, its effects in color over
 * it), and the silhouette's 1 px outline (the winner's energy; null: none, the victim's).
 */
export interface StagedLook {
  readonly pose: StagedPose | null;
  readonly silhouette: number;
  readonly outline: number | null;
}

/** Nothing imposed: the game's drawing. */
export const UNSTAGED: StagedLook = { pose: null, silhouette: 0, outline: null };

/** Riff's bounce (§3.10): up 28 px in 12 frames, held 10 (L'Ange, in full), then down. */
const BOUNCE = { height: 28, rise: 12, angel: 10 } as const;
/** Riff's poses until her planche `finale` (PR 4): the jump's for Rebond and L'Ange. */
const REBOUND_TICK = 0;
const ANGEL_TICK = 13;
/** Her flip on the way down: `jumpForward` frames 2 to 4 (its ticks 4 to 16), then the landing. */
const FLIP = { from: 4, ticks: 12, landing: 4 } as const;

/**
 * What the winner shows `k` frames after the KO (null: what the game shows), `koTick` the
 * super's tick it landed on; `endTick`, its last; `finale`, its round pose after the scene (the
 * planche `finale`, its victory until PR 4 draws it). Nayo holds his third blow (s4) through the
 * silence, rises from it on QUATRE (s5 to s9, at ×1), then shows `finale`. Riff holds her stomp,
 * bounces up off the chest on the reprise (Rebond, then L'Ange in full: the jump's poses until
 * hers), flips down onto the floor with the victim, then shows `finale`.
 */
export function winnerPoseOf(
  script: FinisherScript,
  timeline: Timeline,
  k: number,
  koTick: number,
  nextTick: number,
  endTick: number,
  finale: ClipId,
): StagedPose | null {
  if (k < 0) return null;
  const { release, touchdown } = timeline;
  if (k < release) return { clip: 'super', tick: koTick, lift: 0 };
  if (script.silence === 'flight') {
    const rising = nextTick + (k - release);
    if (rising < endTick) return { clip: 'super', tick: rising, lift: 0 };
    return { clip: finale, tick: rising - endTick, lift: 0 };
  }
  if (k >= touchdown) return { clip: finale, tick: k - touchdown, lift: 0 };
  const into = k - release;
  const angel = timeline.version === 'full' ? BOUNCE.angel : 0;
  if (into < BOUNCE.rise) {
    return {
      clip: 'jump',
      tick: REBOUND_TICK + into,
      lift: BOUNCE.height * easeOut(into + 1, 0, BOUNCE.rise),
    };
  }
  if (into < BOUNCE.rise + angel) return { clip: 'jump', tick: ANGEL_TICK, lift: BOUNCE.height };
  const down = into - BOUNCE.rise - angel;
  const falling = Math.max(1, touchdown - release - BOUNCE.rise - angel);
  const t = down / falling;
  const lift = BOUNCE.height * (1 - t * t);
  if (falling - down <= FLIP.landing) return { clip: 'landing', tick: 0, lift };
  return { clip: 'jumpForward', tick: FLIP.from + Math.floor(FLIP.ticks * t), lift };
}
