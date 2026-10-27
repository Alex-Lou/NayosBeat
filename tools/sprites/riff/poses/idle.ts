import { at, GUARD, lifted, planted, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * idle: 8 frames of 6 ticks, looping (0.8 s): toprock on the spot, a b-girl's Indian step done
 * in her guard. The lead heel peels up (1), the foot swings back across (2) and plants crossed
 * in front of the rear one (3), swings back through (4), flicks out heel first, toes up (5),
 * plants flat with the hips dropping into it (6) and rises into the guard (7). The poses are
 * spaced evenly along the foot's path: no jump between two frames, no hold that jitters.
 *
 * The hips, the feet and the braids carry the bounce; the torso and the head barely move (a
 * degree or two, a pixel or two), and not at all on the two plants (3 and 6), so the accents
 * read and the sprite does not boil. The arms answer the step with a small swing: the lead
 * hand opens out as the foot crosses, comes back as it flicks out. The head keeps the guard's
 * angle (torso + head = 12 degrees, drawn upright, see head.ts), so its pixels only shift.
 * Frame 0 is exactly GUARD: every move that ends in the guard flows into it, and frame 7 flows
 * back into frame 0.
 */

/** The guard with the torso leaning `torso` degrees, the head kept at the guard's angle. */
function lean(pose: Omit<Pose, 'head' | 'torso'>, torso: number): Pose {
  return { ...pose, torso, head: GUARD.torso + GUARD.head - torso };
}

/** One frame of the step: hips, lean, feet and wrists; the rest is the guard's. */
function step(
  hip: readonly [number, number],
  torso: number,
  nearFoot: Pose['nearFoot'],
  farFoot: Pose['farFoot'],
  nearFist: readonly [number, number],
  farFist: readonly [number, number],
  extra: Partial<Pose> = {},
): Pose {
  return lean(
    {
      ...GUARD,
      ...extra,
      hip: at(...hip),
      nearFoot,
      farFoot,
      nearFist: at(...nearFist),
      farFist: at(...farFist),
    },
    torso,
  );
}

export const POSES: readonly Pose[] = [
  GUARD,
  // The lead heel peels up, the hips rise a little off it.
  step([-5.6, 32.4], 18, planted(5.4, -18), GUARD.farFoot, [7.8, 39.4], [8.8, 47.4]),
  // The lead foot swings back across, off the floor; the lead hand swings open, out and low.
  step(
    [-5.9, 32.6],
    17.5,
    lifted(planted(-2.2, -10), 3.2),
    GUARD.farFoot,
    [7.4, 37.4],
    [8.6, 47.6],
    { twist: 0.3 },
  ),
  // Planted, crossed over in front of the rear foot: the hips sink into it.
  step([-6.2, 31.4], 17.5, planted(-9.5, -6), planted(-19.2, -22), [7.2, 36.6], [8.6, 47.2], {
    twist: 0.5,
  }),
  // Swinging back through, lifted, toes already coming up; the hips rise.
  step([-5.9, 32.6], 17.5, lifted(planted(-1.0, 10), 4), GUARD.farFoot, [7.6, 37.8], [8.8, 47.6], {
    twist: 0.2,
  }),
  // Flicked out past the guard, heel down, toes up: the lead hand comes back in.
  step([-5.6, 32.3], 18, planted(7.2, 20), GUARD.farFoot, [8.0, 38.8], [9.0, 47.6], {
    twist: -0.1,
  }),
  // Planted flat, the weight dropped onto it: the hips down.
  step([-5.4, 31.4], 18, planted(6.8, 0), GUARD.farFoot, [8.0, 38.4], [9.0, 46.6], {
    twist: -0.1,
  }),
  // Rising back into the guard.
  step([-5.5, 31.8], 18, planted(6.5, -2), GUARD.farFoot, [8.0, 38.8], [9.0, 46.8]),
];
