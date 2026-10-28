/**
 * How a fighter's clips (src/art/<name>/clips.ts) play its strips, read by the tools: the ticks
 * of each frame, which pace the hanging parts in the generator, and the frames on screen while
 * a move can hit, which the preview and the tests measure against its hitbox. The clips follow
 * the frame data: the strips are drawn to them, never the other way around.
 */

import type { Clip, ClipId } from '../../src/art/types.ts';
import type { FighterTemplate } from '../../src/core/config.ts';
import { toPx } from '../../src/core/constants.ts';
import { MOVE_IDS, type MoveData, type MoveId } from '../../src/core/move-data.ts';
import type { Strike } from './fighter.ts';

export type Clips = Readonly<Partial<Record<ClipId, Clip>>>;

/**
 * Ticks per frame of a strip of `frames` frames, from the clips that play it (the clip named
 * after the strip last, so its timing wins where another clip borrows a few of its frames; 3
 * for a frame none times), and whether one of them loops.
 */
export function timingOf(
  clips: Clips,
  sheet: string,
  frames: number,
): { ticks: number[]; loops: boolean } {
  const ticks = Array.from({ length: frames }, () => 3);
  let loops = false;
  const ordered = Object.entries(clips).sort(
    ([a], [b]) => Number(a === sheet) - Number(b === sheet),
  );
  for (const [, clip] of ordered) {
    if (clip.sheet !== sheet) continue;
    clip.frames.forEach((frame, index) => {
      ticks[frame] = clip.ticks[index] ?? 3;
    });
    if (clip.loopFrom !== undefined) loops = true;
  }
  return { ticks, loops };
}

/** The frames of `clip` shown while `move` can hit (its active ticks). */
export function activeFrames(clip: Clip, move: MoveData): number[] {
  const frames: number[] = [];
  let tick = 0;
  clip.ticks.forEach((ticks, index) => {
    const active = tick < move.startup + move.active && tick + ticks > move.startup;
    const frame = clip.frames[index];
    if (active && frame !== undefined) frames.push(frame);
    tick += ticks;
  });
  return frames;
}

/** A move that plays a strip with a hitbox: which one, and its strike in world pixels. */
export interface StripStrike extends Strike {
  readonly id: MoveId;
  readonly move: MoveData;
}

/** The move of `template` whose clip plays `sheet`, if it has a hitbox (a strike, the grab). */
export function strikeOf(
  clips: Clips,
  template: FighterTemplate,
  sheet: string,
): StripStrike | undefined {
  for (const id of MOVE_IDS) {
    const clip = clips[id];
    const move = template.moves[id];
    const box = move?.hitbox;
    if (clip?.sheet !== sheet || !move || !box) continue;
    return {
      id,
      move,
      frames: activeFrames(clip, move),
      box: { x: toPx(box.x), y: toPx(box.y), width: toPx(box.width), height: toPx(box.height) },
    };
  }
  return undefined;
}
