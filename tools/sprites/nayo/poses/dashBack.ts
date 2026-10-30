import { at, GUARD, type Pose } from './common.ts';
import { dust, guard, IDLE_HANG, lift, onToes, stageOf, toeOf } from './dashForward.ts';

/**
 * dashBack (Retrait, docs/combat-v2.md §3.3, §11.2): 6 frames, 1, 4, 4, 4, 4, 5 ticks (22). A
 * small hop back, the guard kept high. The game moves him 44 px back over ticks 1-16 (grabs
 * miss him on ticks 0-11): the poses stay anchored around x = 0.
 *
 * A boxer bouncing out of range, composed, never a flinch: a quick dip and the lead foot flicks
 * him off the floor (it leaves last, long and pointed, while the rear leg gathers), a low hop
 * back that changes shape at its apex (the lead foot tucks, the rear leg reaches), the chin
 * tucked behind the shoulder and both gloves up at the face, the eyes on the opponent all along.
 * The rear foot lands first on its ball and skids, the lead foot hovers through the anti-grab
 * window and sets after it, the knees take the weight and he rises into the stance, ending on
 * the idle's last frame. What touches the floor is placed on the stage (see `stageOf`): the
 * landing's feet skid on with the stop and never snap forward against the travel at a frame
 * change; the dust goes with them.
 */

/** Ticks of each frame (§11.2). */
const TICKS = [1, 4, 4, 4, 4, 5] as const;
/** The game's backdash curve (§3.3): px per tick on ticks 1 to 16, backward. */
const SPEEDS = [
  5.33, 4.98, 4.64, 4.3, 3.95, 3.61, 3.27, 2.92, 2.58, 2.23, 1.89, 1.55, 1.2, 0.86, 0.52, 0.17,
] as const;

const stage = stageOf(
  SPEEDS.map((speed) => -speed),
  TICKS,
);

const LEAD = GUARD.nearFoot;
const LEAD_TOE = toeOf(LEAD);
const REAR_TOE = toeOf(GUARD.farFoot);

// 0 - The push (1 tick): a quick dip, the lead heel up as the ball of the foot drives him back,
// the gloves snapping up tight to the face.
const PUSH: Pose = guard(
  {
    hip: at(-7, 35),
    torso: 14,
    head: 3,
    shrug: 1.6,
    nearFoot: onToes(LEAD_TOE, -12),
    farFoot: GUARD.farFoot,
  },
  at(-0.2, 0.8),
  at(-0.2, 0.6),
);

// 1 - The push-off (4 ticks, the fastest stretch: 19 px): the flick still in the lead leg, long,
// the ankle extended off the push (30 degrees past square to the shin: with the leg reaching
// forward, the foot stays close to the floor's line; pointed farther, the boot stood on its tip
// like a stiletto), the last part of him to leave the floor, its toe just off the canvas; the
// rear leg already gathered up under the hips, it left first. The chin tucked behind the rolled-up
// lead shoulder, the gloves a pixel behind the rise (they have weight). Upright but still
// leaning in: he leaves, he doesn't run.
const OFF: Pose = guard(
  {
    hip: at(-8, 41),
    torso: 11,
    head: 6,
    shrug: 2,
    nearFoot: lift(onToes(15, -23), 2.5),
    farFoot: lift(onToes(-15, -34), 5),
  },
  at(0.3, -0.8),
  at(0.3, -0.6),
);

/**
 * The rear foot's landing on frame 3, on its ball: one stop-tick behind its mark in the cell,
 * so it skids back with the stop and takes over frame 4 (on the mark) exactly where it left off.
 */
const TOUCHDOWN = onToes(stage(REAR_TOE, 4, 3), -24);
/** Where the rear toe bites on the landing. */
const TOUCH = toeOf(TOUCHDOWN);

// 2 - The tuck and reach (4 ticks, the other half of the hop: as high as the push-off): the lead
// foot drawn up under the knee, the rear toe reaching down and back for the floor, right above
// where it touches down; the gloves caught up, tight at the face.
const TUCK: Pose = guard(
  {
    hip: at(-7.2, 40.5),
    torso: 13,
    head: 4,
    shrug: 2.2,
    nearFoot: lift(onToes(10, -25), 4),
    farFoot: lift(onToes(stage(TOUCH, 3, 2) + 0.1, -28), 1),
  },
  at(0, 1),
  at(0, 0.8),
);

// 3 - The rear foot bites on its ball where it reached (the game still carries him back: it
// skids on with him into the next frame, never forward), the knees give, the hips come over the
// feet and the chest leans over the lead knee to brake; the lead foot hovers on its ball right
// above where it sets.
const LAND: Pose = guard(
  {
    hip: at(-6.5, 33.6),
    torso: 17,
    head: 0,
    shrug: 2,
    nearFoot: lift(onToes(stage(LEAD_TOE, 4, 3), -8), 1.2),
    farFoot: TOUCHDOWN,
  },
  at(0.2, -0.6),
  at(0, -0.4),
);

// 4 - The lead foot sets, both feet on the guard's marks (the last skid of the stop), and he
// rises into the stance.
const SET: Pose = guard(
  {
    hip: at(-7, 35.4),
    torso: 15.5,
    head: 1.5,
    shrug: 1.8,
    nearFoot: LEAD,
    farFoot: onToes(REAR_TOE, -17),
  },
  at(0, 0.4),
  at(0, 0.3),
);

export const POSES: readonly Pose[] = [
  { ...PUSH, effects: [dust(LEAD_TOE, 2.5, 0.1)] },
  // The push-off puff, left on the stage where the lead toe flicked him off.
  { ...OFF, effects: [dust(stage(LEAD_TOE, 0, 1), 2.5, 0.45)] },
  TUCK,
  { ...LAND, effects: [dust(TOUCH, 3, 0.2)] },
  // The rear foot took the landing: its puff thins out; the lead foot sets softly, no dust.
  { ...SET, effects: [dust(stage(TOUCH, 3, 4), 3, 0.6)] },
  IDLE_HANG,
];
