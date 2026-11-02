import type { Pose } from './common.ts';
import { POSES as FORWARD } from './walkForward.ts';

/**
 * walkBack: 10 frames of 2 ticks, looping (20 ticks, 32 px at her 1.6 px/tick, the fastest walk
 * back of the cast). The forward glide played backward: frame 0 is the guard, then the forward
 * frames from the last to the first. A planted foot then slides forward 3.2 px a frame in the
 * cell while the game carries her back over it: it stays on its floor pixel. The rear foot leads
 * the retreat, the lead one glides after it on its ball.
 */
const [FIRST, ...REST] = FORWARD;

export const POSES: readonly Pose[] = FIRST ? [FIRST, ...REST.reverse()] : [];
