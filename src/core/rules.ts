import { px, TICK_RATE } from './constants';

/** Match rules shared by every character. Durations in ticks. */

export const ROUND_TIME = 99 * TICK_RATE;
export const ROUNDS_TO_WIN = 2;

export const INTRO_FRAMES = 90;
export const ROUND_END_FRAMES = 150;
/** Delay before the results screen, so the final KO can be seen. */
export const MATCH_END_FRAMES = 120;

/** An attack pressed while busy is remembered this long, then started as soon as possible. */
export const INPUT_BUFFER_FRAMES = 5;

/** Slowdown applied each tick to the slide of a fighter in hit or block stun. */
export const PUSHBACK_FRICTION = px(0.25);

/** Upward speed given to a fighter hit in the air. */
export const AIR_HIT_LIFT = px(3);

/** Ticks of input history kept to recognize motions. */
export const DIRECTION_HISTORY_FRAMES = 16;

/** A motion counts if it was completed this recently, and performed within the history. */
export const MOTION_END_FRAMES = 4;

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
