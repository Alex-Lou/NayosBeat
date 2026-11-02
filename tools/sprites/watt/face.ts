/**
 * Watt's expressions (docs/watt.md §10): his face is the bulb's filament (head.ts). Nothing else
 * moves on the glass; the filament and the light around it say how he is. Calm, it glows (focus,
 * cool, smirk); straining, it burns brighter (effort), white at the peak of a special (kiai);
 * hurt or tired, it dims; knocked out, it goes off. Never a blink: a change is a few frames long
 * at least, the strips hold it (docs/flashs.md).
 */

import type { Face } from '../skeleton.ts';

/** How each character of head.ts turns, by face: the coil (F, f) and the glow (h, H). */
const EXPRESSIONS: Readonly<Record<Face, Readonly<Record<string, string>>>> = {
  focus: {},
  cool: {},
  smirk: {},
  // Brighter: the whole coil lit, the glow one step up.
  effort: { f: 'F', H: 'h' },
  // White hot: the coil all core, the glow up to the coil's color.
  kiai: { f: 'F', H: 'h', h: 'f' },
  // Dimmer: the core gone, the glow down a step.
  hurt: { F: 'f', h: 'H' },
  tired: { F: 'f', h: 'H', H: 'b' },
  // Off: the coil a dark wire, no light in the smoke.
  out: { F: 'w', f: 'w', h: 'b', H: 'b' },
};

/** The head's rows with the filament of `face` (same legend as head.ts). */
export function expressionOf(head: readonly string[], face: Face): readonly string[] {
  const swaps = EXPRESSIONS[face];
  if (Object.keys(swaps).length === 0) return head;
  return head.map((row) => Array.from(row, (char) => swaps[char] ?? char).join(''));
}
