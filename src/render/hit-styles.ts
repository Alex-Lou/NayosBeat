import type { Colorway } from '../art';
import type { FighterId } from '../data/roster';

/**
 * How a fighter's blows look where they land: each fighter has its own shape and colors, so a
 * hit tells who threw it at a glance (as in Tekken).
 */
export interface HitStyle {
  /**
   * `slash`: crescent slashes, a starburst of rays and a shockwave ring.
   * `claw`: crossed blade cuts, claw marks and a spray of diamond shards.
   */
  readonly shape: 'slash' | 'claw';
  /** The fighter's energy: slashes, cuts, rings, the glow around the impact. */
  readonly energy: number;
  /** The hot color of the strike: rays, sparks, shards. */
  readonly strike: number;
  /** The near-white heart of the flash. */
  readonly core: number;
}

const STYLES: Readonly<Record<FighterId, Readonly<Record<Colorway, HitStyle>>>> = {
  // Nayo: neon sound slashes (cyan, magenta in his second outfit) and a gold starburst.
  polyvalent: {
    main: { shape: 'slash', energy: 0x30e8ff, strike: 0xffa526, core: 0xfff4d6 },
    alt: { shape: 'slash', energy: 0xff4fc8, strike: 0xffa526, core: 0xfff4d6 },
  },
  // Riff: violet claw cuts and sun-yellow shards (swapped in her second outfit).
  rushdown: {
    main: { shape: 'claw', energy: 0xa25cff, strike: 0xffe03a, core: 0xfff8e6 },
    alt: { shape: 'claw', energy: 0xffd23a, strike: 0xb070ff, core: 0xfff8e6 },
  },
};

export function hitStyleOf(fighter: FighterId, colorway: Colorway = 'main'): HitStyle {
  return STYLES[fighter][colorway];
}
