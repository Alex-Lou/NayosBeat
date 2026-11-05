import { at, GUARD, onBall, planted, smear, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * specialForward (Surcharge, docs/watt.md §5): 9 frames, 3, 3, 4, 4, [4], 4, 4, 6, 6 ticks
 * (38), active frame 4 (ticks 14-17), hitbox x 8..38 / y 20..70; the game moves him 56 px on
 * ticks 3-17. The charge of the source drawing (Zen-Tazzer's colosse, 3 - Mob Idle): the near
 * shoulder down and forward like a battering ram, the gauntlet across the chest, the bulb low
 * behind the shoulder plate. Speed lines and a green trail behind the shoulder on the rush, dust
 * at the rear foot as he pushes off.
 */

// Frame 0: the load. He sinks, the near shoulder turning in, the bulb dropping.
const LOAD: Pose = {
  ...GUARD,
  hip: at(-10.5, 34),
  torso: 16,
  head: -12,
  shrug: 3.4,
  twist: 0.1,
  nearFist: at(3.5, 48),
  farFist: at(9.5, 48),
  face: 'effort',
};

// Frames 1-2: the shoulder down, the push off the rear foot.
const DIP: Pose = {
  ...LOAD,
  hip: at(-7.5, 33),
  torso: 26,
  shrug: 3.8,
  reach: { near: 1.6 },
  nearFoot: onBall(-17.5, -26),
  nearFist: at(7, 48),
  farFist: at(15, 48),
  effects: [{ kind: 'dust', x: -16, size: 1, progress: 0.3 }],
};

const PUSH: Pose = {
  ...DIP,
  hip: at(-2.5, 33),
  torso: 32,
  reach: { near: 2.4 },
  nearFoot: onBall(-17.5, -32),
  farFoot: planted(12.5, 0),
  nearFist: at(12.5, 49),
  farFist: at(23, 48),
  effects: [{ kind: 'dust', x: -16, size: 1.2, progress: 0.6 }],
};

// Frame 3: the rush, the ram out in front, the exoskeleton lit by its armor.
const RUSH: Pose = {
  ...PUSH,
  hip: at(-1, 34),
  torso: 36,
  reach: { near: 3.0 },
  nearFoot: onBall(-14, -36),
  farFoot: planted(13.5, 0),
  nearFist: at(13.5, 50),
  farFist: at(25, 49),
  bends: { ...GUARD.bends, nearElbow: 'back' },
  effects: [
    smear(3, [-2, 60], [4, 61], [10, 60]),
    { kind: 'speed', center: at(6, 54), length: 24, spread: 8, direction: 0, tone: 'sound' },
    { kind: 'arc', from: at(-6, 58), to: at(16, 54), spread: 3.5 },
  ],
  glows: [{ center: at(10, 56), reach: 26, power: 1.0, tone: 'sound' }],
};

// Frame 4 (active): the impact, the shoulder plate into the opponent's chest with a plasma burst.
const IMPACT: Pose = {
  ...RUSH,
  hip: at(0, 34),
  torso: 38,
  reach: { near: 3.4 },
  nearFist: at(14, 50.5),
  farFist: at(30, 50),
  face: 'kiai',
  effects: [
    smear(3, [0, 61], [7, 62], [14, 61]),
    { kind: 'plasma', center: at(18, 58), radius: 6, tone: 'sound' },
    { kind: 'arc', from: at(-4, 62), to: at(28, 56), spread: 4.5 },
    { kind: 'arc', from: at(2, 48), to: at(32, 52), spread: 3.5 },
    { kind: 'flash', center: at(18, 58), radius: 4.5, tone: 'sound' },
    { kind: 'ring', center: at(18, 58), radius: 12, progress: 0.25, tone: 'sound' },
  ],
  glows: [{ center: at(16, 58), reach: 32, power: 1.3, tone: 'sound' }],
};

// Frames 5-7: the follow-through, the weight still going.
const THROUGH: Pose = {
  ...IMPACT,
  hip: at(0.5, 34.5),
  torso: 34,
  face: 'effort',
  effects: [
    { kind: 'ring', center: at(20, 56), radius: 16, progress: 0.6, tone: 'sound' },
    { kind: 'arc', from: at(6, 56), to: at(24, 52), spread: 3 },
  ],
  glows: [{ center: at(16, 56), reach: 22, power: 0.85, tone: 'sound' }],
};

const BRAKE: Pose = {
  ...GUARD,
  hip: at(-2, 35),
  torso: 28,
  shrug: 3.2,
  nearFoot: onBall(-15.5, -26),
  farFoot: planted(11, 0),
  nearFist: at(10, 50),
  farFist: at(20, 49.5),
  effects: [{ kind: 'dust', x: 12, size: 1.1, progress: 0.4 }],
};

const SETTLE: Pose = {
  ...GUARD,
  hip: at(-4.5, 35.5),
  torso: 22,
  shrug: 3,
  nearFoot: onBall(-16.5, -22),
  farFoot: planted(9.5, 0),
  nearFist: at(6, 50),
  farFist: at(15, 49.5),
};

// Frames 8-9: back up into the guard.
const UP: Pose = { ...GUARD, hip: at(-8, 36.5), torso: 11 };

export const POSES: readonly Pose[] = [
  LOAD,
  DIP,
  PUSH,
  RUSH,
  IMPACT,
  THROUGH,
  BRAKE,
  SETTLE,
  UP,
  GUARD,
];
