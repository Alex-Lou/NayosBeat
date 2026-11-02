import { armOut, at, behindBack, GUARD, raised, smear, type Effect, type Pose } from './common.ts';

/**
 * Her two kicks in the air, overheads both, the arms out of her back to balance the kick.
 *
 * jumpLight (Pointe sautée): 5 frames, 2, 2, 6, 3, 3 ticks (16), the heel out on frame 2 (ticks
 * 4-9), hitbox 4..32 / 8..24: a half turn, her back to the opponent, the heel lashing out.
 *
 * jumpHeavy (Chassé sauté): 6 frames, 3, 4, 5, 3, 3, 4 ticks (22), the heel out on frame 2
 * (ticks 7-11), hitbox 4..40 / -2..18: a spinning heel kick, the body turned, the heel driven
 * down and forward over the guard.
 */

/** Tucked in the air: both knees up, the torso upright. */
export const TUCK: Pose = behindBack({
  ...GUARD,
  hip: at(-2, 38),
  torso: 0,
  nearFoot: raised(6, 22, -30),
  farFoot: raised(-4, 21, -45),
  bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'down' },
});

/**
 * Her magic on a turning kick (docs/saphir.md §9): the cut sapphire shards along the trail, the
 * grooves of a record round the turn, two swing notes off the blow.
 */
export function turnMagic(
  limb: readonly [number, number],
  turn: readonly [number, number],
  radius: number,
  arc: readonly [number, number],
): Effect[] {
  return [
    { kind: 'shards', center: at(limb[0] - 4, limb[1]), radius: 7, progress: 0.25, tone: 'sound' },
    {
      kind: 'grooves',
      center: at(turn[0], turn[1]),
      radius,
      from: arc[0],
      to: arc[1],
      progress: 0.2,
    },
    { kind: 'notes', center: at(limb[0] - 2, limb[1] + 6), count: 2, progress: 0.2 },
  ];
}

/**
 * jumpLight turned (Pointe sautée, owner's request: her kicks turn in the air too): a half turn
 * in the air, her back to the opponent, the heel lashing out of it like a backhand.
 */
const LIGHT: readonly Pose[] = [
  TUCK,
  {
    ...TUCK,
    turned: true,
    torso: 8,
    farFoot: raised(-10, 22, -80),
    bends: { ...TUCK.bends, farKnee: 'down' },
  },
  {
    ...TUCK,
    turned: true,
    torso: 18,
    farFoot: raised(-26, 16, -100),
    bends: { ...TUCK.bends, farKnee: 'down' },
    face: 'kiai',
    effects: [
      smear(2.5, [8, 22], [16, 18], [24, 15]),
      ...turnMagic([24, 15], [-2, 30], 16, [-40, 20]),
    ],
  },
  {
    ...TUCK,
    turned: true,
    torso: 8,
    farFoot: raised(-16, 20, -90),
    bends: { ...TUCK.bends, farKnee: 'down' },
  },
  TUCK,
];

/** The arms open behind and above her, against the kicking leg. */
const open = (pose: Pose): Pose =>
  armOut(armOut(behindBack(pose), 'near', Math.min(85, 85 - pose.torso), 15), 'far', -90, 19.5);

export const JUMP_LIGHT: readonly Pose[] = LIGHT.map(open);

/**
 * jumpHeavy turned (Chassé sauté, owner's request): a spinning heel kick in the air, the body
 * turned, the heel driven down and forward over the guard.
 */
const HEAVY: readonly Pose[] = [
  TUCK,
  {
    ...TUCK,
    turned: true,
    torso: 10,
    farFoot: raised(-14, 28, -80),
    bends: { ...TUCK.bends, farKnee: 'down' },
  },
  {
    ...TUCK,
    turned: true,
    hip: at(10, 34),
    torso: 32,
    nearFoot: raised(22, 18, -52),
    farFoot: raised(-15, 12, -100),
    bends: { ...TUCK.bends, farKnee: 'down' },
    face: 'kiai',
    effects: [
      smear(3, [16, 26], [26, 18], [35, 13]),
      ...turnMagic([35, 13], [10, 34], 20, [-60, 10]),
    ],
  },
  {
    ...TUCK,
    turned: true,
    hip: at(6, 35),
    torso: 20,
    nearFoot: raised(14, 19, -45),
    farFoot: raised(-14, 16, -95),
    bends: { ...TUCK.bends, farKnee: 'down' },
  },
  { ...TUCK, torso: -8, nearFoot: raised(14, 24, -20) },
  TUCK,
];

export const JUMP_HEAVY: readonly Pose[] = HEAVY.map(open);
