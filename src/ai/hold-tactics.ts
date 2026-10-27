import type { MatchConfig } from '../core/config';
import { px } from '../core/constants';
import { Input, type InputBits } from '../core/input';
import { moveDuration, moveOf } from '../core/moves';
import { wallsAt } from '../core/positions';
import { GRAB_TECH_FRAMES } from '../core/rules';
import type { FighterState, GameState, HoldState } from '../core/state';
import { nextRandom } from './rng';

/** What the CPU does in a hold, by level (docs/combat-v2.md §13.1). */
export interface HoldProfile {
  /** Ticks between something happening and the CPU reacting to it. */
  readonly reactionFrames: number;
  /** Chance to break free of a grab, pressed `min(reaction, 11)` ticks into the clinch. */
  readonly tech: number;
  /** Presses per second once held past the clinch, to be let go sooner. */
  readonly struggle: number;
  /** Pummels wanted before the throw (Infinity: as many as fit). */
  readonly pummels: number;
}

/** Its back this close to a wall (px), the CPU throws backward: the opponent goes in the corner. */
const CORNER_RANGE = px(60);
const TICKS_PER_SECOND = 60;

/**
 * The CPU's input while `player` is in the hold (§13.2), from its own state only, which is fair:
 * held, it tries the tech once, on its reaction tick in the clinch, by chance, then struggles at
 * its pace; holding, it pummels as its profile wants (and to finish a fighter a knee would KO)
 * while a pummel ends by the limit, then throws: forward when that knocks out, backward with its
 * own back to a wall, forward otherwise. A button is pressed only after a tick without it, so
 * every press is a new one. Pure: same state and seed, same input.
 */
export function holdInput(
  player: 0 | 1,
  profile: HoldProfile,
  state: GameState,
  hold: HoldState,
  config: MatchConfig,
  seed: number,
): { input: InputBits; seed: number } {
  const me = state.fighters[player];
  if (hold.holder !== player) return heldInput(me, profile, hold, seed);
  return { input: press(me, holderChoice(player, state, hold, config, profile)), seed };
}

function heldInput(
  me: FighterState,
  profile: HoldProfile,
  hold: HoldState,
  seed: number,
): { input: InputBits; seed: number } {
  const techTick = Math.min(profile.reactionFrames, GRAB_TECH_FRAMES - 1);
  if (hold.frame === techTick && hold.techable) {
    const [value, next] = nextRandom(seed);
    return { input: value < profile.tech ? press(me, Input.Grab) : 0, seed: next };
  }
  if (hold.frame < GRAB_TECH_FRAMES || profile.struggle <= 0) return { input: 0, seed };
  const period = Math.max(2, Math.round(TICKS_PER_SECOND / profile.struggle));
  const mash = (hold.frame - GRAB_TECH_FRAMES) % period === 0;
  return { input: mash ? press(me, Input.Light) : 0, seed };
}

/** The holder's buttons for its next move, or 0 while it waits (its move plays on). */
function holderChoice(
  player: 0 | 1,
  state: GameState,
  hold: HoldState,
  config: MatchConfig,
  profile: HoldProfile,
): InputBits {
  const me = state.fighters[player];
  const victim = state.fighters[player === 0 ? 1 : 0];
  const { moves } = config.fighters[player];
  const current = me.move ? moveOf(config.fighters[player], me.move) : null;
  // Free on the next tick: the choice is buffered, a press in the clinch kept for its end.
  if (current && me.actionFrame + 2 < moveDuration(current)) return 0;
  if (hold.frame < GRAB_TECH_FRAMES - 1) return 0;

  const start = Math.max(hold.frame + 1, GRAB_TECH_FRAMES);
  const fits = start + moveDuration(moves.pummel) <= hold.limit;
  const wanted = hold.pummels < profile.pummels || victim.health <= moves.pummel.damage;
  if (fits && wanted) return Input.Light;
  if (victim.health <= moves.throwForward.damage) return Input.Heavy;
  const walls = wallsAt(state.cameraX, config.stage);
  const wall = me.facing === 1 ? walls.min : walls.max;
  const back = me.facing === 1 ? Input.Left : Input.Right;
  return Math.abs(me.x - wall) < CORNER_RANGE ? back | Input.Heavy : Input.Heavy;
}

/** `buttons`, unless they were held on the last tick: let go first, so the next press counts. */
function press(me: FighterState, buttons: InputBits): InputBits {
  const pressed = buttons & ~(Input.Left | Input.Right);
  return (me.input & pressed) !== 0 ? 0 : buttons;
}
