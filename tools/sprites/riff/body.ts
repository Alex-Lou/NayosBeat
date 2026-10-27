import type { Body } from '../skeleton.ts';

/**
 * Riff's measurements in world pixels: about nine tenths of Nayo (her guard stands about 70 px
 * to his 79), a shorter torso and shorter arms, a head a little smaller than his but as big for
 * her body (head.ts: 25 rows, a face of 15 under a 10-row cap), legs that stay long enough to
 * sit deep in a b-girl's stance, chunky high-tops (a higher ankle, a thicker sole). The head
 * sits high enough over the collar to show a short neck in the jaw's shadow.
 */
export const RIFF_BODY: Body = {
  shoulder: 19.5,
  neck: 23.5,
  headDistance: 7.8,
  headRadius: 5.5,
  headPivot: 2.2,
  shoulderSpread: 1.3,
  hipSpread: 1.5,
  upperArm: 11.6,
  forearm: 10.6,
  thigh: 17.6,
  shin: 16.2,
  ankle: 5,
  footRadius: 2.5,
  foot: 6.6,
  heel: 2.6,
};
