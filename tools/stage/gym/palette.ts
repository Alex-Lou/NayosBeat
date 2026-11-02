/**
 * The Viaduct Gym's palette (docs/art/decor-gym.md §3): the street's, slot for slot (its people,
 * signs, posters and night sky are drawn by the street's own code), then the gym's ramps. Under the
 * arch, soot-black brick and railway-green iron, old wood, a burgundy ring; the light is the cold
 * white-green of fluorescent tubes. Slot 0 is transparent, every other color opaque. The fighters
 * own cyan and magenta; nothing here comes near them.
 */

import type { Rgba } from '../../sprites/png.ts';
import { PALETTE as STREET } from '../rue/palette.ts';

const colors: Rgba[] = [...STREET];

/** Registers the colors, darkest first, and returns their slots. */
function ramp(...hexes: string[]): readonly number[] {
  return hexes.map((hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    colors.push({ r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 255 });
    return colors.length - 1;
  });
}

/** The vault's brick, blackened by a century of trains overhead. */
export const VAULT = ramp(
  '#221c1e',
  '#271f21',
  '#2b2022',
  '#352628',
  '#422e2e',
  '#523834',
  '#64443c',
);
/** The arch rings and the end wall's dressed stone, a step paler than the brick. */
export const RING_STONE = ramp('#1f1c20', '#29252a', '#343035', '#413c41', '#504a4e', '#625a5c');
/** Railway iron, painted green long ago: beams, the window's frame, the ring's posts. */
export const IRON = ramp('#171c1b', '#222927', '#2b3330', '#363f3b', '#444c46', '#566057');
/** A fluorescent tube: its glow (two steps), the tube, its core. */
export const FLUO = ramp('#343c32', '#4c5844', '#8e9a72', '#cfd6aa', '#f2f4dc');
/** The floor's old boards, oiled dark. */
export const WOOD = ramp(
  '#1a1314',
  '#261c1e',
  '#342522',
  '#402d28',
  '#4d362e',
  '#5d4135',
  '#704e3d',
);
/** The ring's apron and canvas: burgundy gone brown. */
export const APRON = ramp('#1f1016', '#2c171f', '#371a23', '#45212b', '#552a33');
export const ROPE = ramp('#4a1a20', '#6e2a2c', '#93413a');
export const ROPE_PALE = ramp('#57524f', '#7a736b', '#9c9488');
/** Heavy bags and gloves: cracked leather, oxblood and black. */
export const LEATHER = ramp('#1a1314', '#2c1d1c', '#3a2622', '#4c302a', '#5f3c31');
export const LEATHER_BLACK = ramp('#121114', '#19171b', '#221f24', '#2d2930');
/** Paint on brick: the club's name, faded. */
export const SIGN_PAINT = ramp('#4a3e3d', '#625450', '#7c6a62', '#968273');
/** The round timer's lamps: green for the round, red for the rest. */
export const LAMP_GREEN = ramp('#1e2a1c', '#35522f', '#5f9150', '#a6d48c');
export const LAMP_RED = ramp('#2e1416', '#5c2224', '#9a3a32', '#e0745c');
/** The train over the next arch: its body, its lit windows. */
export const TRAIN = ramp('#1a1920', '#29272f', '#34313a');
export const TRAIN_LIT = ramp('#5e5644', '#9a8c64', '#d2c290');
/** Lockers, painted grey-blue, dented. */
export const LOCKER = ramp('#1c1f25', '#2a2d35', '#343841', '#41454e');
/** Dust shaken from the vault by a train: specks in the light. */
export const DUST = ramp('#5a5a4c', '#7a7a66');
/** Tape on the floor and on the gloves: dull white. */
export const TAPE = ramp('#5e5a53', '#8a8478');

/** Every color, slot by slot (256 at most: one PNG palette). */
export const PALETTE: readonly Rgba[] = colors;

if (PALETTE.length > 256) throw new Error(`The gym has ${PALETTE.length} colors: 256 at most`);
