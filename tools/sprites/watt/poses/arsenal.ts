import type { Effect, Foot, Pose } from '../../skeleton.ts';
import { at, GUARD, onBall, planted, smear, springAnkle } from './common.ts';
import { POSES as COUP_DE_PILON } from './forwardHeavy.ts';
import { keyPose } from './strike.ts';

/**
 * Watt's own arsenal strips (docs/watt-arsenal.md §4, §7):
 * - chainHigh (Coup de masse): the overhead in the string that bounces a juggled body (Rebond);
 * - specialBack (Câble): the cable shot out from the lead gauntlet, reeling the opponent in;
 * - specialClose & throwClose (Branchement): the point-blank command grab, lifted, spun a full
 *   turn (`turned: true`) and planted into the concrete;
 * - jumpSpecial & throwDive (Plongeon): the air grab diving down, then the crush on the floor;
 * - throwCatch (Plaqué): the slam of a jumper caught by the Plafonnier saisi.
 */

const HEAD = GUARD.torso + GUARD.head;
const air = (x: number, y: number, angle: number): Foot => ({ x, y, angle });

function withEffects(
  pose: Pose,
  more: readonly Effect[],
  recolor: (effect: Effect) => Effect = (effect) => effect,
): Pose {
  return { ...pose, effects: [...(pose.effects ?? []).map(recolor), ...more] };
}

const strikeTone = (effect: Effect): Effect =>
  effect.kind === 'smear' ? { ...effect, tone: 'strike' } : effect;

// --- chainHigh (Coup de masse, 6 frames: [7, 8, 3, 5, 5, 6], active frame 2) --------------------

const HIGH_LOAD = COUP_DE_PILON[2] ?? GUARD;
const HIGH_TOP = COUP_DE_PILON[3] ?? GUARD;
const HIGH_IMPACT = COUP_DE_PILON[4] ?? GUARD;

export const CHAIN_HIGH_POSES: readonly Pose[] = [
  {
    ...withEffects(
      HIGH_LOAD,
      [
        {
          kind: 'energy',
          center: at(HIGH_LOAD.farFist.x, HIGH_LOAD.farFist.y),
          radius: 2.5,
          tone: 'strike',
        },
      ],
      strikeTone,
    ),
    glows: [
      {
        center: at(HIGH_LOAD.farFist.x, HIGH_LOAD.farFist.y),
        reach: 22,
        power: 0.9,
        tone: 'strike',
      },
    ],
  },
  {
    ...withEffects(
      HIGH_TOP,
      [
        {
          kind: 'energy',
          center: at(HIGH_TOP.farFist.x, HIGH_TOP.farFist.y),
          radius: 3.2,
          tone: 'strike',
        },
      ],
      strikeTone,
    ),
    glows: [
      { center: at(HIGH_TOP.farFist.x, HIGH_TOP.farFist.y), reach: 26, power: 1.1, tone: 'strike' },
    ],
  },
  {
    ...withEffects(
      HIGH_IMPACT,
      [
        { kind: 'flash', center: at(36, 60), radius: 4.5, tone: 'strike' },
        { kind: 'shards', center: at(36, 58), radius: 10, progress: 0.25, tone: 'strike' },
      ],
      strikeTone,
    ),
    glows: [{ center: at(35, 60), reach: 30, power: 1.2, tone: 'strike' }],
  },
  ...COUP_DE_PILON.slice(5),
];

// --- specialBack (Câble, 8 frames: [4, 4, 6, 6, 6, 6, 7, 7], active frames 3-4) -----------------

export const SPECIAL_BACK_POSES: readonly Pose[] = [
  // 0-1: bracing on the rear leg, aiming the lead gauntlet out at chest height.
  keyPose({
    hip: [-9, 36],
    torso: 8,
    farFoot: planted(10),
    nearFoot: onBall(-18, -28),
    near: [2, 48],
    far: [18, 42],
    face: 'effort',
  }),
  keyPose({
    hip: [-8, 35.5],
    torso: 12,
    farFoot: planted(11),
    nearFoot: onBall(-18, -30),
    near: [0, 48],
    far: [26, 39],
    face: 'effort',
    effects: [{ kind: 'energy', center: at(28, 38), radius: 3 }],
    glows: [{ center: at(28, 38), reach: 24, power: 0.9, tone: 'sound' }],
  }),
  // 2: the gauntlet fires, the clamp opening as the cable shoots out.
  keyPose({
    hip: [-5, 35],
    torso: 18,
    reach: { far: 3 },
    farFoot: planted(13),
    nearFoot: onBall(-16, -32),
    near: [4, 47],
    far: [33, 37],
    farHand: 'open',
    face: 'effort',
    effects: [
      smear(2.5, [22, 39], [34, 37], [46, 36]),
      { kind: 'ring', center: at(36, 37), radius: 6, progress: 0.2, tone: 'sound' },
    ],
    glows: [{ center: at(36, 37), reach: 28, power: 1.1, tone: 'sound' }],
  }),
  // 3-4 (active): the cable taut across the cell at y = 36, electric arcs running along it.
  keyPose({
    hip: [-2, 35],
    torso: 24,
    reach: { far: 4 },
    farFoot: planted(14),
    nearFoot: onBall(-15, -34),
    near: [6, 46],
    far: [33, 36],
    farHand: 'open',
    face: 'kiai',
    effects: [
      smear(3, [30, 36], [44, 36], [56, 36]),
      { kind: 'speed', center: at(55, 36), length: 24, spread: 5, direction: 0, tone: 'sound' },
      { kind: 'energy', center: at(54, 36), radius: 3.8 },
      { kind: 'flash', center: at(38, 36), radius: 4, tone: 'sound' },
    ],
    glows: [{ center: at(38, 36), reach: 32, power: 1.2, tone: 'sound' }],
  }),
  keyPose({
    hip: [-3, 35],
    torso: 20,
    reach: { far: 3 },
    farFoot: planted(14),
    nearFoot: onBall(-16, -32),
    near: [10, 46],
    far: [30, 36],
    farHand: 'fist',
    face: 'kiai',
    effects: [
      smear(3, [56, 36], [42, 36], [30, 36]),
      { kind: 'speed', center: at(34, 36), length: 22, spread: 5, direction: 180, tone: 'sound' },
      { kind: 'energy', center: at(46, 36), radius: 3.2 },
    ],
    glows: [{ center: at(34, 36), reach: 28, power: 1.0, tone: 'sound' }],
  }),
  // 5-6: the yank back, hauling the line in with both shoulders, dust under the braced boot.
  keyPose({
    hip: [-9, 34.5],
    torso: -4,
    shrug: 3.8,
    farFoot: planted(12),
    nearFoot: planted(-19),
    near: [2, 46],
    far: [16, 42],
    face: 'effort',
    effects: [
      smear(3, [32, 37], [22, 40], [16, 42]),
      { kind: 'dust', x: 14, size: 1.1, progress: 0.35 },
    ],
  }),
  keyPose({
    hip: [-9.5, 36],
    torso: 4,
    farFoot: planted(10),
    near: [2, 49],
    far: [12, 48],
  }),
  // 7: back to the guard.
  GUARD,
];

// --- specialClose & throwClose (Branchement) ----------------------------------------------------

export const SPECIAL_CLOSE_POSES: readonly Pose[] = [
  // 0 (3 ticks): low coil, both clamps open wide and charged green.
  keyPose({
    hip: [-9, 33.5],
    torso: 16,
    shrug: 3.6,
    nearFoot: onBall(-18, -28),
    farFoot: planted(10),
    near: [4, 42],
    far: [12, 42],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
    effects: [{ kind: 'energy', center: at(10, 42), radius: 3 }],
    glows: [{ center: at(10, 42), reach: 24, power: 1.0, tone: 'sound' }],
  }),
  // 1-2 (active, 2 + 6 ticks): surging bear-hug, both clamps reaching x = 33..35 at chest height.
  keyPose({
    hip: [-2, 35],
    torso: 22,
    shrug: 2.8,
    reach: { near: 2, far: 2 },
    nearFoot: onBall(-15, -26),
    farFoot: planted(13),
    near: [23, 47],
    far: [28, 46],
    nearHand: 'open',
    farHand: 'open',
    face: 'kiai',
    effects: [
      smear(3, [8, 43], [18, 45], [28, 46]),
      { kind: 'energy', center: at(30, 46), radius: 3.4 },
    ],
    glows: [{ center: at(28, 46), reach: 28, power: 1.1, tone: 'sound' }],
  }),
  keyPose({
    hip: [-0.5, 35.5],
    torso: 24,
    shrug: 2.4,
    reach: { near: 2.4, far: 2.4 },
    nearFoot: onBall(-14, -28),
    farFoot: planted(14),
    near: [25, 49],
    far: [30, 48],
    nearHand: 'open',
    farHand: 'open',
    face: 'kiai',
    effects: [smear(2.5, [18, 46], [24, 48], [30, 48])],
  }),
  // 3-5 (whiff recovery, 8 + 14 + 14 ticks): clamps slam shut on air, heavy recovery.
  keyPose({
    hip: [0, 34.5],
    torso: 26,
    nearFoot: onBall(-14, -28),
    farFoot: planted(14),
    near: [22, 46],
    far: [26, 45],
    face: 'effort',
  }),
  keyPose({
    hip: [-5, 35.5],
    torso: 16,
    farFoot: planted(11),
    near: [10, 48],
    far: [16, 47],
  }),
  GUARD,
];

export const THROW_CLOSE_POSES: readonly Pose[] = [
  // 0 (4 ticks): wrenching the opponent off the floor by the shoulders.
  keyPose({
    hip: [-6, 33],
    torso: 18,
    shrug: 3.8,
    nearFoot: onBall(-18, -32),
    farFoot: planted(11),
    near: [18, 56],
    far: [22, 54],
    face: 'effort',
    effects: [{ kind: 'energy', center: at(20, 55), radius: 3.2 }],
    glows: [{ center: at(20, 55), reach: 26, power: 1.0, tone: 'sound' }],
  }),
  // 1 (4 ticks): hoisted high above the bulb, both arms straight up.
  keyPose({
    hip: [-5, 39],
    torso: -4,
    shrug: 2.0,
    nearFoot: onBall(-16, -34),
    farFoot: planted(11),
    near: [10, 80],
    far: [16, 82],
    face: 'effort',
    effects: [
      smear(3.5, [20, 56], [18, 70], [16, 82]),
      { kind: 'energy', center: at(14, 82), radius: 3.8 },
    ],
    glows: [{ center: at(14, 82), reach: 30, power: 1.2, tone: 'sound' }],
  }),
  // 2 (2 ticks): spinning a full turn (`turned: true`) with the opponent overhead!
  {
    ...keyPose({
      hip: [-3, 38],
      torso: 8,
      shrug: 2.6,
      nearFoot: onBall(-14, -30),
      farFoot: planted(12),
      near: [16, 74],
      far: [22, 72],
      face: 'kiai',
      effects: [
        smear(4, [4, 80], [14, 78], [22, 72]),
        {
          kind: 'ring',
          center: at(10, 62),
          radius: 14,
          progress: 0.25,
          squash: 0.4,
          tone: 'sound',
        },
      ],
      glows: [{ center: at(18, 72), reach: 32, power: 1.2, tone: 'sound' }],
    }),
    turned: true,
  },
  // 3 (1 tick, release — 140 dmg!): planted straight down into the concrete!
  keyPose({
    hip: [0.5, 30.5],
    torso: 44,
    shrug: 4.0,
    reach: { near: 3, far: 4 },
    farFoot: planted(14),
    nearFoot: onBall(-14, -34),
    near: [24, 22],
    far: [32, 16],
    nearHand: 'open',
    farHand: 'open',
    face: 'kiai',
    effects: [
      smear(4.5, [22, 70], [30, 44], [32, 16]),
      { kind: 'flash', center: at(34, 14), radius: 5.5, tone: 'sound' },
      { kind: 'shards', center: at(34, 14), radius: 11, progress: 0.2, tone: 'strike' },
      { kind: 'ring', center: at(34, 8), radius: 14, progress: 0.2, squash: 0.3, tone: 'sound' },
      { kind: 'dust', x: 34, size: 1.7, progress: 0.25 },
    ],
    glows: [{ center: at(34, 14), reach: 38, power: 1.4, tone: 'sound' }],
  }),
  // 4-6 (8 + 8 + 8 ticks): the ground slam held, then rising back into the guard.
  springAnkle({
    ...GUARD,
    hip: at(-1, 31.5),
    torso: 38,
    head: HEAD - 38,
    farFoot: planted(13),
    nearFoot: onBall(-15, -30),
    nearFist: at(22, 24),
    farFist: at(28, 20),
    face: 'effort',
    effects: [{ kind: 'dust', x: 36, size: 1.4, progress: 0.65 }],
  }),
  springAnkle({
    ...GUARD,
    hip: at(-5, 35),
    torso: 18,
    head: HEAD - 18,
    farFoot: planted(10),
    nearFist: at(10, 44),
    farFist: at(16, 42),
  }),
  GUARD,
];

// --- jumpSpecial & throwDive (Plongeon) ---------------------------------------------------------

const TUCKED = { nearFoot: air(-12, 12, -52), farFoot: air(6, 13, -14) } as const;
const AIR_BENDS = { farKnee: 'front' } as const;

export const JUMP_SPECIAL_POSES: readonly Pose[] = [
  // 0-1: spreading out in the air, both clamps open and charged green.
  keyPose({
    nearFoot: air(-16, 18, -36),
    farFoot: air(2, 20, -14),
    hip: [-8, 38],
    torso: 8,
    near: [-4, 62],
    far: [14, 64],
    nearHand: 'open',
    farHand: 'open',
    bends: AIR_BENDS,
    face: 'effort',
    effects: [{ kind: 'energy', center: at(12, 62), radius: 2.8 }],
  }),
  keyPose({
    ...TUCKED,
    hip: [-5, 31],
    torso: 34,
    near: [10, 42],
    far: [22, 40],
    nearHand: 'open',
    farHand: 'open',
    bends: AIR_BENDS,
    face: 'effort',
    effects: [{ kind: 'energy', center: at(20, 40), radius: 3.2 }],
    glows: [{ center: at(20, 40), reach: 26, power: 1.0, tone: 'sound' }],
  }),
  // 2 (active): full body dive, both open clamps reaching down to x = 31, y = 12..16.
  keyPose({
    ...TUCKED,
    hip: [-2, 25],
    torso: 52,
    reach: { near: 3, far: 3 },
    near: [19, 17],
    far: [26, 15],
    nearHand: 'open',
    farHand: 'open',
    bends: AIR_BENDS,
    face: 'kiai',
    effects: [
      smear(3.5, [18, 42], [24, 28], [28, 14]),
      { kind: 'energy', center: at(28, 14), radius: 3.5 },
    ],
    glows: [{ center: at(26, 15), reach: 28, power: 1.1, tone: 'sound' }],
  }),
  // 3-5: recovery in the air.
  keyPose({ ...TUCKED, hip: [-5, 30], torso: 34, near: [10, 30], far: [18, 28], bends: AIR_BENDS }),
  keyPose({
    nearFoot: air(-16, 12, -30),
    farFoot: air(2, 12, -14),
    hip: [-8, 36],
    torso: 16,
    bends: AIR_BENDS,
  }),
  keyPose({
    nearFoot: air(-18, 8, -26),
    farFoot: air(4, 7, -6),
    hip: [-9, 39],
    torso: 8,
    bends: AIR_BENDS,
  }),
];

export const THROW_DIVE_POSES: readonly Pose[] = [
  // 0-1: pinning the opponent under his weight, then raising both fists above them.
  keyPose({
    hip: [-3, 28],
    torso: 40,
    shrug: 3.8,
    farFoot: planted(12),
    nearFoot: onBall(-15, -36),
    near: [18, 30],
    far: [24, 28],
    face: 'effort',
  }),
  keyPose({
    hip: [-6, 36],
    torso: 12,
    shrug: 2.6,
    farFoot: planted(12),
    nearFoot: onBall(-15, -32),
    near: [14, 62],
    far: [20, 64],
    face: 'effort',
    effects: [{ kind: 'energy', center: at(18, 64), radius: 3.4 }],
    glows: [{ center: at(18, 64), reach: 26, power: 1.0, tone: 'sound' }],
  }),
  // 2: both fists coming down hard.
  keyPose({
    hip: [-1, 32],
    torso: 32,
    reach: { near: 2, far: 3 },
    farFoot: planted(13),
    nearFoot: onBall(-14, -34),
    near: [20, 44],
    far: [26, 42],
    face: 'kiai',
    effects: [smear(4, [16, 64], [22, 52], [26, 42])],
  }),
  // 3 (release — 100 dmg): double-fist crush on the floor!
  keyPose({
    hip: [1, 30.5],
    torso: 44,
    reach: { near: 3, far: 4 },
    farFoot: planted(14),
    nearFoot: onBall(-13, -34),
    near: [21, 24],
    far: [29, 18],
    face: 'kiai',
    effects: [
      smear(4, [24, 44], [28, 28], [30, 14]),
      { kind: 'flash', center: at(32, 12), radius: 5, tone: 'sound' },
      { kind: 'ring', center: at(32, 8), radius: 12, progress: 0.2, squash: 0.3, tone: 'sound' },
      { kind: 'dust', x: 32, size: 1.5, progress: 0.3 },
    ],
    glows: [{ center: at(32, 12), reach: 34, power: 1.3, tone: 'sound' }],
  }),
  // 4-6: rising back into the guard.
  keyPose({
    hip: [-1, 31.5],
    torso: 38,
    reach: { near: 2, far: 3 },
    farFoot: planted(13),
    nearFoot: onBall(-14, -32),
    near: [19, 26],
    far: [25, 22],
    face: 'effort',
  }),
  keyPose({ hip: [-5, 35], torso: 18, farFoot: planted(10), near: [10, 44], far: [16, 42] }),
  GUARD,
];

// --- throwCatch (Plaqué of the Plafonnier saisi, 7 frames: [4, 4, 2, 1, 6, 7, 7]) ----------------

export const THROW_CATCH_POSES: readonly Pose[] = [
  // 0-1: the jumper caught high above the bulb, then wrenched forward and down.
  keyPose({
    hip: [-4.5, 39],
    torso: -2,
    shrug: 2.0,
    near: [10, 78],
    far: [16, 80],
    face: 'effort',
    effects: [{ kind: 'energy', center: at(14, 80), radius: 3.4 }],
    glows: [{ center: at(14, 80), reach: 28, power: 1.1, tone: 'sound' }],
  }),
  keyPose({
    hip: [-3.5, 36.5],
    torso: 12,
    shrug: 2.8,
    near: [16, 66],
    far: [22, 64],
    face: 'effort',
    effects: [smear(3.5, [14, 80], [18, 72], [22, 64])],
  }),
  // 2: driving them down toward the floor in a wide green arc.
  keyPose({
    hip: [-1.5, 33.5],
    torso: 26,
    shrug: 3.4,
    reach: { near: 2, far: 3 },
    farFoot: planted(12),
    nearFoot: onBall(-15, -28),
    near: [22, 42],
    far: [28, 38],
    face: 'kiai',
    effects: [smear(4, [20, 64], [25, 50], [28, 38])],
  }),
  // 3 (release — 110 dmg): slammed flat into the concrete in front of him!
  keyPose({
    hip: [0.5, 31],
    torso: 42,
    shrug: 3.8,
    reach: { near: 3, far: 4 },
    farFoot: planted(14),
    nearFoot: onBall(-14, -32),
    near: [24, 22],
    far: [32, 16],
    nearHand: 'open',
    farHand: 'open',
    face: 'kiai',
    effects: [
      smear(4.5, [26, 40], [30, 26], [32, 16]),
      { kind: 'flash', center: at(34, 14), radius: 5, tone: 'sound' },
      { kind: 'shards', center: at(34, 14), radius: 9, progress: 0.25, tone: 'strike' },
      { kind: 'dust', x: 34, size: 1.6, progress: 0.25 },
    ],
    glows: [{ center: at(34, 14), reach: 34, power: 1.3, tone: 'sound' }],
  }),
  // 4-6: rising back into the guard.
  keyPose({
    hip: [-1, 32],
    torso: 36,
    farFoot: planted(13),
    nearFoot: onBall(-15, -28),
    near: [20, 26],
    far: [26, 22],
    face: 'effort',
    effects: [{ kind: 'dust', x: 36, size: 1.3, progress: 0.65 }],
  }),
  keyPose({ hip: [-5.5, 35.5], torso: 16, farFoot: planted(10), near: [10, 46], far: [16, 44] }),
  GUARD,
];
