import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { toPx } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import {
  atHoldTick,
  firstTick,
  grabbed,
  last,
  lost,
  mash,
  NAYO_MIRROR,
  play,
  RIFF_MIRROR,
} from './hold-helpers';

const { Left, Light, Heavy, Special, Grab } = Input;

/**
 * What the holder does (docs/combat-v2.md §4.2 to §4.4, §15 Phase 2): pummels against the
 * limit, the two throws, their knockdowns and where they land. Player 1 holds player 2, from
 * 30 px, facing right: back is left.
 */

/** Plays a hold from its first free tick (t12), the holder pressing `choice` once, then nothing. */
function thrown(config: MatchConfig, choice: number, overrides = {}): GameState[] {
  const start = atHoldTick(grabbed(config, [{}, overrides]), 12, config);
  return play(start, 150, (tick) => [tick === 0 ? choice : 0, 0], config);
}

describe('pummels (§4.2.9)', () => {
  it.each([
    { config: NAYO_MIRROR, most: 2, total: 130 },
    { config: RIFF_MIRROR, most: 3, total: 115 },
  ])(
    '$config.fighters.0.name lands $most at most without a struggle, then throws: $total',
    ({ config, most, total }) => {
      const start = grabbed(config);
      const states = play(start, 150, (tick) => [mash(Light, tick), 0], config);
      const pummels = states.flatMap((s) => s.contacts).filter((c) => c.kind === 'pummel');
      expect(pummels).toHaveLength(most);
      expect(lost(start, last(states, start), 1)).toBe(total);
      // Fixed damage, every blow of the hold counted in the combo.
      const throwTick = states.find((s) => s.contacts.some((c) => c.kind === 'throw'));
      expect(throwTick?.fighters[1].comboCount).toBe(most + 1);
    },
  );

  it.each([
    { config: NAYO_MIRROR, most: 1 },
    { config: RIFF_MIRROR, most: 2 },
  ])(
    '$config.fighters.0.name lands $most against the fastest struggle (the floor of 36)',
    ({ config, most }) => {
      const start = grabbed(config);
      const states = play(start, 150, (tick) => [mash(Light, tick), mash(Heavy, tick)], config);
      const pummels = states.flatMap((s) => s.contacts).filter((c) => c.kind === 'pummel');
      expect(pummels).toHaveLength(most);
    },
  );
});

describe('throws (§4.3)', () => {
  it.each([
    { config: NAYO_MIRROR, choice: Heavy, advantage: 28, landsAt: 72 },
    { config: NAYO_MIRROR, choice: Left | Heavy, advantage: 26, landsAt: -66 },
    { config: RIFF_MIRROR, choice: Special, advantage: 30, landsAt: 49 },
    { config: RIFF_MIRROR, choice: Left | Grab, advantage: 28, landsAt: -66 },
  ])(
    '$config.fighters.0.name: knockdown +$advantage, landing $landsAt px away',
    ({ config, choice, advantage, landsAt }) => {
      const states = thrown(config, choice);
      const release = firstTick(states, (s) => s.hold === null);
      const after = states.slice(release);
      const throwerFree = firstTick(after, (s) => s.fighters[0].action === 'idle');
      const victimFree = firstTick(after, (s) => s.fighters[1].action === 'idle');
      expect(Math.abs(victimFree - throwerFree - advantage)).toBeLessThanOrEqual(1);
      const landed = after.find((s) => s.fighters[1].action === 'knockdown');
      const [thrower, victim] = landed?.fighters ?? [];
      const distance = toPx((victim?.x ?? 0) - (thrower?.x ?? 0));
      expect(Math.abs(distance - landsAt)).toBeLessThanOrEqual(2);
    },
  );

  it('switches sides on frame 6 of the throw backward, then lets go on its frame 14', () => {
    const states = thrown(NAYO_MIRROR, Left | Heavy);
    const side = (frame: number) => {
      const state = states.find(
        (s) => s.fighters[0].move === 'throwBack' && s.fighters[0].actionFrame === frame,
      );
      return Math.sign((state?.fighters[1].x ?? 0) - (state?.fighters[0].x ?? 0));
    };
    expect([side(5), side(6), side(13)]).toEqual([1, -1, -1]);
    const release = states.find((s) => s.contacts.some((c) => c.kind === 'throw'));
    expect(release?.fighters[0].actionFrame).toBe(14);
    expect(release?.fighters[1].action).toBe('airHit');
  });

  it('knocks out with a throw: the round ends', () => {
    const states = thrown(NAYO_MIRROR, Heavy, { health: 50 });
    const release = states.find((s) => s.contacts.some((c) => c.kind === 'throw'));
    expect(release?.fighters[1].action).toBe('ko');
    expect(release?.round.phase).toBe('roundEnd');
  });
});
