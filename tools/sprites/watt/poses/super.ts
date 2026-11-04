import { at, onBall, planted, smear, type Pose } from './common.ts';
import { keyPose } from './strike.ts';

export const ANIMATED: boolean = true;

/**
 * super (Plein feu, docs/watt.md §7): 9 frames, 1, 2, [6, 7, 3], 6, 8, 8, 8 ticks (49), active
 * frames 2-4: a left hook on tick 3 (frame 2), a right hook on tick 9 (frame 3), both fists down
 * to the floor on tick 16 (frame 4), which floors; hitbox x 4..50 / y 0..92. Invincible from the
 * first frame, the flash on tick 1: the bulb at full glow. He never steps (every blow lands
 * where the first one did): the boots stay put, the hips and the shoulders throw the blows.
 */

const PLANTED = { farFoot: planted(9), nearFoot: onBall(-16, -30) } as const;

export const POSES: readonly Pose[] = [
  // 0-1: the flash: drawn in, the whole body charged, the clamps shut.
  keyPose({
    hip: [-9.5, 36],
    torso: 10,
    shrug: 4,
    nearOff: [0, -1],
    farOff: [1, -1],
    face: 'kiai',
    effects: [{ kind: 'energy', center: at(-4, 76), radius: 5, tone: 'platine' }],
    glows: [{ center: at(-4, 76), reach: 34, power: 1.3, tone: 'platine' }],
  }),
  keyPose({
    hip: [-9, 35.5],
    torso: 13,
    shrug: 4,
    nearOff: [0, -2],
    farOff: [1, -2],
    face: 'kiai',
    glows: [{ center: at(10, 52), reach: 30, power: 1.2, tone: 'platine' }],
  }),
  // 2 (active): the left hook, the lead clamp swung round at the jaw.
  keyPose({
    ...PLANTED,
    hip: [-2, 35.5],
    torso: 26,
    twist: 0.2,
    reach: { far: 6 },
    far: [40, 56],
    nearOff: [0, -2],
    face: 'kiai',
    effects: [
      smear(3.5, [18, 62], [30, 60], [40, 56]),
      { kind: 'arc', from: at(16, 62), to: at(44, 55), spread: 4 },
      { kind: 'flash', center: at(42, 56), radius: 4.5, tone: 'sound' },
    ],
    glows: [{ center: at(40, 56), reach: 32, power: 1.2, tone: 'sound' }],
  }),
  // 3 (active): the right hook, the rear clamp through, the shoulders turned the other way.
  keyPose({
    ...PLANTED,
    hip: [-1.5, 35.5],
    torso: 26,
    twist: 0.8,
    reach: { near: 9 },
    near: [41, 54],
    far: [21, 47],
    face: 'kiai',
    effects: [
      smear(3.5, [14, 60], [28, 58], [41, 54]),
      { kind: 'arc', from: at(12, 60), to: at(45, 53), spread: 4.5 },
      { kind: 'flash', center: at(43, 54), radius: 5, tone: 'sound' },
    ],
    glows: [{ center: at(41, 54), reach: 32, power: 1.2, tone: 'sound' }],
  }),
  // 4 (active): both fists down to the floor in front of him, all his weight behind them.
  keyPose({
    ...PLANTED,
    hip: [0, 31],
    torso: 44,
    reach: { near: 2, far: 3 },
    near: [22, 26],
    far: [31, 18],
    face: 'kiai',
    effects: [
      smear(3, [28, 50], [33, 32], [34, 14]),
      { kind: 'column', base: at(36, 2), height: 86, width: 18, progress: 0.25, tone: 'platine' },
      { kind: 'arc', from: at(18, 72), to: at(38, 8), spread: 5, tone: 'platine' },
      { kind: 'flash', center: at(36, 12), radius: 5.5, tone: 'platine' },
      { kind: 'ring', center: at(36, 8), radius: 14, progress: 0.2, squash: 0.3, tone: 'platine' },
      { kind: 'dust', x: 36, size: 1.6, progress: 0.3 },
      { kind: 'energy', center: at(38, 8), radius: 4, tone: 'platine' },
    ],
    glows: [{ center: at(34, 16), reach: 38, power: 1.4, tone: 'platine' }],
  }),
  // 5-8: the fists in the floor a beat, then back up into the guard.
  keyPose({
    ...PLANTED,
    hip: [-0.5, 31.5],
    torso: 42,
    reach: { near: 3, far: 5 },
    near: [21, 25],
    far: [30, 17],
    face: 'effort',
  }),
  keyPose({ ...PLANTED, hip: [-3, 33.5], torso: 30, near: [18, 34], far: [27, 28] }),
  keyPose({ ...PLANTED, hip: [-6, 35.5], torso: 18, near: [10, 46], far: [16, 45] }),
  keyPose({ hip: [-8.5, 37], torso: 10 }),
];
