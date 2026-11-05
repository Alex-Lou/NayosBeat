/**
 * Watt's expressions (docs/watt.md §10): his face is the bulb's twin-coil Tesla filament (head.ts).
 * Each expression reshapes the filament's arc inside the globe (rows 11..17, columns 12..21) AND
 * shifts its glow intensity:
 * - `focus` / `cool`: twin V-brows and a steady lower arc;
 * - `smirk`: asymmetric cocked arc;
 * - `effort`: jagged high-voltage sawtooth coil burning bright;
 * - `kiai`: blazing X-star plasma discharge filling the globe;
 * - `hurt`: shattered asymmetric short-circuit zigzag;
 * - `tired`: drooping low-voltage filament;
 * - `out`: cold dark wire (`w`), all internal glow extinguished.
 */

import type { Face } from '../skeleton.ts';
import { patched, type Patch } from '../stamp.ts';

/** Filament window inside `HEAD`: columns 12 to 21, rows 11 to 17. */
function coil(rows: readonly [string, string, string, string, string, string, string]): Patch {
  return { x: 12, y: 11, rows };
}

const COIL_PATCHES: Partial<Readonly<Record<Face, readonly Patch[]>>> = {
  smirk: [
    coil([
      'hfFFhFFfhh',
      'fFFhhFFffh',
      'hhhhhhhhFh',
      'fFhhhhhFFh',
      'hfFFFFFffh',
      'hwhfFfwhhH',
      'HHwhhhwhhH',
    ]),
  ],
  effort: [
    coil([
      'FFfhhfFFhh',
      'fFFffFFfhh',
      'hfFFFFfhhh',
      'fFFhhFFfhh',
      'FFfhhfFFhh',
      'hwhFFfwhhH',
      'HHwhhhwhhH',
    ]),
  ],
  kiai: [
    coil([
      'FFFffFFFff',
      'fFFFFFFFfh',
      'ffFFFFFFFF',
      'fFFFFFFFFf',
      'FFFffFFFff',
      'fwhFFFwhfh',
      'hhwhhhwhhh',
    ]),
  ],
  hurt: [
    coil([
      'hfFhhhfFhh',
      'fFhhfFhhhh',
      'hhfFhhfFhh',
      'fFhhhhhhfF',
      'hhfFhhfFhh',
      'hwhhhhwhhH',
      'HHwhhhwhhH',
    ]),
  ],
  tired: [
    coil([
      'HHHHHHHHHH',
      'HhhhhhhhhH',
      'HhffhhffhH',
      'HhfFhhFfhH',
      'HHhffffhHH',
      'HHwhffwhHH',
      'HHHwhhwHHH',
    ]),
  ],
  out: [
    coil([
      'bbbbbbbbbb',
      'bsswbbwssb',
      'bswsssswsb',
      'bswsssswsb',
      'bsswwwwssb',
      'bsswsswssb',
      'bsssswsssb',
    ]),
  ],
};

/** Global glow swaps across the rest of the bulb. */
const GLOW_SWAPS: Readonly<Record<Face, Readonly<Record<string, string>>>> = {
  focus: {},
  cool: {},
  smirk: {},
  effort: { f: 'F', H: 'h' },
  kiai: { f: 'F', H: 'h', h: 'f' },
  hurt: { F: 'f', h: 'H' },
  tired: { F: 'f', h: 'H', H: 'b' },
  out: { F: 'w', f: 'w', h: 'b', H: 'b' },
};

/** The head's rows with the filament of `face` (same legend as head.ts). */
export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  const withCoil = COIL_PATCHES[face] ? patched(head, COIL_PATCHES[face]) : head;
  const swaps = GLOW_SWAPS[face];
  if (Object.keys(swaps).length === 0) return withCoil;
  return withCoil.map((row) => Array.from(row, (char) => swaps[char] ?? char).join(''));
}
