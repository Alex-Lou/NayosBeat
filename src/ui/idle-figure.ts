import type { FighterLook } from './fighter-look';
import { element } from './menu';

/** A rectangle of a cell, in art pixels: the part an element shows (the whole cell, the bust). */
export interface View {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Frame `frame` of `look`, in an element that its parent (which shows `view` of the cell, scaled
 * to its size) places over the frame's cut: the image shows there, the rest of the cell is empty.
 */
export function cutElement(look: FighterLook, frame: number, view: View): HTMLElement {
  const cut = element('span', 'select-cut');
  Object.assign(cut.style, {
    position: 'absolute',
    backgroundImage: `url("${look.strip}")`,
    backgroundRepeat: 'no-repeat',
    ...cutStyle(look, frame, view),
  });
  return cut;
}

/**
 * Where the element of `cutElement` goes to show frame `frame`, in percentages of its parent (which
 * shows `view`), and where its image goes in it: the part of the frame's cut inside the view.
 */
function cutStyle(look: FighterLook, frame: number, view: View): Record<string, string> {
  const cut = look.cuts[frame] ?? { x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 };
  const x = Math.max(cut.x, view.x);
  const y = Math.max(cut.y, view.y);
  const width = Math.max(0, Math.min(cut.x + cut.width, view.x + view.width) - x);
  const height = Math.max(0, Math.min(cut.y + cut.height, view.y + view.height) - y);
  const { image } = look;
  // The image scaled so that `width` by `height` of it fill the element, moved so that the
  // part shown starts at the element's corner (a percentage of the room left around it).
  const scale = (size: number, part: number): string => (part > 0 ? percent(size / part) : '0%');
  const shift = (at: number, room: number): string => (room > 0 ? percent(at / room) : '0%');
  return {
    left: percent((x - view.x) / view.width),
    top: percent((y - view.y) / view.height),
    width: percent(width / view.width),
    height: percent(height / view.height),
    backgroundSize: `${scale(image.width, width)} ${scale(image.height, height)}`,
    backgroundPosition: `${shift(cut.left + x - cut.x, image.width - width)} ${shift(cut.top + y - cut.y, image.height - height)}`,
  };
}

/**
 * The idle of `look` as keyframes of the element of `cutElement`, each frame of the strip held
 * until the next (`step-end`): the pace of the game, its uneven steps included, which a CSS
 * `steps()` would even out.
 */
export function idleKeyframes(
  look: FighterLook,
  view: View,
): { keyframes: Keyframe[]; duration: number } {
  const { idle } = look;
  const total = idle.reduce((sum, { seconds }) => sum + seconds, 0);
  const keyframes: Keyframe[] = [];
  let start = 0;
  for (const { frame, seconds } of idle) {
    keyframes.push({ offset: start / total, easing: 'step-end', ...cutStyle(look, frame, view) });
    start += seconds;
  }
  // The last frame holds to the end of the loop.
  keyframes.push({ offset: 1, ...cutStyle(look, idle.at(-1)?.frame ?? 0, view) });
  return { keyframes, duration: total * 1000 };
}

function percent(ratio: number): string {
  return `${Math.round(ratio * 10000) / 100}%`;
}
