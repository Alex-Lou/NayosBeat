import { at, ease, GUARD, planted, tween, type Effect, type Foot, type Pose } from './common.ts';

/**
 * tech (the grab broken, docs/combat-v2.md §4.1, §4.2, §11.1): 4 frames, 3, 3, 4, 4 ticks (14,
 * the stun of a tech), played by both fighters: the grip stripped, the recoil (the game
 * slides both back at 4 px/tick, about 33 px over the 14 ticks). Back to the guard.
 *
 * Mirrored, the two fighters make one picture: each strips the grip with the lead forearm,
 * swept out and up through it at chin height, and shoves the other off with the rear palm; the
 * two shoving palms meet halfway on one cyan slap. Then each sinks into the skid, low, the arms
 * out for balance, dust off the feet, rises through a true in-between (half up, the gloves
 * coming up through the chest) and lands in the guard as the slide dies out. The last frame is
 * the guard (within a hair), so idle takes over without a pop. Active, never scared: he is the
 * one breaking it, the eyes stay on the opponent, the face only sets on the break.
 */

/** Dust kicked up by the feet sliding back. */
function skid(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

/** How far the heel sits behind the ankle, foot at `degrees`. */
function heel(degrees: number): number {
  const a = (degrees * Math.PI) / 180;
  return 2.6 * Math.cos(a) - 2.3 * Math.sin(a);
}

/** `foot` turned to `angle` around its heel (the toes peel up, the heel stays put). */
function onHeel(foot: Foot, angle: number): Foot {
  return planted(foot.x - heel(foot.angle ?? 0) + heel(angle), angle);
}

// Frame 0 (3 ticks): the break. He strips the grip: the lead forearm sweeps out and up through
// it at chin height, elbow out, the hand open in front of his face; the rear palm shoves the
// opponent's chest, the arm long, a cyan slap where the two shoving palms meet. The hips are
// already back and low, the weight loading the rear foot (on its ball, the heel up as the knee
// bends over it: flat, the shin would fold over the foot), the lead toes coming up as the push
// starts: he is the one doing the breaking.
const BREAK: Pose = {
  hip: at(-10, 34.5),
  torso: 4,
  head: 8,
  shrug: 2,
  reach: { far: 2 },
  twist: 0.4,
  nearFoot: onHeel(GUARD.nearFoot, 14),
  farFoot: planted(-22.5, -20),
  nearFist: at(10, 61.5),
  farFist: at(12, 52.5),
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
  effects: [{ kind: 'flash', center: at(14.5, 52.5), radius: 4, tone: 'sound' }],
};

// Frame 1 (3 ticks): the skid. Sliding back fast, he sinks into it, the chest over the lead knee,
// both arms thrown forward for balance (what a body does when it is carried backward), the
// hands still open, the rear one higher, over the lead forearm: in profile, a rear arm flung
// back would only show its hand, sprouting from the middle of the back. The rear foot rides on
// its ball, the heel up over the bent knee; dust off both feet.
const SKID: Pose = {
  hip: at(-8.2, 31.5),
  torso: 24,
  head: -6,
  shrug: 1.8,
  twist: 0.15,
  nearFoot: planted(7.5),
  farFoot: planted(-22.5, -30),
  nearFist: at(14, 42),
  farFist: at(15, 48),
  nearHand: 'open',
  farHand: 'open',
  effects: [skid(15, 3, 0.2), skid(-20, 2.4, 0.2)],
};

// Frame 2 (4 ticks): the slide dies out, he rises out of the skid: halfway up, the chest
// lifting, the gloves rising through the chest toward the guard, the rear heel coming down
// toward the guard's.
const GATHER: Pose = {
  hip: at(-7.8, 33),
  torso: 21,
  head: -3,
  shrug: 1.6,
  nearFoot: GUARD.nearFoot,
  farFoot: planted(-22, -24),
  nearFist: at(10, 49),
  farFist: at(9.5, 55),
  effects: [skid(15, 3, 0.65), skid(-20, 2.4, 0.6)],
};

// Frame 3 (4 ticks): settled in the guard, the last of the dust.
const SETTLE: Pose = {
  ...tween(GATHER, GUARD, 0.85, ease.out),
  effects: [skid(15, 3, 0.92), skid(-20, 2.4, 0.9)],
};

export const POSES: readonly Pose[] = [BREAK, SKID, GATHER, SETTLE];
