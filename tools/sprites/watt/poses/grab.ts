import { at, GUARD, inReach, onBall, planted, smear, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * grab (Prise, docs/watt.md §5): 6 frames, 3, 3, [3], 6, 8, 8 ticks (31), active frame 2
 * (ticks 6-8), hitbox x 6..40 / y 20..60: the longest grab of the cast, his signature. Frames
 * 3-5 close on nothing (the missed grab) and come back to the guard; on a catch the game goes on
 * with hold. From and back to the guard.
 *
 * A grappler's two-handed reach, nothing like Riff's one-handed snatch: both clamps open wide at
 * the belly, then the whole colosse leans in behind them, the arms out at full stretch, the
 * clamps open at the opponent's shoulders, a short green trail behind each. On a whiff they shut
 * on air and he comes back heavy: the arms drop, the weight rocks back onto the rear leg, the
 * guard last.
 */

// Frame 0 (3 ticks): the gather. The weight sinks, both clamps open low in front of the belly.
const GATHER: Pose = {
  ...GUARD,
  hip: at(-10, 35.5),
  torso: 13,
  shrug: 3.2,
  nearFist: at(1.5, 46),
  farFist: at(8.5, 46.5),
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
};

// Frame 1 (3 ticks): the lunge. The hips drive in over the lead foot, the clamps rising, open.
const LUNGE: Pose = {
  ...GUARD,
  hip: at(-2.5, 36),
  torso: 20,
  shrug: 2.6,
  reach: { near: 1.2, far: 1.0 },
  nearFoot: onBall(-15.5, -20),
  farFoot: planted(12.5, 0),
  nearFist: at(14, 52),
  farFist: at(19, 51.5),
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
  effects: [smear(2.5, [6, 47], [10, 50], [14, 52]), smear(2.5, [13, 47], [16, 50], [19, 51.5])],
};

// Frame 2 (3 ticks, active): full stretch, the clamps open at the shoulders, magnetic arc between them.
const REACH: Pose = {
  ...GUARD,
  hip: at(-0.5, 36),
  torso: 24,
  shrug: 2.2,
  reach: { near: 2.2, far: 2.0 },
  nearFoot: onBall(-14.5, -22),
  farFoot: planted(13.5, 0),
  nearFist: at(26, 54),
  farFist: at(31.5, 53),
  nearHand: 'open',
  farHand: 'open',
  face: 'kiai',
  effects: [
    smear(2, [14, 52], [20, 53.5], [26, 54]),
    smear(2, [19, 51.5], [26, 52.5], [31.5, 53]),
    { kind: 'arc', from: at(24, 54), to: at(34, 53), spread: 2.5 },
    { kind: 'energy', center: at(30, 53.5), radius: 2.8 },
    { kind: 'ring', center: at(30, 53.5), radius: 8, progress: 0.3, squash: 1.5, tone: 'sound' },
  ],
  glows: [{ center: at(29, 53.5), reach: 22, power: 0.9, tone: 'sound' }],
};

// Frame 3 (5 ticks): shut on air: the clamps close, the arms still out, dropping a little.
const SHUT: Pose = {
  ...REACH,
  nearFist: at(23, 52),
  farFist: at(28, 51),
  nearHand: 'fist',
  farHand: 'fist',
  face: 'focus',
  effects: [{ kind: 'energy', center: at(26, 51.5), radius: 2 }],
  glows: [],
};

// Frame 4 (6 ticks): pulling the clamps back toward the chest.
const PULL_IN: Pose = {
  ...GUARD,
  hip: at(-5, 36.2),
  torso: 16,
  shrug: 2.5,
  nearFoot: onBall(-16, -20),
  farFoot: planted(10.5, 0),
  nearFist: at(13, 51),
  farFist: at(18, 50.5),
};

// Frame 5 (6 ticks): heavy recovery, the weight rocking back, the arms coming in.
const BACK: Pose = {
  ...GUARD,
  hip: at(-8, 36.5),
  torso: 11,
  shrug: 2.6,
  nearFoot: onBall(-17, -19),
  nearFist: at(5, 50),
  farFist: at(10, 50),
};

// Frame 6 (5 ticks): back into the guard.
export const POSES: readonly Pose[] = [GATHER, LUNGE, REACH, SHUT, PULL_IN, BACK, GUARD].map(
  inReach,
);
