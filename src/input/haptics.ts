/**
 * The phone's vibration (Android browsers; iOS has none): the fight scene calls it on the
 * events that deserve one (see `vibrationFor`). Does nothing where it is not supported.
 */
export function vibrate(ms: number): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(ms);
}

/**
 * The gamepads' rumble (Chrome and Edge, where the pad has one): a jolt of `ms`, at `strength`
 * 0 to 1, on every pad connected. Does nothing elsewhere.
 */
export function rumble(pads: readonly Gamepad[], ms: number, strength: number): void {
  for (const pad of pads) {
    // Missing on some browsers, whatever the types say.
    const actuator = (pad as { vibrationActuator?: GamepadHapticActuator }).vibrationActuator;
    actuator
      ?.playEffect('dual-rumble', {
        duration: ms,
        strongMagnitude: strength,
        weakMagnitude: strength * 0.6,
      })
      .catch(() => undefined);
  }
}
