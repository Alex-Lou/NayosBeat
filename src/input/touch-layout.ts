import { Input } from '../core/input';

/**
 * The right-hand cluster of the touch controls, as data: tested in pure geometry (no visible
 * overlap on the small phones), drawn from the same numbers. Two rows; the centers of L, H, SAUT
 * and S never move (muscle memory), PRISE takes the old throw button's place, DASH is the only
 * new one:
 *
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
    fontSize: 12,
    flag: Input.Light,
    className: 'touch-light',
    right: 200,
    bottom: 52,
    diameter: 68,
  },
  {
    label: 'H',
    fontSize: 12,
    flag: Input.Heavy,
    className: 'touch-heavy',
    right: 126,
    bottom: 52,
    diameter: 68,
  },
  {
    label: 'SAUT',
    fontSize: 9,
    flag: Input.Jump,
    className: 'touch-jump',
    right: 52,
    bottom: 52,
    diameter: 60,
  },
  {
    label: 'S',
    fontSize: 12,
    flag: Input.Special,
    className: 'touch-special',
    right: 163,
    bottom: 126,
    diameter: 64,
  },
  {
    label: 'PRISE',
    fontSize: 8,
    flag: Input.Grab,
    className: 'touch-grab',
    right: 89,
    bottom: 126,
    diameter: 60,
  },
  {
    label: 'DASH',
    fontSize: 8,
    flag: Input.Dash,
    className: 'touch-dash',
    right: 237,
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
