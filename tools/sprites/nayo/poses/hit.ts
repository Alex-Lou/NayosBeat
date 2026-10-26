import { at, planted, type Effect, type Foot, type Pose } from './common.ts';

/**
 * hit: 7 frames. Standing 0-3 (3, 4, 4 ticks, then held while the hitstun lasts), crouching 4-6
 * (3, 4, then held). The snap is held through the hitstop, so it carries the whole reaction:
 * the head whips back, the arms fly loose, hands open. Then a decaying settle: the body
 * rebounds a little past upright while the knees soak up the blow and the feet skid back, the
 * fists come back up, and he gathers himself into a shaken guard, jaw set. Every beat moves
 * away from the opponent, never into him.
 */

/** Dust kicked up by the feet sliding back under the blow. */
function skid(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

// Standing: the head snaps back, rebounds, recovers, then holds a shaken guard.

const SNAP: Pose = {
  hip: at(-5.6, 36.4),
  torso: -17,
  head: -18,
  shrug: 0,
  twist: 0.4,
  nearFoot: planted(5.6, 6),
  farFoot: planted(-13.5),
  nearFist: at(9, 44),
  farFist: at(-25, 63),
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

/** The rebound: a little past upright, knees soaking it up, the fists coming back up. */
const REBOUND: Pose = {
  hip: at(-8, 33.8),
  torso: 5,
  head: 12,
  shrug: 2,
  twist: 0.1,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5),
  nearFist: at(5, 43),
  farFist: at(2, 56),
  nearHand: 'open',
  face: 'hurt',
  effects: [skid(12.5, 2.6, 0.5), skid(-16, 1.6, 0.45)],
};

/** Gathering himself: eyes open again, the guard nearly back. */
const RECOVER: Pose = {
  hip: at(-6.5, 35.4),
  torso: 2,
  head: 10,
  shrug: 2.6,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5),
  nearFist: at(6, 43),
  farFist: at(5, 58),
  face: 'effort',
  effects: [skid(13, 2.4, 0.85)],
};

/** The shaken guard, held while the hitstun lasts: one step from GUARD. */
const SHAKEN: Pose = {
  hip: at(-4.4, 36.8),
  torso: 0,
  head: 11,
  shrug: 3,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5),
  nearFist: at(6.8, 42.6),
  farFist: at(6.2, 59),
  face: 'effort',
};

// Crouching: same beats, low, from the crouch's shell (same feet, the rear heel up).

/** A foot on its toes, heel raised by `angle` (negative) around the toe of a flat foot at `x`. */
function onToes(x: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return { ...planted(x, angle), x: x + 7 - 2.3 * Math.sin(a) - 7 * Math.cos(a) };
}

const LOW = { nearFoot: planted(5.6), farFoot: onToes(-13.5, -30) } as const;

const LOW_SNAP: Pose = {
  ...LOW,
  hip: at(-11.5, 15.4),
  torso: -2,
  head: -16,
  shrug: 0,
  twist: 0.4,
  nearFoot: planted(5.6, 4),
  nearFist: at(6, 30),
  farFist: at(-24, 44),
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

const LOW_REBOUND: Pose = {
  ...LOW,
  hip: at(-12, 14.6),
  torso: 26,
  head: 4,
  shrug: 2.5,
  twist: 0.1,
  nearFist: at(6, 30),
  farFist: at(5, 37),
  nearHand: 'open',
  face: 'hurt',
  effects: [skid(12.5, 2.6, 0.5)],
};

const LOW_SHAKEN: Pose = {
  ...LOW,
  hip: at(-10.8, 15),
  torso: 22,
  head: 0,
  shrug: 3,
  nearFist: at(9.5, 31.5),
  farFist: at(9.5, 40),
  face: 'effort',
};

/** hit: standing 0-3 (snap, rebound, recover, held), crouching 4-6 (snap, rebound, held). */
export const POSES: readonly Pose[] = [
  SNAP,
  REBOUND,
  RECOVER,
  SHAKEN,
  LOW_SNAP,
  LOW_REBOUND,
  LOW_SHAKEN,
];
