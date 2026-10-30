import { describe, expect, it, vi } from 'vitest';
import { rumble } from '../../src/input/haptics';

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
});
