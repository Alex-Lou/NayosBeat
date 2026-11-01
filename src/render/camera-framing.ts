import { toPx } from '../core/constants';
import { FLAG_EXTENDED, type GameState } from '../core/state';
import type { FightEvent } from './fight-events';
import type { FlashMode } from './flash-budget';
import type { ShakeMode } from './shake';
import { VIEW_SIZE } from './view';

/** Closest framing: fighters standing close fill about 45% of the screen's height. */
export const MAX_CLOSE_UP = 1.45;
/**
 * The Finisher's close up (docs/finisher.md §1.14), only while it locks the pair and after its KO,
 * once nobody plays any more: the fight itself never goes past MAX_CLOSE_UP.
 */
export const FINISHER_CLOSE_UP = 2;
/**
 * The size of an effect fired at the Finisher's close up over its own (× 0.725): it covers the
 * screen as it does at the closest framing of the fight, whose flashes are measured.
 */
export const CLOSE_UP_EFFECTS = MAX_CLOSE_UP / FINISHER_CLOSE_UP;

/**
 * Device pixels per world pixel of a text of the world (a stamp, a sound word, a move's name) for
 * a canvas `canvasWidth` pixels wide, to stay sharp up to `closeUp`.
 */
export function textResolution(canvasWidth: number, closeUp = MAX_CLOSE_UP): number {
  return Math.ceil((canvasWidth / VIEW_SIZE.width) * closeUp);
}
/** World pixels kept in view left and right of the outermost fighter or projectile. */
const SIDE_MARGIN = 64;
/** Height of a standing fighter plus the free space kept above the highest one. */
const FIGHTER_TOP = 104;
/** Share of the distance to its target framing the camera covers every 1/60 s. */
const EASE = 0.1;

/**
 * The camera's push on a strong blow (docs/polish/AUDIT-ET-PLAN.md P12): how much closer than the
 * fight's framing, toward which world x (the contact's). Played only while the game is frozen.
 */
export interface CameraPush {
  /** Magnification over the fight's framing: 1, no push. */
  readonly zoom: number;
  /** World x of the contact the camera leans toward. */
  readonly x: number;
}
export const NO_PUSH: CameraPush = { zoom: 1, x: 0 };
/** The player's options the push obeys (src/app/comfort.ts). */
export interface PushComfort {
  readonly shake: ShakeMode;
  readonly flashes: FlashMode;
}
/**
 * How much closer each blow pushes: a heavy one or a counter-hit (CONTRE, PUNITION); the blow
 * that sets off an extender (Rebond, Vrille) or a super's last; the KO. A light one, a block, a
 * grab or a throw: none.
 */
export const PUSH_ZOOM = { heavy: 1.04, extender: 1.06, ko: 1.08 } as const;
/** The closest the fight ever frames: a KO's push at the closest framing (the flashes' measure). */
export const PUSHED_CLOSE_UP = MAX_CLOSE_UP * PUSH_ZOOM.ko;
/** Share of the way from the framed middle to the contact the camera leans while it pushes. */
export const PUSH_LEAN = 0.25;
/**
 * The lean's limit in pixels of the view, the same on screen at any close-up (§6 Q2): world
 * pixels are this divided by the close-up.
 */
export const PUSH_LEAN_MAX = 12;
/** Share of the distance the push covers every 1/60 s: 75 % in 2 frames. */
const PUSH_EASE = 0.5;
/**
 * The footsies window (Keren's Street Fighter camera, L13), world pixels each side: the framed
 * middle stays put while the fighters' middle moves less than this from it, then sticks to the
 * window's edge. Small steps leave the stage still. At the whole view (×1) the framing is the
 * simulation's camera anyway: the window only shows close up. To be judged playing.
 */
export const FOOTSIES_WINDOW = 8;

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
  /** The framed middle of the previous display frame (FightFraming); null: none, it starts afresh. */
  readonly middle: number | null;
  /** The push's lean of the previous display frame, world pixels (FightFraming). */
  readonly lean: number;
  /** The last contact's push (`pushOf`), played while `hitstop` lasts. */
  readonly push: CameraPush;
  /** The game's freeze, ticks left (GameState.hitstop). */
  readonly hitstop: number;
  /** The player's options: the push obeys them (`pushNow`). */
  readonly comfort: PushComfort;
}

export interface Framing {
  /** Magnification over the simulation's camera, 1 (the whole view) to MAX_CLOSE_UP. */
  readonly closeUp: number;
  /** World point at the screen's top left corner. */
  readonly left: number;
  readonly top: number;
}

/** The fight's framing, and what the next display frame eases from. */
export interface FightFraming extends Framing {
  /** The framed middle, world x: the fighters' middle, within FOOTSIES_WINDOW of it. */
  readonly middle: number;
  /** How far the push leans the camera from `middle` toward the contact, world pixels. */
  readonly lean: number;
}

/**
 * The camera of a fighting game: close on the fighters when they are close, wider as they
 * part or jump, easing between the two. Display only: the simulation keeps its own camera
 * (cameraX), and the framing always stays inside it, so gameplay never depends on the zoom.
 * The ground keeps its place at the bottom of the screen. The framed middle keeps still while the
 * fighters only step about (FOOTSIES_WINDOW). On a strong blow, while the game is frozen, the
 * camera pushes in and leans toward the contact (`pushNow`), then lets go as the game moves on.
 */
export function frameFight(input: FramingInput): FightFraming {
  const { xs, highestFeet, viewLeft, groundY } = input;
  const leftmost = Math.min(...xs);
  const rightmost = Math.max(...xs);
  const fitWidth = VIEW_SIZE.width / (rightmost - leftmost + 2 * SIDE_MARGIN);
  const fitHeight = groundY / (highestFeet + FIGHTER_TOP);
  const push = pushNow(input.push, input.hitstop, input.comfort);
  const pushing = push.zoom > 1;
  const fit = Math.min(MAX_CLOSE_UP, Math.max(1, Math.min(fitWidth, fitHeight)));
  const target = fit * push.zoom;
  const kept = (1 - (pushing ? PUSH_EASE : EASE)) ** input.elapsed;
  const closeUp = target + (input.closeUp - target) * kept;
  const middle = windowed(input.middle, (leftmost + rightmost) / 2);
  // The same lean on screen at any close-up (§6 Q2).
  const reach = PUSH_LEAN_MAX / closeUp;
  const toward = pushing ? within(PUSH_LEAN * (push.x - middle), reach) : 0;
  const lean = within(toward + (input.lean - toward) * kept, reach);
  const { left, top } = frameAround(middle + lean, closeUp, viewLeft, groundY);
  return { closeUp, left, top, middle, lean };
}

/**
 * The push the camera plays now: the last contact's while the game is frozen (`hitstop`), none
 * once it moves (nobody has the hand in the freeze: docs/finisher.md §4.4). None at all with the
 * screen kept still (« Tremblement : aucun », XAG 117), nor with the flashes calm: what a muted
 * blow and the calm words light is measured at MAX_CLOSE_UP under the reduced area, which the
 * push's ×1.17 would break (a muted KO: 1 060 view px² become 1 236, over 1 100).
 */
export function pushNow(push: CameraPush, hitstop: number, comfort: PushComfort): CameraPush {
  const allowed = comfort.shake !== 'off' && comfort.flashes === 'normal';
  return hitstop > 0 && allowed ? push : NO_PUSH;
}

/**
 * The push of the tick's contacts (`events`, between `prev` and `next`), the strongest of a trade:
 * the last contact sets it, a light one to none; `push` when nothing touched, as long as its
 * freeze lasts: spent once the game moves, it never comes back with a freeze that no blow made
 * (a super's flash). The Finisher's blows push nothing: its scene frames them
 * (docs/finisher.md §1.14).
 */
export function pushOf(
  events: readonly FightEvent[],
  prev: GameState,
  next: GameState,
  push: CameraPush,
): CameraPush {
  let found: CameraPush | null = null;
  for (const event of events) {
    if (event.type === 'finisherLock' || event.type === 'finisherBlow') return NO_PUSH;
    const contact = contactPush(event, prev, next);
    if (contact && (!found || contact.zoom > found.zoom)) found = contact;
  }
  if (found) return found;
  return next.hitstop > 0 ? push : NO_PUSH;
}

/** The push of a contact (NO_PUSH for a light one); null, the event is not a contact. */
function contactPush(event: FightEvent, prev: GameState, next: GameState): CameraPush | null {
  switch (event.type) {
    case 'ko':
      return { zoom: PUSH_ZOOM.ko, x: toPx(event.x) };
    case 'hit': {
      const zoom = hitZoomOf(event, prev, next);
      return zoom > 1 ? { zoom, x: toPx(event.x) } : NO_PUSH;
    }
    case 'block':
    case 'grab':
    case 'tech':
    case 'throw':
      return NO_PUSH;
    default:
      return null;
  }
}

/**
 * How much closer a blow that went through pushes: the one that sets off the combo's extender
 * (its defender extended on this tick) or a super's last, then a heavy one or a counter-hit.
 */
function hitZoomOf(
  hit: Extract<FightEvent, { type: 'hit' }>,
  prev: GameState,
  next: GameState,
): number {
  const defender = hit.by === 0 ? 1 : 0;
  const before = prev.fighters[defender].flags;
  const extended = (next.fighters[defender].flags & ~before & FLAG_EXTENDED) !== 0;
  if (extended || (hit.tier === 3 && !hit.pulse)) return PUSH_ZOOM.extender;
  return hit.heavy || hit.counter !== null ? PUSH_ZOOM.heavy : 1;
}

/**
 * The closest the camera frames while `push` plays, from `closeUp` (this frame's): what the
 * flashes lit on its contact are counted at, as they will show (flash-budget.ts).
 */
export function closestDuring(closeUp: number, push: CameraPush): number {
  return Math.max(closeUp, Math.min(closeUp, MAX_CLOSE_UP) * push.zoom);
}

/** The framed middle: `framed` as long as the fighters' `middle` stays within the window. */
function windowed(framed: number | null, middle: number): number {
  if (framed === null) return middle;
  return Math.min(Math.max(framed, middle - FOOTSIES_WINDOW), middle + FOOTSIES_WINDOW);
}

function within(value: number, limit: number): number {
  return Math.min(Math.max(value, -limit), limit);
}

/**
 * The framing at `closeUp` centered on world x `middle` as far as the simulation's camera
 * (`viewLeft`) lets it, the ground at the bottom of the screen: the fight's, and the Finisher's
 * close up on its impact.
 */
export function frameAround(
  middle: number,
  closeUp: number,
  viewLeft: number,
  groundY: number,
): Framing {
  const width = VIEW_SIZE.width / closeUp;
  const left = Math.min(Math.max(middle - width / 2, viewLeft), viewLeft + VIEW_SIZE.width - width);
  return { closeUp, left, top: groundY - groundY / closeUp };
}
