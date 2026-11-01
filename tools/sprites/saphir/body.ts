import type { Body } from '../skeleton.ts';

/**
 * Saphir's measurements in world pixels (docs/saphir.md §9): about 77 px from her soles to the
 * top of her head in the guard, 82 with the hat. A slim, upright woman of sixty-five who still
 * kicks: long legs for her height, a short waist, narrow shoulders, slim arms. Drawn in profile
 * like Nayo, so the spreads are positive (the near shoulder and hip in front of the spine).
 */
export const SAPHIR_BODY: Body = {
  shoulder: 19.6,
  neck: 23,
  headDistance: 6.6,
  headRadius: 5.2,
  headPivot: 2.2,
  shoulderSpread: 1.0,
  hipSpread: 1.2,
  upperArm: 11.8,
  forearm: 10.8,
  thigh: 18.6,
  shin: 17.2,
  ankle: 4.2,
  footRadius: 2.0,
  foot: 6.6,
  heel: 2.4,
};
