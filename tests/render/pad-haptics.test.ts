import { describe, expect, it, vi } from 'vitest';
import type { FightEvent } from '../../src/render/fight-events';
import { PadHaptics, RUMBLES, rumbleFor } from '../../src/render/pad-haptics';

/** Player 1 (index 0) strikes player 2. */
const BY_PLAYER_1 = { x: 0, y: 0, away: 1, by: 0, low: false } as const;
const BLOW = {
  ...BY_PLAYER_1,
  damage: 40,
  held: false,
  counter: null,
  tier: 0,
  pulse: false,
  freeze: 0,
};

const hit = (heavy: boolean, held = false): FightEvent => ({ type: 'hit', ...BLOW, heavy, held });

describe("each player's gamepad (docs/polish/AUDIT-ET-PLAN.md, P23)", () => {
  it('rumbles for a blow taken, harder for a heavy one, and taps the giver of a heavy one', () => {
    expect(rumbleFor(hit(false), 1)).toBe(RUMBLES.lightTaken);
    expect(rumbleFor(hit(false), 0)).toBeNull();
    expect(rumbleFor(hit(true), 1)).toBe(RUMBLES.heavyTaken);
    expect(rumbleFor(hit(true), 0)).toBe(RUMBLES.heavyGiven);
    expect(RUMBLES.heavyGiven.weakOnly).toBe(true);
    // A blow in a hold is a light one.
    expect(rumbleFor(hit(true, true), 1)).toBe(RUMBLES.lightTaken);
    expect(rumbleFor(hit(true, true), 0)).toBeNull();
  });

  it('brushes the guard, and shakes who is grabbed or thrown, never who does it', () => {
    const block: FightEvent = { type: 'block', ...BY_PLAYER_1 };
    const grab: FightEvent = { type: 'grab', ...BY_PLAYER_1, punish: false, freeze: 0 };
    const thrown: FightEvent = { type: 'throw', ...BY_PLAYER_1, damage: 100 };
    expect(rumbleFor(block, 1)).toBe(RUMBLES.guard);
    expect(rumbleFor(grab, 1)).toBe(RUMBLES.grabbed);
    expect(rumbleFor(thrown, 1)).toBe(RUMBLES.heavyTaken);
    for (const event of [block, grab, thrown]) expect(rumbleFor(event, 0)).toBeNull();
  });

  it('leaves the KO that blows a gauge up, and the Finisher, to their own rumble', () => {
    const ko = (finish: 'plain' | 'ultimate' | 'finale'): FightEvent => ({
      type: 'ko',
      ...BLOW,
      finish,
    });
    expect(rumbleFor(ko('plain'), 1)).toBe(RUMBLES.heavyTaken);
    expect(rumbleFor(ko('plain'), 0)).toBe(RUMBLES.heavyGiven);
    for (const player of [0, 1] as const) {
      expect(rumbleFor(ko('ultimate'), player)).toBeNull();
      expect(rumbleFor(ko('finale'), player)).toBeNull();
    }
  });

  it("rumbles each player's own pad, and no pad for a player without one", () => {
    const played: [string, number, number][] = [];
    const padOf = (name: string): Gamepad =>
      ({
        vibrationActuator: {
          playEffect: vi.fn((_: string, effect: GamepadEffectParameters) => {
            played.push([name, effect.strongMagnitude ?? 0, effect.weakMagnitude ?? 0]);
            return Promise.resolve('complete');
          }),
        },
      }) as unknown as Gamepad;
    const pads = { 0: padOf('player 1'), 1: padOf('player 2') };
    new PadHaptics((player) => pads[player]).react(hit(true));
    expect(played).toEqual([
      ['player 1', 0, RUMBLES.heavyGiven.strength],
      ['player 2', RUMBLES.heavyTaken.strength, RUMBLES.heavyTaken.strength * 0.6],
    ]);
    played.length = 0;
    new PadHaptics((player) => (player === 1 ? pads[1] : undefined)).react(hit(true));
    expect(played.map(([name]) => name)).toEqual(['player 2']);
  });
});
