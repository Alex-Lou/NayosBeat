/**
 * How a fighter's clips (src/art/<name>/clips.ts) play its strips, read by the tools: the ticks
 * of each frame, which pace the hanging parts in the generator, and the frames on screen while
 * a move can hit, which the preview and the tests measure against its hitbox, move by move. The
 * clips follow the frame data: the strips are drawn to them, never the other way around.
 *
 * A strip drawn ahead of its gameplay has no clip in the game yet: its fighter's pending table
 * (tools/sprites/<name>/pending-timing.ts) holds the clip it will be played with and its move's
 * timing and hitbox, from the design. The tools read it only while no clip of the game plays the
 * strip: once the gameplay adds its clip and its move, the game's win, and the entry can go.
 */

import type { Clip, ClipId } from '../../src/art/types.ts';
import type { FighterTemplate } from '../../src/core/config.ts';
import { toPx } from '../../src/core/constants.ts';
import { MOVE_IDS, type Guard, type MoveData, type MoveId } from '../../src/core/move-data.ts';
import type { Strike } from './fighter.ts';

export type Clips = Readonly<Partial<Record<ClipId, Clip>>>;

/** The ticks of a move that the tools need: when it starts hitting, for how long. */
export type MoveTiming = Pick<MoveData, 'startup' | 'active'>;

/** The strike of a strip drawn ahead of its gameplay, from the design. */
export interface PendingStrike extends MoveTiming {
  readonly guard: Guard;
  /** World pixels from the feet anchor, x toward the opponent, y up (see `edges`). */
  readonly box: Strike['box'];
}

/** A strip drawn ahead of its gameplay: the clip the game will play it with, and its strike. */
export interface PendingStrip {
  readonly clip: Clip;
  readonly strike?: PendingStrike;
}

/** A fighter's strips drawn ahead of their gameplay, by strip. */
export type PendingStrips = Readonly<Partial<Record<string, PendingStrip>>>;

/** A hitbox from its edges in world pixels: x from `x0` to `x1`, y from `y0` to `y1`. */
export function edges(x0: number, x1: number, y0: number, y1: number): Strike['box'] {
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** Whether a clip of the game plays `sheet`: then its pending entry, if any, is ignored. */
export function isPlayed(clips: Clips, sheet: string): boolean {
  return Object.values(clips).some((clip) => clip.sheet === sheet);
}

/**
 * Ticks per frame of a strip of `frames` frames, from the clips that play it (the clip named
 * after the strip last, so its timing wins where another clip borrows a few of its frames; 3
 * for a frame none times), and whether one of them loops. A strip no clip plays yet takes its
 * pending clip's.
 */
export function timingOf(
  clips: Clips,
  sheet: string,
  frames: number,
  pending?: PendingStrips,
): { ticks: number[]; loops: boolean } {
  const ticks = Array.from({ length: frames }, () => 3);
  let loops = false;
  const play = (clip: Clip): void => {
    clip.frames.forEach((frame, index) => {
      ticks[frame] = clip.ticks[index] ?? 3;
    });
    if (clip.loopFrom !== undefined) loops = true;
  };
  const ordered = Object.entries(clips).sort(
    ([a], [b]) => Number(a === sheet) - Number(b === sheet),
  );
  for (const [, clip] of ordered) {
    if (clip.sheet === sheet) play(clip);
  }
  const planned = pending?.[sheet]?.clip;
  if (planned && !isPlayed(clips, sheet)) play(planned);
  return { ticks, loops };
}

/** The frames of `clip` shown while `move` can hit (its active ticks). */
export function activeFrames(clip: Clip, move: MoveTiming): number[] {
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

/**
 * A strike as a strip shows it: its box in world pixels, the frames it is on (each once: a clip
 * may show a frame again), and its move's timing and guard (the design's, for a strip drawn
 * ahead of its gameplay).
 */
export interface ShownStrike extends Strike {
  readonly move: MoveTiming & { readonly guard: Guard };
}

/** A move of the game with a hitbox: which one, the strip its clip plays, and its strike. */
export interface StripStrike extends ShownStrike {
  readonly id: MoveId;
  readonly move: MoveData;
  readonly sheet: string;
}

/**
 * Every move of `template` that strikes with a hitbox (the strikes, the grab), with the strip its
 * clip plays: reaches are a move's, not a strip's, since several moves may play one strip, each
 * with its own box and its own frames (docs/combos-v3.md §5: the Double direct plays the Direct's
 * strip, the Marteau the Overhand's).
 */
export function strikesOf(clips: Clips, template: FighterTemplate): StripStrike[] {
  return MOVE_IDS.flatMap((id) => {
    const clip = clips[id];
    const move = template.moves[id];
    const box = move?.hitbox;
    if (!clip || !move || !box) return [];
    return [
      {
        id,
        move,
        sheet: clip.sheet,
        frames: [...new Set(activeFrames(clip, move))],
        box: { x: toPx(box.x), y: toPx(box.y), width: toPx(box.width), height: toPx(box.height) },
      },
    ];
  });
}

/**
 * The strike a strip shows (the preview draws its hitbox): the move named after the strip,
 * else the first move whose clip plays it, if it has a hitbox; for a strip no clip plays yet,
 * its pending one.
 */
export function strikeOf(
  clips: Clips,
  template: FighterTemplate,
  sheet: string,
  pending?: PendingStrips,
): ShownStrike | undefined {
  const strikes = strikesOf(clips, template).filter((strike) => strike.sheet === sheet);
  const played = strikes.find((strike) => strike.id === sheet) ?? strikes[0];
  if (played) return played;
  const planned = pending?.[sheet];
  if (!planned?.strike || isPlayed(clips, sheet)) return undefined;
  const { clip, strike } = planned;
  return { move: strike, frames: [...new Set(activeFrames(clip, strike))], box: strike.box };
}
