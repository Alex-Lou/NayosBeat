/**
 * Riff's frame timing and strikes, from docs/combat-v2.md §10.2 and §11.3 (combat v2: not the v1
 * `RIFF` template of src/data/fighters/riff.ts). The generator reads the ticks to make her
 * hanging parts (braids, drawstrings) lag behind her moves; the tests and the preview read the
 * strikes: on its active frames, the striking limb reaches the far edge of the hitbox.
 *
 * Where the spec says "as Nayo" without numbers (reactions), the ticks are Nayo's current ones;
 * they only pace the braids' swing and change nothing in the game.
 */

import type { RiffSheet } from '../../../src/art/riff/sheets.ts';
import type { Strike } from '../fighter.ts';

interface Timing {
  readonly ticks: readonly number[];
  /** A looping strip's last frame flows into its first (idle, walks, crouch, held...). */
  readonly loops: boolean;
}

const once = (...ticks: number[]): Timing => ({ ticks, loops: false });
const loop = (...ticks: number[]): Timing => ({ ticks, loops: true });
const repeat = (ticks: number, frames: number): number[] => Array<number>(frames).fill(ticks);

/** Ticks of every frame of every strip (60 per second). */
export const RIFF_TIMING: Readonly<Record<RiffSheet, Timing>> = {
  idle: loop(...repeat(6, 8)),
  walkForward: loop(...repeat(2, 10)),
  walkBack: loop(...repeat(2, 10)),
  crouch: loop(2, 2, 2, 8, 8, 8),
  // Pre-jump [0], in the air [1-4] (28 ticks), landing [5].
  jump: once(3, 6, 7, 7, 8, 2),
  jumpForward: once(3, 4, 4, 4, 4, 4, 5),
  dashForward: once(1, 3, 3, 3, 3, 3),
  dashBack: once(1, 4, 4, 3, 3, 5),
  // Standing guard 0-2, crouching guard 3-5.
  block: once(2, 3, 1, 2, 3, 1),
  hitHigh: once(3, 3, 4, 4, 2),
  hitMid: once(3, 3, 4, 4, 2),
  hitLow: once(3, 3, 4, 4, 2),
  hitCrouch: once(3, 4, 1),
  trip: once(2, 2, 2, 7),
  airHit: once(3, 5, 6, 1),
  knockdown: once(3, 3, 4, 6, 6, 8),
  getup: once(2, 2, 2, 2, 2),
  ko: once(4, 4, 4, 4, 4, 4, 6, 1),
  held: loop(4, 4),
  thrownBack: once(4, 4, 4, 4),
  tech: once(3, 3, 4, 4),
  standLight: once(1, 2, 2, 3, 3),
  chainLight: once(2, 3, 3, 3, 3, 4),
  lightFinisher: once(2, 2, 3, 3, 5, 6, 7),
  forwardLight: once(2, 3, 3, 2, 5, 5),
  standHeavy: once(2, 2, 2, 3, 4, 5, 5),
  forwardHeavy: once(4, 4, 4, 5, 3, 4, 5, 5),
  backHeavy: once(2, 2, 2, 5, 5, 5, 5),
  crouchLight: once(1, 2, 2, 3, 4),
  crouchHeavy: once(2, 2, 3, 3, 4, 4, 5, 5),
  jumpLight: once(1, 2, 6, 2, 3),
  jumpHeavy: once(3, 3, 5, 3, 3, 3),
  special: once(3, 3, 4, 4, 4, 5, 5, 6),
  specialForward: once(3, 3, 3, 3, 4, 4, 4, 5, 5),
  specialAntiAir: once(2, 2, 3, 3, 6, 6, 6, 6),
  grab: once(2, 3, 3, 6, 6, 7),
  hold: loop(6, 6),
  pummel: once(2, 2, 1, 7),
  throwForward: once(3, 3, 4, 1, 7, 7, 7),
  throwBack: once(3, 3, 4, 4, 1, 8, 8, 9),
  // The entrance fills the 90-tick intro; the victory loops from its frame 4.
  intro: once(10, 8, 8, 8, 10, 8, 8, 10, 10, 10),
  victory: loop(6, 6, 6, 6, 8, 8, 8, 8),
  timeOver: loop(10, 10, 10, 10),
};

/** A strike of §10.2: active frames, hitbox, and whether it reaches up (anti-airs) or forward. */
export interface RiffStrike extends Strike {
  readonly up: boolean;
}

/** Hitbox from its edges in world pixels: x from `x0` to `x1`, y from `y0` to `y1`. */
function strike(frames: readonly number[], x0: number, x1: number, y0: number, y1: number) {
  return { frames, box: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, up: false };
}

function upward(frames: readonly number[], x0: number, x1: number, y0: number, y1: number) {
  return { ...strike(frames, x0, x1, y0, y1), up: true };
}

/** Every attack strip's active frames and hitbox (§10.2, §10.3 for the grab). */
export const RIFF_STRIKES: Readonly<Partial<Record<RiffSheet, RiffStrike>>> = {
  standLight: strike([2], 9, 33, 42, 54),
  chainLight: strike([2], 8, 38, 44, 58),
  lightFinisher: strike([3], 8, 42, 30, 56),
  forwardLight: strike([3], 8, 32, 44, 58),
  standHeavy: strike([3], 9, 43, 40, 58),
  forwardHeavy: strike([4], 8, 34, 34, 70),
  backHeavy: upward([3], -12, 22, 56, 100),
  crouchLight: strike([2], 10, 32, 4, 14),
  crouchHeavy: strike([3], 10, 44, 2, 14),
  jumpLight: strike([2], -14, 26, 6, 24),
  jumpHeavy: strike([2], 2, 32, -4, 18),
  special: strike([3, 4], 6, 36, 2, 14),
  specialForward: strike([5], 0, 30, 16, 56),
  specialAntiAir: upward([2, 3], 4, 28, 30, 92),
  grab: strike([2], 6, 28, 20, 56),
};

/** Half width of her standing pushbox (26 px), the dashed guides of the preview. */
export const PUSHBOX_HALF = 13;
