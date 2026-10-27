import { at, GUARD, planted, type Effect, type Foot, type Pose } from './common.ts';

/**
 * hitHigh (docs/combat-v2.md §9.4, §11.1; with hitMid and hitLow, replaces the standing hit):
 * 5 frames. A hit above 60 % of his height: the head snapped back. Heavy hits (hitstun 18 and
 * more) play frames 0-4, light ones 0, 1 and 4; the last frame holds to the end of the stun,
 * then the guard takes over: it leads back to the guard.
 *
 * A whiplash, the head leading and the body following. Frame 0, held through the hitstop, is
 * the snap: the chin flung up, the chest arched back after it over hips that stay put, the
 * guard knocked up and open, hands open, the lead toes popping up as the weight slams onto the
 * rear heel. Frame 1 rebounds: the chest swings back past the hips while the head still lags
 * behind it, the rear arm trailing long behind him, the lead one hanging limp in front, the
 * knees soak it up and the feet skid under the pushback. Heavy hits get two more beats: the
 * head overshoots, the chin dropping (past 20 degrees: the head is turned) as the body sags on
 * loose arms (2), then he gathers himself, the gloves climbing (3). Frame 4, held, is the shaken high
 * guard: hunched behind gloves held higher than usual, eyes squeezed shut, the jaw clenched, one
 * small step from the guard. Every beat moves away from the opponent, never into him.
 */

/** Dust kicked up by a foot sliding back under the blow. */
export function skid(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

/** How far the toes reach past the ankle, foot at `degrees`. */
function toes(degrees: number): number {
  const a = (degrees * Math.PI) / 180;
  return 2.3 * Math.sin(a) + 7 * Math.cos(a);
}

/** How far the heel sits behind the ankle, foot at `degrees`. */
function heel(degrees: number): number {
  const a = (degrees * Math.PI) / 180;
  return 2.6 * Math.cos(a) - 2.3 * Math.sin(a);
}

/** `foot` turned to `angle` around its toes (the ball of the foot stays put). */
export function onToes(foot: Foot, angle: number): Foot {
  return planted(foot.x + toes(foot.angle ?? 0) - toes(angle), angle);
}

/** `foot` turned to `angle` around its heel (the toes peel up, the heel stays put). */
export function onHeel(foot: Foot, angle: number): Foot {
  return planted(foot.x - heel(foot.angle ?? 0) + heel(angle), angle);
}

/** Held through the hitstop: the chin flung up, the guard knocked up and wide open. */
const SNAP: Pose = {
  hip: at(-5.4, 36.7),
  torso: -10,
  head: -21,
  shrug: 0,
  twist: 0.4,
  nearFoot: onHeel(GUARD.nearFoot, 13),
  farFoot: onToes(GUARD.farFoot, -3),
  nearFist: at(6, 51.5),
  farFist: at(-28, 62),
  bends: { nearElbow: 'down', farElbow: 'down' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

/**
 * The rebound: the chest swings back past the hips, the head still thrown back on it (it drags
 * behind), the knees giving. The arms follow through from where the blow flung them: the rear
 * one trails long and low behind the back, the elbow behind the shoulder; the lead one hangs
 * limp in front.
 */
const REBOUND: Pose = {
  hip: at(-7.6, 34.8),
  torso: 9,
  head: -30,
  shrug: 0.4,
  twist: 0.25,
  nearFoot: onHeel(GUARD.nearFoot, 4),
  farFoot: onToes(GUARD.farFoot, -7),
  nearFist: at(5.5, 46),
  farFist: at(-20, 40),
  bends: { nearElbow: 'down', farElbow: 'back' },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [skid(14.5, 2.6, 0.45), skid(-17, 1.8, 0.4)],
};

/** Heavy hits: the head overshoots, the chin dropping forward, the body sags on loose arms. */
const SAG: Pose = {
  hip: at(-8.4, 33.5),
  torso: 18,
  head: 5,
  shrug: 1.6,
  twist: 0.1,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(GUARD.farFoot, -9),
  nearFist: at(4, 42.5),
  farFist: at(-6.5, 43),
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [skid(15, 2.4, 0.8), skid(-17.5, 1.7, 0.75)],
};

/** Gathering himself: the knees come back up, the gloves climb, closing. */
const GATHER: Pose = {
  hip: at(-7.6, 34.6),
  torso: 15,
  head: 3,
  shrug: 2.4,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(GUARD.farFoot, -12),
  nearFist: at(7, 51),
  farFist: at(7.8, 58.8),
  face: 'hurt',
};

/**
 * The shaken high guard, held while the hitstun lasts: hunched, the shoulders up, the gloves a
 * touch higher than usual over the jaw he just took it on, eyes squeezed shut.
 */
const SHAKEN: Pose = {
  hip: at(-7.1, 35.5),
  torso: 16,
  head: 2.5,
  shrug: 3.2,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(GUARD.farFoot, -13),
  nearFist: at(8.3, 55.8),
  farFist: at(9.5, 63.8),
  face: 'hurt',
};

export const POSES: readonly Pose[] = [SNAP, REBOUND, SAG, GATHER, SHAKEN];
