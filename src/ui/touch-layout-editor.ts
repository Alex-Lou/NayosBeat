import type { PadAction } from '../input/bindings';
import { controlsStore, type ControlsStore } from '../input/controls-store';
import { placeButton } from '../input/touch-controls';
import {
  BUTTON_SIZES,
  CLUSTER_SIZES,
  DEFAULT_TOUCH_LAYOUT,
  fitsZone,
  nearestButton,
  OPACITIES,
  overlapping,
  placedButtons,
  reachOf,
  TOP_CLEARANCE_PX,
  TOUCH_BUTTONS,
  type TouchLayout,
} from '../input/touch-layout';
import { movedText, TOUCH_TEXTS } from './bindings-text';
import { element, Menu, type MenuFeedback, type MenuItem } from './menu';

export interface TouchLayoutEditorOptions {
  readonly overlay?: boolean;
  readonly onBack: () => void;
  readonly feedback?: (action: MenuFeedback) => void;
  readonly store?: ControlsStore;
}

/** A button held by a finger: which, by which pointer, from where, and how far off its center. */
interface Drag {
  readonly pointerId: number;
  readonly index: number;
  readonly from: TouchLayout;
  readonly offsetRight: number;
  readonly offsetBottom: number;
}

/**
 * « Disposition » (docs/polish/AUDIT-ET-PLAN.md, P24): player 1's touch buttons where the fight
 * puts them, on the right half of the screen, moved with a finger; beside them, a menu for the
 * cluster's size, a button's size, the cluster's opacity and « Par défaut », driven like every
 * menu (the keyboard and the gamepad reach all but the placing). Every change is kept at once
 * (`ControlsStore`), and refused when buttons would overlap or leave the screen.
 */
export class TouchLayoutEditor {
  private readonly root: HTMLDivElement;
  private readonly zone: HTMLDivElement;
  private readonly buttons: readonly HTMLDivElement[];
  private readonly store: ControlsStore;
  private layout: TouchLayout;
  private menu: Menu | undefined;
  /** The button the menu sizes (TOUCH_BUTTONS' index): the last one touched, or chosen. */
  private chosen = 0;
  private note: string = TOUCH_TEXTS.drag;
  private drag: Drag | undefined;

  constructor(
    parent: HTMLElement,
    private readonly options: TouchLayoutEditorOptions,
  ) {
    this.store = options.store ?? controlsStore;
    this.layout = this.store.get().touch;
    this.root = element('div', 'touch-editor');
    // The buttons' zone of the fight (styles.css, `.touch-button-zone`), the same corner.
    this.zone = element('div', 'touch-editor-zone');
    this.buttons = TOUCH_BUTTONS.map((spec) =>
      element('div', `touch-button ${spec.className}`, spec.label),
    );
    this.zone.append(...this.buttons);
    this.zone.addEventListener('pointerdown', this.onDown);
    this.zone.addEventListener('pointermove', this.onMove);
    this.zone.addEventListener('pointerup', this.onUp);
    this.zone.addEventListener('pointercancel', this.onUp);
    this.root.appendChild(this.zone);
    parent.appendChild(this.root);
    this.place();
    this.showMenu(0);
  }

  dispose(): void {
    this.menu?.dispose();
    this.root.remove();
  }

  /** The zone's size on the page, in CSS px. */
  private zoneSize(): { width: number; height: number } {
    const rect = this.zone.getBoundingClientRect();
    return { width: rect.right - rect.left, height: rect.bottom - rect.top };
  }

  /** Whether `layout` keeps every button apart and on this screen. */
  private allows(layout: TouchLayout): boolean {
    const placed = placedButtons(layout);
    return !overlapping(placed) && fitsZone(placed, this.zoneSize());
  }

  private place(): void {
    placedButtons(this.layout).forEach((spec, index) => {
      const button = this.buttons[index];
      if (!button) return;
      placeButton(button, spec);
      if (index === this.chosen) button.classList.add('chosen');
      else button.classList.remove('chosen');
    });
    this.zone.style.opacity = String(this.layout.opacity / 100);
  }

  /** Keeps `layout`, and shows it. */
  private keep(layout: TouchLayout): void {
    this.layout = layout;
    this.store.set({ ...this.store.get(), touch: layout });
    this.place();
  }

  private showMenu(initialIndex: number): void {
    const spec = TOUCH_BUTTONS[this.chosen] ?? TOUCH_BUTTONS[0];
    if (!spec) return;
    const { size, opacity, buttons } = this.layout;
    const items: MenuItem[] = [];
    const again = (item: MenuItem) => () => {
      this.showMenu(items.indexOf(item));
    };
    const cluster: MenuItem = {
      label: `Taille : ${size} %`,
      onSelect: () => {
        this.cycle(CLUSTER_SIZES, size, (next) => ({ ...this.layout, size: next }));
        again(cluster)();
      },
    };
    const which: MenuItem = {
      label: `Bouton : ${spec.label}`,
      onSelect: () => {
        this.chosen = (this.chosen + 1) % TOUCH_BUTTONS.length;
        this.place();
        again(which)();
      },
    };
    const action: PadAction = spec.action;
    const own = buttons[action];
    const single: MenuItem = {
      label: `Taille de ${spec.label} : ${own.size} %`,
      onSelect: () => {
        this.cycle(BUTTON_SIZES, own.size, (next) => ({
          ...this.layout,
          buttons: { ...this.layout.buttons, [action]: { ...own, size: next } },
        }));
        again(single)();
      },
    };
    const fade: MenuItem = {
      label: `Opacité : ${opacity} %`,
      onSelect: () => {
        const next = OPACITIES[(OPACITIES.indexOf(opacity) + 1) % OPACITIES.length] ?? 100;
        this.keep({ ...this.layout, opacity: next });
        again(fade)();
      },
    };
    const reset: MenuItem = {
      label: 'Par défaut',
      onSelect: () => {
        this.note = TOUCH_TEXTS.reset;
        this.keep(DEFAULT_TOUCH_LAYOUT);
        again(reset)();
      },
    };
    items.push(cluster, which, single, fade, reset, {
      label: 'Retour',
      onSelect: this.options.onBack,
    });
    this.menu?.dispose();
    this.menu = new Menu(this.root, {
      title: TOUCH_TEXTS.title,
      subtitle: this.note,
      items,
      onBack: this.options.onBack,
      initialIndex,
      ...(this.options.overlay ? { overlay: true } : {}),
      ...(this.options.feedback ? { feedback: this.options.feedback } : {}),
    });
  }

  /**
   * The next of `values` after `current` that keeps the buttons apart and on the screen, round
   * and round; none: nothing changes, and the screen says so.
   */
  private cycle(
    values: readonly number[],
    current: number,
    apply: (value: number) => TouchLayout,
  ): void {
    const start = values.indexOf(current);
    for (let step = 1; step < values.length; step++) {
      const value = values[(start + step) % values.length];
      if (value === undefined) continue;
      const layout = apply(value);
      if (!this.allows(layout)) continue;
      this.note = TOUCH_TEXTS.drag;
      this.keep(layout);
      return;
    }
    this.note = TOUCH_TEXTS.noRoom;
  }

  /** Where a pointer is, from the zone's bottom-right corner, in CSS px. */
  private fromCorner(event: PointerEvent): { right: number; bottom: number } {
    const rect = this.zone.getBoundingClientRect();
    return { right: rect.right - event.clientX, bottom: rect.bottom - event.clientY };
  }

  private readonly onDown = (event: PointerEvent): void => {
    if (this.drag) return;
    const at = this.fromCorner(event);
    const placed = placedButtons(this.layout);
    const index = nearestButton(at.right, at.bottom, placed);
    const button = placed[index];
    if (!button) return;
    this.zone.setPointerCapture(event.pointerId);
    this.drag = {
      pointerId: event.pointerId,
      index,
      from: this.layout,
      offsetRight: at.right - button.right,
      offsetBottom: at.bottom - button.bottom,
    };
    this.chosen = index;
    this.place();
  };

  private readonly onMove = (event: PointerEvent): void => {
    const drag = this.drag;
    if (event.pointerId !== drag?.pointerId) return;
    const spec = TOUCH_BUTTONS[drag.index];
    const button = placedButtons(this.layout)[drag.index];
    if (!spec || !button) return;
    const at = this.fromCorner(event);
    const { width, height } = this.zoneSize();
    const reach = reachOf(button);
    // The center, kept where the whole button stays in the zone, under the pause's corner.
    const clamp = (value: number, max: number) => Math.min(Math.max(value, reach), max - reach);
    const right = clamp(at.right - drag.offsetRight, width);
    const bottom = clamp(at.bottom - drag.offsetBottom, height - TOP_CLEARANCE_PX);
    const cluster = this.layout.size / 100;
    const own = this.layout.buttons[spec.action];
    this.layout = {
      ...this.layout,
      buttons: {
        ...this.layout.buttons,
        [spec.action]: { ...own, right: right / cluster, bottom: bottom / cluster },
      },
    };
    this.place();
  };

  private readonly onUp = (event: PointerEvent): void => {
    const drag = this.drag;
    if (event.pointerId !== drag?.pointerId) return;
    this.drag = undefined;
    const label = TOUCH_BUTTONS[drag.index]?.label ?? '';
    if (this.layout === drag.from) return;
    if (overlapping(placedButtons(this.layout))) {
      this.options.feedback?.('back');
      this.note = TOUCH_TEXTS.overlap;
      this.layout = drag.from;
      this.place();
    } else {
      this.options.feedback?.('confirm');
      this.note = movedText(label);
      this.keep(this.layout);
    }
    this.showMenu(1);
  };
}

/**
 * The touch tab's picture of `layout`: a phone held sideways (667 × 375 CSS px, an iPhone SE),
 * shrunk, its stick's place and the buttons where the fight puts them, at their opacity.
 */
export function drawTouchPreview(layout: TouchLayout): HTMLElement {
  const frame = element('div', 'touch-mini');
  frame.setAttribute('aria-hidden', 'true');
  const screen = element('div', 'touch-mini-screen');
  const zone = element('div', 'touch-mini-zone');
  zone.style.opacity = String(layout.opacity / 100);
  placedButtons(layout).forEach((spec) => {
    const button = element('div', `touch-button ${spec.className}`, spec.label);
    placeButton(button, spec);
    zone.appendChild(button);
  });
  screen.append(element('div', 'touch-mini-stick'), zone);
  frame.appendChild(screen);
  return frame;
}
