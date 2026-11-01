import { CadenceBreaks, FrameClock } from '../../src/loop/cadence';
import { FixedTimestep } from '../../src/loop/fixed-timestep';
import { TickPacer } from '../../src/loop/tick-pacer';

/**
 * Fights of 60 s played frame by frame through the fight's clocks, as FightScene plays them,
 * on simulated screens: the model, seeds and measure of the bench that chose the snapped clock
 * (docs/qualite-adaptative.md, [cadence-main]). Each frame lasts a whole number of vsyncs; its
 * timestamp jitters, then is rounded to the clock's grain, and the fight sees the difference.
 */

export const STEP_MS = 1000 / 60;
/** FightScene's MAX_TICKS_PER_FRAME. */
const MAX_STEPS = 5;
/** FightFeedback's KO slow motion: 7 ticks every 20 frames of game time, for 50 of them. */
const KO_SLOW_MOTION = { ticks: 7, frames: 20 } as const;
const KO_SLOW_MOTION_FRAMES = 50;
const KO_SCALE = KO_SLOW_MOTION.ticks / KO_SLOW_MOTION.frames;
/** The fight's first frame lasts 167 to 333 ms (its scene being made): the backlog is dropped. */
const FIRST_FRAME_MS = 250;
const MATCH_S = 60;
const KOS_AT_S = [20, 40];
/** The round's intro (INTRO_FRAMES): the cadence settles meanwhile, the frames are not counted. */
const WARMUP_S = 1.5;

export interface Screen {
  readonly name: string;
  /** The cadence requestAnimationFrame gives, from each time on (s). */
  readonly segments: readonly { readonly hz: number; readonly fromS: number }[];
  /** The timestamps' rounding, and their jitter (uniform, ± ms), before rounding. */
  readonly grainMs: number;
  readonly jitterMs: number;
  /** Share of frames that miss a vsync (they last two). */
  readonly late: number;
  /** The game paused from `fromS` to `toS`: frames go by, the fight sees none of them. */
  readonly pause?: { readonly fromS: number; readonly toS: number };
}

export const screen = (name: string, hz: number, grainMs: number, jitterMs: number, late = 0) =>
  ({ name, segments: [{ hz, fromS: 0 }], grainMs, jitterMs, late }) satisfies Screen;

/** WebKit's rAF cadence on an N Hz screen (AnimationFrameRate.cpp, framesPerSecondNearestFullSpeed). */
export function safariHz(screenHz: number): number {
  if (screenHz <= 60) return screenHz;
  const ratio = screenHz / 60;
  const below = Math.floor(screenHz / Math.floor(ratio));
  const above = Math.floor(screenHz / Math.ceil(ratio));
  return ratio - Math.floor(ratio) <= 0.5 ? below : above;
}

/** `main`: the raw delta to two clocks, the ticks' scaled in the slow motion. `A`: this PR. */
export type Variant = 'main' | 'A';

export interface Tally {
  /** % of frames whose ticks break the cadence (outside the slow motion). */
  readonly ticks: number;
  /** % of frames whose visual steps break it (all frames). */
  readonly visual: number;
  /** The most the visual steps strayed from real time, in steps, the first frame aside. */
  readonly maxDriftSteps: number;
  /** In every slow motion, the ticks played after each frame against 7 for 20 of its frames. */
  readonly slowMotionOff: number;
  /** The cadences the clock was snapped on, in turn (A), and how many times it changed. */
  readonly cadences: readonly number[];
  readonly cadenceChanges: number;
  readonly frames: number;
}

/** The bench's xorshift, seeded anew for every screen and variant: the same frames for both. */
function xorshift(seed: number): () => number {
  let state = seed;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/** Plays `matches` fights on `screen`; the game's FrameClock lives across them, as FightScene's. */
export function measure(screen: Screen, variant: Variant, matches = 100): Tally {
  const rand = xorshift(4242);
  const clock = new FrameClock(screen.grainMs, MAX_STEPS);
  let tickBreaks = 0;
  let tickFrames = 0;
  let visualBreaks = 0;
  let visualFrames = 0;
  let maxDriftSteps = 0;
  let slowMotionOff = 0;
  const cadences = new Set<number>([clock.hz]);
  let cadenceChanges = 0;
  for (let m = 0; m < matches; m++) {
    const start = rand() * 10;
    let trueMs = 0;
    let last = Math.floor(start / screen.grainMs) * screen.grainMs;
    // main: both clocks made anew by every fight (FightScene.init).
    const mainVisual = new FixedTimestep(STEP_MS, MAX_STEPS);
    const mainTicks = new FixedTimestep(STEP_MS, MAX_STEPS);
    clock.restart();
    const tickBand = new CadenceBreaks();
    const visualBand = new CadenceBreaks();
    const kos = [...KOS_AT_S];
    let slowFrames = 0;
    let pacer = new TickPacer(KO_SLOW_MOTION.ticks, KO_SLOW_MOTION.frames);
    let slowSteps = 0;
    let slowTicks = 0;
    let stepsSinceFirst = 0;
    let seenMs = 0;
    let first = true;
    while (trueMs < MATCH_S * 1000) {
      const periodMs = 1000 / hzAt(screen, trueMs / 1000);
      const vsyncs = rand() < screen.late ? 2 : 1;
      const frameMs = first ? FIRST_FRAME_MS : vsyncs * periodMs;
      trueMs += frameMs;
      const noise = (rand() - 0.5) * 2 * screen.jitterMs;
      const stamp = Math.floor((start + trueMs + noise) / screen.grainMs) * screen.grainMs;
      // Phaser's delta, never negative.
      const deltaMs = Math.max(0, stamp - last);
      last = stamp;
      const { pause } = screen;
      if (pause && trueMs >= pause.fromS * 1000 && trueMs < pause.toS * 1000) continue;

      const hz = clock.hz;
      const steps = variant === 'A' ? clock.advance(stamp, deltaMs) : mainVisual.advance(deltaMs);
      if (clock.hz !== hz) {
        cadenceChanges++;
        cadences.add(clock.hz);
      }
      const slow = slowFrames > 0;
      // FightFeedback.ticksFor (A), or main's tick clock scaled by timeScale().
      let ticks: number;
      if (variant === 'main') ticks = mainTicks.advance(deltaMs * (slow ? KO_SCALE : 1));
      else ticks = slow ? pacer.advance(steps) : steps;
      if (slow) {
        slowSteps += steps;
        slowTicks += ticks;
        if (slowTicks !== Math.floor((slowSteps * KO_SLOW_MOTION.ticks) / KO_SLOW_MOTION.frames)) {
          slowMotionOff++;
        }
      }
      // A KO lands on one of the frame's ticks; the slow motion runs from the next frame.
      if (kos.length > 0 && trueMs >= (kos[0] ?? 0) * 1000 && ticks > 0) {
        kos.shift();
        slowFrames = KO_SLOW_MOTION_FRAMES;
        pacer = new TickPacer(KO_SLOW_MOTION.ticks, KO_SLOW_MOTION.frames);
        slowSteps = 0;
        slowTicks = 0;
      }
      slowFrames = Math.max(0, slowFrames - steps);

      const tickBroke = tickBand.frame(ticks, frameMs * (slow ? KO_SCALE : 1));
      const visualBroke = visualBand.frame(steps, frameMs);
      if (first) first = false;
      else {
        stepsSinceFirst += steps;
        seenMs += frameMs;
        const driftSteps = Math.abs(stepsSinceFirst - seenMs / STEP_MS);
        maxDriftSteps = Math.max(maxDriftSteps, driftSteps);
      }
      if (trueMs <= WARMUP_S * 1000) continue;
      visualFrames++;
      if (visualBroke) visualBreaks++;
      if (!slow) {
        tickFrames++;
        if (tickBroke) tickBreaks++;
      }
    }
  }
  return {
    ticks: (100 * tickBreaks) / tickFrames,
    visual: (100 * visualBreaks) / visualFrames,
    maxDriftSteps,
    slowMotionOff,
    cadences: [...cadences],
    cadenceChanges,
    frames: visualFrames,
  };
}

function hzAt(screen: Screen, timeS: number): number {
  let hz = screen.segments[0]?.hz ?? 60;
  for (const segment of screen.segments) if (timeS >= segment.fromS) hz = segment.hz;
  return hz;
}
