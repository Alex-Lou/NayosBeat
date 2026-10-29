/** Frame data of the moves, passed to the simulation. Distances in sub-pixels, durations in ticks. */

import type { Box } from './config';

/** Every move a fighter must define: validation checks them all. */
export const CORE_MOVE_IDS = [
  'standLight',
  'standHeavy',
  'crouchLight',
  'crouchHeavy',
  'jumpLight',
  'jumpHeavy',
  'special',
  'specialForward',
  'specialAntiAir',
  'grab',
  'pummel',
  'throwForward',
  'throwBack',
  'dashForward',
  'dashBack',
] as const;

/**
 * Moves a fighter may leave out (docs/combat-v2.md §2.8): the command that asks for one gives
 * the standing normal instead (`groundMove`), and a string (`branches`) only leads to the ones it
 * has; BOOST gives nothing without its move. Nayo defines them all, Riff all but the Double
 * direct.
 */
export const OPTIONAL_MOVE_IDS = [
  'forwardLight',
  'forwardHeavy',
  'backHeavy',
  'chainLight',
  'lightFinisher',
  // The strings of combos v3 (docs/combos-v3.md §2.4, §4): reached only through a branch.
  'jabRepeat',
  'chainHeavy',
  'chainHigh',
  'chainLaunch',
  // The Boost layer (docs/combos-v3.md §1.8): the Rewind, the three Remixes, the super.
  'boostCancel',
  'specialBoost',
  'specialForwardBoost',
  'specialAntiAirBoost',
  'super',
] as const;

/** Every move a fighter can have, required or not. */
export const MOVE_IDS = [...CORE_MOVE_IDS, ...OPTIONAL_MOVE_IDS] as const;

export type CoreMoveId = (typeof CORE_MOVE_IDS)[number];
export type OptionalMoveId = (typeof OPTIONAL_MOVE_IDS)[number];
export type MoveId = CoreMoveId | OptionalMoveId;

/**
 * The normals, one bit each in the phrase (docs/combos-v3.md §1.2): a cancel never enters a
 * normal the phrase already played. Every normal of the cast is here (validation), 31 at most.
 */
export const PHRASE_MOVE_IDS = [
  'standLight',
  'standHeavy',
  'crouchLight',
  'crouchHeavy',
  'jumpLight',
  'jumpHeavy',
  'forwardLight',
  'forwardHeavy',
  'backHeavy',
  'chainLight',
  'lightFinisher',
  'jabRepeat',
  'chainHeavy',
  'chainHigh',
  'chainLaunch',
] as const satisfies readonly MoveId[];

/** The beat, the two lights: a phrase may play each of them twice. */
export const PHRASE_TWICE_IDS = ['standLight', 'crouchLight'] as const satisfies readonly MoveId[];

/** Moves performed in the air (a projectile there would never be fired). */
export const AIR_MOVE_IDS: readonly MoveId[] = ['jumpLight', 'jumpHeavy'];

/**
 * Decides what a move can cancel into, and how it is blocked (grabs cannot be). A `movement`
 * (dash, backdash, the Rewind) carries the fighter and never strikes: the CPU does not guard
 * against it, and a fighter hit during one is not caught attacking. A `throw` is played on a
 * held opponent (`hold.ts`): no hitbox, it lands on its startup frame, whatever the boxes say.
 */
export type MoveKind = 'normal' | 'special' | 'grab' | 'throw' | 'movement';

/** The moves of kind `movement`, and only they. */
export const MOVEMENT_MOVE_IDS: readonly MoveId[] = ['dashForward', 'dashBack', 'boostCancel'];

/** Each Remix (docs/combos-v3.md §1.8.3) and the special whose strip and timing it keeps. */
export const REMIX_OF = {
  specialBoost: 'special',
  specialForwardBoost: 'specialForward',
  specialAntiAirBoost: 'specialAntiAir',
} as const satisfies Partial<Record<MoveId, MoveId>>;

/** The moves of kind `throw`, and only they: what the holder does with the opponent it holds. */
export const THROW_MOVE_IDS: readonly MoveId[] = ['pummel', 'throwForward', 'throwBack'];

/** How a move must be blocked: low = crouching, overhead = standing, mid = either. */
export type Guard = 'mid' | 'low' | 'overhead';

/** A range of action frames: `from` included, `to` excluded. */
export interface FrameRange {
  readonly from: number;
  readonly to: number;
}

export interface ProjectileData {
  /** Horizontal speed, in sub-pixels per tick. */
  readonly speed: number;
  /** Spawn distance in front of the fighter. */
  readonly spawnX: number;
  /** Relative to the projectile's position (a point on the ground line). */
  readonly hitbox: Box;
}

/**
 * How a move carries the fighter: `dx[f]` is the forward movement on action frame `f`, one
 * entry per frame of the move, and `y[f]`, when given, the height of its feet on that frame
 * (a leap that really leaves the ground, back on it on the last frame). Data, not code, so
 * every way of moving shares one mechanism.
 */
export interface RootMotion {
  readonly dx: readonly number[];
  readonly y?: readonly number[];
}

/** Where the fighter can be hit during `frames` of a move, instead of its posture's boxes. */
export interface MoveHurtbox {
  readonly frames: FrameRange;
  readonly boxes: readonly Box[];
}

/**
 * How a blow sends the defender flying, even from the ground: launched at `vy`, carried at `vx`
 * (away from the attacker, sub-pixels per tick) until it lands, then down for its knockdown.
 */
export interface Knockdown {
  readonly vx: number;
  readonly vy: number;
  /** Swept off the legs (sweeps, the Glissade): the defender falls on its back. */
  readonly trip?: boolean;
  /**
   * A launcher: the juggle points the defender gets, sent up from the ground or caught in a
   * jump (docs/combos-v3.md §1.5). Each blow in the air then spends its `juggleCost`.
   */
  readonly juggle?: number;
}

/** The direction a branch asks for, read relative to the side faced when the button was pressed. */
export type BranchDir = 'neutral' | 'forward' | 'back' | 'down';

/**
 * A string (docs/combos-v3.md §1.4): this button, with one of these directions held (any, when
 * `dirs` is left out), during a move that hit or was blocked, gives `move`, before the command
 * table and whatever `cancelInto` says.
 */
export interface Branch {
  readonly button: 'light' | 'heavy';
  readonly dirs?: readonly BranchDir[];
  readonly move: MoveId;
}

/** What a CONTRE or a PUNITION does instead (docs/combos-v3.md §1.6), when the move says. */
export interface CounterEffect {
  /** Hitstun added, instead of COUNTER_HITSTUN. */
  readonly hitstun?: number;
  /** The slide it gives instead of `pushback` (the Crochet folds the opponent on the spot). */
  readonly pushback?: number;
  /** Its own launch (the Remontant's fifth juggle point). */
  readonly knockdown?: Knockdown;
}

/**
 * A blow of a multi-hit move after its first (the super's, docs/combos-v3.md §1.11): from `frame`
 * on, the move can land again, as `hit` says (its damage, stun, freeze, knockdown), computed once
 * with the data.
 */
export interface Pulse {
  readonly frame: number;
  readonly hit: MoveData;
}

/** The whole game freezes `ticks` long as the move reaches `frame` (docs/combos-v3.md §1.9). */
export interface Flash {
  readonly frame: number;
  readonly ticks: number;
}

/**
 * Frames during which the move cannot be hit: by anything ('all', the default: strikes,
 * projectiles, grabs), or by attacks from the air only (Riff's Genou montant, no reversal).
 */
export interface Invincibility extends FrameRange {
  readonly against?: 'all' | 'air';
}

export interface MoveData {
  /** Display name, shown in training mode. */
  readonly name: string;
  readonly kind: MoveKind;
  /** Ticks before the first active tick. */
  readonly startup: number;
  /** Ticks during which the hitbox can hit. */
  readonly active: number;
  readonly recovery: number;
  readonly damage: number;
  /** Ticks the defender cannot act after being hit (or blocking). */
  readonly hitstun: number;
  readonly blockstun: number;
  /** Ticks during which the whole game freezes on impact. */
  readonly hitstop: number;
  /** Initial slide speed given to the defender (it then slows down with friction). */
  readonly pushback: number;
  readonly guard: Guard;
  /** Strike hitbox. Absent for projectile moves (the projectile carries its own) and movements. */
  readonly hitbox?: Box;
  /** Spawned on the first active tick. */
  readonly projectile?: ProjectileData;
  /**
   * Move kinds this move can be cancelled into, once it has hit or been blocked (or from
   * `freeCancelFrom` on, without contact).
   */
  readonly cancelInto?: readonly MoveKind[];
  /** The strings it opens once it has hit or been blocked (docs/combos-v3.md §1.4). */
  readonly branches?: readonly Branch[];
  /**
   * Juggle points it spends on a juggled defender (docs/combos-v3.md §1.5): 1 by default; 0 for
   * the super's blows, which land on any body already in the combo.
   */
  readonly juggleCost?: number;
  /** Its own CONTRE (docs/combos-v3.md §1.6). */
  readonly counter?: CounterEffect;
  /**
   * Once per combo, on a juggled body: the Rebond (slammed down, it bounces back up) or the
   * Vrille (spun away up in the air), each with more juggle points (docs/combos-v3.md §1.5).
   */
  readonly extender?: 'rebond' | 'vrille';
  /**
   * The rung of the cancel ladder (docs/combos-v3.md §1.3) of a special: 2 a Remix, 3 the super;
   * a plain special (left out) is 1.
   */
  readonly tier?: 2 | 3;
  /** Boost gauge it costs, paid as it starts: a bar for a Remix or the Rewind, three the super. */
  readonly boostCost?: number;
  /** A multi-hit move's blows after the first (the super). */
  readonly pulses?: readonly Pulse[];
  /** Its freeze of the whole game (the super, the Rewind). */
  readonly flash?: Flash;
  /** Played crouching: the crouching pushbox and hurtboxes. */
  readonly crouching?: true;
  /**
   * From this action frame on, the move can be cancelled without having touched anything (Riff's
   * dash): the move cancelled into keeps part of its speed (DASH_MOMENTUM_PERCENT).
   */
  readonly freeCancelFrom?: number;
  /** Movement during the move. */
  readonly motion?: RootMotion;
  /** Replaces the posture's hurtboxes on some frames (the Glissade's body along the floor). */
  readonly hurtboxes?: readonly MoveHurtbox[];
  /** Frames during which strikes, projectiles and grabs (or attacks from the air) whiff. */
  readonly invincible?: Invincibility;
  /** Frames during which grabs whiff, strikes do not (the backdash). */
  readonly throwInvincible?: FrameRange;
  /** Sends the defender to the ground on hit, even when standing. */
  readonly knockdown?: Knockdown;
  /**
   * A throw backward: on this frame the held opponent goes over to the holder's back, before the
   * release (the arc over the shoulder is drawn, the core keeps no path).
   */
  readonly sideSwitchFrame?: number;
}
