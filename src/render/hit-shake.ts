import type { FighterAction, GameState } from '../core/state';
import type { ShowContext } from './animation';
import type { ShakeMode } from './shake';

/**
 * How far the fighter struck shakes through the impact freeze, in world pixels: a light blow, or
 * a heavy one (a counter-hit, CONTRE or PUNITION, and the final blow shake as hard). A blocked
 * blow shakes the guard lightly, whatever its weight.
 */
export const HIT_SHAKE = { light: 1, heavy: 2 } as const;
/** Ticks the body stays on each side: it turns back 15 times a second. */
export const HIT_SHAKE_TICKS = 2;

/** Hit, sent flying, swept, knocked out: the actions a blow that went through leaves. */
const STRUCK: ReadonlySet<FighterAction> = new Set(['hitstun', 'airHit', 'ko']);

/**
 * The horizontal offset of `player`'s body (world pixels) while the freeze of the blow it just
 * took holds the game (docs/art/animation-plan.md §2, V1): the frame of the hit stays, the body
 * trembles under it, away from the attacker first, then back, every HIT_SHAKE_TICKS ticks of the
 * game's own clock (`frame` goes on in the freeze, docs/combat-v2.md): the same on every screen,
 * and in a replay. Only its drawing moves: not its shadow, nor its place in the game. Within the
 * player's « Tremblement de l'écran »: reduced, 1 px at most; none, still. None with the animation
 * of before, nor under a freeze that is not its blow's (a super's flash).
 */
export function hitShakeOf(
  state: GameState,
  player: 0 | 1,
  context: ShowContext,
  shake: ShakeMode,
): number {
  const blow = context.memory?.blowOn(player);
  if (!blow || context.options.legacy || shake === 'off' || state.hitstop <= 0) return 0;
  const since = state.frame - blow.frame;
  if (since < 0 || since >= blow.hitstop) return 0;
  const full = reachOf(state.fighters[player].action, blow.heavy);
  if (full === 0) return 0;
  const reach = shake === 'reduced' ? Math.min(full, 1) : full;
  const away = Math.floor(since / HIT_SHAKE_TICKS) % 2 === 0;
  return away ? reach * blow.away : -reach * blow.away;
}

/** How far a fighter in `action` shakes under a blow, `heavy` or not. */
function reachOf(action: FighterAction, heavy: boolean): number {
  if (action === 'blockstun') return HIT_SHAKE.light;
  if (!STRUCK.has(action)) return 0;
  return heavy ? HIT_SHAKE.heavy : HIT_SHAKE.light;
}
