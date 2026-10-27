/** Between two names stacked over each other, in world pixels. */
const STACK_GAP = 2;

/** A caption's box, anchored at its bottom centre (origin 0.5, 1). */
interface CaptionBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Where `later` goes so as not to cover `earlier`: just above it, or null if they do not meet. */
export function stackedY(later: CaptionBox, earlier: CaptionBox): number | null {
  const apart = Math.abs(later.x - earlier.x) >= (later.width + earlier.width) / 2;
  const clear = later.y <= earlier.y - earlier.height || earlier.y <= later.y - later.height;
  return apart || clear ? null : earlier.y - earlier.height - STACK_GAP;
}
