/**
 * Riff's head: three-quarter view facing right like Nayo's, same pixel density, her own face.
 * A white snapback worn backwards: the violet brim sticks out at the back (the silhouette that
 * says "backwards" at any size), a sun-yellow diamond on the front panel (now at the back), a
 * yellow button on top, one panel seam, and at the forehead a lock of auburn hair poking out of
 * the strap opening. Light golden skin, freckles across the cheek and the nose; a green eye wide
 * open on the opponent under an arched lid, a white catchlight, the brow up, the mouth closed
 * (no grin: the mischief is in the `smirk` and `cool` patches of face.ts).
 *
 * One character per pixel (legend below). The braids are not in the stamp: they hang from
 * `BRAID_ROOTS` as strips of `BRAID` that bend behind her moves (see `braidSlots`); the cap is
 * rigid, so unlike Nayo's spikes no row of the head trails. Drawn like Nayo's: upright below 20
 * degrees, turned by RotSprite beyond (../stamp.ts).
 */

import type { PixelCanvas, Point } from '../raster.ts';
import type { Face } from '../skeleton.ts';
import { slotsOf, stamp, UPRIGHT_TOLERANCE, type Legend } from '../stamp.ts';
import { expressionOf } from './face.ts';
import { DETAIL, MATERIAL } from './palette.ts';

export const HEAD: readonly string[] = [
  '..................11.................',
  '...............111YZ1111.............',
  '............111445556665111..........',
  '..........1134444435566655411........',
  '........1233Y344444355555555541......',
  '.pppppp1223YZY34444435555555441......',
  'pttuuup1223yYy34444435555555421......',
  'ptttuuu12223y3344444433555432kk......',
  'pqrrrrr122233334444444435432klbk.....',
  '.ppppppp1223333344444443321111bk.....',
  '.......kdd11111111111kkSSSBBBBLO.....',
  '.......kdsbllbsblbsdkkkSBsddsBLO.....',
  '.......kdsbblbkOBSkdSBBBBBBBBBLO.....',
  '.......kdssbbskBDOSkSBBKKKKBBBLO.....',
  '........kdsbbskSDOBkSBBKWIXKBBLO.....',
  '........kdssbdkSDSBSBBBBWCJSBLBO.....',
  '.........kdsbkkOSOBLLBBBBSBBFBDLO....',
  '..........kdsk..OSBBFBBBBBFBBSBO.....',
  '...........kk...OSBBBBBFBBBBBBBO.....',
  '.................OSSBBBBBBBSDDBO.....',
  '..................OSSBBBBBBBLBO......',
  '..................ODSSBBBBBBBDO......',
  '...................ODSSBBBBBDO.......',
  '.....................ODDSBBDO........',
  '.......................OOOO..........',
];

/** Pixel of the stamp on the skeleton's head point (the middle of the skull, at the ear). */
export const HEAD_CENTER: Point = { x: 17, y: 13 };

/**
 * One braid, root at the top: three three-strand lobes that alternate, a yellow hair tie, a
 * short flared tuft. Short enough that the tie sits at the shoulder line, over the hood. Its
 * column `BRAID_COLUMN` hangs under the root.
 */
export const BRAID: readonly string[] = [
  '.kkk..',
  'kblk..',
  'ksbbk.',
  'kdslk.',
  '.kdsk.',
  'kblk..',
  'ksbbk.',
  'kdslk.',
  '.kdsk.',
  'kblk..',
  'ksbbk.',
  'kdslk.',
  '.kdsk.',
  '.kkk..',
  'kyYYk.',
  'kyyyk.',
  'kbkbk.',
  'kbsbsk',
  'ksdksk',
  '.k..k.',
];

/** Column of BRAID right under its root. */
const BRAID_COLUMN = 3;

export type BraidSide = 'near' | 'far';

/**
 * Stamp pixels where the braids leave the hair, under the cap: the near one at the back of the
 * nape (so it falls over the hood, behind the sleeve), the far one higher and farther back,
 * splayed back (`BRAID_SPLAY`) so that two empty columns part the two plaits below the root.
 */
export const BRAID_ROOTS: Readonly<Record<BraidSide, Point>> = {
  near: { x: 10, y: 17 },
  far: { x: 6, y: 13 },
};

/** How far each braid's tip hangs back at rest, in pixels (- is toward the back). */
export const BRAID_SPLAY: Readonly<Record<BraidSide, number>> = { near: 0, far: -4 };

/** The far braid, one tone darker (like the far limbs). */
const FAR_HAIR: Readonly<Record<string, string>> = { l: 'b', b: 's', s: 'd' };

const SKIN = MATERIAL.skin;
const HAIR = MATERIAL.hair;
const CAP = MATERIAL.white;
const BRIM = MATERIAL.primary;
const ACCENT = MATERIAL.accent;

/** Palette slot of each stamp character; '.' (or any other) is empty. */
const LEGEND: Legend = {
  // Skin, darkest to lightest.
  O: SKIN.outline,
  D: SKIN.deep,
  S: SKIN.shadow,
  B: SKIN.base,
  L: SKIN.light,
  H: SKIN.gloss,
  F: DETAIL.freckle,
  // Hair.
  k: HAIR.outline,
  d: HAIR.deep,
  s: HAIR.shadow,
  b: HAIR.base,
  l: HAIR.light,
  g: HAIR.gloss,
  // Cap crown (the white material), darkest to lightest.
  '1': CAP.outline,
  '2': CAP.deep,
  '3': CAP.shadow,
  '4': CAP.base,
  '5': CAP.light,
  '6': CAP.gloss,
  // Brim (her primary color: violet, sun-yellow on the second colorway).
  p: BRIM.outline,
  q: BRIM.deep,
  r: BRIM.shadow,
  t: BRIM.base,
  u: BRIM.light,
  // Accent (logo, button, hair ties): yellow, violet on the second colorway.
  y: ACCENT.shadow,
  Y: ACCENT.base,
  Z: ACCENT.light,
  // Eye and mouth.
  K: DETAIL.ink,
  W: DETAIL.eyeWhite,
  C: DETAIL.iris,
  J: DETAIL.irisLight,
  I: DETAIL.irisDeep,
  X: DETAIL.catchlight,
  M: DETAIL.mouth,
  T: DETAIL.teeth,
};

/**
 * Draws the head with the expression of `face`, its center pixel at `center` (cell pixels),
 * turned `angle` degrees clockwise on screen.
 */
export function stampHead(canvas: PixelCanvas, face: Face, center: Point, angle: number): void {
  stamp(canvas, headSlots(expressionOf(HEAD, face)), HEAD_CENTER, center, angle);
}

/** Palette slots of a head's pixels (0: empty). */
export function headSlots(rows: readonly string[] = HEAD): number[][] {
  return slotsOf(rows, LEGEND);
}

/**
 * Where a pixel of the stamp lands (cell pixels) when the head is stamped at `center`, turned
 * `angle` degrees: the roots of the braids follow the head.
 */
export function onHead(pixel: Point, center: Point, angle: number): Point {
  const dx = pixel.x - HEAD_CENTER.x;
  const dy = pixel.y - HEAD_CENTER.y;
  const cx = Math.round(center.x);
  const cy = Math.round(center.y);
  if (Math.abs(angle) < UPRIGHT_TOLERANCE) return { x: cx + dx, y: cy + dy };
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/**
 * Slots of a braid, bent by `swing` pixels at the tip (+ to the right: a forward dash wants a
 * negative swing): each row slides by a share of it that grows toward the tip, so the plaits
 * stay whole pixel art. The grid is padded by ceil(|swing|) on both sides. The far braid is one
 * tone darker.
 */
export function braidSlots(which: BraidSide, swing = 0): number[][] {
  const last = BRAID.length - 1;
  const pad = Math.ceil(Math.abs(swing));
  const rows = BRAID.map((row, y) => {
    const shift = Math.round(swing * (y / last) ** 1.6);
    const chars = which === 'far' ? row.replace(/[lbs]/g, (c) => FAR_HAIR[c] ?? c) : row;
    return '.'.repeat(pad + shift) + chars + '.'.repeat(pad - shift);
  });
  return slotsOf(rows, LEGEND);
}

/**
 * Draws a braid hanging straight down from `root` (cell pixels), whatever the head does: it
 * follows gravity, bent `swing` pixels at the tip.
 */
export function stampBraid(
  canvas: PixelCanvas,
  which: BraidSide,
  root: Point,
  swing: number,
): void {
  const pad = Math.ceil(Math.abs(swing));
  stamp(canvas, braidSlots(which, swing), { x: BRAID_COLUMN + pad, y: 0 }, root, 0);
}
