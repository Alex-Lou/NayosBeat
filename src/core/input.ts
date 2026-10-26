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
} as const;

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
