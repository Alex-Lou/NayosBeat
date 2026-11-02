import type { Body } from '../skeleton.ts';

/**
 * Watt's measurements in world pixels (docs/watt.md §10), from the colosse of Zen-Tazzer at
 * Riff's density (her head's 7.2 source pixels per art pixel): about 85 px standing, the bulb
 * included, his guard about 80 (Nayo's 79, Riff's 73). A colosse: a long heavy torso, wide
 * shoulders, long thick arms (the exoskeleton's), short thick legs, big rangers. The bulb sits on
 * its brass cap in the collar: its center a long way above the neck. Drawn three quarters from
 * the front like the reference and Riff: the near shoulder and hip behind the spine, so the
 * spreads are negative.
 */
export const WATT_BODY: Body = {
  shoulder: 23.0,
  neck: 26.0,
  headDistance: 12.0,
  headRadius: 7.0,
  headPivot: 2.2,
  shoulderSpread: -6.2,
  hipSpread: -2.6,
  upperArm: 13.0,
  forearm: 12.0,
  thigh: 18.5,
  shin: 16.8,
  ankle: 6.0,
  footRadius: 3.0,
  foot: 8.0,
  heel: 3.0,
};
