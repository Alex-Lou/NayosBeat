import type { Body } from '../skeleton.ts';

/**
 * Riff's measurements in world pixels, taken from the punk girl of Zen-Tazzer at the density of
 * her head (head.ts: 33 rows from the spikes to the chin): she stands about 78 px tall, her guard
 * about 75 (Nayo's: 79). Long legs, a short waist under a cropped jacket, slim arms; chunky
 * combat boots (a high ankle, a thick lugged sole). The head sits high over the low popped
 * collar, as in the reference: about 5 px of neck between the chin and the bandeau's neckline,
 * room for the choker, the collarbones and the long chain.
 *
 * She is drawn three quarters from the front, like the reference, where Nayo is nearly in
 * profile: her shoulders and hips spread across the image, the near ones (camera side) behind
 * the spine, so the spreads are negative. The near arm hangs at the back of her silhouette and
 * the far shoulder shows at its front edge, leaving the open jacket, the crop top and the
 * midriff in view.
 */
export const RIFF_BODY: Body = {
  shoulder: 19.6,
  neck: 22.8,
  headDistance: 11.0,
  headRadius: 5.5,
  headPivot: 2.2,
  shoulderSpread: -4.8,
  hipSpread: -2,
  upperArm: 11.4,
  forearm: 10.4,
  thigh: 16.8,
  shin: 15.4,
  ankle: 5.2,
  footRadius: 2.6,
  foot: 6.8,
  heel: 2.6,
};
