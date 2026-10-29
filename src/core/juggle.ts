import type { Knockdown, MoveData } from './move-data';
import { signed } from './numbers';
import {
  AIR_HIT_LIFT,
  COMBO_LIMIT,
  COMBO_LIMIT_LIFT,
  JUGGLE_CARRY,
  JUGGLE_LIFT_MIN,
  JUGGLE_LIFT_PER_POINT,
  REBOND_DOWN,
  VRILLE_CARRY,
  VRILLE_LIFT,
  VRILLE_POINTS,
} from './rules';
import { FLAG_BOUNCE, FLAG_EXTENDED, FLAG_LIMIT, type FighterState } from './state';

/**
 * The juggle with points (docs/combos-v3.md §1.5, §1.7): a launcher gives the body it sends up
 * a few points, each blow in the air spends its cost and lifts it less as they run out, the
 * extender (once a combo) gives it a second wind, and the combo's limit floors it for good.
 */

/** How a blow that hit sends the defender: speeds, points left, its combo marks. */
export interface Flight {
  /** Up (> 0), slammed down (< 0, the Rebond), or 0: it stays on its feet, in hitstun. */
  readonly vy: number;
  readonly vx: number;
  readonly juggle: number;
  readonly flags: number;
}

/**
 * Whether a body sent flying can take a blow costing `cost` points: only while it has them, or,
 * for a blow that costs none (the super's), while it is in the combo; never slammed down into
 * its bounce nor past the combo's limit, until it lands.
 */
export function isJuggled(fighter: FighterState, cost: number): boolean {
  if (fighter.action !== 'airHit') return false;
  if ((fighter.flags & (FLAG_LIMIT | FLAG_BOUNCE)) !== 0) return false;
  return cost === 0 ? fighter.comboCount > 0 : fighter.juggle >= cost;
}

/**
 * Where a blow that hit sends the defender (`away` from the attacker): a juggled body as its
 * points say; one on the ground or in a jump by the blow's `launch` (a launcher gives its points
 * there), lifted a little if it was in the air, or left on its feet sliding at `slide`. The blow
 * that brings the combo to COMBO_LIMIT floors it, and nothing touches it until it lands.
 */
export function flightOf(
  defender: FighterState,
  move: MoveData,
  launch: Knockdown | undefined,
  slide: number,
  away: -1 | 1,
  comboCount: number,
): Flight {
  const flight =
    defender.action === 'airHit'
      ? juggleHit(defender, move, away)
      : {
          vy: launch?.vy ?? (defender.y > 0 ? AIR_HIT_LIFT : 0),
          vx: signed(away, launch?.vx ?? slide),
          juggle: launch?.juggle ?? 0,
          flags: defender.flags,
        };
  if (comboCount < COMBO_LIMIT) return flight;
  return {
    vy: Math.max(flight.vy, COMBO_LIMIT_LIFT),
    vx: flight.vx,
    juggle: 0,
    flags: (flight.flags | FLAG_LIMIT) & ~FLAG_BOUNCE,
  };
}

/**
 * A blow on a juggled body spends its cost. The extender, once a combo, slams it down to bounce
 * (the Rebond: `airborne` bounces it on the floor) or spins it up and away (the Vrille), with
 * more points; a blow that floors without launching (a finisher, a sweep, the Uppercut) ends the
 * juggle in its own flight; any other blow pops it up, less as the points run out, and carries
 * it on slowly. A launcher on a body already in the air gives no point: it only lifts it.
 */
function juggleHit(defender: FighterState, move: MoveData, away: -1 | 1): Flight {
  const left = Math.max(0, defender.juggle - (move.juggleCost ?? 1));
  const { flags } = defender;
  if (move.extender && (flags & FLAG_EXTENDED) === 0) {
    const extended = flags | FLAG_EXTENDED;
    return move.extender === 'rebond'
      ? { vy: -REBOND_DOWN, vx: 0, juggle: left, flags: extended | FLAG_BOUNCE }
      : {
          vy: VRILLE_LIFT,
          vx: signed(away, VRILLE_CARRY),
          juggle: left + VRILLE_POINTS,
          flags: extended,
        };
  }
  const floors = move.knockdown;
  if (floors && floors.juggle === undefined) {
    return { vy: floors.vy, vx: signed(away, floors.vx), juggle: 0, flags };
  }
  const vy = Math.min(AIR_HIT_LIFT, JUGGLE_LIFT_MIN + JUGGLE_LIFT_PER_POINT * left);
  return { vy, vx: signed(away, JUGGLE_CARRY), juggle: left, flags };
}
