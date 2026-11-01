import { overlaps } from './boxes';
import type { Box, FighterTemplate, MatchConfig } from './config';
import { superGauge } from './fighter/move';
import { juggleLift } from './juggle';
import type { MoveData, Pulse } from './move-data';
import { signed } from './numbers';
import {
  AIR_HIT_LIFT,
  BOOST_MAX,
  COMBO_LIMIT,
  HIT_GRAVITY,
  JUGGLE_CARRY,
  PUSHBACK_FRICTION,
  ROUNDS_TO_WIN,
} from './rules';
import { sideOf } from './side';
import {
  FLAG_BOUNCE,
  FLAG_DANGER,
  FLAG_FINISHER,
  FLAG_LIMIT,
  FLAG_MOVE_HIT,
  type FighterAction,
  type FighterState,
  type GameState,
} from './state';

/**
 * The Finisher (docs/finisher.md §1): the super let go armed, with no data of its own. Its four
 * lights are read once a tick from the previous state, like the threats: the match point, a full
 * gauge, the opponent in danger as its combo began, room for the super's blows (and a victim on
 * the ground for a super that leaves it). Armed as it starts (FLAG_FINISHER), the super locks
 * the pair on its first blow if it lands clean and every blow after it will land too:
 * untouchable, the timer stopped, its blows before its last stopping at 1 HP, its last taking
 * all the health left. Integers only, nothing allocated.
 */

/** At this share of its health or less, a fighter is in danger (the life bar's orange too). */
export const FINISHER_DANGER_PERCENT = 30;

/** What the signal shows (§1.2): every light on, all but the room, or nothing. */
export type FinisherState = 'ready' | 'blocked' | 'off';

/** How a blow of the lock lands: stopped at 1 HP, or taking all the health left (§1.6). */
export type FinisherBlow = 'floor' | 'lethal';

/** The victim a lock holds: reeling, juggled, or knocked out by the last blow. */
const LOCKED_VICTIM: ReadonlySet<FighterAction> = new Set(['hitstun', 'airHit', 'ko']);

/** The armed super, and its first contact landed. */
const LOCKED_FLAGS = FLAG_FINISHER | FLAG_MOVE_HIT;

export function inDanger(fighter: FighterState, maxHealth: number): boolean {
  return fighter.health * 100 <= maxHealth * FINISHER_DANGER_PERCENT;
}

/**
 * The lights of `player`'s Finisher (§1.1, §1.2). In training, as its option says
 * (§1.12): the match point played as reached, or always ready (a full gauge and room enough), or
 * never.
 */
export function finisherState(state: GameState, player: 0 | 1, config: MatchConfig): FinisherState {
  const option = config.training ? (config.trainingFinisher ?? 'match') : 'match';
  const move = config.fighters[player].moves.super;
  if (option === 'off' || !move) return 'off';
  const matchPoint = config.training === true || state.round.wins[player] === ROUNDS_TO_WIN - 1;
  if (!matchPoint || superGauge(state.fighters[player]) < BOOST_MAX) return 'off';
  return victimLights(state.fighters[player === 0 ? 1 : 0], player, move, config);
}

/** Every light on: back + BOOST lets the super go armed. */
export function finisherReady(state: GameState, player: 0 | 1, config: MatchConfig): boolean {
  return finisherState(state, player, config) === 'ready';
}

/**
 * `player`'s super holds the pair locked (§1.6): armed, its first contact landed, and the
 * victim still reeling, juggled or knocked out. The flags alone never tell: FLAG_FINISHER and
 * FLAG_MOVE_HIT outlive the super.
 */
export function finisherLocked(state: GameState, player: 0 | 1): boolean {
  return locks(state.fighters[player], state.fighters[player === 0 ? 1 : 0]);
}

/** Whether `attacker`'s super locks `victim` (`finisherLocked`, on any pair of states). */
export function locks(attacker: FighterState, victim: FighterState): boolean {
  return (
    attacker.action === 'attack' &&
    attacker.move === 'super' &&
    (attacker.flags & LOCKED_FLAGS) === LOCKED_FLAGS &&
    LOCKED_VICTIM.has(victim.action)
  );
}

/**
 * How the strike of `attacker` (`by`) lands on `victim` on this tick, as the blow found them
 * (§1.6); null for a plain blow. On a pair it already locks, or on the armed super's first
 * contact if nothing lands on the attacker on this tick (`untouched`: a trade arms nothing), the
 * victim still has lights 3 and 4, and the blows to come will all find it (`everyBlowLands`):
 * the blows before the super's last stop at 1 HP, its last takes all that is left. The lock
 * takes there if that first blow hits (`connected`, step.ts).
 */
export function finisherBlowOf(
  attacker: FighterState,
  victim: FighterState,
  by: 0 | 1,
  untouched: boolean,
  config: MatchConfig,
): FinisherBlow | null {
  const move = config.fighters[by].moves.super;
  if (!move) return null;
  if (!locks(attacker, victim)) {
    const first =
      attacker.action === 'attack' &&
      attacker.move === 'super' &&
      (attacker.flags & LOCKED_FLAGS) === FLAG_FINISHER;
    if (!first || !untouched || victimLights(victim, by, move, config) !== 'ready') return null;
    if (!everyBlowLands(attacker, victim, move, config.fighters[by === 0 ? 1 : 0])) return null;
  }
  return isLastBlow(move, attacker.actionFrame) ? 'lethal' : 'floor';
}

/**
 * The victim's marks once a blow brings its combo to `comboCount`: FLAG_DANGER set by the
 * combo's first blow if the victim was in danger before it (`danger`), cleared otherwise, then
 * kept to the combo's end. A combo begun above the threshold never arms, however low it goes.
 */
export function dangerMarked(flags: number, comboCount: number, danger: boolean): number {
  if (comboCount !== 1) return flags;
  return danger ? flags | FLAG_DANGER : flags & ~FLAG_DANGER;
}

/**
 * Lights 3 and 4, read on the opponent of `player` (§1.1): in danger, by its health in neutral
 * or in guard, by FLAG_DANGER in a combo (unless training plays the Finisher always ready); room
 * in its combo for every blow of the super, neither floored by the limit nor slammed down to
 * bounce; and on the ground, out of a juggle, for a super that leaves it (the Slam).
 */
function victimLights(
  victim: FighterState,
  player: 0 | 1,
  move: MoveData,
  config: MatchConfig,
): FinisherState {
  const always = config.training === true && config.trainingFinisher === 'always';
  const maxHealth = config.fighters[player === 0 ? 1 : 0].maxHealth;
  const danger =
    victim.comboCount === 0 ? inDanger(victim, maxHealth) : (victim.flags & FLAG_DANGER) !== 0;
  if (!always && !danger) return 'off';
  const blows = 1 + (move.pulses?.length ?? 0);
  const room =
    (victim.flags & (FLAG_LIMIT | FLAG_BOUNCE)) === 0 &&
    victim.comboCount + blows <= COMBO_LIMIT &&
    (!leavesGround(move) || (victim.y === 0 && victim.action !== 'airHit'));
  return room ? 'ready' : 'blocked';
}

/** No pulse: a super of one blow. */
const NO_PULSES: readonly Pulse[] = [];

/**
 * The guarantee (§1.6), read on the armed super's first contact: that contact is its first blow
 * (one that whiffed leaves a plain super, never a lock begun on a later blow), and each blow
 * after it still finds the victim. Its body is followed from this tick to each blow as the blows
 * send it (`flightOf`, validate-boost.ts keeps them plain): on the ground it slides back, slowed
 * by friction (`slide`, stun.ts); in the air it is popped up and carried on, falling
 * (`airborne`), and once down it is out of the juggle. The attacker is held where it stands: a
 * super carries its fighter no further than towards the victim (the Slam's advance) and down to
 * the floor. In the corner, the wall turns the slide into the attacker's: the gap grows as much,
 * or a little less.
 */
function everyBlowLands(
  attacker: FighterState,
  victim: FighterState,
  move: MoveData,
  template: FighterTemplate,
): boolean {
  const pulses = move.pulses ?? NO_PULSES;
  const second = pulses[0];
  const box = move.hitbox;
  if (!box || (second && attacker.actionFrame >= second.frame)) return false;
  const away = sideOf(victim, attacker.x) === 1 ? -1 : 1;
  const air = victim.y > 0;
  // A juggled body pops up by its points left (the super spends none); one caught in a jump
  // goes up as any body hit in the air, then as a juggled one without a point.
  const juggled = victim.action === 'airHit';
  const lift = juggleLift(juggled ? victim.juggle : 0);
  let x = victim.x;
  let y = victim.y;
  let vx = air && juggled ? JUGGLE_CARRY : move.pushback;
  let vy = juggled ? lift : AIR_HIT_LIFT;
  let frame = attacker.actionFrame;
  for (const pulse of pulses) {
    for (; frame < pulse.frame; frame++) {
      x += signed(away, vx);
      if (!air) {
        vx = Math.max(0, vx - PUSHBACK_FRICTION);
        continue;
      }
      vy -= HIT_GRAVITY;
      y += vy;
      if (y <= 0) return false;
    }
    if (!touches(box, attacker, victim, x, y, template)) return false;
    vx = air ? JUGGLE_CARRY : pulse.hit.pushback;
    vy = lift;
  }
  return true;
}

/**
 * Whether `box`, struck from where `attacker` stands, meets the body of `victim` moved to `x`,
 * `y`: the boxes of its posture (`hurtboxesOf`), a blow having left it no move of its own.
 */
function touches(
  box: Box,
  attacker: FighterState,
  victim: FighterState,
  x: number,
  y: number,
  template: FighterTemplate,
): boolean {
  const bodies =
    y > 0
      ? template.airHurtboxes
      : victim.crouching
        ? template.crouchingHurtboxes
        : template.standingHurtboxes;
  for (const body of bodies) {
    if (overlaps(box, attacker.x, attacker.y, attacker.facing, body, x, y, victim.facing)) {
      return true;
    }
  }
  return false;
}

/** The move lifts its fighter off the ground on some frame (its motion has a height). */
function leavesGround(move: MoveData): boolean {
  const heights = move.motion?.y;
  if (!heights) return false;
  for (const height of heights) if (height > 0) return true;
  return false;
}

/** The blow landing on `actionFrame` is the move's last: its last pulse reached, or no pulse. */
function isLastBlow(move: MoveData, actionFrame: number): boolean {
  const pulses = move.pulses;
  const last = pulses?.[pulses.length - 1];
  return last === undefined || actionFrame >= last.frame;
}
