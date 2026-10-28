import { clipOf, type Clip, type ClipId, type FighterArt } from '../art/types';
import type { MatchConfig } from '../core/config';
import { flightTicks } from '../core/fighter/air';
import { contactDistance } from '../core/hold-pair';
import { horizontalDirection } from '../core/input';
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
  if (shown.clip === 'knockdown') standUp(fighter, art, shown);
  else if (fighter.action === 'hitstun' || fighter.action === 'blockstun') {
    shown.tick = stunTick(clipOf(art, shown.clip), shown.tick, fighter.stunTotal);
  }
}

/**
 * The last ticks of a knockdown play the getup (docs/combat-v2.md §3.8): the fighter stands up
 * as the knockdown ends, the clip of the fall and the floor before.
 */
function standUp(fighter: FighterState, art: FighterArt, shown: Shown): void {
  const getup = sumTicks(art.clips.getup, 0);
  if (fighter.stunFrames > getup) return;
  shown.clip = 'getup';
  shown.tick = getup - fighter.stunFrames;
}

/**
 * The tick of a stun's clip `tick` ticks into a stun of `stun` ticks: with `endFrames`, its last
 * frames end with the stun (§11.4), the ones before keep their pace, or, on a stun too short
 * for the clip, the whole clip is squeezed into it. Past the stun (the proximity guard holds
 * the block), the last frame.
 */
export function stunTick(clip: Clip, tick: number, stun: number): number {
  const ending = clip.endFrames ?? 0;
  if (ending === 0 || stun <= 0) return tick;
  const total = sumTicks(clip, 0);
  if (tick >= stun) return total;
  const tail = sumTicks(clip, clip.ticks.length - ending);
  const head = total - tail;
  if (stun < total) return Math.trunc((tick * total) / stun);
  return tick < head ? tick : head + Math.trunc(((tick - head) * tail) / (stun - head));
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
  // Knocked out by the throw, it flies the same way until it lands.
  const flying = fighter.action === 'airHit' || (fighter.action === 'ko' && isAirborne(fighter));
  if (!flying || !knockdown || thrower.actionFrame < startup) return false;
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
    case 'landing':
    case 'knockdown':
    case 'held':
    case 'tech':
      return fighter.action;
    case 'preJump':
      // The jump's direction is read at take-off: forward held, it is about to be the flip.
      return horizontalDirection(fighter.input) === fighter.facing ? 'preJumpForward' : 'preJump';
    case 'ko':
      return koClipOf(fighter);
    case 'holding':
      return fighter.move ?? 'hold';
    case 'air':
      return fighter.vx * fighter.facing > 0 ? 'jumpForward' : 'jump';
    case 'attack':
    case 'airAttack':
      return fighter.move ?? 'idle';
    case 'airHit':
      return flightClipOf(fighter);
    case 'hitstun':
      return hitClipOf(fighter);
    case 'blockstun':
    case 'guard':
      return fighter.crouching ? 'blockCrouch' : 'blockStand';
  }
}

/** Sent flying: swept off the legs by a sweep, launched otherwise. */
function flightClipOf(fighter: FighterState): ClipId {
  return fighter.reaction === 'trip' ? 'trip' : 'airHit';
}

/**
 * Knocked out. Sent flying (a launcher, a sweep, a throw, a blow in the air), it flies as any
 * fighter sent flying until the body lands, then plays the ko from the frame it meets the floor
 * (`koLanding`), on the clock the landing restarts: it never hovers upright through the first
 * frames of a ko drawn on its feet. On its feet, the whole ko.
 */
function koClipOf(fighter: FighterState): ClipId {
  if (isAirborne(fighter)) return flightClipOf(fighter);
  const { reaction } = fighter;
  return reaction === 'launch' || reaction === 'trip' || reaction === 'thrown' ? 'koLanding' : 'ko';
}

/** Off the ground, or leaving it on this tick (the blow that sends it flying has just landed). */
function isAirborne(fighter: FighterState): boolean {
  return fighter.y > 0 || fighter.vy > 0;
}

/**
 * Hit standing: the head, the belly or a leg, by where the blow landed (§9.4); the whole
 * reaction for a long stun, its quick version otherwise. Crouching, the crouching one.
 */
function hitClipOf(fighter: FighterState): ClipId {
  if (fighter.crouching) return 'hitCrouch';
  const heavy = fighter.reactionHeavy;
  switch (fighter.reaction) {
    case 'high':
      return heavy ? 'hitHigh' : 'hitHighLight';
    case 'low':
      return heavy ? 'hitLow' : 'hitLowLight';
    default:
      return heavy ? 'hitMid' : 'hitMidLight';
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
