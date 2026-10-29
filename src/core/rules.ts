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

/** Upward speed given to a fighter hit in the air (the most a juggled blow lifts, too). */
export const AIR_HIT_LIFT = px(3);

/**
 * The juggle (docs/combos-v3.md §1.5): a launcher gives the body 1 to JUGGLE_POINTS_MAX points,
 * each blow in the air spends its cost, and lifts the body less as they run out (JUGGLE_LIFT_MIN
 * plus JUGGLE_LIFT_PER_POINT per point left, AIR_HIT_LIFT at most), carried on slowly
 * (JUGGLE_CARRY): the juggle dies out by itself.
 */
export const JUGGLE_POINTS_MAX = 5;
export const JUGGLE_LIFT_MIN = px(1.5);
export const JUGGLE_LIFT_PER_POINT = px(0.5);
export const JUGGLE_CARRY = px(0.5);

/**
 * The extenders, once a combo, on a juggled body. Nayo's Rebond: slammed down at REBOND_DOWN,
 * untouchable as it falls, it bounces back up at BOUNCE_LIFT with BOUNCE_POINTS more. Riff's
 * Vrille: spun up and away, VRILLE_POINTS more. The blow that sets one off freezes the game
 * EXTENDER_HITSTOP ticks longer: the combo's second wind.
 */
export const REBOND_DOWN = px(5);
export const BOUNCE_LIFT = px(6);
export const BOUNCE_POINTS = 2;
export const VRILLE_LIFT = px(5);
export const VRILLE_CARRY = px(1);
export const VRILLE_POINTS = 2;
export const EXTENDER_HITSTOP = 4;

/**
 * The phrase runs out of breath (docs/combos-v3.md §1.7): from the DECAY_FROM-th hit of a combo
 * on, each blow on the ground stuns DECAY_STEP ticks less than the one before, so a loop of
 * links lets go before the limit.
 */
export const DECAY_FROM = 8;
export const DECAY_STEP = 2;

/**
 * The hard cap (docs/combos-v3.md §1.7, §1.13): the blow that brings a combo to COMBO_LIMIT
 * floors, lifting the body COMBO_LIMIT_LIFT at least, and nothing touches it until it lands.
 */
export const COMBO_LIMIT = 12;
export const COMBO_LIMIT_LIFT = px(3);

/** The longest path of strings from a move (docs/combos-v3.md §1.4): a string always ends. */
export const MAX_BRANCH_DEPTH = 5;

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

/**
 * A blow on a fighter attacking (CONTRE) or recovering (PUNITION) hurts this much more, stuns
 * longer (unless it knocks down) and freezes the game longer: reading the opponent pays, and
 * only a combo's first hit can be one (the rest land on a fighter in hitstun).
 */
export const COUNTER_DAMAGE_PERCENT = 20;
export const COUNTER_HITSTUN = 4;
export const COUNTER_HITSTOP = 3;

/** A special blocked still takes this share of its damage (the chip), never the last point. */
export const SPECIAL_CHIP_PERCENT = 15;

/** A hitstun this long plays the whole reaction; a shorter one, its quick version. */
export const HEAVY_REACTION_HITSTUN = 18;

/**
 * A tech (both players grabbing on the same tick, or the held one breaking free): nobody is
 * thrown, both are pushed apart at this speed and reel for THROW_TECH_STUN ticks (the `tech`
 * strip).
 */
export const THROW_TECH_PUSHBACK = px(4);
export const THROW_TECH_STUN = 14;

/** The freeze when a grab catches (docs/combat-v2.md §4.1): the victim's phone vibrates. */
export const GRAB_HITSTOP = 6;
/**
 * The clinch: on the first ticks of a hold (200 ms), the held player breaks free with the grab
 * button; the holder's choice waits for the end of it.
 */
export const GRAB_TECH_FRAMES = 12;
/** How long a hold lasts at most, then the holder throws forward if it chose nothing. */
export const HOLD_LIMIT_FRAMES = 56;
/** Struggling shortens the hold down to this: a throw chosen at once is never cut short. */
export const HOLD_MIN_FRAMES = 36;
/** Each button the held player presses after the clinch takes this off the hold's limit. */
export const STRUGGLE_FRAMES = 3;

/** Training mode: health refills once the dummy has been left alone this long. */
export const TRAINING_REFILL_FRAMES = 60;
