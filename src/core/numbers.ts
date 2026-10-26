/**
 * `direction × magnitude`, never `-0`: two states that only differ by the sign of a zero
 * would compare as different, which breaks determinism checks and replays.
 */
export function signed(direction: -1 | 0 | 1, magnitude: number): number {
  const value = direction * magnitude;
  return value === 0 ? 0 : value;
}
