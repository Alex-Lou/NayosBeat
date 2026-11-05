/**
 * Temple Courtyard's palette (docs/art/decor-temple.md §3): high-contrast, luminous pixel-art
 * ramps for the Archipel des Légendes sanctuary. Deep twilight-indigo sky grading into a warm
 * rose-gold horizon, sparkling sapphire sea, sculpted courtyard stone, emerald moss, warm cedar
 * wood, vivid vermilion lacquer, antique gold, slate-blue roof tiles, radiant sakura blossoms, and
 * glowing paper and stone lanterns. Slot 0 is transparent, every other color opaque.
 */

import type { Rgba } from '../../sprites/png.ts';
import { MIST_HEXES } from '../kit/fog.ts';
import type { FigureRamps } from '../rue/people.ts';

const colors: Rgba[] = [{ r: 0, g: 0, b: 0, a: 0 }];

/** Registers the colors, darkest first, and returns their slots. */
function ramp(...hexes: string[]): readonly number[] {
  return hexes.map((hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    colors.push({ r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 255 });
    return colors.length - 1;
  });
}

/** A ramp given again, tone for tone: a hidden one, which only an atmosphere repaints. */
function twin(of: readonly number[]): readonly number[] {
  return ramp(
    ...of.map((slot) => {
      const { r, g, b } = colors[slot] ?? { r: 0, g: 0, b: 0 };
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }),
  );
}

/** The twilight sky over the sea: deep royal indigo overhead to warm twilight rose-amber at the horizon. */
export const SKY = ramp(
  '#1b203c',
  '#23284a',
  '#2d3158',
  '#393a66',
  '#484372',
  '#5a4d7c',
  '#6e5884',
  '#866588',
  '#a0748a',
);
export const CLOUD = ramp('#34385c', '#4a4e78', '#686c98', '#9498c4');
export const MOON = ramp('#7c7894', '#ccc8dc', '#faf6fc');
/** The sea, the moon's path on it. */
export const SEA = ramp('#1c2644', '#263458', '#32446c', '#425682', '#566c9a');
export const GLITTER = ramp('#7480a8', '#b4c0e2', '#f2f6ff');
/** The islands, farthest first, with moonlit pine ridges. */
export const ISLAND_FAR = ramp('#303456', '#40466c', '#545a82');
export const ISLAND = ramp('#202642', '#2e3658', '#404a70', '#58648e');
/** The courtyard's stone: the walls, the lanterns, the flagstones, the steps. */
export const STONE = ramp(
  '#242230',
  '#343142',
  '#464256',
  '#5a546a',
  '#706880',
  '#887e96',
  '#a49ab2',
  '#c6bcce',
);
export const MOSS = ramp('#1e3022', '#2e4832', '#446846', '#669664');
/** Warm cedar wood: the hall's frame, the railings, the plaques. */
export const WOOD = ramp('#2a1e24', '#3e2c30', '#563e3e', '#72524e', '#966e62');
/** The hall's and the gate's vermilion lacquer. */
export const LACQUER = ramp('#401a22', '#62262e', '#88343a', '#b64646', '#e86058');
/** The roofs' tiles, slate-blue with moonlit silver-blue ridges. */
export const TILE = ramp('#1e2232', '#2c3248', '#3e4662', '#566080', '#7e8cae');
/** The paper lanterns and the stone lanterns' fire: their glow, the paper, the bright flame. */
export const LANTERN = ramp('#643422', '#9e5228', '#e08238', '#ffb858', '#ffeca4');
/** Paper: the hall's shoji doors lit from within, and the crisp white shide streamers and omikuji. */
export const PAPER = ramp('#6c504e', '#987268', '#ece4d8');
export const ROPE = ramp('#4e3e28', '#78603e', '#aa8c58');
/** The cherry tree: its bark, its sakura blossoms. */
export const BARK = ramp('#241a1c', '#362628', '#4a3436', '#644848');
export const BLOSSOM = ramp('#4a2c3c', '#6c4054', '#92586e', '#be7e94', '#ecb4c6');
/** The fox guardians' red votive bibs and antique gold/bronze fittings. */
export const BIB = ramp('#78262c', '#c44044');
export const BRONZE = ramp('#383424', '#5c5434', '#948248', '#ecc864');
export const PERSON = ramp('#1a1824', '#201d2b', '#272333', '#2f2a3c', '#3a3446');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
export const MIST = ramp(...MIST_HEXES);
/** The snow twin ramps. */
export const SNOW_TILE = twin(TILE);
export const SNOW_STONE = twin(STONE);
export const SNOW_MOSS = twin(MOSS);
export const SNOW_BLOSSOM = twin(BLOSSOM);

export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };

export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The temple has ${PALETTE.length} colors: 256 at most`);
