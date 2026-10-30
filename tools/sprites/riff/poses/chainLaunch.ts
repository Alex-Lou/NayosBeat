import type { Point } from '../../raster.ts';
import { solve, type Bend, type Bends, type Effect, type Face, type Foot } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { POSES as RETOURNE } from './backHeavy.ts';
import { at, GUARD, planted, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * chainLaunch (Retourné sauté, L, L, ← + H; docs/combos-v3.md §4): her Retourné (backHeavy)
 * out of a call hop. 7 frames, 2, 2, 2, [5], 5, 5, 5 ticks (26: 6/5/15, the Retourné's own,
 * src/art/riff/clips.ts), the scorpion on frame 3 (ticks 6-10), hitbox -12..22 / 58..100 as the
 * Retourné's, reached upward. It cancels out of her Revers (chainLight) on contact, from its
 * backfist (frame 2), launches (the opponent flies to about 60 px) and ends in her GUARD. The
 * game carries her 14 px forward while the hop shows, both boots in the air (ticks 0-1, CARRY:
 * 10.5 px on average while frame 0 shows, 14 from frame 1): the poses stay anchored, the hop's
 * height drawn in the cell, and the foot she lands on is drawn where the Retourné takes off from
 * on the screen, so it stays put from the landing to the take-off, nothing carrying it.
 *
 * The call hop is the gymnast's hurdle before a round-off, done by a street punk: out of the
 * backfist she bounds forward pitched over it, the lead knee driven up in front, the rear leg
 * tucked under her and snapping up after it (a chassé, nothing like the flat skip of her
 * Revers, which is on its back with the elbow leading); the backfist's arm folds in across the
 * chest, the lead one swings back against the lead knee. She lands on the lead foot, deep, and
 * lets the rear leg swing down and back behind her, the pendulum's wind-up that whips it over
 * her head on the next frame, while both arms swing down in front. Hop, squash, stretch: the
 * bounce sells the 14 px the game carries her.
 *
 * - 0 (new, 2 ticks): the hop: both boots off the floor (the lead one 14 px up, under its knee,
 *   the rear one tucked under her seat, toes down), the hips 6.5 px over her guard's, the body
 *   pitched 37 degrees; the rear fist folded across the chest on its way down from the
 *   backfist, the lead fist pulled back to the ribs (its elbow back behind her, the forearm
 *   forward: a sprinter's back arm); a puff of dust where she pushed off.
 * - 1 (new, 2 ticks): the landing, loaded: the lead foot flat where the Retourné takes off (14 px
 *   ahead of the Revers' on the screen), the knee sunk (the hips 4 px under her guard's), the
 *   body pitched 32 degrees over it, the rear leg swung down and back off the floor, the toes
 *   pointed down, both arms swinging down in front against the pitch (the lead fist low by the
 *   knee, its elbow open, not folded shut); a bigger landing dust. The Retourné's own
 *   launch (its frame 1), taken from the air, deeper, its lead toe on the same spot.
 * - 2-6: the Retourné's frames 2 to 6 (the take-off, the scorpion, the landing, the settle,
 *   the guard), with their effects.
 *
 * The fringe and the chain are springs, at rest when a strip starts (sheet.ts): they lift as she
 * drops onto the landing, stream back on the kick, and swing forward as she settles.
 */

const BENDS: readonly Bend[] = ['down', 'up', 'front', 'back'];

/** How far the game has carried her while each frame shows (14 px over ticks 0-1, the hop). */
const CARRY = [10.5, 14, 14, 14, 14, 14, 14] as const;

/**
 * The hop and the landing were first drawn for a carry spread over ticks 0-5; carried on the hop
 * alone, both are drawn this much further back in the cell, unchanged: the hop leaves from the
 * same spot on its first tick, and the landing foot comes down on the take-off spot.
 */
const BACK = 4.6;

/** Where she pushes off from: the toe of the Revers' lead foot (her guard's). */
const PUSH_OFF = toeOf(GUARD.farFoot);

/** Where the Retourné takes off from on the screen: the toe of its frame 2's lead foot. */
const TAKE_OFF = toeOf((RETOURNE[2] ?? GUARD).farFoot) + CARRY[2];

/** A leg by its angles: thigh and shin (degrees from forward, y up) and the foot's. */
interface Kick {
  readonly thigh: number;
  readonly shin: number;
  readonly foot: number;
}

const kick = (thigh: number, shin: number, foot: number): Kick => ({ thigh, shin, foot });

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** The head's on-screen tilt (torso + head), degrees. */
  readonly look: number;
  readonly shrug: number;
  readonly twist: number;
  /** The rear leg (camera side): a foot, or its angles from the hip. */
  readonly near: Foot | Kick;
  /** The lead leg: a foot, or its angles from the hip. */
  readonly far: Foot | Kick;
  /** The rear fist. */
  readonly rear: Point;
  /** The lead fist. */
  readonly lead: Point;
  readonly bends?: Bends;
  readonly face?: Face;
  readonly effects?: readonly Effect[];
}

/** One leg placed by its angles (forward kinematics), with the knee bend that fits. */
function legAt(pose: Pose, side: 'near' | 'far', leg: Kick): Pose {
  const hip = solve(pose, RIFF_BODY)[side].hip;
  const r = (d: number) => (d * Math.PI) / 180;
  const knee = at(
    hip.x + RIFF_BODY.thigh * Math.cos(r(leg.thigh)),
    hip.y + RIFF_BODY.thigh * Math.sin(r(leg.thigh)),
  );
  const foot: Foot = {
    x: knee.x + RIFF_BODY.shin * Math.cos(r(leg.shin)),
    y: knee.y + RIFF_BODY.shin * Math.sin(r(leg.shin)),
    angle: leg.foot,
  };
  let best: Pose = pose;
  let error = Infinity;
  for (const bend of BENDS) {
    const trial: Pose =
      side === 'near'
        ? { ...pose, nearFoot: foot, bends: { ...pose.bends, nearKnee: bend } }
        : { ...pose, farFoot: foot, bends: { ...pose.bends, farKnee: bend } };
    const e = solve(trial, RIFF_BODY)[side].knee;
    const d = Math.hypot(e.x - knee.x, e.y - knee.y);
    if (d < error) {
      error = d;
      best = trial;
    }
  }
  return best;
}

function key(k: Key): Pose {
  let pose: Pose = {
    ...GUARD,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: k.look - k.torso,
    shrug: k.shrug,
    reach: {},
    twist: k.twist,
    nearFoot: 'thigh' in k.near ? GUARD.nearFoot : k.near,
    farFoot: 'thigh' in k.far ? GUARD.farFoot : k.far,
    nearFist: k.rear,
    farFist: k.lead,
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  if ('thigh' in k.near) pose = legAt(pose, 'near', k.near);
  if ('thigh' in k.far) pose = legAt(pose, 'far', k.far);
  return pose;
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

// 0: the hop, pitched over, the lead knee driven up in front, the rear foot tucked after it.
const HOP: Key = {
  hip: [-2 - BACK, 38.5],
  torso: 37,
  look: 15,
  shrug: 2.4,
  twist: 0.1,
  near: kick(-72, -128, -50),
  far: kick(-10, -95, -15),
  rear: at(12 - BACK, 50),
  lead: at(4.5 - BACK, 40.5),
  bends: { farElbow: 'back' },
  effects: [dust(PUSH_OFF - CARRY[0], 2.5, 0.2)],
};

// 1: the landing on the lead foot, sunk and loaded, the rear leg swinging back.
const LAND: Key = {
  hip: [-BACK, 28],
  torso: 32,
  look: 9,
  shrug: 2.2,
  twist: 0.3,
  near: kick(235, 190, 255),
  far: planted(TAKE_OFF - CARRY[1] - RIFF_BODY.foot),
  rear: at(10.5 - BACK, 41),
  lead: at(15.5 - BACK, 26),
  effects: [dust(TAKE_OFF - CARRY[1] - 4, 4, 0.1)],
};

export const POSES: readonly Pose[] = [key(HOP), key(LAND), ...RETOURNE.slice(2)];
