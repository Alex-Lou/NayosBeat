import { Input } from '../core/input';
import { isRecord, PAD_ACTIONS, type PadAction } from './bindings';

/**
 * The right-hand cluster of the touch controls, as data: tested in pure geometry (no visible
 * overlap on the small phones), drawn from the same numbers. Two rows; the centers of L, H, SAUT
 * and S never move (muscle memory), PRISE takes the old throw button's place, DASH came with the
 * combat v2, BOOST with the combos v3 (docs/combos-v3.md §1.8.5), in the notch between S and
 * PRISE, never right over S:
 *
 *            (center 190 from the bottom)                     [BOOST]
 *            top row (center 126 from the bottom)    [DASH]   [ S ]   [PRISE]
 *            bottom row (center 52 from the bottom)    [ L ]   [ H ]   [SAUT]
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
  readonly action: PadAction;
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
    label: 'SAUT',
    action: 'jump',
    fontSize: 9,
    flag: Input.Jump,
    className: 'touch-jump',
    right: 52,
    bottom: 52,
    diameter: 60,
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
    right: 89,
    bottom: 126,
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
    right: 126,
    bottom: 190,
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
  readonly buttons: Readonly<Record<PadAction, TouchPlacement>>;
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
  ) as Record<PadAction, TouchPlacement>,
};

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
 * A stored layout, checked once as it is read: the sizes and the opacity among those the screen
 * offers, each button's place finite and on a screen, its size offered; else its default. Buttons
 * that would overlap all go back to their places. Pure.
 */
export function parseTouchLayout(value: unknown): TouchLayout {
  if (!isRecord(value)) return DEFAULT_TOUCH_LAYOUT;
  const pick = (candidate: unknown, offered: readonly number[], fallback: number): number =>
    typeof candidate === 'number' && offered.includes(candidate) ? candidate : fallback;
  const stored = isRecord(value['buttons']) ? value['buttons'] : {};
  const buttons = Object.fromEntries(
    PAD_ACTIONS.map((action) => [
      action,
      parsePlacement(stored[action]) ?? DEFAULT_TOUCH_LAYOUT.buttons[action],
    ]),
  ) as Record<PadAction, TouchPlacement>;
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
