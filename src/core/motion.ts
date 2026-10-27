import { has, Input, type InputBits } from './input';
import { MOTION_END_FRAMES, MOTION_SPAN_FRAMES } from './rules';
import type { Facing } from './state';

/** Classic special-move motions, relative to the direction the fighter faces. */
export type Motion = 'quarterCircleForward' | 'dragonPunch';

type Step = 'down' | 'downForward' | 'forward';

const QUARTER_CIRCLE_FORWARD: readonly Step[] = ['down', 'downForward', 'forward'];
const DRAGON_PUNCH: readonly Step[] = ['forward', 'down', 'downForward'];

/**
 * Recognizes a motion in the direction history (oldest first). When both motions can be read,
 * the one completed most recently wins: walking forward then ↓↘→ is a quarter circle, not a
 * dragon punch, even though the walk provides the dragon punch's first step.
 */
export function detectMotion(history: readonly InputBits[], facing: Facing): Motion | null {
  const dragonPunch = completedAt(history, facing, DRAGON_PUNCH);
  const quarterCircle = completedAt(history, facing, QUARTER_CIRCLE_FORWARD);
  if (dragonPunch === null && quarterCircle === null) return null;
  if (quarterCircle === null) return 'dragonPunch';
  if (dragonPunch === null) return 'quarterCircleForward';
  return dragonPunch >= quarterCircle ? 'dragonPunch' : 'quarterCircleForward';
}

/**
 * Index in the history where the motion was completed (where its last step was entered), or
 * null. The steps must appear in order (other inputs may come in between), and the motion must
 * be fresh (docs/combat-v2.md §2.7): its last step entered, not merely held, within the last
 * `MOTION_END_FRAMES` ticks, and its first step within the last `MOTION_SPAN_FRAMES`. Crouching,
 * then walking forward a while before pressing, is a walk, not a quarter circle.
 */
function completedAt(
  history: readonly InputBits[],
  facing: Facing,
  sequence: readonly Step[],
): number | null {
  const last = history.length - 1;
  const final = sequence.length - 1;
  // Back from the present to the last step, then to the tick it was entered on.
  let entered = last;
  while (entered >= 0 && stepAt(history, entered, facing) !== sequence[final]) entered--;
  while (entered > 0 && stepAt(history, entered - 1, facing) === sequence[final]) entered--;
  if (entered < 0 || last - entered >= MOTION_END_FRAMES) return null;

  let expected = final - 1;
  for (let i = entered - 1; i >= 0 && last - i < MOTION_SPAN_FRAMES; i--) {
    if (stepAt(history, i, facing) !== sequence[expected]) continue;
    expected--;
    if (expected < 0) return entered;
  }
  return null;
}

function stepAt(history: readonly InputBits[], index: number, facing: Facing): Step | null {
  const bits = history[index];
  return bits === undefined ? null : stepOf(bits, facing);
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
