import { describe, expect, it } from 'vitest';
import { findHit } from '../../src/core/combat';
import { px } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import {
  HOLD_LIMIT_FRAMES,
  HOLD_MIN_FRAMES,
  STRUGGLE_FRAMES,
  THROW_TECH_STUN,
} from '../../src/core/rules';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import {
  atHoldTick,
  catches,
  firstTick,
  grabbed,
  last,
  mash,
  NAYO_MIRROR,
  play,
  RIFF_MIRROR,
} from './hold-helpers';
import { expectMirrored, facingOff, makeFighter, type TickInputs } from './helpers';

const { Up, Left, Right, Light, Heavy, Grab, Dash } = Input;

/**
 * Every case of docs/combat-v2.md §4.6, one test each, and the same-tick priorities of §4.2.4.
 * Player 1 grabs player 2 from 30 px, facing right, unless said otherwise. The rules they rest
 * on are in hold-rules.test.ts, the pummels and throws in throws.test.ts.
 */
describe('the grab whiffs (§4.6)', () => {
  it('whiffs on an invincible Uppercut, until its invincibility ends', () => {
    const grabber = makeFighter({ action: 'attack', move: 'grab', actionFrame: 5 });
    const uppercut = (frame: number) =>
      makeFighter({
        x: px(430),
        facing: -1,
        action: 'attack',
        move: 'specialAntiAir',
        actionFrame: frame,
      });
    for (let frame = 0; frame < 7; frame++) {
      expect(findHit(grabber, NAYO, uppercut(frame), NAYO), `f${frame}`).toBeNull();
    }
    expect(findHit(grabber, NAYO, uppercut(7), NAYO)).not.toBeNull();
  });

  it("whiffs on a backdash in its grab-proof frames, and on a fighter in the air (Saut de l'ange)", () => {
    expect(catches(facingOff(30), 20, NAYO_MIRROR, (tick) => (tick === 0 ? Right | Dash : 0))).toBe(
      false,
    );
    // Off the ground on tick 3: the grab comes out on tick 5. (The Saut de l'ange leaves the
    // ground with combat v2's phase 3; this is the rule it will meet.)
    expect(catches(facingOff(30), 20, NAYO_MIRROR, (tick) => (tick === 0 ? Up : 0))).toBe(false);
  });

  it('whiffs during the 4 ticks of protection out of a stun, then catches', () => {
    const start = facingOff(30, NAYO_MIRROR, [{}, { action: 'blockstun', stunFrames: 2 }]);
    const states = play(start, 7, (tick) => [tick === 0 ? Grab : 0, 0]);
    // Free on tick 2, protected through tick 5; the grab is out on ticks 5 to 7.
    expect(states[5]?.hold).toBeNull();
    expect(states[6]?.hold).not.toBeNull();
  });
});

describe('the tech (§4.6)', () => {
  it('teches two grabs on the same tick: nobody is held, both pushed apart, reeling', () => {
    const states = play(facingOff(30), 8, () => [Grab, Grab]);
    const teched = states.find((state) => state.contacts.length > 0);
    expect(teched?.contacts.map((contact) => contact.kind)).toEqual(['tech', 'tech']);
    expect(teched?.hold).toBeNull();
    expect(teched?.fighters.map((f) => [f.action, f.stunFrames])).toEqual([
      ['tech', THROW_TECH_STUN],
      ['tech', THROW_TECH_STUN],
    ]);
  });

  it('counts PRISE pressed before the grab, still in the buffer', () => {
    // Crochet on tick 0, PRISE on tick 4 (too late to turn it into a grab: buffered).
    const start = facingOff(30);
    const states = play(start, 20, (tick) => [
      tick === 0 ? Grab : 0,
      tick === 0 ? Heavy : tick === 4 ? Grab : 0,
    ]);
    expect(states.some((state) => state.hold !== null)).toBe(true);
    expect(last(states, start).hold).toBeNull();
    expect(states.flatMap((state) => state.contacts.map((c) => c.kind))).toEqual(['grab', 'tech']);
  });

  it('counts on the clinch last tick (t11), not after it (t12)', () => {
    expect(step(atHoldTick(grabbed(), 11), [0, Grab], NAYO_MIRROR).hold).toBeNull();
    const late = step(atHoldTick(grabbed(), 12), [0, Grab], NAYO_MIRROR);
    expect(late.hold?.limit).toBe(HOLD_LIMIT_FRAMES - STRUGGLE_FRAMES);
  });

  it('PUNITION: a fighter caught recovering cannot break free', () => {
    // The end of a Crochet (active on frames 8 to 11).
    const recovering = { action: 'attack', move: 'standHeavy', actionFrame: 12 } as const;
    const caught = grabbed(NAYO_MIRROR, [{}, recovering]);
    expect(caught.hold?.techable).toBe(false);
    expect(caught.contacts[0]?.counter).toBe('punish');
    const states = play(caught, 30, (tick) => [0, mash(Grab, tick)]);
    expect(states.every((state) => state.hold !== null)).toBe(true);
  });
});

describe('the limit (§4.6)', () => {
  it('stops at the floor of 36, where the automatic throw forward goes', () => {
    const start = grabbed();
    const states = play(start, 80, (tick) => [0, mash(Input.Jump, tick)]);
    const limits = states.flatMap((state) => (state.hold ? [state.hold.limit] : []));
    expect(Math.min(...limits)).toBe(HOLD_MIN_FRAMES);
    const thrown = states.find((state) => state.fighters[0].move === 'throwForward');
    expect(thrown?.hold?.frame).toBe(HOLD_MIN_FRAMES + 1);
  });

  it('does not start a pummel that would end past the limit', () => {
    // A knee lasts 16 ticks: from t40 it ends on the limit (56), from t41 past it.
    const fits = step(atHoldTick(grabbed(), 40), [Light, 0], NAYO_MIRROR);
    expect(fits.fighters[0].move).toBe('pummel');
    const late = step(atHoldTick(grabbed(), 41), [Light, 0], NAYO_MIRROR);
    expect(late.fighters[0].move).toBeNull();
  });

  it('throws forward on its own at the limit, when the holder chose nothing', () => {
    const states = play(grabbed(), 70);
    const thrown = states.find((state) => state.fighters[0].move === 'throwForward');
    expect(thrown?.hold?.frame).toBe(HOLD_LIMIT_FRAMES + 1);
  });
});

describe('the end of the hold (§4.6)', () => {
  it('throws backward from the corner into it: the holder steps out, the victim lands there', () => {
    // Back to the stage's left end, the camera there already.
    const start: GameState = {
      ...facingOff(30, NAYO_MIRROR, [{ x: px(20) }, { x: px(50) }]),
      cameraX: px(240),
    };
    let state = step(start, [Grab, 0], NAYO_MIRROR);
    while (!state.hold) state = step(state, [0, 0], NAYO_MIRROR);
    state = atHoldTick(state, 12);
    const states = play(state, 80, (tick) => [tick === 0 ? Left | Heavy : 0, 0]);
    const switched = states.find((s) => s.fighters[0].actionFrame === 6);
    const [holder, held] = switched?.fighters ?? [];
    // The held body against the wall (14 px: half its pushbox), the holder 28 px out of it.
    expect(held?.x).toBe(px(14));
    expect(holder?.x).toBe(px(42));
    const landed = states.find((s) => s.fighters[1].action === 'knockdown');
    expect(landed?.fighters[1].x).toBe(px(14));
  });

  it('restarts the held loop on the impact, and a KO by a pummel ends the round', () => {
    const start = atHoldTick(grabbed(NAYO_MIRROR, [{}, { health: 10 }]), 12);
    const states = play(start, 30, (tick) => [tick === 0 ? Light : 0, 0]);
    const impact = firstTick(states, (s) => s.contacts.length > 0);
    expect(states[impact]?.fighters[1]).toMatchObject({ action: 'ko', health: 0 });
    expect(states[impact]?.hold).toBeNull();
    expect(states[impact]?.round.phase).toBe('roundEnd');
    // The holder finishes its knee as a plain attack.
    expect(states[impact]?.fighters[0]).toMatchObject({ action: 'attack', move: 'pummel' });
  });

  it('breaks the hold when the time runs out, without damage', () => {
    const start = grabbed();
    const ending: GameState = { ...start, round: { ...start.round, timer: 3 } };
    const states = play(ending, 30, () => [Light, Light]);
    const over = states.find((state) => state.round.phase === 'roundEnd');
    expect(over).toBeDefined();
    const after = last(states, ending);
    expect(after.hold).toBeNull();
    expect(after.fighters.map((f) => f.health)).toEqual([NAYO.maxHealth, NAYO.maxHealth]);
  });
});

describe('priorities and projectiles (§4.2.4, §4.6)', () => {
  it('a strike landing on the tick the grab would catch wins', () => {
    // The jab out on tick 5 (pressed on tick 1, startup 4), the grab too.
    const states = play(facingOff(30), 6, (tick) => [
      tick === 0 ? Grab : 0,
      tick === 1 ? Light : 0,
    ]);
    const tick = last(states, facingOff(30));
    expect(tick.hold).toBeNull();
    expect(tick.contacts).toEqual([expect.objectContaining({ by: 1, kind: 'hit' })]);
    expect(tick.fighters[0].action).toBe('hitstun');
  });

  it('a projectile hitting the grabber on that tick wins too', () => {
    const start = facingOff(30);
    const x = start.fighters[0].x + px(43);
    // Reaches player 1 on tick 5, when the grab comes out.
    const flying: GameState = {
      ...start,
      projectiles: [{ owner: 1, move: 'special', x, facing: -1 }],
    };
    const tick = last(
      play(flying, 6, (t) => [t === 0 ? Grab : 0, 0]),
      flying,
    );
    expect(tick.hold).toBeNull();
    expect(tick.contacts).toEqual([expect.objectContaining({ by: 1, move: 'special' })]);
  });

  it('a projectile goes through the held pair', () => {
    const start = grabbed();
    const [holder, held] = start.fighters;
    const fired: GameState = {
      ...start,
      projectiles: [{ owner: 0, move: 'special', x: holder.x - px(60), facing: 1 }],
    };
    const states = play(fired, 50);
    expect(states.flatMap((state) => state.contacts)).toEqual([]);
    expect(last(states, fired).fighters[1].health).toBe(held.health);
    expect(last(states, fired).projectiles[0]?.x).toBeGreaterThan(held.x + px(60));
  });
});

describe('symmetry and determinism (§4.6, §14.7)', () => {
  /** A grab, a knee chosen in the clinch, then a mash of the throw backward. */
  const SCRIPT: TickInputs[] = Array.from({ length: 160 }, (_, tick): TickInputs => {
    if (tick === 0) return [Grab, 0];
    if (tick === 20) return [Light, 0];
    return tick >= 40 ? [mash(Left | Heavy, tick), mash(Light, tick)] : [0, 0];
  });

  it('plays the same mirrored, to the sub-pixel', () => {
    for (const config of [NAYO_MIRROR, RIFF_MIRROR]) {
      const states = expectMirrored(SCRIPT, config, 30);
      const moves = states.map((s) => s.fighters[0].move);
      expect(moves).toContain('pummel');
      expect(moves).toContain('throwBack');
    }
  });

  it('plays the same twice', () => {
    const start = facingOff(30);
    const once = play(start, SCRIPT.length, (tick) => SCRIPT[tick] ?? [0, 0]);
    const twice = play(start, SCRIPT.length, (tick) => SCRIPT[tick] ?? [0, 0]);
    expect(twice).toEqual(once);
  });
});
