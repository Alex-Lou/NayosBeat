import { solve } from '../../skeleton.ts';
import { at, planted, type Pose } from './common.ts';

/**
 * timeOver: 4 frames of 10 ticks, looping (one heavy breath): lost on time, bent over with his
 * hands on his knees, catching his breath. Out (frame 0) the back sags, the head hangs and the
 * elbows give under the weight; in (frames 1-2) the back rises on straight arms, the shoulders
 * heave and the head comes up, mouth open; then it sags again (frame 3).
 *
 * Bent over, the head goes forward: the whole pose sits back on its heels so that nothing in
 * front passes the pushbox (the winner may stand at point blank).
 */

const WINDED: Pose = {
  hip: at(-15, 34),
  torso: 38,
  head: 0,
  shrug: 0.5,
  nearFoot: planted(0),
  farFoot: planted(-18),
  nearFist: at(5, 24),
  farFist: at(0, 22),
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'back', farElbow: 'back' },
  face: 'tired',
};

/** How full the lungs are on each frame: 0 out, 1 in. */
const BREATH = [0, 0.55, 1, 0.45] as const;

function breathing(frame: 0 | 1 | 2 | 3): Pose {
  const b = BREATH[frame];
  const body: Pose = {
    ...WINDED,
    // Breathing in, the back lifts and the hips push back up a little.
    hip: at(-15.4 + 0.4 * b, 34 + 0.6 * b),
    torso: 39 - 7 * b,
    head: -16 * b,
    shrug: 0.3 + 1.8 * b,
  };
  // The palms stay on the knees, just above the kneecaps, wherever the knees go.
  const { near, far } = solve(body);
  return {
    ...body,
    nearFist: at(near.knee.x - 0.5, near.knee.y + 4.5),
    farFist: at(far.knee.x - 0.5, far.knee.y + 4.5),
  };
}

export const POSES: readonly Pose[] = [breathing(0), breathing(1), breathing(2), breathing(3)];
