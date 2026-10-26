import { has, Input, type InputBits } from './input';
import { MOTION_END_FRAMES } from './rules';
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
 * Index in the history where the motion was completed, or null. The steps must appear in
 * order (other inputs may come in between) and the last one must have been held during the
 * last `MOTION_END_FRAMES` ticks.
 */
function completedAt(
  history: readonly InputBits[],
  facing: Facing,
  sequence: readonly Step[],
): number | null {
  let expected = sequence.length - 1;
  let lastStepIndex: number | null = null;
  for (let i = history.length - 1; i >= 0; i--) {
    const bits = history[i];
    if (bits === undefined || stepOf(bits, facing) !== sequence[expected]) continue;
    if (lastStepIndex === null) {
      if (history.length - 1 - i >= MOTION_END_FRAMES) return null;
      lastStepIndex = i;
    }
    expected--;
    if (expected < 0) return lastStepIndex;
  }
  return null;
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
