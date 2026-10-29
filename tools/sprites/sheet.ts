import type { NayoSheet } from '../../src/art/nayo/sheets.ts';
import { CELL_SIZE } from '../../src/art/types.ts';
import { STILL, type Fighter, type Motion, type Spring } from './fighter.ts';
import { NAYO } from './nayo/index.ts';
import type { PosedSheet } from './nayo/poses/index.ts';
import { PixelCanvas, type Point } from './raster.ts';
import { solve, type Effect, type Pose } from './skeleton.ts';
import { drawEffect, inkAt } from './vfx.ts';

/**
 * Draws one strip of a fighter, one cell per frame, shaded and outlined as a whole. The pixels
 * hold palette slots: the same strip is saved once per colorway, with that colorway's palette.
 */
export function drawStrip(fighter: Fighter, sheet: string): PixelCanvas {
  const frames = framesOf(fighter, sheet);
  const canvas = new PixelCanvas(CELL_SIZE * frames, CELL_SIZE);
  const effects = fighter.effectsOnly?.(sheet);
  if (effects) {
    expectFrames(sheet, effects.length, frames);
    effects.forEach((drawn, frame) => {
      const ink = inkAt(canvas, frame * CELL_SIZE, fighter.fx);
      for (const effect of drawn) drawEffect(ink, effect);
    });
  } else {
    const poses = posesOf(fighter, sheet);
    expectFrames(sheet, poses.length, frames);
    const motions = motionsOf(fighter, sheet, poses);
    poses.forEach((pose, frame) => {
      fighter.draw(canvas, solve(pose, fighter.body), frame * CELL_SIZE, motions[frame] ?? STILL);
    });
  }
  canvas.finish();
  return canvas;
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
  const poses = posesOf(fighter, sheet);
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
