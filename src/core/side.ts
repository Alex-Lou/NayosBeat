import type { Facing, FighterState } from './state';

/**
 * The side of `x` (an opponent, or where a blow comes from) as seen from the fighter. On the
 * same spot, the side faced decides, so the answer is always deterministic. Facing, guard and
 * dash all read the real side through this one rule: `facing` itself lags while the fighter is
 * airborne or busy, and the opponent may have switched sides meanwhile (a cross-up).
 */
export function sideOf(fighter: FighterState, x: number): Facing {
  if (x === fighter.x) return fighter.facing;
  return x > fighter.x ? 1 : -1;
}
