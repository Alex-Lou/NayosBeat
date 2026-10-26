import { has, Input, type InputBits } from './input';
import { MOTION_END_FRAMES } from './rules';
import type { Facing } from './state';

/** Classic special-move motions, relative to the direction the fighter faces. */
export type Motion = 'quarterCircleForward' | 'dragonPunch';

type Step = 'down' | 'downForward' | 'forward';

const QUARTER_CIRCLE_FORWARD: readonly Step[] = ['down', 'downForward', 'forward'];
const DRAGON_PUNCH: readonly Step[] = ['forward', 'down', 'downForward'];

/**
 * Recognizes a motion in the direction history (oldest first). The dragon punch is checked
 * first because its input usually ends with a quarter-circle-like shape.
 */
export function detectMotion(history: readonly InputBits[], facing: Facing): Motion | null {
  if (matches(history, facing, DRAGON_PUNCH)) return 'dragonPunch';
  if (matches(history, facing, QUARTER_CIRCLE_FORWARD)) return 'quarterCircleForward';
  return null;
}

/**
 * True if the steps appear in order (other inputs may come in between)
 * and the last step was held during the last `MOTION_END_FRAMES` ticks.
 */
function matches(
  history: readonly InputBits[],
  facing: Facing,
  sequence: readonly Step[],
): boolean {
  let expected = sequence.length - 1;
  for (let i = history.length - 1; i >= 0; i--) {
    const bits = history[i];
    if (bits === undefined || stepOf(bits, facing) !== sequence[expected]) continue;
    const isLastStep = expected === sequence.length - 1;
    if (isLastStep && history.length - 1 - i >= MOTION_END_FRAMES) return false;
    expected--;
    if (expected < 0) return true;
  }
  return false;
}

function stepOf(bits: InputBits, facing: Facing): Step | null {
  const forward = facing === 1 ? Input.Right : Input.Left;
  const back = facing === 1 ? Input.Left : Input.Right;
  if (has(bits, back) || has(bits, Input.Up)) return null;

  const down = has(bits, Input.Down);
  if (down && has(bits, forward)) return 'downForward';
  if (down) return 'down';
  if (has(bits, forward)) return 'forward';
  return null;
}
