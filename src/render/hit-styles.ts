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
  /**
   * The fighter's color on the HUD (the rim of its bars, the word BOOST, the first Boost bar),
   * when its energy would not do: a gold one would read as the health's yellow, and the Boost is
   * never gold (docs/combos-v3.md §1.8.7). The energy otherwise.
   */
  readonly hud?: number;
}

const STYLES: Readonly<Record<FighterId, Readonly<Record<Colorway, HitStyle>>>> = {
  // Nayo: neon sound slashes (cyan, magenta in his second outfit) and a gold starburst.
  nayo: {
    main: { shape: 'slash', energy: 0x30e8ff, strike: 0xffa526, core: 0xfff4d6 },
    alt: { shape: 'slash', energy: 0xff4fc8, strike: 0xffa526, core: 0xfff4d6 },
  },
  // Riff: magenta claw cuts and silver-white shards, her fringe and her studs; gold cuts and
  // crimson shards in her second outfit (the red jacket, the gold fringe). The colors of her
  // sprites' effects (tools/sprites/riff/palette.ts).
  riff: {
    main: { shape: 'claw', energy: 0xff3ca0, strike: 0xd8e0ec, core: 0xffffff },
    // On the HUD, her crimson: her gold would be the health bar's yellow.
    alt: { shape: 'claw', energy: 0xffc83a, strike: 0xe0283c, core: 0xffe8ea, hud: 0xe0283c },
  },
};

export function hitStyleOf(fighter: FighterId, colorway: Colorway = 'main'): HitStyle {
  return STYLES[fighter][colorway];
}

/** The fighter's color on the HUD: see HitStyle.hud. */
export function hudColorOf(style: HitStyle): number {
  return style.hud ?? style.energy;
}
