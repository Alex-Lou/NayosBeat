import { px, TICK_RATE } from './constants';

/** Match rules shared by every character. Durations in ticks. */

export const ROUND_TIME = 99 * TICK_RATE;
export const ROUNDS_TO_WIN = 2;

export const INTRO_FRAMES = 90;
export const ROUND_END_FRAMES = 150;
export const MATCH_END_FRAMES = 240;

/** An attack pressed while busy is remembered this long, then started as soon as possible. */
export const INPUT_BUFFER_FRAMES = 5;

/** Slowdown applied each tick to the slide of a fighter in hit or block stun. */
export const PUSHBACK_FRICTION = px(0.25);

/** Upward speed given to a fighter hit in the air. */
export const AIR_HIT_LIFT = px(3);
