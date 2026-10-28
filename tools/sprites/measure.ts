/**
 * Where a strip's drawing stands, measured on its pixels (docs/combat-v2.md §9.2): the hurtboxes
 * are calibrated on these numbers, not guessed. Shared by `npm run measure-boxes`, which reads
 * the generated PNGs, and by the tests, which draw the same strips in memory.
 */

import { ART_SCALE, type Cell, type ClipId } from '../../src/art/types.ts';
import type { Box } from '../../src/core/config.ts';
import { toPx } from '../../src/core/constants.ts';
import type { Clips } from './clips.ts';

/** The cells of one strip, as what they draw: opaque or not. */
export interface StripMask {
  readonly cell: Cell;
  /** Whether the pixel at `column`, `row` of cell `frame` is drawn. */
  readonly opaque: (frame: number, column: number, row: number) => boolean;
}

/** Height of the bands the drawing is measured in, in world pixels. */
export const BAND = 4;
/** §9.2: a hurtbox's edges follow the drawing to this much, in world pixels. */
export const TOLERANCE = 1.5;
/** The feet: the bands under this height, where the back edge follows the rear foot. */
const FEET = 12;

/** The drawn extent of one band of heights, in world pixels from the feet anchor. */
export interface Band {
  /** Bottom of the band (included); its top is `from + BAND` (excluded). */
  readonly from: number;
  /** Farthest drawn pixel edge toward the opponent, and away from it (±Infinity: nothing). */
  readonly front: number;
  readonly back: number;
}

/** A measure of some frames: the bands from the ground up, and the top of the drawing. */
export interface Drawing {
  readonly bands: readonly Band[];
  readonly top: number;
}

export type Posture = 'standing' | 'crouching' | 'air';

/**
 * The poses each posture's hurtboxes are calibrated on (§9.2: the neutral, guard and hit
 * poses), as the clips that show them; a looping clip counts from where it loops (going down
 * into the crouch is not the crouch yet). The walks and the forward jump throw their limbs out
 * (a stride, the legs tucked forward): they are measured too, for the record, but limbs are
 * not hurtboxes (§9.2), the body is.
 */
export const POSTURE_CLIPS: Readonly<
  Record<Posture, { readonly body: readonly ClipId[]; readonly limbs: readonly ClipId[] }>
> = {
  // A low hit buckles the lead knee forward for a frame or two (2 px past the body): a limb.
  standing: {
    body: ['idle', 'blockStand', 'hitHigh', 'hitMid'],
    limbs: ['walkForward', 'walkBack', 'hitLow'],
  },
  crouching: { body: ['crouch', 'blockCrouch', 'hitCrouch'], limbs: [] },
  air: { body: ['jump'], limbs: ['jumpForward'] },
};

/** The strip a fighter's clip plays, and the frames of it that show the posture. */
export function postureFrames(
  clips: Clips,
  id: ClipId,
): { sheet: string; frames: readonly number[] } {
  const clip = clips[id];
  if (!clip) throw new Error(`No clip ${id}`);
  return { sheet: clip.sheet, frames: clip.frames.slice(clip.loopFrom ?? 0) };
}

/**
 * The drawing of `frames` of a strip, band by band from the ground up: the farthest any of them
 * reaches. Pixel edges, in world pixels: the cell's anchor column starts at x 0, and its anchor
 * row ends at y 0 (the feet stand on its bottom edge).
 */
export function measureFrames(mask: StripMask, frames: readonly number[]): Drawing {
  const { width, height, anchor } = mask.cell;
  const bands: { front: number; back: number }[] = [];
  let top = -Infinity;
  for (const frame of frames) {
    for (let row = 0; row < height; row++) {
      // The row's bottom edge, which band it lies in.
      const y = (anchor.y - 1 - row) / ART_SCALE;
      if (y < 0) continue;
      for (let column = 0; column < width; column++) {
        if (!mask.opaque(frame, column, row)) continue;
        const band = (bands[Math.floor(y / BAND)] ??= { front: -Infinity, back: Infinity });
        band.front = Math.max(band.front, (column + 1 - anchor.x) / ART_SCALE);
        band.back = Math.min(band.back, (column - anchor.x) / ART_SCALE);
        top = Math.max(top, y + 1 / ART_SCALE);
      }
    }
  }
  return {
    // Bands with nothing drawn (a gap under tucked legs) stay holes until here.
    bands: Array.from({ length: bands.length }, (_, index) => ({
      from: index * BAND,
      front: bands[index]?.front ?? -Infinity,
      back: bands[index]?.back ?? Infinity,
    })),
    top,
  };
}

/** Several drawings as one: the farthest each band reaches in any of them. */
export function envelope(drawings: readonly Drawing[]): Drawing {
  const count = Math.max(0, ...drawings.map(({ bands }) => bands.length));
  return {
    bands: Array.from({ length: count }, (_, index) => ({
      from: index * BAND,
      front: Math.max(...drawings.map(({ bands }) => bands[index]?.front ?? -Infinity)),
      back: Math.min(...drawings.map(({ bands }) => bands[index]?.back ?? Infinity)),
    })),
    top: Math.max(...drawings.map(({ top }) => top)),
  };
}

/** How a posture's hurtboxes compare to its drawing, edge by edge, in world pixels. */
export interface Calibration {
  /** Each box's front edge, against the farthest the drawing reaches over the box's heights. */
  readonly fronts: readonly { readonly box: number; readonly drawn: number }[];
  /** The rearmost box edge, against the rear foot. */
  readonly back: { readonly box: number; readonly drawn: number };
  /** The highest box edge, against the top of the drawing. */
  readonly top: { readonly box: number; readonly drawn: number };
}

/**
 * The rules of §9.2: the front edge of each box meets the farthest drawn front over its
 * heights, the back edge the rear foot, the top the top of the drawing. A body is not a box (the
 * waist sits behind the gloves and the toes): within a box the drawing may recede, never reach
 * past it, and never stop short of it everywhere.
 */
export function calibrate(boxes: readonly Box[], drawing: Drawing): Calibration {
  const reach = (from: number, to: number, side: 'front' | 'back'): number => {
    const sides = drawing.bands
      .filter((band) => band.from + BAND > from && band.from < to)
      .map((band) => band[side]);
    return side === 'front' ? Math.max(...sides) : Math.min(...sides);
  };
  return {
    fronts: boxes.map((box) => ({
      box: toPx(box.x + box.width),
      drawn: reach(toPx(box.y), toPx(box.y + box.height), 'front'),
    })),
    back: { box: Math.min(...boxes.map((box) => toPx(box.x))), drawn: reach(0, FEET, 'back') },
    top: { box: Math.max(...boxes.map((box) => toPx(box.y + box.height))), drawn: drawing.top },
  };
}

/** Whether a box edge is within the tolerance of the drawing. */
export function fits(edge: { readonly box: number; readonly drawn: number }): boolean {
  return Math.abs(edge.box - edge.drawn) <= TOLERANCE;
}
