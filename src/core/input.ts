/**
 * One player's input for one tick, as a bitmask. Every device (keyboard, gamepad, touch, AI)
 * produces this same format, so the simulation never knows where inputs come from.
 */
export type InputBits = number;

export const Input = {
  Up: 1 << 0,
  Down: 1 << 1,
  Left: 1 << 2,
  Right: 1 << 3,
  Jump: 1 << 4,
  Light: 1 << 5,
  Heavy: 1 << 6,
  Special: 1 << 7,
} as const;

export const DIRECTIONS = Input.Up | Input.Down | Input.Left | Input.Right;

export function has(bits: InputBits, flag: number): boolean {
  return (bits & flag) !== 0;
}

/**
 * Resolves simultaneous opposite directions (SOCD), as fighting-game standards do:
 * left + right = neutral, up + down = up.
 */
export function cleanSocd(bits: InputBits): InputBits {
  let cleaned = bits;
  if (has(bits, Input.Left) && has(bits, Input.Right)) {
    cleaned &= ~(Input.Left | Input.Right);
  }
  if (has(bits, Input.Up) && has(bits, Input.Down)) {
    cleaned &= ~Input.Down;
  }
  return cleaned;
}

/** The horizontal direction held, in stage coordinates (SOCD already cleaned). */
export function horizontalDirection(input: InputBits): -1 | 0 | 1 {
  if (has(input, Input.Right)) return 1;
  if (has(input, Input.Left)) return -1;
  return 0;
}
