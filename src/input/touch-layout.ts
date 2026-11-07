import { Input } from '../core/input';
import { isRecord, type PadAction } from './bindings';

/** The actions with a touch button: every pad action but jump, the d-pad's up. */
export type TouchAction = Exclude<PadAction, 'jump'>;
export const TOUCH_ACTIONS: readonly TouchAction[] = [
  'light',
  'heavy',
  'special',
  'grab',
  'dash',
  'boost',
];

/**
 * The touch controls as data: the right-hand cluster and the d-pad, tested in pure geometry (no
 * visible overlap on the small phones), drawn from the same numbers. Two rows of three; the
 * centers of L, H and S never move (muscle memory). Jumping is the d-pad's up since the d-pad
 * came (docs/combat-v2.md §0.2, D40): PRISE took SAUT's place, BOOST (docs/combos-v3.md §1.8.5)
 * came down beside S, where PRISE was:
 *
 *            top row (center 126 from the bottom)    [DASH]   [ S ]   [BOOST]
 *            bottom row (center 52 from the bottom)    [ L ]   [ H ]   [PRISE]
 *
 * The farthest edge is 265 px from the right: within the thumb's reach on an iPhone SE in
 * landscape (right half: 333 px).
 */

export interface TouchButton {
  /** Shown on the button, in the pixel font: it must fit inside (see LABEL_PADDING_PX). */
  readonly label: string;
  /** Font size of the label, in CSS px: every glyph of the pixel font is this wide. */
  readonly fontSize: number;
  /** Input flags held while the button is. */
  readonly flag: number;
  /** Its action, by which the player's layout places it (`TouchLayout`). */
  readonly action: TouchAction;
  /** Color and look (styles.css). */
  readonly className: string;
  /** Center, in CSS px from the right and from the bottom of the safe area. */
  readonly right: number;
  readonly bottom: number;
  /** Visible size, in CSS px. */
  readonly diameter: number;
}

export const TOUCH_BUTTONS: readonly TouchButton[] = [
  {
    label: 'L',
    action: 'light',
    fontSize: 12,
    flag: Input.Light,
    className: 'touch-light',
    right: 200,
    bottom: 52,
    diameter: 68,
  },
  {
    label: 'H',
    action: 'heavy',
    fontSize: 12,
    flag: Input.Heavy,
    className: 'touch-heavy',
    right: 126,
    bottom: 52,
    diameter: 68,
  },
  {
    label: 'S',
    action: 'special',
    fontSize: 12,
    flag: Input.Special,
    className: 'touch-special',
    right: 163,
    bottom: 126,
    diameter: 64,
  },
  {
    label: 'PRISE',
    action: 'grab',
    fontSize: 8,
    flag: Input.Grab,
    className: 'touch-grab',
    right: 52,
    bottom: 52,
    diameter: 60,
  },
  {
    label: 'DASH',
    action: 'dash',
    fontSize: 8,
    flag: Input.Dash,
    className: 'touch-dash',
    right: 237,
    bottom: 126,
    diameter: 56,
  },
  {
    label: 'BOOST',
    action: 'boost',
    fontSize: 8,
    flag: Input.Boost,
    className: 'touch-boost',
    right: 89,
    bottom: 126,
    diameter: 56,
  },
];

/** A label keeps this much room on each side inside its circle. */
export const LABEL_PADDING_PX = 8;

/**
 * A touch counts this far beyond the visible circle (a target of at least 48 dp); where two
 * such zones overlap, the nearest center wins.
 */
export const TOUCH_SLOP_PX = 8;

/**
 * Index of the button a touch at (`right`, `bottom`) presses (CSS px from the right and from the
 * bottom of the safe area): the one whose center is nearest, among those whose zone it is in.
 * -1 when it is in none.
 */
export function nearestButton(
  right: number,
  bottom: number,
  layout: readonly TouchButton[] = TOUCH_BUTTONS,
): number {
  let nearest = -1;
  let nearestDistance = Infinity;
  for (let index = 0; index < layout.length; index++) {
    const button = layout[index];
    if (!button) continue;
    const distance = Math.hypot(right - button.right, bottom - button.bottom);
    if (distance <= button.diameter / 2 + TOUCH_SLOP_PX && distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/**
 * The player's own cluster (« Disposition », docs/polish/AUDIT-ET-PLAN.md, P24): each button
 * where they moved it and as big as they made it, the whole cluster bigger or smaller (around
 * the safe area's bottom-right corner), and how opaque. Kept with the keys
 * (src/input/controls-store.ts).
 */
export interface TouchLayout {
  /** The whole cluster, in percent: its buttons' places and sizes. */
  readonly size: number;
  /** The cluster's opacity, in percent. */
  readonly opacity: number;
  readonly buttons: Readonly<Record<TouchAction, TouchPlacement>>;
}

/** A button's center at the cluster's 100 % (CSS px from the right and the bottom), its size. */
export interface TouchPlacement {
  readonly right: number;
  readonly bottom: number;
  /** In percent, on top of the cluster's. */
  readonly size: number;
}

/** The sizes the cluster and each button take, in the order they cycle. */
export const CLUSTER_SIZES: readonly number[] = [80, 90, 100, 110, 120];
export const BUTTON_SIZES: readonly number[] = [80, 90, 100, 110, 120, 130];
/** Never fainter than 40 %: a button must stay where the thumb can find it. */
export const OPACITIES: readonly number[] = [40, 50, 60, 70, 80, 90, 100];

export const DEFAULT_TOUCH_LAYOUT: TouchLayout = {
  size: 100,
  opacity: 100,
  buttons: Object.fromEntries(
    TOUCH_BUTTONS.map(({ action, right, bottom }) => [action, { right, bottom, size: 100 }]),
  ) as Record<TouchAction, TouchPlacement>,
};

/**
 * The d-pad (docs/combat-v2.md §0.2, D40): fixed at the bottom-left corner of the safe area, its
 * center and its size scaled with the cluster's « Taille », never moved by hand. In CSS px at the
 * cluster's 100 %.
 */
export const DPAD = { left: 104, bottom: 104, diameter: 156 } as const;

/** Where the d-pad is and how big, for `layout`: from the safe area's bottom-left corner. Pure. */
export function dpadOf(layout: TouchLayout): { left: number; bottom: number; diameter: number } {
  const cluster = layout.size / 100;
  return {
    left: DPAD.left * cluster,
    bottom: DPAD.bottom * cluster,
    diameter: DPAD.diameter * cluster,
  };
}

/** A touch counts this far beyond the d-pad's edge: a thumb lands roughly. */
export const DPAD_SLOP_PX = 24;

/**
 * The buttons as `layout` places them, TOUCH_BUTTONS' order: centers scaled with the cluster
 * around the corner, diameters and labels with the cluster and the button (a label that fits at
 * 100 % fits at every size). Pure.
 */
export function placedButtons(layout: TouchLayout): TouchButton[] {
  const cluster = layout.size / 100;
  return TOUCH_BUTTONS.map((button) => {
    const placement = layout.buttons[button.action];
    const scale = cluster * (placement.size / 100);
    return {
      ...button,
      right: placement.right * cluster,
      bottom: placement.bottom * cluster,
      diameter: button.diameter * scale,
      fontSize: button.fontSize * scale,
    };
  });
}

/** The ring of the BOOST button, past its edge (styles.css, `.touch-boost::before`, inset -6px). */
export const BOOST_RING_PX = 6;

/** How far a button reaches from its center: its circle, BOOST's ring with it. */
export function reachOf(button: TouchButton): number {
  return button.diameter / 2 + (button.flag === Input.Boost ? BOOST_RING_PX : 0);
}

/** Two buttons whose circles (and rings) touch: the eye could not tell them apart. */
export function overlapping(buttons: readonly TouchButton[]): boolean {
  return buttons.some((a, at) =>
    buttons
      .slice(at + 1)
      .some((b) => Math.hypot(a.right - b.right, a.bottom - b.bottom) < reachOf(a) + reachOf(b)),
  );
}

/**
 * The top of the button zone, kept free for the pause button (styles.css, `.pause-button`, and
 * its 48 px target) and the notch of the status bar.
 */
export const TOP_CLEARANCE_PX = 56;

/** Whether every button stays inside a button zone of `width` × `height` CSS px. */
export function fitsZone(
  buttons: readonly TouchButton[],
  zone: { readonly width: number; readonly height: number },
): boolean {
  return buttons.every((button) => {
    const reach = reachOf(button);
    return (
      button.right >= reach &&
      button.bottom >= reach &&
      button.right + reach <= zone.width &&
      button.bottom + reach <= zone.height - TOP_CLEARANCE_PX
    );
  });
}

/**
 * The buttons as `layout` places them, on a button zone of `zone` CSS px: as they are if they fit
 * in it (fitsZone), else the whole cluster shrunk around its corner as the « Taille » setting
 * shrinks it, as little as it takes for every button to fit. A screen smaller than the one the
 * layout was made on (the browser's bars back, the phone turned): the layout itself is never
 * changed, and comes back whole on a screen it fits. A zone not measured yet (no size) leaves the
 * buttons as they are. Pure.
 */
export function fittedButtons(
  layout: TouchLayout,
  zone: { readonly width: number; readonly height: number },
): TouchButton[] {
  const placed = placedButtons(layout);
  if (zone.width <= 0 || zone.height <= 0 || fitsZone(placed, zone)) return placed;
  // Each button's far edges, shrunk with the cluster; BOOST's ring keeps its width.
  let fit = 1;
  for (const button of placed) {
    const half = button.diameter / 2;
    const ring = reachOf(button) - half;
    fit = Math.min(
      fit,
      (zone.width - ring) / (button.right + half),
      (zone.height - TOP_CLEARANCE_PX - ring) / (button.bottom + half),
    );
  }
  // In tenths of a percent, rounded down: the edges land inside, never a rounding past them.
  const size = Math.floor(layout.size * Math.max(0, fit) * 10) / 10;
  return placedButtons({ ...layout, size });
}

/**
 * Where PRISE and BOOST stood by default before the d-pad (D40). A stored button still there was
 * never moved by the player: it takes its new default place, its size kept. One the player moved
 * stays where they put it.
 */
const PLACES_BEFORE_DPAD: Partial<Record<TouchAction, { right: number; bottom: number }>> = {
  grab: { right: 89, bottom: 126 },
  boost: { right: 126, bottom: 190 },
};

function sincePad(action: TouchAction, placement: TouchPlacement): TouchPlacement {
  const before = PLACES_BEFORE_DPAD[action];
  if (before?.right !== placement.right || before.bottom !== placement.bottom) return placement;
  const { right, bottom } = DEFAULT_TOUCH_LAYOUT.buttons[action];
  return { ...placement, right, bottom };
}

/**
 * A stored layout, checked once as it is read: the sizes and the opacity among those the screen
 * offers, each button's place finite and on a screen, its size offered; else its default. A
 * button left where the layout before the d-pad put it takes its new place (`sincePad`); a stored
 * SAUT, gone with the d-pad, is dropped. Buttons that would overlap all go back to their places.
 * Pure.
 */
export function parseTouchLayout(value: unknown): TouchLayout {
  if (!isRecord(value)) return DEFAULT_TOUCH_LAYOUT;
  const pick = (candidate: unknown, offered: readonly number[], fallback: number): number =>
    typeof candidate === 'number' && offered.includes(candidate) ? candidate : fallback;
  const stored = isRecord(value['buttons']) ? value['buttons'] : {};
  const buttons = Object.fromEntries(
    TOUCH_ACTIONS.map((action) => {
      const placement = parsePlacement(stored[action]);
      return [
        action,
        placement ? sincePad(action, placement) : DEFAULT_TOUCH_LAYOUT.buttons[action],
      ];
    }),
  ) as Record<TouchAction, TouchPlacement>;
  const layout: TouchLayout = {
    size: pick(value['size'], CLUSTER_SIZES, DEFAULT_TOUCH_LAYOUT.size),
    opacity: pick(value['opacity'], OPACITIES, DEFAULT_TOUCH_LAYOUT.opacity),
    buttons,
  };
  return overlapping(placedButtons(layout))
    ? { ...layout, buttons: DEFAULT_TOUCH_LAYOUT.buttons }
    : layout;
}

/** The farthest a center may be from the corner: past any phone or tablet. */
const MAX_OFFSET_PX = 2000;

function parsePlacement(value: unknown): TouchPlacement | undefined {
  if (!isRecord(value)) return undefined;
  const { right, bottom, size } = value;
  const offset = (n: unknown): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= MAX_OFFSET_PX;
  if (!offset(right) || !offset(bottom)) return undefined;
  if (typeof size !== 'number' || !BUTTON_SIZES.includes(size)) return undefined;
  return { right, bottom, size };
}
