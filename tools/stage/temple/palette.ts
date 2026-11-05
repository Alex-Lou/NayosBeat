/**
 * Temple Courtyard's palette (docs/art/decor-temple.md §3): its own. The Archipel des Légendes at
 * night: a clear twilight-indigo sky over the sea, the islands' silhouettes and village lights, the
 * luminous moon; the courtyard's sculpted stone and emerald moss, warm cedar wood, vermilion
 * lacquer and antique gold, roof tiles edged in moonlight, sakura blossoms, and the warm amber glow
 * of paper and stone lanterns. Slot 0 is transparent, every other color opaque.
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

/** The night over the sea: deep twilight blue overhead, a warm violet haze down to the horizon. */
export const SKY = ramp(
  '#1b1d34',
  '#1e213a',
  '#222540',
  '#272946',
  '#2d2d4b',
  '#34314e',
  '#3c3551',
  '#453953',
  '#4e3c54',
);
export const CLOUD = ramp('#282a46', '#343656', '#484a6e', '#6c7096');
export const MOON = ramp('#726e86', '#c4c0d4', '#f6f2f8');
/** The sea, the moon's path on it. */
export const SEA = ramp('#1c2036', '#21263e', '#272d46', '#2f354e', '#393c54');
export const GLITTER = ramp('#5e6484', '#9ca4c4', '#eaf0fa');
/** The islands, farthest first a step off the sky, the nearer darker with moonlit ridges. */
export const ISLAND_FAR = ramp('#262842', '#2e304b', '#383a54');
export const ISLAND = ramp('#1e2136', '#252940', '#2e334c', '#383e56');
/** The courtyard's stone: the walls, the lanterns, the flagstones, the steps. */
export const STONE = ramp(
  '#23212c',
  '#2c2935',
  '#36323f',
  '#443949',
  '#544252',
  '#644456',
  '#847680',
  '#b2a6b0',
);
export const MOSS = ramp('#1f2a22', '#28362a', '#344432', '#5c8254');
/** Warm cedar wood: the hall's frame, the railings, the plaques. */
export const WOOD = ramp('#261e24', '#33272c', '#423234', '#543c3c', '#7c5a50');
/** The hall's and the gate's vermilion lacquer. */
export const LACQUER = ramp('#341a20', '#482026', '#5c282e', '#6d3036', '#d8544a');
/** The roofs' tiles, slate-blue with moonlit silver-blue ridges. */
export const TILE = ramp('#1e202c', '#262938', '#303444', '#3c3c52', '#68728e');
/** The paper lanterns and the stone lanterns' fire: their glow, the paper, the bright flame. */
export const LANTERN = ramp('#5a3020', '#924a26', '#d87836', '#ffae52', '#ffe89e');
/**
 * Paper: the hall's shoji doors lit from within, and the crisp white shide streamers and omikuji.
 */
export const PAPER = ramp('#523c3e', '#664446', '#dfd6ca');
export const ROPE = ramp('#463826', '#6c583a', '#9c8254');
/** The cherry tree: its bark, its sakura blossoms. */
export const BARK = ramp('#20181a', '#2c2124', '#3b2c2e', '#503b3c');
export const BLOSSOM = ramp('#402a36', '#523644', '#663c4e', '#a67484', '#deb0be');
/** The fox guardians' red votive bibs and antique gold/bronze fittings. */
export const BIB = ramp('#642228', '#a8383b');
export const BRONZE = ramp('#2c2e24', '#444836', '#726c44', '#d8b85c');
export const PERSON = ramp('#1a1824', '#201d2b', '#272333', '#2f2a3c', '#3a3446');
export const SKIN = ramp('#5e3e38', '#86584a', '#a87660');
/** The fog's mist (kit/fog.ts), used by no atmosphere yet. */
export const MIST = ramp(...MIST_HEXES);
/**
 * The snow (docs/art/decor-temple.md §4), drawn where the snow would settle, tone for tone with
 * what it covers: dry, nothing shows; under the snow, they turn to snow.
 */
export const SNOW_TILE = twin(TILE);
export const SNOW_STONE = twin(STONE);
export const SNOW_MOSS = twin(MOSS);
export const SNOW_BLOSSOM = twin(BLOSSOM);

/** The courtyard's ramps for the shared drawing code (people.ts). */
export const FIGURE_RAMPS: FigureRamps = { body: PERSON, skin: SKIN };

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The temple has ${PALETTE.length} colors: 256 at most`);
