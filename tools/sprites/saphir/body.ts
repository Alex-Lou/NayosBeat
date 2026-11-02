import type { Body } from '../skeleton.ts';

/**
 * Saphir's measurements in world pixels (docs/saphir.md §9): about 72 px from her soles to the
 * crown of her mask in the guard. A slim, upright woman in her thirties, a dancer who kicks:
 * legs a little long for her height but no longer (the owner's call at porte 2), a short
 * waist, narrow shoulders, short slim arms. Drawn in profile like Nayo, so the spreads are
 * positive (the near shoulder and hip in front of the spine).
 */
export const SAPHIR_BODY: Body = {
  shoulder: 19.6,
  neck: 23,
  headDistance: 6.6,
  headRadius: 5.2,
  headPivot: 2.2,
  shoulderSpread: 1.0,
  hipSpread: 1.2,
  upperArm: 10.8,
  forearm: 9.9,
  thigh: 17.7,
  shin: 16.3,
  ankle: 4.2,
  footRadius: 2.0,
  foot: 6.6,
  heel: 2.4,
};

/**
 * Where her shoe bends, from the back of the heel's sole along the foot (world px): the ball of
 * the foot. On her toes, the toe box lies flat on the floor in front of it (look.ts drawShoe).
 */
export const SAPHIR_BALL = 3.6;
