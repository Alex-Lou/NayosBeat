import { at, GUARD, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * idle: 8 frames, looping (60 ticks, a bar at 120 BPM, src/art/watt/clips.ts): he breathes on
 * the « one » of each bar (docs/watt.md §10, the half time). A slow heavy breath from the belly:
 * the chest rises, the shoulders lift and roll back a little, the clamps rise with them, the bulb
 * rides up; then he lets it all down onto his legs, the knees giving a touch. Nothing else moves:
 * a colosse at rest is still. The feet never slide.
 *
 * - 0: the guard (every move ending in the guard flows into the loop).
 * - 1-2: the breath in: the hips and the chest rise, the shoulders lift, the clamps follow a
 *   little later.
 * - 3: the top, held (the « one »).
 * - 4-6: the breath out: the weight sinks onto the legs, a touch below the guard, the shoulders
 *   forward, the clamps settling last.
 * - 7: back up to the guard.
 */

interface Beat {
  /** The hips from the guard's (world pixels): forward, up. */
  readonly hip: readonly [number, number];
  /** The torso's lean from the guard's (degrees). */
  readonly lean: number;
  /** The shoulders up into the collar, from the guard's. */
  readonly shrug: number;
  /** Both clamps from the guard's (world pixels). */
  readonly fists: readonly [number, number];
}

const BEATS: readonly Beat[] = [
  { hip: [0, 0.4], lean: -0.5, shrug: 0.3, fists: [0, 0.2] },
  { hip: [-0.1, 0.9], lean: -1.2, shrug: 0.7, fists: [-0.1, 0.6] },
  { hip: [-0.2, 1.1], lean: -1.5, shrug: 0.9, fists: [-0.2, 0.9] },
  { hip: [0, 0.5], lean: -0.6, shrug: 0.4, fists: [-0.1, 0.8] },
  { hip: [0.1, -0.3], lean: 0.6, shrug: -0.2, fists: [0, 0.1] },
  { hip: [0.1, -0.5], lean: 0.9, shrug: -0.3, fists: [0.1, -0.4] },
  { hip: [0, -0.2], lean: 0.4, shrug: -0.1, fists: [0, -0.2] },
];

function body(b: Beat): Pose {
  return {
    ...GUARD,
    hip: at(GUARD.hip.x + b.hip[0], GUARD.hip.y + b.hip[1]),
    torso: GUARD.torso + b.lean,
    shrug: (GUARD.shrug ?? 0) + b.shrug,
    nearFist: at(GUARD.nearFist.x + b.fists[0], GUARD.nearFist.y + b.fists[1]),
    farFist: at(GUARD.farFist.x + b.fists[0], GUARD.farFist.y + b.fists[1]),
  };
}

export const POSES: readonly Pose[] = [GUARD, ...BEATS.map(body)];
