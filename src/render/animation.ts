import { clipOf, type Clip, type ClipId, type FighterArt } from '../art/types';
import type { MatchConfig } from '../core/config';
import { flightTicks } from '../core/fighter/air';
import { contactDistance } from '../core/hold-pair';
import { horizontalDirection } from '../core/input';
import type { FighterState, GameState, RoundState } from '../core/state';
import { ANIM_OPTIONS, type AnimOptions } from './anim-options';
import { deathClipOf } from './deaths';
import type { FightMemory } from './fight-memory';
import { flightClipOf, hitClipOf, isAirborne } from './reactions';
import { restTickOf, roundPoseOf } from './rest-poses';

/** Past every clip's end: the proximity guard holds the shell the block settles into. */
const HELD = Number.POSITIVE_INFINITY;

/**
 * Which clip shows a fighter: a round pose while the round is not being fought (entrance,
 * winner, loser on time: rest-poses.ts), otherwise the clip of its current action.
 */
export function clipIdOf(fighter: FighterState, player: 0 | 1, round: RoundState): ClipId {
  return roundPoseOf(fighter, player, round) ?? actionClipOf(fighter);
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
 * What the animation is drawn from besides the state (docs/art/animation-plan.md §2, V1): its
 * options (the animation of before, to compare), and what the view remembers of the fight
 * (FightMemory, held by the fight scene; none where no fight is played tick by tick).
 */
export interface ShowContext {
  readonly options: AnimOptions;
  readonly memory: FightMemory | null;
}

/** The animation as it is now, with nothing remembered. */
export const SHOW_NOW: ShowContext = { options: ANIM_OPTIONS, memory: null };

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
  context: ShowContext = SHOW_NOW,
): void {
  const fighter = state.fighters[player];
  const thrower = state.fighters[player === 0 ? 1 : 0];
  shown.x = fighter.x;
  if (thrower.move === 'throwBack' && thrownBack(fighter, thrower, player, config, art, shown)) {
    return;
  }
  shown.clip = clipIdOf(fighter, player, state.round);
  shown.tick = clipTickOf(shown.clip, fighter, state.round, context.options);
  if (shown.clip === 'knockdown') standUp(fighter, art, shown);
  else if (fighter.action === 'hitstun' || fighter.action === 'blockstun') {
    shown.tick = stunTick(clipOf(art, shown.clip), shown.tick, fighter.stunTotal);
  }
  if (context.options.legacy) shown.tick = keyTick(art, shown.clip, shown.tick);
}

/**
 * The animation of before (docs/art/animation-plan.md §3.3, F2): the clip of the keys alone
 * (`FighterArt.keyClips`) shows, `tick` ticks in, the key that the played clip shows from the
 * tick this returns on, the tick that key came on. Each key comes on at the same tick in both,
 * so the in-betweens are skipped and the keys held as long as they were. A clip without
 * in-betweens, and the last hold, never cut, keep `tick` itself.
 */
function keyTick(art: FighterArt, id: ClipId, tick: number): number {
  const keys = art.keyClips?.[id];
  const total = keys ? sumTicks(keys, 0) : 0;
  const same = !keys || keys === art.clips[id];
  if (same || !Number.isFinite(tick) || (tick >= total && keys.loopFrom === undefined)) {
    return tick;
  }
  const index = clipFrameAt(keys, tick);
  const start = total - sumTicks(keys, index);
  if (tick < total || keys.loopFrom === undefined) return start;
  const loopStart = total - sumTicks(keys, keys.loopFrom);
  return tick - ((tick - loopStart) % (total - loopStart)) - loopStart + start;
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

/**
 * Ticks since a clip started: the poses at rest on their own clocks (rest-poses.ts), the rest on
 * the action's.
 */
export function clipTickOf(
  clip: ClipId,
  fighter: FighterState,
  round: RoundState,
  options: AnimOptions = ANIM_OPTIONS,
): number {
  const rest = restTickOf(clip, fighter, round, options);
  if (rest !== null) return rest;
  // The proximity guard holds the block's last pose, not its impact: nothing has touched yet,
  // and a real block then shows by rocking back from it.
  return fighter.action === 'guard' ? HELD : fighter.actionFrame;
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
      return deathClipOf(fighter);
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
