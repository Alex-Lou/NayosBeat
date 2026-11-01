import type { NayoSheet } from '../../src/art/nayo/sheets.ts';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types.ts';
import { STILL, type Fighter, type Motion, type Spring } from './fighter.ts';
import type { Planned } from './inbetweens.ts';
import { NAYO } from './nayo/index.ts';
import type { PosedSheet } from './nayo/poses/index.ts';
import { PixelCanvas, type Point } from './raster.ts';
import { solve, type Effect, type Pose } from './skeleton.ts';
import { drawEffect, inkAt } from './vfx.ts';

/**
 * Draws one strip of a fighter, one cell per frame, shaded and outlined as a whole. The pixels
 * hold palette slots: the same strip is saved once per colorway, with that colorway's palette.
 * Its keys are drawn exactly as they were before the in-betweens, then its in-betweens
 * (inbetweens.ts), each one's hanging parts swung between those of its two keys, and brought
 * down to the floor when both its keys touch it (`groundedPoses`).
 */
export function drawStrip(fighter: Fighter, sheet: string): PixelCanvas {
  const frames = framesOf(fighter, sheet);
  const effects = fighter.effectsOnly?.(sheet);
  if (!effects) {
    const poses = groundedPoses(fighter, sheet);
    // The draft groundedPoses painted, when it brought nothing down: the very same pixels.
    const draft = drafts.get(fighter)?.get(sheet);
    drafts.get(fighter)?.delete(sheet);
    return draft ?? paintBodies(fighter, sheet, poses);
  }
  const canvas = new PixelCanvas(CELL_SIZE * frames, CELL_SIZE);
  expectFrames(sheet, effects.length, frames);
  effects.forEach((drawn, frame) => {
    const ink = inkAt(canvas, frame * CELL_SIZE, fighter.fx);
    for (const effect of drawn) drawEffect(ink, effect);
  });
  canvas.finish();
  return canvas;
}

/**
 * The bodies of a strip in `poses`: its keys with the motion of their clips, as always, then
 * its in-betweens with a motion mixed between their keys'.
 */
function paintBodies(fighter: Fighter, sheet: string, poses: readonly Pose[]): PixelCanvas {
  const frames = framesOf(fighter, sheet);
  expectFrames(sheet, poses.length, frames);
  const keys = keysOf(fighter, sheet);
  const inbetweens = fighter.inbetweens(sheet);
  expectFrames(sheet, keys.length + inbetweens.length, frames);
  const canvas = new PixelCanvas(CELL_SIZE * frames, CELL_SIZE);
  const motions = motionsOf(fighter, sheet, keys);
  const motionOf = (frame: number): Motion => {
    const inbetween = inbetweens[frame - keys.length];
    if (!inbetween) return motions[frame] ?? STILL;
    return mixMotion(motions[inbetween.from] ?? STILL, motions[inbetween.to] ?? STILL, inbetween.t);
  };
  poses.forEach((pose, frame) => {
    fighter.draw(canvas, solve(pose, fighter.body), frame * CELL_SIZE, motionOf(frame));
  });
  canvas.finish();
  return canvas;
}

/** A motion `t` of the way from `a` to `b`, its hanging parts too. */
function mixMotion(a: Motion, b: Motion, t: number): Motion {
  const mix = (p: number, q: number): number => p + (q - p) * t;
  const motion = { vx: mix(a.vx, b.vx), vy: mix(a.vy, b.vy) };
  if (!a.hang || !b.hang) return motion;
  const to = b.hang;
  const hang = a.hang.map((p, i) => ({
    x: mix(p.x, to[i]?.x ?? p.x),
    y: mix(p.y, to[i]?.y ?? p.y),
  }));
  return { ...motion, hang };
}

/** The lowest row a body touching the floor reaches, in the cell (its feet's anchor row). */
const FLOOR_ROW = ANCHOR.y - 2;

const grounded = new WeakMap<Fighter, Map<string, readonly Pose[]>>();
/** A draft painted by groundedPoses that it did not change, handed once to drawStrip. */
const drafts = new WeakMap<Fighter, Map<string, PixelCanvas>>();

/**
 * The poses of a strip as drawn: its keys, then its in-betweens, each one whose two keys touch
 * the floor and that does not (a roll, a fall between two frames on the floor) brought down by
 * as much, measured on the drawing (a translation: the anatomy does not change).
 */
export function groundedPoses(fighter: Fighter, sheet: string): readonly Pose[] {
  let known = grounded.get(fighter);
  if (!known) grounded.set(fighter, (known = new Map<string, readonly Pose[]>()));
  const done = known.get(sheet);
  if (done) return done;
  const poses = posesOf(fighter, sheet);
  const inbetweens = fighter.inbetweens(sheet);
  let result = poses;
  if (inbetweens.length > 0) {
    const draft = paintBodies(fighter, sheet, poses);
    const keys = poses.length - inbetweens.length;
    const lowered = inbetweens.map((inbetween: Planned, rank): Pose => {
      const [a, b, own] = [inbetween.from, inbetween.to, keys + rank].map((f) =>
        bottomRow(draft, f),
      ) as [number, number, number];
      if (a < FLOOR_ROW || b < FLOOR_ROW || own >= FLOOR_ROW) return inbetween.pose;
      return lower(inbetween.pose, (Math.min(a, b) - own) / ART_SCALE);
    });
    result = [...poses.slice(0, keys), ...lowered];
    if (lowered.every((pose, rank) => pose === inbetweens[rank]?.pose)) {
      let spare = drafts.get(fighter);
      if (!spare) drafts.set(fighter, (spare = new Map<string, PixelCanvas>()));
      spare.set(sheet, draft);
    }
  }
  known.set(sheet, result);
  return result;
}

/** The lowest row a cell draws on, -1 when it draws nothing. */
export function bottomRow(canvas: PixelCanvas, frame: number): number {
  for (let row = CELL_SIZE - 1; row >= 0; row--) {
    const from = row * canvas.width + frame * CELL_SIZE;
    if (canvas.pixels.subarray(from, from + CELL_SIZE).some((slot) => slot !== 0)) return row;
  }
  return -1;
}

/** `pose` lowered by `by` world pixels. */
function lower(pose: Pose, by: number): Pose {
  const down = <T extends Point>(p: T): T => ({ ...p, y: p.y - by });
  return {
    ...pose,
    hip: down(pose.hip),
    nearFist: down(pose.nearFist),
    farFist: down(pose.farFist),
    nearFoot: down(pose.nearFoot),
    farFoot: down(pose.farFoot),
  };
}

/**
 * The front effects of a strip (all but the motion trails, which are drawn behind the body),
 * or undefined when it has none; `recolor` changes each one first (`toPlatine`).
 */
export function drawStripEffects(
  fighter: Fighter,
  sheet: string,
  recolor: (effect: Effect) => Effect = (effect) => effect,
): PixelCanvas | undefined {
  if (fighter.effectsOnly?.(sheet)) return undefined;
  const poses = groundedPoses(fighter, sheet);
  const front = poses.map((pose) =>
    (pose.effects ?? []).filter((effect) => effect.kind !== 'smear').map(recolor),
  );
  if (front.every((effects) => effects.length === 0)) return undefined;
  const canvas = new PixelCanvas(CELL_SIZE * poses.length, CELL_SIZE);
  front.forEach((effects, frame) => {
    const ink = inkAt(canvas, frame * CELL_SIZE, fighter.fx);
    for (const effect of effects) drawEffect(ink, effect);
  });
  canvas.finish();
  return canvas;
}

/**
 * An effect in the Boost's platine (docs/combos-v3.md §1.8.7): a Remix plays its special's strip
 * with that strip's effects redrawn so, all white; the dust of the floor and the guard's arc stay
 * as they are.
 */
export function toPlatine(effect: Effect): Effect {
  return effect.kind === 'dust' || effect.kind === 'shield'
    ? effect
    : { ...effect, tone: 'platine' };
}

/** One of Nayo's strips (see drawStrip). */
export function drawSheet(sheet: NayoSheet): PixelCanvas {
  return drawStrip(NAYO, sheet);
}

/** The front effects of one of Nayo's strips (see drawStripEffects). */
export function drawEffectsSheet(sheet: PosedSheet): PixelCanvas | undefined {
  return drawStripEffects(NAYO, sheet);
}

function framesOf(fighter: Fighter, sheet: string): number {
  const spec = fighter.sheets[sheet];
  if (!spec) throw new Error(`${fighter.name} has no strip ${sheet}`);
  return spec.frames;
}

function posesOf(fighter: Fighter, sheet: string): readonly Pose[] {
  const poses = fighter.poses(sheet);
  if (!poses) throw new Error(`${fighter.name}: no poses for ${sheet}`);
  return poses;
}

function keysOf(fighter: Fighter, sheet: string): readonly Pose[] {
  const keys = fighter.keys(sheet);
  if (!keys) throw new Error(`${fighter.name}: no key poses for ${sheet}`);
  return keys;
}

/**
 * How fast the upper body moves at each frame, in world pixels per tick, smoothed with the
 * frame before: what hangs (chain, cable, hem) lags behind it. Looping strips wrap around.
 */
function motionsOf(fighter: Fighter, sheet: string, poses: readonly Pose[]): Motion[] {
  const { ticks, loops } = fighter.timing(sheet);
  const necks = poses.map((pose) => solve(pose, fighter.body).neck);
  const raw = necks.map((neck, frame): Motion => {
    const previousFrame = frame > 0 ? frame - 1 : loops ? poses.length - 1 : -1;
    const previous = necks[previousFrame];
    if (!previous) return STILL;
    const duration = ticks[previousFrame] ?? 3;
    return { vx: (neck.x - previous.x) / duration, vy: (neck.y - previous.y) / duration };
  });
  const springs = fighter.springs ?? [];
  const hangs = springs.map((spring) => swingOf(spring, necks, ticks, loops));
  return raw.map((motion, frame) => {
    const before = raw[frame > 0 ? frame - 1 : loops ? raw.length - 1 : frame] ?? STILL;
    const smoothed = {
      vx: motion.vx * 0.65 + before.vx * 0.35,
      vy: motion.vy * 0.65 + before.vy * 0.35,
    };
    if (springs.length === 0) return smoothed;
    return { ...smoothed, hang: hangs.map((hang) => hang[frame] ?? { x: 0, y: 0 }) };
  });
}

/** Loops a looping strip is played through before its swing is read: it settles into a cycle. */
const SETTLE_LOOPS = 6;

/**
 * A spring hanging from the neck over a strip, tick by tick: the neck glides from each frame's
 * position to the next one's while the frame is shown, the hanging tip is pulled toward it and
 * slowed by the air. Returns, for each frame, how far the tip is from the neck (as it is when
 * the frame comes on screen). A looping strip is played until the swing repeats itself, so its
 * last frame flows into its first; any other starts at rest.
 */
function swingOf(
  spring: Spring,
  necks: readonly Point[],
  ticks: readonly number[],
  loops: boolean,
): Point[] {
  const first = necks[0] ?? { x: 0, y: 0 };
  let tip = { ...first };
  let velocity = { x: 0, y: 0 };
  const offsets: Point[] = [];
  const rounds = loops ? SETTLE_LOOPS : 1;
  for (let round = 0; round < rounds; round++) {
    necks.forEach((neck, frame) => {
      if (round === rounds - 1) offsets[frame] = { x: tip.x - neck.x, y: tip.y - neck.y };
      const next = necks[frame + 1] ?? (loops ? first : neck);
      const duration = Math.max(1, ticks[frame] ?? 3);
      for (let tick = 1; tick <= duration; tick++) {
        const t = tick / duration;
        const anchor = { x: neck.x + (next.x - neck.x) * t, y: neck.y + (next.y - neck.y) * t };
        velocity = {
          x: velocity.x * (1 - spring.damping) - spring.stiffness * (tip.x - anchor.x),
          y: velocity.y * (1 - spring.damping) - spring.stiffness * (tip.y - anchor.y),
        };
        tip = { x: tip.x + velocity.x, y: tip.y + velocity.y };
      }
    });
  }
  return offsets;
}

function expectFrames(sheet: string, drawn: number, frames: number): void {
  if (drawn !== frames) throw new Error(`${sheet}: ${drawn} frames drawn for a strip of ${frames}`);
}
