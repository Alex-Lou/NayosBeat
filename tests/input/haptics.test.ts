import { describe, expect, it, vi } from 'vitest';
import { rumble, rumblePad } from '../../src/input/haptics';

describe('the gamepads rumble', () => {
  it('plays a strong rumble on every pad that has one, and leaves the others alone', async () => {
    const playEffect = vi.fn(() => Promise.resolve('complete' as GamepadHapticsResult));
    const failing = vi.fn(() => Promise.reject(new Error('not supported')));
    const pads = [
      { vibrationActuator: { playEffect } },
      {},
      { vibrationActuator: { playEffect: failing } },
    ] as unknown as Gamepad[];
    rumble(pads, 260, 1);
    expect(playEffect).toHaveBeenCalledWith('dual-rumble', {
      duration: 260,
      strongMagnitude: 1,
      weakMagnitude: 0.6,
    });
    expect(failing).toHaveBeenCalledOnce();
    // A pad that cannot rumble rejects quietly.
    await Promise.resolve();
  });

  it('taps with the weak motor alone when asked, a heavy blow given (P23)', () => {
    const playEffect = vi.fn(() => Promise.resolve('complete' as GamepadHapticsResult));
    const pad = { vibrationActuator: { playEffect } } as unknown as Gamepad;
    rumblePad(pad, { ms: 30, strength: 0.3, weakOnly: true });
    expect(playEffect).toHaveBeenCalledWith('dual-rumble', {
      duration: 30,
      strongMagnitude: 0,
      weakMagnitude: 0.3,
    });
  });
});
