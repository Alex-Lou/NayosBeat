import type { Clip, ClipId } from '../art/types';
import { ROUND_END_FRAMES } from '../core/rules';
import type { FighterState, RoundState } from '../core/state';

/**
 * Which clip shows a fighter: a round pose while the round is not being fought (entrance,
 * winner, loser on time), otherwise the clip of its current action.
 */
export function clipIdOf(fighter: FighterState, player: 0 | 1, round: RoundState): ClipId {
  if (round.phase === 'intro') return 'intro';
  const over = round.phase === 'roundEnd' || round.phase === 'matchEnd';
  // Only once standing still: a fighter still recovering, or knocked out, keeps its animation.
  if (over && round.result && fighter.action === 'idle') {
    if (round.result.winner === player) return 'victory';
    if (round.result.reason === 'timeout') return 'timeOver';
  }
  return actionClipOf(fighter);
}

/** Ticks since a clip started: round poses follow the round clock, the rest the action's. */
export function clipTickOf(clip: ClipId, fighter: FighterState, round: RoundState): number {
  switch (clip) {
    case 'intro':
      return round.phaseFrame;
    case 'victory':
    case 'timeOver':
      // The match end follows the round end: keep counting so the pose does not restart.
      return round.phaseFrame + (round.phase === 'matchEnd' ? ROUND_END_FRAMES : 0);
    default:
      return fighter.actionFrame;
  }
}

function actionClipOf(fighter: FighterState): ClipId {
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
