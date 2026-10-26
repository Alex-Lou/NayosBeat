import type { Clip, ClipId } from '../art/types';
import type { FighterState } from '../core/state';

/** Which clip shows a fighter's current state. */
export function clipIdOf(fighter: FighterState): ClipId {
  switch (fighter.action) {
    case 'idle':
    case 'walkForward':
    case 'walkBack':
    case 'crouch':
    case 'preJump':
    case 'landing':
    case 'airHit':
    case 'knockdown':
    case 'ko':
      return fighter.action;
    case 'air':
      return fighter.vx * fighter.facing > 0 ? 'jumpForward' : 'jump';
    case 'attack':
    case 'airAttack':
      return fighter.move ?? 'idle';
    case 'hitstun':
      return fighter.crouching ? 'hitCrouch' : 'hitStand';
    case 'blockstun':
      return fighter.crouching ? 'blockCrouch' : 'blockStand';
  }
}

/**
 * Index into `clip.frames` shown `tick` ticks after the clip started. Past the end, the clip
 * plays again from `loopFrom`, or holds its last frame.
 */
export function clipFrameAt(clip: Clip, tick: number): number {
  const last = clip.frames.length - 1;
  const total = sumTicks(clip, 0);
  let t = tick;
  if (t >= total) {
    if (clip.loopFrom === undefined) return last;
    const loopStart = total - sumTicks(clip, clip.loopFrom);
    t = loopStart + ((t - loopStart) % (total - loopStart));
  }
  for (let i = 0; i < last; i++) {
    t -= clip.ticks[i] ?? 0;
    if (t < 0) return i;
  }
  return last;
}

/** Ticks of the frames from `from` to the end. */
function sumTicks(clip: Clip, from: number): number {
  let sum = 0;
  for (let i = from; i < clip.ticks.length; i++) sum += clip.ticks[i] ?? 0;
  return sum;
}
