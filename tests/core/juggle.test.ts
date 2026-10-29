import { describe, expect, it } from 'vitest';
import { applyHit, canBeHit, type HitDetail } from '../../src/core/combat';
import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { updateFighter } from '../../src/core/fighter';
import { Input } from '../../src/core/input';
import { MOVE_IDS } from '../../src/core/move-data';
import { moveOf } from '../../src/core/moves';
import { findProjectileHit } from '../../src/core/projectiles';
import {
  BOUNCE_LIFT,
  COMBO_LIMIT,
  COMBO_LIMIT_LIFT,
  COUNTER_HITSTUN,
  EXTENDER_HITSTOP,
  REBOND_DOWN,
  VRILLE_CARRY,
  VRILLE_LIFT,
} from '../../src/core/rules';
import {
  FLAG_BOUNCE,
  FLAG_EXTENDED,
  FLAG_LIMIT,
  type FighterState,
  type ProjectileState,
} from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { playCombo } from './combo-helpers';
import { expectMirrored, facingOff, makeFighter, run } from './helpers';

/**
 * The juggle with points (docs/combos-v3.md §1.5), the CONTRE of a move (§1.6), the decay and
 * the combo's limit (§1.7), on one blow (`applyHit`) and on the real engine. It replaces the one
 * blow juggle of docs/combat-v2.md §7.6.
 */

const { Light: L, Heavy: H, Down: D, Left: B, Right: F, Special: S } = Input;

const NAYO_VS_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const RIFF_VS_NAYO: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };

/** Hit from the left (Nayo stands at 370 px, the defender at 400). */
const FROM = px(370);
const CONTRE: HitDetail = { counter: 'counter', impactPercent: 50 };

/** Riff sent up by Nayo's Remontant, a moment later in the air. */
function launched(overrides: Partial<FighterState> = {}): FighterState {
  const sent = applyHit(makeFighter({ health: 900 }), FROM, moveOf(NAYO, 'backHeavy'));
  return { ...sent, y: px(30), ...overrides };
}

describe('the launch (§1.5)', () => {
  it('gives 4 points to a body sent up from the ground, 5 on a CONTRE, at 8 px a tick', () => {
    const backHeavy = moveOf(NAYO, 'backHeavy');
    const sent = applyHit(makeFighter({ health: 900 }), FROM, backHeavy);
    expect(sent).toMatchObject({ action: 'airHit', juggle: 4, vy: px(8), reaction: 'launch' });
    expect(applyHit(makeFighter({ health: 900 }), FROM, backHeavy, 0, CONTRE).juggle).toBe(5);
    expect(applyHit(makeFighter({ health: 900 }), FROM, moveOf(RIFF, 'backHeavy')).juggle).toBe(4);
  });

  it('gives its points to a body caught in a jump: the anti-air opens a juggle', () => {
    const jumping = makeFighter({ action: 'air', y: px(40), health: 900 });
    expect(applyHit(jumping, FROM, moveOf(NAYO, 'backHeavy')).juggle).toBe(4);
  });

  it('gives none to a body already juggled: a launcher there only spends and lifts', () => {
    const relaunched = applyHit(launched({ juggle: 3 }), FROM, moveOf(NAYO, 'chainLaunch'));
    expect(relaunched).toMatchObject({ action: 'airHit', juggle: 2, vy: px(2.5) });
  });

  it('is no juggle from any other blow in the air', () => {
    const jumping = makeFighter({ action: 'air', y: px(40), health: 900 });
    const hit = applyHit(jumping, FROM, NAYO.moves.standHeavy);
    expect(hit).toMatchObject({ action: 'airHit', juggle: 0 });
    expect(canBeHit(hit, RIFF)).toBe(false);
  });
});

describe('the points (§1.5)', () => {
  it('a blow on a juggled body spends its cost: 1, 2 for a heavy', () => {
    expect(applyHit(launched(), FROM, NAYO.moves.standLight).juggle).toBe(3);
    expect(applyHit(launched(), FROM, NAYO.moves.standHeavy).juggle).toBe(2);
    expect(applyHit(launched(), FROM, moveOf(NAYO, 'chainHeavy')).juggle).toBe(2);
    expect(applyHit(launched(), FROM, RIFF.moves.standHeavy).juggle).toBe(2);
  });

  it('a blow lands only while the body has its cost', () => {
    const last = launched({ juggle: 1 });
    expect(canBeHit(last, RIFF, false, 1)).toBe(true);
    expect(canBeHit(last, RIFF, false, 2)).toBe(false);
  });

  it('lifts less as the points run out, min(3, 1.5 + 0.5 per point left), carried slowly', () => {
    const lifts = [4, 3, 2, 1].map((points) => {
      const hit = applyHit(launched({ juggle: points }), FROM, NAYO.moves.standLight);
      expect(hit.vx).toBe(px(0.5));
      return hit.vy;
    });
    expect(lifts).toEqual([px(3), px(2.5), px(2), px(1.5)]);
  });

  it('at 0, nothing touches the body until it lands, in its knockdown, its points gone', () => {
    const spent = applyHit(launched({ juggle: 1 }), FROM, NAYO.moves.standLight);
    expect(spent).toMatchObject({ juggle: 0, comboCount: 2 });
    expect(canBeHit(spent, RIFF)).toBe(false);
    let body = spent;
    while (body.action === 'airHit') body = updateFighter(body, 0, RIFF, px(900));
    expect(body).toMatchObject({ action: 'knockdown', juggle: 0 });
  });

  it('a blow that floors without launching ends the juggle in its own flight', () => {
    const finisher = moveOf(NAYO, 'lightFinisher');
    const ended = applyHit(launched(), FROM, finisher);
    expect(ended).toMatchObject({ juggle: 0, vy: finisher.knockdown?.vy });
  });

  it('ends on the ground: the juggle is gone when the fighter lands', () => {
    const result = playCombo(facingOff(30, NAYO_VS_RIFF), NAYO_VS_RIFF, [B | H]);
    const down = result.states.find((s) => s.fighters[1].action === 'knockdown');
    expect(down?.fighters[1].juggle).toBe(0);
    expect(result.hits).toHaveLength(1);
  });

  it('takes the launcher and its follow-up, and nothing after a blow that floors', () => {
    // ←H, the Uppercut, then a jab as soon as he can: she is out of reach, falling then down.
    const steps = [B | H, D | S, L];
    const result = playCombo(facingOff(30, NAYO_VS_RIFF), NAYO_VS_RIFF, steps);
    expect(result.hits.map((h) => h.move)).toEqual(['backHeavy', 'specialAntiAir']);
  });

  it('plays the same on both sides: the Remontant, then the phrase again in the air', () => {
    const route = playCombo(facingOff(30, NAYO_VS_RIFF), NAYO_VS_RIFF, [B | H, L, L, L]);
    const states = expectMirrored(route.inputs, NAYO_VS_RIFF, 30);
    expect(states.some(({ fighters }) => fighters[1].juggle === 4)).toBe(true);
  });
});

describe('the Rebond and the Vrille (§1.5)', () => {
  it("Nayo's Marteau slams a juggled body down, untouchable as it falls", () => {
    const slammed = applyHit(launched(), FROM, moveOf(NAYO, 'chainHigh'));
    expect(slammed).toMatchObject({ action: 'airHit', vy: -REBOND_DOWN, vx: 0, juggle: 3 });
    expect(slammed.flags & (FLAG_EXTENDED | FLAG_BOUNCE)).toBe(FLAG_EXTENDED | FLAG_BOUNCE);
    expect(canBeHit(slammed, RIFF)).toBe(false);
  });

  it('it bounces back up on the floor with 2 points more, hittable again', () => {
    let body = applyHit(launched(), FROM, moveOf(NAYO, 'chainHigh'));
    while (body.vy < 0) body = updateFighter(body, 0, RIFF, px(900));
    expect(body).toMatchObject({ action: 'airHit', y: 0, vy: BOUNCE_LIFT, juggle: 5 });
    expect(body.flags & FLAG_BOUNCE).toBe(0);
    expect(canBeHit(body, RIFF)).toBe(true);
  });

  it('once a combo: a second Marteau only lifts', () => {
    const again = launched({ flags: FLAG_EXTENDED });
    const lifted = applyHit(again, FROM, moveOf(NAYO, 'chainHigh'));
    expect(lifted).toMatchObject({ vy: px(3), juggle: 3 });
    expect(lifted.flags & FLAG_BOUNCE).toBe(0);
  });

  it("Riff's Swipe spins a juggled body up and away instead, 2 points more, once a combo", () => {
    const swipe = moveOf(RIFF, 'lightFinisher');
    const spun = applyHit(launched(), FROM, swipe);
    expect(spun).toMatchObject({ vy: VRILLE_LIFT, vx: VRILLE_CARRY, juggle: 5 });
    expect(spun.flags & FLAG_EXTENDED).toBe(FLAG_EXTENDED);
    // The same mark as the Rebond: a combo never has two extenders.
    const floored = applyHit({ ...spun, y: px(30) }, FROM, swipe);
    expect(floored).toMatchObject({ juggle: 0, vy: swipe.knockdown?.vy });
    const marked = applyHit(launched({ flags: FLAG_EXTENDED }), FROM, moveOf(NAYO, 'chainHigh'));
    expect(marked.flags & FLAG_BOUNCE).toBe(0);
  });

  it('the blow that sets one off freezes 4 ticks longer', () => {
    const steps = [L, L, B | H, L, L, F | H];
    const route = playCombo(facingOff(40, NAYO_VS_RIFF), NAYO_VS_RIFF, steps);
    const rebond = route.states.find((state) => state.contacts.some((c) => c.move === 'chainHigh'));
    expect(rebond?.hitstop).toBe(moveOf(NAYO, 'chainHigh').hitstop + EXTENDER_HITSTOP);
  });

  it('the marks go once the body stands in neutral again', () => {
    const route = playCombo(facingOff(40, NAYO_VS_RIFF), NAYO_VS_RIFF, [L, L, B | H, L, L, F | H]);
    expect(route.states.some(({ fighters }) => fighters[1].flags !== 0)).toBe(true);
    const down = route.end.fighters[1];
    expect(down.action).not.toBe('idle');
    const up = run(60, [0, 0], route.end, NAYO_VS_RIFF).fighters[1];
    expect(up).toMatchObject({ action: 'idle', flags: 0, comboCount: 0 });
  });

  it('play the same on both sides', () => {
    const rebond = playCombo(facingOff(40, NAYO_VS_RIFF), NAYO_VS_RIFF, [
      ...[L, L, B | H],
      ...[L, L, F | H],
      ...[L, L, L],
    ]);
    const bounced = expectMirrored(rebond.inputs, NAYO_VS_RIFF, 40);
    expect(bounced.some(({ fighters }) => (fighters[1].flags & FLAG_BOUNCE) !== 0)).toBe(true);
    const vrille = playCombo(facingOff(26, RIFF_VS_NAYO), RIFF_VS_NAYO, [
      ...[B | H, L, L, L],
      ...[L, L, D | S],
    ]);
    const spun = expectMirrored(vrille.inputs, RIFF_VS_NAYO, 26);
    expect(spun.some(({ fighters }) => (fighters[1].flags & FLAG_EXTENDED) !== 0)).toBe(true);
  });
});

describe("a move's own CONTRE (§1.6)", () => {
  it('the Crochet folds the opponent on the spot: 16 more ticks of hitstun, a 0.5 px slide', () => {
    const crochet = NAYO.moves.standHeavy;
    const folded = applyHit(makeFighter({ health: 900 }), FROM, crochet, 0, CONTRE);
    expect(folded).toMatchObject({ action: 'hitstun', stunFrames: crochet.hitstun + 16 });
    expect(folded.vx).toBe(px(0.5));
    // Any other blow: the common CONTRE.
    const jab = applyHit(makeFighter({ health: 900 }), FROM, NAYO.moves.standLight, 0, CONTRE);
    expect(jab.stunFrames).toBe(NAYO.moves.standLight.hitstun + COUNTER_HITSTUN);
  });
});

describe("a move's own CONTRE, on both sides", () => {
  it('the fold plays the same either way: H as a CONTRE ⇢ L, L, H, H → →S', () => {
    const elbow = (tick: number): number => (tick === 4 ? H : 0);
    const steps = [H, L, L, H, H, F | S];
    const route = playCombo(facingOff(40, NAYO_VS_RIFF), NAYO_VS_RIFF, steps, elbow);
    expect(route.hits[0]).toMatchObject({ move: 'standHeavy', counter: 'counter' });
    expectMirrored(route.inputs, NAYO_VS_RIFF, 40);
  });
});

describe('the decay and the limit (§1.7)', () => {
  it('from the 9th hit of a combo on the ground, each blow stuns 2 ticks less', () => {
    const jab = NAYO.moves.standLight;
    const stunOf = (comboCount: number): number =>
      applyHit(makeFighter({ action: 'hitstun', comboCount }), FROM, jab).stunFrames;
    expect([7, 8, 9, 10].map(stunOf)).toEqual([14, 12, 10, 8]);
  });

  it('the 12th hit floors, past the limit: nothing of either fighter touches the body', () => {
    const reeling = makeFighter({ action: 'hitstun', comboCount: COMBO_LIMIT - 1 });
    const last = applyHit(reeling, FROM, NAYO.moves.standLight);
    expect(last).toMatchObject({ action: 'airHit', comboCount: COMBO_LIMIT, juggle: 0 });
    expect(last.vy).toBeGreaterThanOrEqual(COMBO_LIMIT_LIFT);
    expect(last.flags & FLAG_LIMIT).toBe(FLAG_LIMIT);
    const flying = { ...last, y: px(20), juggle: 5 };
    for (const template of [NAYO, RIFF]) {
      for (const id of MOVE_IDS) {
        const cost = template.moves[id]?.juggleCost ?? 1;
        expect(canBeHit(flying, NAYO, false, cost), `${template.name} ${id}`).toBe(false);
      }
    }
    const vinyle: ProjectileState = { owner: 0, move: 'special', x: flying.x, facing: 1 };
    const config = { stage: TRAINING_STAGE, fighters: [NAYO, NAYO] } as const;
    expect(findProjectileHit([vinyle], 1, flying, config)).toBeNull();
  });

  it("plays the same on both sides: Riff's twelve hits, the last floored by the limit", () => {
    const steps = [D | L, F | L, D | L, L, L, B | H, F | L, F | L, F | L, L, L, L];
    const route = playCombo(facingOff(34, RIFF_VS_NAYO), RIFF_VS_NAYO, steps);
    expect(route.hits).toHaveLength(COMBO_LIMIT);
    const states = expectMirrored(route.inputs, RIFF_VS_NAYO, 34);
    expect(states.some(({ fighters }) => (fighters[1].flags & FLAG_LIMIT) !== 0)).toBe(true);
  });

  it('the limit takes the bounce away: a body slammed down on the 12th hit just falls', () => {
    const juggled = launched({ comboCount: COMBO_LIMIT - 1 });
    const last = applyHit(juggled, FROM, moveOf(NAYO, 'chainHigh'));
    expect(last.flags & FLAG_BOUNCE).toBe(0);
    expect(last.flags & FLAG_LIMIT).toBe(FLAG_LIMIT);
  });
});
