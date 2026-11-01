/** Between two names side by side on training's line of move names, in view pixels. */
const LINE_GAP = 6;

/** A caption on the line: its middle and its width (view pixels). */
interface CaptionBox {
  readonly x: number;
  readonly width: number;
}

/**
 * Where `later` goes along the line, `lineWidth` wide, so as not to cover `earlier`: beside it,
 * on its own side (on the other if the line's end leaves no room), or null if they do not meet.
 */
export function besideX(later: CaptionBox, earlier: CaptionBox, lineWidth: number): number | null {
  const apart = (later.width + earlier.width) / 2 + LINE_GAP;
  if (Math.abs(later.x - earlier.x) >= apart) return null;
  const side = later.x >= earlier.x ? 1 : -1;
  const x = earlier.x + side * apart;
  const fits = x - later.width / 2 >= 0 && x + later.width / 2 <= lineWidth;
  return fits ? x : earlier.x - side * apart;
}
