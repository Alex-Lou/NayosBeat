import { leftEdge } from '../core/boxes';
import { hurtboxesOf } from '../core/combat';
import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { pushboxOf } from '../core/fighter';
import type { FighterState, GameState } from '../core/state';
import type { TouchControls } from '../input/touch-controls';
import type { Framing } from './camera-framing';
import { VIEW_SIZE } from './view';

/** A rectangle: in view pixels (the 480×270 screen), or in the page's CSS pixels. */
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const PLAYERS = [0, 1] as const;

/**
 * `fighter`'s body on screen, in view pixels: its pushbox and its hurtboxes of the moment, through
 * the fight's camera (`framing`: its top left world point and its close up), the ground at
 * `groundY`. The camera's shake, a few pixels, is left out.
 */
export function bodyOnScreen(
  fighter: FighterState,
  template: MatchConfig['fighters'][number],
  framing: Framing,
  groundY: number,
): Rect {
  const { x, y, facing } = fighter;
  const pushbox = pushboxOf(fighter, template);
  // Stage sub-pixels: left and right, bottom and top above the ground.
  let left = x - Math.trunc(pushbox.width / 2);
  let right = left + pushbox.width;
  let bottom = y + (pushbox.lift ?? 0);
  let top = bottom + pushbox.height;
  for (const box of hurtboxesOf(fighter, template)) {
    const boxLeft = leftEdge(box, x, facing);
    left = Math.min(left, boxLeft);
    right = Math.max(right, boxLeft + box.width);
    bottom = Math.min(bottom, y + box.y);
    top = Math.max(top, y + box.y + box.height);
  }
  const { closeUp } = framing;
  return {
    left: (toPx(left) - framing.left) * closeUp,
    right: (toPx(right) - framing.left) * closeUp,
    top: (groundY - toPx(top) - framing.top) * closeUp,
    bottom: (groundY - toPx(bottom) - framing.top) * closeUp,
  };
}

/** A rectangle of the view where the canvas (`canvas`, its place on the page) shows it. */
export function onPage(view: Rect, canvas: Rect): Rect {
  const scale = (canvas.right - canvas.left) / VIEW_SIZE.width;
  return {
    left: canvas.left + view.left * scale,
    right: canvas.left + view.right * scale,
    top: canvas.top + view.top * scale,
    bottom: canvas.top + view.bottom * scale,
  };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** What `a` and `b` share (empty, its left past its right, when they do not touch). */
function intersection(a: Rect, b: Rect): Rect {
  return {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };
}

/**
 * Player 1's touch buttons fade while a fighter is under them (docs/polish/AUDIT-ET-PLAN.md, P21,
 * L35): on a 16:9 phone they cover the right quarter of the fight, and a fighter cornered there
 * vanished under the thumbs. Where the canvas and the buttons are on the page is measured once,
 * and again after every resize (a turn, fullscreen); the fighters, on every frame.
 */
export class TouchCover {
  private canvasRect: Rect | undefined;
  private buttonsRect: Rect | undefined;

  constructor(
    private readonly canvas: HTMLElement,
    private readonly touch: TouchControls,
    private readonly config: MatchConfig,
    private readonly groundY: number,
  ) {
    window.addEventListener('resize', this.forget);
  }

  /** Once a frame, after the camera is framed. `now`: in milliseconds. */
  update(state: GameState, framing: Framing, now: number): void {
    const canvas = (this.canvasRect ??= this.canvas.getBoundingClientRect());
    const buttons = (this.buttonsRect ??= this.touch.buttonsRect());
    const covered = PLAYERS.some((player) => {
      const body = bodyOnScreen(
        state.fighters[player],
        this.config.fighters[player],
        framing,
        this.groundY,
      );
      // Only what the canvas shows: a hurtbox past the wall is off screen, nobody misses it.
      return overlaps(intersection(onPage(body, canvas), canvas), buttons);
    });
    this.touch.setCovered(covered, now);
  }

  dispose(): void {
    window.removeEventListener('resize', this.forget);
  }

  private readonly forget = (): void => {
    this.canvasRect = undefined;
    this.buttonsRect = undefined;
  };
}
