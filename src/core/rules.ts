import { px, TICK_RATE } from './constants';

/** Match rules shared by every character. Durations in ticks. */

export const ROUND_TIME = 99 * TICK_RATE;
export const ROUNDS_TO_WIN = 2;

export const INTRO_FRAMES = 90;
export const ROUND_END_FRAMES = 150;
/** Delay before the results screen, so the final KO can be seen. */
export const MATCH_END_FRAMES = 120;

/**
 * A command pressed while busy (an attack, a grab, a dash, a jump) is remembered this long, then
 * carried out on the first tick the fighter is free: 100 ms, which absorbs the touch latency.
 */
export const INPUT_BUFFER_FRAMES = 6;

/** The second tap of a double tap must come this many ticks after the first, at most. */
export const DASH_TAP_WINDOW = 12;

/** Share of its speed a dash hands over to the move it is cancelled into (Riff's momentum). */
export const DASH_MOMENTUM_PERCENT = 50;

/** Ticks a fighter cannot be grabbed once out of any stun: no unescapable grab loops. */
export const THROW_PROTECTION_FRAMES = 4;

/** An attack threatens from this far beyond its reach: the proximity guard stops the retreat. */
export const THREAT_MARGIN = px(24);
/** A projectile heading for a fighter threatens it from this close. */
export const PROJECTILE_THREAT_RANGE = px(96);

/**
 * Gravity of everyone sent flying (hit in the air, knocked out, thrown), whoever they are: the
 * advantage of a knockdown depends on the blow alone, not on the victim's jump.
 */
export const HIT_GRAVITY = px(0.5);

/**
 * Slowdown applied each tick to the slide of a fighter in hit or block stun, and to the momentum
 * a cancelled dash hands over (one rule for every slide).
 */
export const PUSHBACK_FRICTION = px(0.25);

/** Upward speed given to a fighter hit in the air. */
export const AIR_HIT_LIFT = px(3);

/** Ticks of input history kept to recognize motions. */
export const DIRECTION_HISTORY_FRAMES = 16;

/**
 * A motion (↓↘→, →↓↘) counts when it is fresh: performed within the last MOTION_SPAN_FRAMES
 * ticks, its last step entered (not merely held) within the last MOTION_END_FRAMES. A thumb
 * sliding from the crouch into a walk does not throw a special a moment later.
 */
export const MOTION_SPAN_FRAMES = 12;
export const MOTION_END_FRAMES = 6;

/** A normal can still turn into a throw this long after it started (light + heavy pressed late). */
export const THROW_CONVERSION_FRAMES = 3;

/** Damage of each extra hit in a combo drops by this percentage, down to the floor below. */
export const COMBO_SCALING_STEP = 10;
export const COMBO_SCALING_FLOOR = 50;

/** Separation speed when both players throw each other on the same tick. */
export const THROW_TECH_PUSHBACK = px(4);
export const THROW_TECH_STUN = 12;

/** Training mode: health refills once the dummy has been left alone this long. */
export const TRAINING_REFILL_FRAMES = 60;
