import { contactOf, techGrab } from './combat';
import { agedBuffer, readInput } from './commands';
import type { FighterTemplate, MatchConfig } from './config';
import { enter, nextFrame } from './fighter/action';
import { startAttack } from './fighter/move';
import { Input, type InputBits } from './input';
import type { MoveData } from './move-data';
import { holdMove, isHoldChoice, moveDuration } from './moves';
import { signed } from './numbers';
import { GRAB_TECH_FRAMES, HOLD_LIMIT_FRAMES, HOLD_MIN_FRAMES, STRUGGLE_FRAMES } from './rules';
import { sideOf } from './side';
import { heldOf, holdContact, pairOf, placeHeld } from './hold-pair';
import {
  EMPTY_CONTACTS,
  type Contact,
  type FighterState,
  type GameState,
  type HoldState,
} from './state';

/**
 * The hold (docs/combat-v2.md §4): a grab that catches forms a pair, which the holder plays
 * through its `holding` moves (pummel, throws) and the held fighter through the clinch (it may
 * break free) and the struggle (it shortens the hold). While it lasts, the pair alone is
 * updated here, instead of `updateFighter`: blows and projectiles go through both, the pair
 * never pushes itself apart. Symmetric: everything is read from the holder's index.
 */

/** Every button counts as struggling, no direction (§4.2). */
const STRUGGLE_BUTTONS =
  Input.Jump | Input.Light | Input.Heavy | Input.Special | Input.Grab | Input.Dash;

/** A tick where nothing lands. */
const QUIET = { contacts: EMPTY_CONTACTS, hitstop: 0 } as const;

/** What a tick of the hold produced. */
export interface HoldTick {
  readonly fighters: readonly [FighterState, FighterState];
  /** Null once the pair is over: thrown, broken free, knocked out. */
  readonly hold: HoldState | null;
  readonly contacts: readonly Contact[];
  readonly hitstop: number;
}

/**
 * Caught while recovering (PUNITION, §4.2, §7.4), the held fighter cannot break free: the end of
 * a move after its active frames (a missed grab, a dash), a landing, and a backdash once out of
 * its grab-proof frames.
 */
export function isRecovering(fighter: FighterState, template: FighterTemplate): boolean {
  if (fighter.action === 'landing') return true;
  if (fighter.action !== 'attack' || !fighter.move) return false;
  const move = template.moves[fighter.move];
  if (fighter.actionFrame >= move.startup + move.active) return true;
  const proof = move.throwInvincible;
  return proof !== undefined && fighter.actionFrame >= proof.to;
}

/**
 * The grab of `holderIndex` caught the opponent, on this tick: the pair forms, touching, both
 * standing and still, the held fighter turned to the holder. `fighters` are placed for the tick.
 */
export function startHold(
  holderIndex: 0 | 1,
  fighters: readonly [FighterState, FighterState],
  cameraX: number,
  config: MatchConfig,
): HoldTick {
  const heldIndex = holderIndex === 0 ? 1 : 0;
  const grabber = fighters[holderIndex];
  const caught = fighters[heldIndex];
  const holderTemplate = config.fighters[holderIndex];
  const grab = holderTemplate.moves.grab;
  const hold: HoldState = {
    holder: holderIndex,
    frame: 0,
    limit: HOLD_LIMIT_FRAMES,
    techable: !isRecovering(caught, config.fighters[heldIndex]),
    pummels: 0,
  };
  // The holder keeps its buffer: a choice pressed during the grab waits for the clinch's end.
  const holder: FighterState = {
    ...enter(grabber, 'holding'),
    move: null,
    moveConnected: false,
    crouching: false,
    vx: 0,
  };
  const held: FighterState = {
    ...enter(caught, 'held'),
    facing: sideOf(caught, grabber.x),
    move: null,
    moveConnected: false,
    crouching: false,
    stunFrames: 0,
    comboCount: 0,
    vx: 0,
    vy: 0,
  };
  // Where the grab met the body, before the pair is placed (data validation gives it a box).
  const box = grab.hitbox;
  if (!box) throw new Error('The grab has no hitbox');
  const striker = { box, x: grabber.x, y: grabber.y, facing: grabber.facing };
  const counter = hold.techable ? null : 'punish';
  const caughtTemplate = config.fighters[heldIndex];
  const contact = contactOf(
    holderIndex,
    'grab',
    striker,
    caught,
    caughtTemplate,
    held,
    'grab',
    counter,
  );
  return {
    fighters: pairOf(hold, ...placeHeld(hold, holder, held, holder.facing, cameraX, config)),
    hold,
    contacts: [contact],
    hitstop: grab.hitstop,
  };
}

/**
 * One tick of the hold, in order: inputs (the holder's choice is kept through the clinch and a
 * pummel), the
 * break at the round's end, the tech in the clinch, the struggle, the holder's move and the
 * held fighter's loop, the placement (the throw backward switches sides), then what lands: a
 * pummel, or the release of a throw, which ends the hold.
 */
export function updateHold(
  state: GameState,
  hold: HoldState,
  inputs: readonly [InputBits, InputBits],
  fighting: boolean,
  config: MatchConfig,
): HoldTick {
  const heldIndex = heldOf(hold);
  const before = state.fighters[heldIndex];
  const t = hold.frame;
  const clinch = t < GRAB_TECH_FRAMES;
  // The holder's choice waits through the clinch and through a move under way: L or ← + H
  // pressed early in a knee plays when the knee ends, not lost to the buffer's 6 ticks.
  const holderBefore = state.fighters[hold.holder];
  const waits = clinch || holderBefore.move !== null;
  const read = readFighter(holderBefore, inputs[hold.holder], !waits, before.x);
  const victim = readInput(before, inputs[heldIndex], true, read.x);

  // Time out: the hold breaks like a tech, without damage (§4.2).
  if (!fighting) return broken(hold, read, victim, null);
  if (clinch && hold.techable && victim.bufferedCommand === 'grab') {
    return broken(hold, read, victim, holdContact(hold, 'tech', read, victim, 0, config));
  }

  const limit = struggled(hold, before.input, victim.input);
  const holderTemplate = config.fighters[hold.holder];
  const holder = holderTick(read, holderTemplate, t, limit);
  const move = holder.move ? holderTemplate.moves[holder.move] : null;
  const behind = move?.sideSwitchFrame !== undefined && holder.actionFrame >= move.sideSwitchFrame;
  const back = holder.facing === 1 ? -1 : 1;
  const side = behind ? back : holder.facing;
  const [placedHolder, placedHeld] = placeHeld(
    hold,
    holder,
    nextFrame(victim),
    side,
    state.cameraX,
    config,
  );
  const next: HoldState = { ...hold, frame: t + 1, limit };

  if (!move || holder.actionFrame !== move.startup) {
    return { fighters: pairOf(hold, placedHolder, placedHeld), hold: next, ...QUIET };
  }
  return lands(next, move, placedHolder, placedHeld, config);
}

/**
 * `readInput`, except for the holder: a jump or a dash has no move in the hold (§2.8), so
 * pressed after a choice (the touch stick slipping to ↖ on ← + H) it must not erase the choice
 * kept for the clinch's end (§4.1). The choice ages as if nothing were pressed; a new L, H, S or
 * PRISE still replaces it. Used in the freeze too, where the buffer does not age.
 */
export function readFighter(
  fighter: FighterState,
  rawInput: InputBits,
  ageBuffer: boolean,
  opponentX: number,
): FighterState {
  const read = readInput(fighter, rawInput, ageBuffer, opponentX);
  const kept = fighter.bufferedCommand;
  const stray = read.bufferedCommand !== null && !isHoldChoice(read.bufferedCommand);
  if (fighter.action !== 'holding' || !stray || !isHoldChoice(kept)) return read;
  const bufferFrames = agedBuffer(fighter, ageBuffer);
  return {
    ...read,
    bufferedCommand: bufferFrames > 0 ? kept : null,
    bufferFrames,
    bufferedInput: fighter.bufferedInput,
    bufferedMotion: fighter.bufferedMotion,
    bufferedFacing: fighter.bufferedFacing,
  };
}

/**
 * The held fighter pressed buttons during the hitstop: each counts as it would have, once out
 * of the clinch (§14.3), and the hold's ring jumps at once.
 */
export function struggleInHitstop(
  hold: HoldState,
  before: readonly [FighterState, FighterState],
  after: readonly [FighterState, FighterState],
): HoldState {
  const held = heldOf(hold);
  const limit = struggled(hold, before[held].input, after[held].input);
  return limit === hold.limit ? hold : { ...hold, limit };
}

/** The limit after the held fighter's input of this tick: one press, three ticks less (§4.2). */
function struggled(hold: HoldState, before: InputBits, after: InputBits): number {
  const pressed = (after & ~before & STRUGGLE_BUTTONS) !== 0;
  if (!pressed || hold.frame < GRAB_TECH_FRAMES) return hold.limit;
  return Math.max(HOLD_MIN_FRAMES, hold.limit - STRUGGLE_FRAMES);
}

/**
 * The holder's tick: its move goes on, or, free (on the tick a move ends too), it plays its
 * choice once the clinch is over: a pummel only if it ends by the limit, a throw anytime, and
 * the throw forward when the limit is reached without one (§4.2). A move started goes to its end.
 */
function holderTick(
  holder: FighterState,
  template: FighterTemplate,
  t: number,
  limit: number,
): FighterState {
  const current = holder.move ? template.moves[holder.move] : null;
  if (current && holder.actionFrame + 1 < moveDuration(current)) return nextFrame(holder);
  const free = current ? { ...enter(holder, 'holding'), move: null } : nextFrame(holder);
  if (t < GRAB_TECH_FRAMES) return free;

  const command = holder.bufferedCommand;
  const chosen = command ? holdMove(command, holder.bufferedInput, holder.bufferedFacing) : null;
  const fits = chosen !== 'pummel' || t + moveDuration(template.moves.pummel) <= limit;
  if (chosen && fits) return startAttack(free, 'holding', chosen);
  return t >= limit ? startAttack(free, 'holding', 'throwForward') : free;
}

/**
 * The holder's move lands on its startup frame: a pummel hurts the held fighter, who reels
 * again (the `held` loop starts over on the impact); a throw lets it go, flying, and the hold
 * is over. Fixed damage, no scaling; it counts in the combo. A KO ends the hold too, the
 * holder finishing its move as a plain attack.
 */
function lands(
  hold: HoldState,
  move: MoveData,
  holder: FighterState,
  held: FighterState,
  config: MatchConfig,
): HoldTick {
  const health = Math.max(config.training ? 1 : 0, held.health - move.damage);
  const hurt: FighterState = {
    ...held,
    health,
    actionFrame: 0,
    comboCount: held.comboCount + 1,
  };
  const thrown = move.knockdown !== undefined;
  const kind = thrown ? 'throw' : 'pummel';
  const contact = holdContact(hold, kind, holder, hurt, held.health - health, config);
  if (!thrown && health > 0) {
    const pummeled = { ...hold, pummels: hold.pummels + 1 };
    return {
      fighters: pairOf(hold, holder, hurt),
      hold: pummeled,
      contacts: [contact],
      hitstop: move.hitstop,
    };
  }
  const away = sideOf(holder, held.x);
  const flight = move.knockdown;
  const victim: FighterState = {
    ...hurt,
    action: health === 0 ? 'ko' : 'airHit',
    vx: flight ? signed(away, flight.vx) : 0,
    vy: flight?.vy ?? 0,
  };
  const free: FighterState = { ...holder, action: 'attack' };
  return {
    fighters: pairOf(hold, free, victim),
    hold: null,
    contacts: [contact],
    hitstop: move.hitstop,
  };
}

/** The pair breaks apart, both reeling (a tech, or the round's end). */
function broken(
  hold: HoldState,
  holder: FighterState,
  held: FighterState,
  contact: Contact | null,
): HoldTick {
  return {
    fighters: pairOf(hold, techGrab(holder, held.x), techGrab(held, holder.x)),
    hold: null,
    contacts: contact ? [contact] : EMPTY_CONTACTS,
    hitstop: 0,
  };
}
