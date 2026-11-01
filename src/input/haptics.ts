/**
 * The phone's vibration (Android browsers; iOS has none): the fight scene calls it on the
 * events that deserve one (see `vibrationFor`). Does nothing where it is not supported.
 */
export function vibrate(ms: number): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(ms);
}

/** A gamepad's jolt: `ms` long, at `strength` 0 to 1; `weakOnly`, the light motor alone, a tap. */
export interface Rumble {
  readonly ms: number;
  readonly strength: number;
  readonly weakOnly?: boolean;
}

/**
 * The gamepads' rumble (Chrome and Edge, where the pad has one): a jolt of `ms`, at `strength`
 * 0 to 1, on every pad connected. Does nothing elsewhere.
 */
export function rumble(pads: readonly Gamepad[], ms: number, strength: number): void {
  for (const pad of pads) rumblePad(pad, { ms, strength });
}

/** One gamepad's rumble (a player's own, docs/polish/AUDIT-ET-PLAN.md, P23). */
export function rumblePad(pad: Gamepad, { ms, strength, weakOnly = false }: Rumble): void {
  // Missing on some browsers, whatever the types say.
  const actuator = (pad as { vibrationActuator?: GamepadHapticActuator }).vibrationActuator;
  actuator
    ?.playEffect('dual-rumble', {
      duration: ms,
      strongMagnitude: weakOnly ? 0 : strength,
      weakMagnitude: weakOnly ? strength : strength * 0.6,
    })
    .catch(() => undefined);
}
