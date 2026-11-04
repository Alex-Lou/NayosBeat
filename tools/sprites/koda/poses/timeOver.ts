import { BODY, solve } from '../../skeleton.ts';
import { at, GUARD, planted, type Pose } from './common.ts';

/**
 * timeOver: 4 frames of 10 ticks, looping (one heavy breath, 0.67 s): lost on time, bent over
 * with his hands on his knees, catching his breath, the head up, still staring at the winner.
 * Out (frame 0) the back sags and the shoulders hang; in (frames 1-2) the whole back heaves up
 * on the arms, the lead shoulder lifting with the gasp, the arms straightening as they push on
 * the knee; then it sinks back down slower (frame 3).
 *
 * Pixel-locked like idle: the back never turns, the upper body moves by whole sprite pixels
 * (0.5 world px), and so does the shoulder heave (at this lean a shrug of 1.04 moves the lead
 * shoulder one sprite pixel up and two forward); the lead upper arm keeps its angle, riding the
 * shoulder, and only the forearm turns about the elbow to keep the palm on the knee. So the
 * jacket, the sleeve emblem and the headphone ring never boil; the legs flex under the heave.
 * Both palms press on the lead knee (the rear one beside the lead one, behind it, in reach).
 * The head stays under 20 degrees (drawn upright, see head.ts). The lead foot stays where GUARD
 * put it: out of the guard he sinks back onto his heels, the rear foot flat, drawn in under the
 * hips (the rear knee bent over a flat foot farther back would fold the ankle past its stop,
 * tools/sprites/anatomy.ts: resting, the shin stands over it). Bent over, the
 * head goes forward, so the whole pose sits back for nothing in front to pass the pushbox (the
 * winner may stand at point blank).
 */

/** Bent over, the breath out: the reference the breath moves from. */
const WINDED: Pose = {
  hip: at(-13.5, 32),
  torso: 40,
  head: -22,
  shrug: 0,
  nearFoot: planted(GUARD.nearFoot.x),
  farFoot: planted(-14),
  // The hands go on the lead knee (breathing, below).
  nearFist: at(0, 0),
  farFist: at(0, 0),
  nearHand: 'open',
  farHand: 'open',
  face: 'tired',
};

/**
 * How far the back has heaved up on each frame of the breath (world px, whole sprite pixels),
 * and the lead shoulder lifting with the gasp.
 */
const HEAVE = [0, 1.5, 2, 1] as const;
const SHRUG = [0, 1.04, 1.04, 0] as const;

/** Where the palms press, from the lead knee wherever it is on the frame: just above the cap. */
const NEAR_PALM = at(0.5, 4);
const FAR_PALM = at(-1, 5);

/** The body of a frame of the breath, the hands not placed yet. */
function body(frame: 0 | 1 | 2 | 3): Pose {
  return { ...WINDED, hip: at(WINDED.hip.x, WINDED.hip.y + HEAVE[frame]), shrug: SHRUG[frame] };
}

/** The lead upper arm (shoulder to elbow) in the breath-out pose, palm exactly on the knee. */
const UPPER_ARM = (() => {
  const { knee } = solve(body(0)).near;
  const { shoulder, elbow } = solve({
    ...body(0),
    nearFist: at(knee.x + NEAR_PALM.x, knee.y + NEAR_PALM.y),
  }).near;
  return at(elbow.x - shoulder.x, elbow.y - shoulder.y);
})();

function breathing(frame: 0 | 1 | 2 | 3): Pose {
  const pose = body(frame);
  const { knee, shoulder } = solve(pose).near;
  // The elbow rides the shoulder; the wrist goes as close to the knee as the forearm reaches
  // from there (within a pixel at the top of the breath).
  const elbow = at(shoulder.x + UPPER_ARM.x, shoulder.y + UPPER_ARM.y);
  const palm = at(knee.x + NEAR_PALM.x, knee.y + NEAR_PALM.y);
  const toPalm = Math.hypot(palm.x - elbow.x, palm.y - elbow.y);
  const k = BODY.forearm / toPalm;
  return {
    ...pose,
    nearFist: at(elbow.x + (palm.x - elbow.x) * k, elbow.y + (palm.y - elbow.y) * k),
    farFist: at(knee.x + FAR_PALM.x, knee.y + FAR_PALM.y),
  };
}

export const POSES: readonly Pose[] = [breathing(0), breathing(1), breathing(2), breathing(3)];
