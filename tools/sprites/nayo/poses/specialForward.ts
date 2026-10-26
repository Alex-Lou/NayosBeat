import { at, ease, GUARD, planted, smear, tween, type Effect, type Pose } from './common.ts';

/**
 * specialForward, "Coup de pied fendu": a flying side kick. Ticks 3,3,3,2,[4],4,5,5,4.
 *
 * The game carries him ~30 px forward during ticks 3-14 (frames 1-4: about 5, 12.5, 19 and
 * 26 px in), so the drawing stays centered and only the height of the flight is drawn. What
 * belongs to the floor compensates for that travel: the push-off foot stays put in the world
 * on frame 1 (the body passes over it), and the takeoff dust drifts back in character space
 * so it stays where he left the ground.
 *
 * Line of action: dip, explode up off the back foot, knee to the chest at the top of the jump,
 * then the lead heel drives out while the torso lays back against it (one long diagonal from
 * the flung-back rear arm to the heel). The leg snaps back, both feet reach for the floor, a
 * deep landing, a little bounce past the guard, and he settles in the shell.
 */

// 0 - Dip: he sinks onto the back leg, heel up, shoulders coiled, chin down on the target.
const DIP: Pose = {
  hip: at(-7, 30),
  torso: 14,
  head: 6,
  shrug: 4.4,
  twist: -0.3,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5, -24),
  nearFist: at(9, 37),
  farFist: at(7, 53),
};

// 1 - Takeoff: the back leg drives off the floor (toes still on it), the lead knee rises,
// hands up.
const TAKEOFF: Pose = {
  hip: at(-3, 42),
  torso: -8,
  head: 12,
  shrug: 3.4,
  twist: -0.3,
  nearFoot: { x: 4, y: 27, angle: 40 },
  farFoot: planted(-18.5, -58),
  nearFist: at(8, 55),
  farFist: at(5, 64),
};

// 2 - Top of the jump: lead knee pulled to the chest, heel cocked, back leg tucked, the rear
// arm starting its swing back. The coiled spring.
const CHAMBER: Pose = {
  hip: at(-1, 49),
  torso: -30,
  head: 30,
  shrug: 3,
  twist: -0.5,
  nearFoot: { x: 7, y: 47.5, angle: 85 },
  farFoot: { x: -10, y: 33, angle: -20 },
  nearFist: at(-2, 68),
  farFist: at(-20, 60),
  bends: { nearKnee: 'up' },
};

// 4 - The kick (active): lead leg locked out heel first, sole to the target, the body laid
// back against it, rear arm flung back as a counterweight, lead fist guarding the chin.
const KICK: Pose = {
  hip: at(2.5, 44.5),
  torso: -42,
  head: 38,
  shrug: 1.2,
  twist: -0.6,
  nearFoot: { x: 39, y: 35.5, angle: 84 },
  farFoot: { x: -8, y: 28, angle: -25 },
  nearFist: at(-3, 59),
  farFist: at(-33, 48),
  bends: { nearKnee: 'up' },
  face: 'kiai',
};

// 3 - The leg shoots out (2 ticks): most of the way already, the knee aimed at the target.
const EXTEND: Pose = {
  ...tween(CHAMBER, KICK, 0.55, ease.out),
  hip: at(1.5, 47),
  nearFoot: { x: 28, y: 41, angle: 85 },
  farFist: at(-29, 52),
  face: 'effort',
};

// 5 - The leg snaps back as he drops, both feet reaching for the floor.
const RETRACT: Pose = {
  hip: at(-1, 39),
  torso: -24,
  head: 26,
  shrug: 3,
  twist: -0.4,
  nearFoot: { x: 10, y: 20, angle: 15 },
  farFoot: { x: -11, y: 12, angle: -30 },
  nearFist: at(3, 56),
  farFist: at(-18, 52),
  bends: { nearKnee: 'up' },
  face: 'effort',
};

// 6 - Landing: both feet down where the guard stands, knees soaking up the drop, the chest
// pitching forward past the guard.
const LAND: Pose = {
  hip: at(-3, 28),
  torso: 8,
  head: 4,
  shrug: 2.6,
  twist: -0.1,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5, -10),
  nearFist: at(8, 36),
  farFist: at(4, 50),
};

// 7 - Bouncing back up a hair past the guard, the lead shoulder rolling up to the chin.
const RISE: Pose = {
  hip: at(-3.4, 38),
  torso: -1,
  head: 13,
  shrug: 4.6,
  twist: 0.05,
  nearFoot: planted(5.6),
  farFoot: planted(-13.5),
  nearFist: at(7.5, 42),
  farFist: at(7, 60),
};

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

export const POSES: readonly Pose[] = [
  DIP,
  // The takeoff dust, left behind at the push-off toe (world-fixed, see above).
  { ...TAKEOFF, effects: [dust(-15, 4, 0.15)] },
  { ...CHAMBER, effects: [dust(-22.5, 4, 0.45)] },
  {
    ...EXTEND,
    effects: [
      dust(-28.75, 4, 0.8),
      smear(4, [7, 51], [17, 48.5], [26, 44]),
      { kind: 'speed', center: at(-15, 38), length: 14, spread: 6, direction: 0, tone: 'sound' },
    ],
  },
  {
    ...KICK,
    effects: [
      // The heel's path, arcing just above the leg so it reads past the limb.
      smear(5, [6, 53], [16, 50.5], [27, 45.5], [36, 40]),
      { kind: 'speed', center: at(-17, 35), length: 22, spread: 8, direction: 0, tone: 'sound' },
      { kind: 'flash', center: at(44, 37), radius: 6, tone: 'strike' },
    ],
  },
  {
    ...RETRACT,
    // The air the heel cracked: a sound ring standing across the kick's line, fading where the
    // heel stopped (he no longer travels, so it stays at the same spot in the world).
    effects: [
      { kind: 'ring', center: at(42, 37), radius: 7, progress: 0.55, tone: 'sound', squash: 1.8 },
    ],
  },
  { ...LAND, effects: [dust(8, 4, 0.25), dust(-14, 3.4, 0.3)] },
  { ...RISE, effects: [dust(10, 4, 0.7), dust(-16, 3.4, 0.75)] },
  tween(RISE, GUARD, 0.75, ease.out),
];
