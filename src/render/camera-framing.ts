import { VIEW_SIZE } from './view';

/** Closest framing: fighters standing close fill about 45% of the screen's height. */
export const MAX_CLOSE_UP = 1.45;
/** World pixels kept in view left and right of the outermost fighter or projectile. */
const SIDE_MARGIN = 64;
/** Height of a standing fighter plus the free space kept above the highest one. */
const FIGHTER_TOP = 104;
/** Share of the distance to its target framing the camera covers every 1/60 s. */
const EASE = 0.1;

export interface FramingInput {
  /** Horizontal positions (world pixels) that must stay in view: fighters and projectiles. */
  readonly xs: readonly number[];
  /** Height of the highest fighter's feet above the ground (world pixels). */
  readonly highestFeet: number;
  /** Left edge of the simulation's camera: the framing never shows anything outside it. */
  readonly viewLeft: number;
  /** World y of the ground line. */
  readonly groundY: number;
  /** The close-up of the previous display frame. */
  readonly closeUp: number;
  /** Time since the previous display frame, in 1/60 s (fractional): the same easing at any refresh rate. */
  readonly elapsed: number;
}

export interface Framing {
  /** Magnification over the simulation's camera, 1 (the whole view) to MAX_CLOSE_UP. */
  readonly closeUp: number;
  /** World point at the screen's top left corner. */
  readonly left: number;
  readonly top: number;
}

/**
 * The camera of a fighting game: close on the fighters when they are close, wider as they
 * part or jump, easing between the two. Display only: the simulation keeps its own camera
 * (cameraX), and the framing always stays inside it, so gameplay never depends on the zoom.
 * The ground keeps its place at the bottom of the screen.
 */
export function frameFight(input: FramingInput): Framing {
  const { xs, highestFeet, viewLeft, groundY } = input;
  const leftmost = Math.min(...xs);
  const rightmost = Math.max(...xs);
  const fitWidth = VIEW_SIZE.width / (rightmost - leftmost + 2 * SIDE_MARGIN);
  const fitHeight = groundY / (highestFeet + FIGHTER_TOP);
  const target = Math.min(MAX_CLOSE_UP, Math.max(1, Math.min(fitWidth, fitHeight)));
  const closeUp = target + (input.closeUp - target) * (1 - EASE) ** input.elapsed;

  const width = VIEW_SIZE.width / closeUp;
  const middle = (leftmost + rightmost) / 2;
  const left = Math.min(Math.max(middle - width / 2, viewLeft), viewLeft + VIEW_SIZE.width - width);
  return { closeUp, left, top: groundY - groundY / closeUp };
}
