import { NAYO_CLIPS } from '../../src/art/nayo/clips.ts';
import { NAYO_SHEETS, type NayoSheet } from '../../src/art/nayo/sheets.ts';
import { CELL_SIZE } from '../../src/art/types.ts';
import { isV2Sheet, NAYO_V2_STRIPS } from './nayo/combat-v2.ts';
import { drawNayo, STILL, type Motion } from './nayo/look.ts';
import { NAYO_POSES, NAYO_PROJECTILE, type PosedSheet } from './nayo/poses/index.ts';
import { drawEffect, inkAt } from './nayo/vfx.ts';
import { PixelCanvas } from './raster.ts';
import { solve, type Pose } from './skeleton.ts';

/**
 * Draws one strip, one cell per frame, shaded and outlined as a whole. The pixels hold palette
 * slots: the same strip is saved once per colorway, with that colorway's palette.
 */
export function drawSheet(sheet: NayoSheet): PixelCanvas {
  const frames = NAYO_SHEETS[sheet].frames;
  const canvas = new PixelCanvas(CELL_SIZE * frames, CELL_SIZE);
  if (sheet === 'projectile') {
    expectFrames(sheet, NAYO_PROJECTILE.length, frames);
    NAYO_PROJECTILE.forEach((effect, frame) => {
      drawEffect(inkAt(canvas, frame * CELL_SIZE), effect);
    });
  } else {
    const poses = NAYO_POSES[sheet];
    expectFrames(sheet, poses.length, frames);
    const motions = motionsOf(sheet, poses);
    poses.forEach((pose, frame) => {
      drawNayo(canvas, solve(pose), frame * CELL_SIZE, motions[frame] ?? STILL);
    });
  }
  canvas.finish();
  return canvas;
}

/**
 * The front effects of a strip (all but the motion trails, which are drawn behind the body),
 * or undefined when it has none.
 */
export function drawEffectsSheet(sheet: PosedSheet): PixelCanvas | undefined {
  const poses = NAYO_POSES[sheet];
  const front = poses.map((pose) =>
    (pose.effects ?? []).filter((effect) => effect.kind !== 'smear'),
  );
  if (front.every((effects) => effects.length === 0)) return undefined;
  const canvas = new PixelCanvas(CELL_SIZE * poses.length, CELL_SIZE);
  front.forEach((effects, frame) => {
    const ink = inkAt(canvas, frame * CELL_SIZE);
    for (const effect of effects) drawEffect(ink, effect);
  });
  canvas.finish();
  return canvas;
}

/**
 * How fast the upper body moves at each frame, in world pixels per tick, smoothed with the
 * frame before: what hangs (chain, cable, hem) lags behind it. Looping strips wrap around.
 */
function motionsOf(sheet: NayoSheet, poses: readonly Pose[]): Motion[] {
  const { ticks, loops } = timingOf(sheet, poses.length);
  const necks = poses.map((pose) => solve(pose).neck);
  const raw = necks.map((neck, frame): Motion => {
    const previousFrame = frame > 0 ? frame - 1 : loops ? poses.length - 1 : -1;
    const previous = necks[previousFrame];
    if (!previous) return STILL;
    const duration = ticks[previousFrame] ?? 3;
    return { vx: (neck.x - previous.x) / duration, vy: (neck.y - previous.y) / duration };
  });
  return raw.map((motion, frame) => {
    const before = raw[frame > 0 ? frame - 1 : loops ? raw.length - 1 : frame] ?? STILL;
    return { vx: motion.vx * 0.65 + before.vx * 0.35, vy: motion.vy * 0.65 + before.vy * 0.35 };
  });
}

/**
 * Ticks per frame of a strip, from the clips that play it (the clip named after the strip last,
 * so its timing wins where another clip borrows a few of its frames), or from the spec for a
 * combat v2 strip that no clip plays yet.
 */
function timingOf(sheet: NayoSheet, frames: number): { ticks: number[]; loops: boolean } {
  const ticks = Array.from({ length: frames }, () => 3);
  let loops = false;
  let played = false;
  const clips = Object.entries(NAYO_CLIPS).sort(
    ([a], [b]) => Number(a === sheet) - Number(b === sheet),
  );
  for (const [, clip] of clips) {
    if (clip.sheet !== sheet) continue;
    played = true;
    clip.frames.forEach((frame, index) => {
      ticks[frame] = clip.ticks[index] ?? 3;
    });
    if (clip.loopFrom !== undefined) loops = true;
  }
  if (!played && isV2Sheet(sheet)) {
    const planned = NAYO_V2_STRIPS[sheet];
    planned.ticks?.forEach((duration, frame) => {
      ticks[frame] = duration;
    });
    loops = planned.loops ?? false;
  }
  return { ticks, loops };
}

function expectFrames(sheet: NayoSheet, drawn: number, frames: number): void {
  if (drawn !== frames) throw new Error(`${sheet}: ${drawn} frames drawn for a strip of ${frames}`);
}
