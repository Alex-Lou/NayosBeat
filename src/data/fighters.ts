import type { FighterStats } from '../core/config';
import { px } from '../core/constants';

/** Placeholder stats shared by both grey-box fighters until the two archetypes (M3). */
export const GREYBOX_FIGHTER: FighterStats = {
  walkForwardSpeed: px(1.2),
  walkBackSpeed: px(1),
  // ~37 airborne ticks, ~85 px high.
  jumpVelocity: px(9),
  gravity: px(0.5),
  jumpForwardSpeed: px(1.8),
  jumpBackSpeed: px(1.6),
  preJumpFrames: 4,
  landingFrames: 3,
  standingPushbox: { width: px(28), height: px(80) },
  crouchingPushbox: { width: px(32), height: px(50) },
};
