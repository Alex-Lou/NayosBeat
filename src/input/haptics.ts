/**
 * The phone's vibration (Android browsers; iOS has none): the fight scene calls it on the
 * events that deserve one (see `vibrationFor`). Does nothing where it is not supported.
 */
export function vibrate(ms: number): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(ms);
}
