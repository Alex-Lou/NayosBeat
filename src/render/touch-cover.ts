import { leftEdge } from '../core/boxes';
import { hurtboxesOf } from '../core/combat';
import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { pushboxOf } from '../core/fighter';
import type { FighterState, GameState } from '../core/state';
import type { ButtonCircle, TouchControls } from '../input/touch-controls';
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

/** Whether `rect` (empty when its left is past its right) reaches into the round `button`. */
export function touches(rect: Rect, button: ButtonCircle): boolean {
  if (rect.left >= rect.right || rect.top >= rect.bottom) return false;
  // The point of the rectangle nearest the button's center.
  const x = Math.min(Math.max(button.x, rect.left), rect.right);
  const y = Math.min(Math.max(button.y, rect.top), rect.bottom);
  return Math.hypot(x - button.x, y - button.y) < button.radius;
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
 * L35), each on its own: on a 16:9 phone the cluster covers the right of the fight, and a fighter
 * there vanished under the thumbs; the buttons over nobody stay as they are. Where the canvas and
 * the buttons are on the page is measured once, and again after every resize (a turn,
 * fullscreen) and every new layout of the buttons (« Disposition », moved under the pause): the
 * player's own places, not the defaults. The fighters, on every frame.
 */
export class TouchCover {
  private canvasRect: Rect | undefined;
  private buttons: readonly ButtonCircle[] | undefined;
  /** The touch layout the buttons were measured in: moved under the pause, they are again. */
  private measuredLayout = -1;

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
    if (this.measuredLayout !== this.touch.layoutVersion) {
      this.measuredLayout = this.touch.layoutVersion;
      this.buttons = undefined;
    }
    const buttons = (this.buttons ??= this.touch.buttonCircles());
    const bodies = PLAYERS.map((player) => {
      const body = bodyOnScreen(
        state.fighters[player],
        this.config.fighters[player],
        framing,
        this.groundY,
      );
      // Only what the canvas shows: a hurtbox past the wall is off screen, nobody misses it.
      return intersection(onPage(body, canvas), canvas);
    });
    this.touch.setCovered(
      buttons.map((button) => bodies.some((body) => touches(body, button))),
      now,
    );
  }

  dispose(): void {
    window.removeEventListener('resize', this.forget);
  }

  private readonly forget = (): void => {
    this.canvasRect = undefined;
    this.buttons = undefined;
  };
}
