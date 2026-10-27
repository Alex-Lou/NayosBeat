import { BODY, solve } from '../../skeleton.ts';
import {
  at,
  ease,
  GUARD,
  planted,
  smear,
  tween,
  type Effect,
  type Foot,
  type Pose,
} from './common.ts';

/**
 * specialForward, "Coup de pied fendu": a flying side kick. Ticks 3,3,3,2,[4],4,5,5,4.
 *
 * The game carries him ~30 px forward during ticks 3-14 (frames 1-4: about 5, 12.5, 19 and
 * 26 px in), so the drawing stays centered and only the height of the flight is drawn. What
 * belongs to the floor compensates for that travel: the push-off foot stays put in the world
 * on frame 1 (the body passes over it), and the takeoff dust drifts back in character space
 * so it stays where he left the ground.
 *
 * Line of action: out of the high guard he sinks into the springy stance, then explodes off the
 * back toe in one long diagonal (toe, hips, head), the lead knee driving up; at the top the knee
 * is chambered, aimed at the target with the heel cocked under it, and the hips turn over; then
 * the lead heel drives out on one flat line while the torso lays back against it (one long line
 * from the flung-back rear arm to the heel), the face still upright on the target. The leg snaps
 * back, the rear foot reaches straight down for its floor mark first, a deep landing in the wide
 * stance, a bounce up past the guard, and he settles into the idle's last frame.
 */

/** Where the guard's rear toe touches the floor (heel up). */
const REAR_TOE = solve(GUARD).far.toe.x;

/**
 * A foot on its toes at `toe`, the heel raised `angle` degrees (negative): the heel rises and
 * sinks around the toe, which stays put on the floor.
 */
function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

/** How far the game has carried him in the middle of frames 0 to 3: the floor slides back. */
const TRAVEL = [0, 5, 12.5, 19] as const;

// 0 - Dip: he sinks into the springy stance, both knees loading, the lean deepening, gloves
// tight, chin down on the target.
const DIP: Pose = {
  ...GUARD,
  hip: at(-6.2, 31.2),
  torso: 20,
  head: -2,
  shrug: 1.8,
  twist: -0.15,
  nearFoot: GUARD.nearFoot,
  farFoot: onToes(REAR_TOE, -24),
  nearFist: at(11, 49.5),
  farFist: at(11.6, 57.4),
};

// 1 - Takeoff: the back leg drives off the floor (toes still on it, left behind as he goes),
// the lead knee rises, the gloves lift with the drive. Toe, hips and head in one line.
const TAKEOFF: Pose = {
  hip: at(-5, 40.5),
  torso: 22,
  head: -4,
  shrug: 2.4,
  twist: -0.3,
  nearFoot: { x: 3, y: 23, angle: -20 },
  farFoot: onToes(REAR_TOE - TRAVEL[1], -62),
  nearFist: at(12.5, 58),
  farFist: at(9.5, 64),
};

// 2 - Top of the jump: the side-kick chamber, the lead knee pulled up and aimed at the target
// with the heel cocked under it (it then drives out on one flat line), back leg tucked, the hips
// turning over and the torso tipping back; the rear arm starts its swing back. The coiled spring.
const CHAMBER: Pose = {
  hip: at(-2, 48.5),
  torso: -8,
  head: 22,
  shrug: 2.6,
  twist: -0.5,
  nearFoot: { x: 10, y: 42, angle: 80 },
  farFoot: { x: -11, y: 31.5, angle: -25 },
  nearFist: at(4, 65),
  farFist: at(-16, 59),
  bends: { nearKnee: 'up' },
};

// 4 - The kick (active): lead leg locked out heel first, sole to the target, the body laid
// back against it, rear arm flung back as a counterweight, lead fist guarding the chin. Jaw set
// (the effort face): laid back this far, the headphone cup sits on the jaw and would hide a
// shout's open mouth; the lead shoulder rolls only a little so the cheek stays clear.
const KICK: Pose = {
  hip: at(2.5, 44.5),
  torso: -40,
  head: 26,
  shrug: 0.6,
  twist: -0.6,
  nearFoot: { x: 39, y: 35.5, angle: 84 },
  farFoot: { x: -8, y: 28, angle: -25 },
  nearFist: at(-2, 60),
  farFist: at(-33, 49),
  bends: { nearKnee: 'up' },
  face: 'effort',
};

// 3 - The leg shoots out (2 ticks): most of the way already, the knee aimed at the target.
const EXTEND: Pose = {
  ...tween(CHAMBER, KICK, 0.55, ease.out),
  hip: at(1, 47),
  nearFoot: { x: 28, y: 41, angle: 85 },
  farFist: at(-29, 53),
  face: 'effort',
};

// 5 - The leg snaps back as he drops, the hips turning back square, the rear foot reaching for
// the floor first.
const RETRACT: Pose = {
  hip: at(-3, 38.5),
  torso: -10,
  head: 22,
  shrug: 2.2,
  twist: -0.35,
  nearFoot: { x: 9, y: 21, angle: 15 },
  // Right above its toe mark: the foot drops straight onto it (no slide back on touchdown).
  farFoot: { x: -20.5, y: 11, angle: -32 },
  nearFist: at(5, 58),
  farFist: at(-14, 54),
  bends: { nearKnee: 'up' },
  face: 'effort',
};

// 6 - Landing: both feet down on their guard marks, the knees soaking up the drop, the chest
// pitching forward past the guard's lean, the gloves coming back up.
const LAND: Pose = {
  ...GUARD,
  hip: at(-6, 30.5),
  torso: 23,
  head: -5,
  shrug: 1.6,
  twist: -0.1,
  nearFoot: planted(6.35),
  farFoot: onToes(REAR_TOE, -22),
  nearFist: at(12, 46.5),
  farFist: at(6, 52),
};

// 7 - Bouncing back up a hair past the guard, the lead shoulder rolling up to the chin.
const RISE: Pose = {
  ...GUARD,
  hip: at(-6.9, 37.2),
  torso: 13,
  head: 4,
  shrug: 2,
  nearFist: at(8.6, 55.6),
  farFist: at(10, 62.8),
};

/**
 * 8 - The idle's last frame (the lead shoulder still up on the breath): the idle's own 9 -> 0
 * beat carries him on into the loop, no frozen copy of the guard at the hand-off.
 */
const IDLE_HANG: Pose = {
  ...GUARD,
  shrug: 1.68,
  nearFist: at(8.82, 54.97),
  farFist: at(10.3, 62.3),
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
  { ...TAKEOFF, effects: [dust(REAR_TOE - TRAVEL[1], 4, 0.15)] },
  { ...CHAMBER, effects: [dust(REAR_TOE - TRAVEL[2], 4, 0.45)] },
  {
    ...EXTEND,
    effects: [
      dust(REAR_TOE - TRAVEL[3], 4, 0.8),
      // The heel's flat drive out of the chamber, under the raised knee.
      smear(4, [8, 45], [18, 44.5], [27, 43.5]),
      { kind: 'speed', center: at(-15, 38), length: 14, spread: 6, direction: 0, tone: 'sound' },
    ],
  },
  {
    ...KICK,
    effects: [
      // The heel's path out of the chamber, flat then dipping onto the target, lifted just above
      // the leg so it reads past the limb.
      smear(5, [8, 50], [18, 48.5], [28, 45.5], [37, 40]),
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
  { ...LAND, effects: [dust(8.5, 4, 0.25), dust(-17, 3.4, 0.3)] },
  { ...RISE, effects: [dust(10.5, 4, 0.7), dust(-18.5, 3.4, 0.75)] },
  IDLE_HANG,
];
