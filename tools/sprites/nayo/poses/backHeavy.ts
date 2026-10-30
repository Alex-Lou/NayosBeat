import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { at, GUARD, planted, smear, type Effect, type Foot, type Pose } from './common.ts';

/**
 * backHeavy (Remontant, docs/combat-v2.md §5.2, §10.1, §11.2): 7 frames, 2, 2, 3, [4], 5, 6, 6
 * ticks (28), active frame 3 (ticks 7-10), hitbox x 4..30 / y 56..104, reached upward and
 * forward (an anti-air, §9.5: its front effects count toward the reach). A launcher that
 * misses crouchers.
 *
 * The short lead uppercut, on the spot: no jump, no wind-up to speak of (7 ticks). He drops an
 * inch into the knees, the lead glove sinking to the chest, then the legs and the hips drive
 * up through the lead shoulder, the rear heel spinning up: the fist rips up almost straight,
 * elbow bent under it, the chin buried behind the rolled shoulder, the rear glove glued to the
 * cheek. A rising arc sweeps up ahead of the fist through the airborne opponent. He holds the
 * top a beat (it launches), lets the arm fold and settles back down into the guard.
 *
 * The Uppercut special is the other one: it jumps, the arm straight overhead, the rear arm
 * flung back, a shout and a sound column; this one stays grounded, compact, jaw set.
 */

/** Where the toe tip of a foot touches the floor (a foot on the ball pivots around it). */
function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  return foot.x + 2.3 * Math.sin(a) + 7 * Math.cos(a);
}

/** A foot on the floor turned to `angle` around its toe tip at `toe`: the toe never slides. */
function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(toe - 2.3 * Math.sin(a) - 7 * Math.cos(a), angle);
}

const LEAD_TOE = toeOf(GUARD.nearFoot);
const REAR_TOE = toeOf(GUARD.farFoot);

type Body = Omit<Pose, 'nearFist' | 'farFist'>;
const sketch = (body: Body): Pose => ({
  ...body,
  nearFist: GUARD.nearFist,
  farFist: GUARD.farFist,
});

/** The rear glove's place in the guard, from the head's centre: it rides the head. */
const CHEEK = ((): Point => {
  const { head } = solve(GUARD);
  return at(GUARD.farFist.x - head.x, GUARD.farFist.y - head.y);
})();

/** The rear glove at the cheek (plus `dx`, `dy`), whatever the head does. */
function atCheek(body: Body, dx = 0, dy = 0): Point {
  const { head } = solve(sketch(body));
  return at(head.x + CHEEK.x + dx, head.y + CHEEK.y + dy);
}

/** The lead wrist `length` px from the lead shoulder, `angle` degrees above horizontal. */
function lead(body: Body, length: number, angle: number): Point {
  const { shoulder } = solve(sketch(body)).near;
  const a = (angle * Math.PI) / 180;
  return at(shoulder.x + Math.cos(a) * length, shoulder.y + Math.sin(a) * length);
}

/** The lead glove as drawn: its middle and the top of its knuckles, past the wrist. */
function glove(pose: Pose): { middle: Point; knuckles: Point } {
  const { wrist, forearm } = solve(pose).near;
  const along = (distance: number): Point =>
    at(wrist.x + forearm.x * distance, wrist.y + forearm.y * distance);
  return { middle: along(2.6), knuckles: along(5.4) };
}

/** The uppercut's trail: from `tail` up the fist's path into the middle of the lead glove. */
function trail(pose: Pose, width: number, ...tail: readonly (readonly [number, number])[]) {
  const { middle } = glove(pose);
  return smear(width, ...tail, [middle.x, middle.y]);
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

const UPPER = { nearElbow: 'front', farElbow: 'down' } as const;

// Frame 0 (2 ticks): the dip. Down an inch into both knees, curled over the lead knee, the lead
// shoulder dropped and the glove sunk to the chest, elbow in; the rear glove stays at the cheek.
// The rear heel rises off the guard's as its knee sinks over it (the ball loaded to drive).
const DIP_BODY: Body = {
  ...GUARD,
  hip: at(-7, 33.8),
  torso: 20,
  head: -2,
  shrug: 0.2,
  twist: -0.2,
  farFoot: onToes(REAR_TOE, -22),
};
const DIP: Pose = {
  ...DIP_BODY,
  nearFist: at(8, 47),
  farFist: atCheek(DIP_BODY),
};

// Frame 1 (2 ticks): the drive. The rear heel spins up, the knees push, the hips rise and turn
// in, the lead shoulder starts up; the glove still low and tight, about to go.
const DRIVE_BODY: Body = {
  ...GUARD,
  hip: at(-6.2, 35.4),
  torso: 17,
  head: 0,
  shrug: 1.2,
  twist: 0.1,
  farFoot: onToes(REAR_TOE, -27),
};
const DRIVE: Pose = {
  ...DRIVE_BODY,
  nearFist: at(10, 49),
  farFist: atCheek(DRIVE_BODY),
};

// Frame 2 (3 ticks): the rip. Legs and hips extending, the lead shoulder rolling up, the fist
// going up past the chin a little ahead of the face, the elbow low and in, right under it.
const RIP_BODY: Body = {
  ...GUARD,
  hip: at(-5.6, 38.6),
  torso: 13,
  head: 4,
  shrug: 3,
  reach: { near: 1.5 },
  twist: -0.3,
  farFoot: onToes(REAR_TOE, -36),
  bends: UPPER,
};
const RIP_ARM: Pose = {
  ...RIP_BODY,
  nearFist: at(16, 64.5),
  farFist: atCheek(RIP_BODY),
};

// Frame 3 (4 ticks, active): the top. Up on both balls of the feet, one line from the rear toe
// through the hips and the lead shoulder to the fist above the head, the elbow still bent under
// it; the chin buried behind the shoulder, the jaw set.
const TOP_BODY: Body = {
  ...GUARD,
  hip: at(-4, 42.4),
  torso: 11,
  head: 7,
  shrug: 4.2,
  reach: { near: 3 },
  twist: -0.6,
  nearFoot: onToes(LEAD_TOE, -24),
  farFoot: onToes(REAR_TOE, -48),
  bends: UPPER,
  face: 'effort',
};
const TOP_ARM: Pose = {
  ...TOP_BODY,
  nearFist: lead(TOP_BODY, 23.5, 71),
  farFist: atCheek(TOP_BODY, 0.4, -0.6),
};
/** Where the fist meets the jumping opponent: just above the knuckles. */
const CONTACT = ((): Point => {
  const { knuckles } = glove(TOP_ARM);
  return at(knuckles.x + 1, knuckles.y + 7);
})();

// Frame 4 (5 ticks): the launch held. The fist hangs at the top, a hair past the contact as the
// arm opens, the body still up on the toes; the chin comes up out of the shoulder to watch the
// opponent go up.
const HOLD_BODY: Body = {
  ...GUARD,
  hip: at(-4.3, 42),
  torso: 10.5,
  head: 2,
  shrug: 3.8,
  reach: { near: 2.8 },
  twist: -0.55,
  nearFoot: onToes(LEAD_TOE, -20),
  farFoot: onToes(REAR_TOE, -44),
  bends: UPPER,
  face: 'effort',
};
const HOLD: Pose = {
  ...HOLD_BODY,
  nearFist: lead(HOLD_BODY, 24, 72),
  farFist: atCheek(HOLD_BODY, 0.3, -0.4),
};

// Frame 5 (6 ticks): the arm folds straight back down the way it went up, the elbow dropping in
// front of the ribs and the glove down to the chin, under the eye; he sinks back a touch into
// his knees, the chin tucked again.
const FOLD_BODY: Body = {
  ...GUARD,
  hip: at(-6.4, 35.6),
  torso: 16,
  head: 1,
  shrug: 2,
  twist: -0.1,
  farFoot: onToes(REAR_TOE, -20),
};
const FOLD: Pose = {
  ...FOLD_BODY,
  nearFist: at(12, 62),
  farFist: atCheek(FOLD_BODY),
};

/**
 * The idle's last frame (the lead shoulder up on the breath): the idle's own 9 -> 0 beat
 * carries him on into the loop, no frozen copy of the guard at the hand-off.
 */
const IDLE_HANG: Pose = {
  ...GUARD,
  shrug: 1.68,
  nearFist: at(8.82, 54.97),
  farFist: at(10.3, 62.3),
};

export const POSES: readonly Pose[] = [
  DIP,
  { ...DRIVE, effects: [dust(REAR_TOE - 2, 2.2, 0.2)] },
  {
    ...RIP_ARM,
    effects: [trail(RIP_ARM, 4, [9, 46], [13, 55], [15.5, 61]), dust(REAR_TOE - 2, 2.2, 0.5)],
  },
  {
    ...TOP_ARM,
    effects: [
      trail(TOP_ARM, 4.5, [11, 54], [14.5, 64], [15.5, 74], [14.5, 82]),
      {
        kind: 'speed',
        center: at(21, 99),
        length: 24,
        spread: 6,
        direction: 90,
        tone: 'sound',
      },
      {
        kind: 'flash',
        center: CONTACT,
        radius: 6,
        tone: 'strike',
      },
    ],
  },
  {
    ...HOLD,
    effects: [
      {
        kind: 'ring',
        center: CONTACT,
        radius: 12,
        progress: 0.65,
        tone: 'sound',
      },
      {
        kind: 'shards',
        center: CONTACT,
        radius: 15,
        progress: 0.5,
        tone: 'strike',
      },
    ],
  },
  FOLD,
  IDLE_HANG,
];
