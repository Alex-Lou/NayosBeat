import type { Clip, ClipId, FighterArt } from '../art/types';
import type { MatchConfig } from '../core/config';
import { flightTicks } from '../core/fighter/air';
import { contactDistance } from '../core/hold-pair';
import { ROUND_END_FRAMES } from '../core/rules';
import type { FighterState, GameState, RoundState } from '../core/state';

/** Past every clip's end: the proximity guard holds the shell the block settles into. */
const HELD = Number.POSITIVE_INFINITY;

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

/**
 * Which fighter is drawn in front: the one attacking, so its blow reads over the opponent, and
 * the one holding the other (its fists on the collar). When both or neither attack, the order
 * stays as it was: no flicker between the two.
 */
export function frontFighter(previous: 0 | 1, a: FighterState, b: FighterState): 0 | 1 {
  const aAttacks = attacks(a);
  if (aAttacks === attacks(b)) return previous;
  return aAttacks ? 0 : 1;
}

function attacks(fighter: FighterState): boolean {
  return fighter.move !== null || fighter.action === 'holding';
}

/** What a fighter shows: a clip, the ticks since it started, where (stage sub-pixels). */
export interface Shown {
  clip: ClipId;
  tick: number;
  x: number;
}

/**
 * Fills `shown` with what `player` shows: the clip of its state on its own clock, where it is.
 * Thrown backward (docs/combat-v2.md §4.3, §11.1), it plays in step with the thrower: the
 * thrownBack strip frame for frame with the throw, then, once let go, that last frame where it
 * was let go while the body flies (the drawing only rises and falls), and the fall at the body's
 * real place on the last ticks before the knockdown: one motion, no jump at the hand-off.
 * Written into `shown`, reused every frame: nothing is allocated.
 */
export function showFighter(
  state: GameState,
  player: 0 | 1,
  config: MatchConfig,
  art: FighterArt,
  shown: Shown,
): void {
  const fighter = state.fighters[player];
  const thrower = state.fighters[player === 0 ? 1 : 0];
  shown.x = fighter.x;
  if (thrower.move === 'throwBack' && thrownBack(fighter, thrower, player, config, art, shown)) {
    return;
  }
  shown.clip = clipIdOf(fighter, player, state.round);
  shown.tick = clipTickOf(shown.clip, fighter, state.round);
}

/** `fighter` held or flying from the thrower's throwBack: fills `shown`, or tells it is not. */
function thrownBack(
  fighter: FighterState,
  thrower: FighterState,
  player: 0 | 1,
  config: MatchConfig,
  art: FighterArt,
  shown: Shown,
): boolean {
  if (fighter.action === 'held') {
    shown.clip = 'thrownBack';
    shown.tick = thrower.actionFrame;
    return true;
  }
  const throwerTemplate = config.fighters[player === 0 ? 1 : 0];
  const { startup, knockdown } = throwerTemplate.moves.throwBack;
  if (fighter.action !== 'airHit' || !knockdown || thrower.actionFrame < startup) return false;
  const fall = flightTicks(knockdown.vy) - sumTicks(art.clips.thrownFall, 0);
  if (fighter.actionFrame >= fall) {
    shown.clip = 'thrownFall';
    shown.tick = fighter.actionFrame - fall;
    return true;
  }
  shown.clip = 'thrownBack';
  shown.tick = HELD;
  // Let go behind the thrower, which has not moved since.
  const distance = contactDistance(throwerTemplate, config.fighters[player]);
  shown.x = thrower.x - thrower.facing * distance;
  return true;
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
      // The proximity guard holds the block's last pose, not its impact: nothing has touched
      // yet, and a real block then shows by rocking back from it.
      return fighter.action === 'guard' ? HELD : fighter.actionFrame;
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
    case 'held':
    case 'tech':
      return fighter.action;
    case 'holding':
      return fighter.move ?? 'hold';
    case 'air':
      return fighter.vx * fighter.facing > 0 ? 'jumpForward' : 'jump';
    case 'attack':
    case 'airAttack':
      return fighter.move ?? 'idle';
    case 'hitstun':
      return fighter.crouching ? 'hitCrouch' : 'hitStand';
    case 'blockstun':
    case 'guard':
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
