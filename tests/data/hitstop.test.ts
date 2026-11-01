import { describe, expect, it } from 'vitest';
import type { MoveData } from '../../src/core/move-data';
import { COUNTER_HITSTOP, EXTENDER_HITSTOP } from '../../src/core/rules';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { SAPHIR } from '../../src/data/fighters/saphir';

/**
 * The rules of the freeze on impact, written as tests of the data (docs/polish/AUDIT-ET-PLAN.md,
 * P20): what the moves already follow, kept for the moves to come. Sakurai (Famitsu 490-491):
 * « the more damage an attack inflicts, the longer the hitstop », projectiles less, and a cap.
 */

/** Every move of every fighter, and each blow of a multi-hit one, named for the messages. */
function blows(): { name: string; move: MoveData }[] {
  const all: { name: string; move: MoveData }[] = [];
  for (const fighter of [NAYO, RIFF, SAPHIR]) {
    for (const [id, move] of Object.entries(fighter.moves)) {
      all.push({ name: `${fighter.name} ${id}`, move });
      move.pulses?.forEach((pulse, index) => {
        all.push({ name: `${fighter.name} ${id}, blow ${index + 2}`, move: pulse.hit });
      });
    }
  }
  return all;
}

/** The freeze a strike of `damage` gets: 5 ticks, plus one per 10 points. */
function law(damage: number): number {
  return 5 + Math.floor(damage / 10);
}

/**
 * Strikes kept off the law, each for a reason: the Mise au tapis ends Nayo's L, L, L string and
 * knocks down, its freeze is the end of the phrase (14 for 50 damage).
 */
const OFF_THE_LAW: ReadonlySet<string> = new Set(['Nayo lightFinisher']);

describe('the freeze on impact', () => {
  it('grows with the damage: 5 ticks plus one per 10 points, give or take 3', () => {
    for (const { name, move } of blows()) {
      // Grabs and throws, projectiles (next test), Remixes and supers have their own rules.
      const strike = move.kind === 'normal' || move.kind === 'special';
      if (!strike || move.projectile || move.tier !== undefined || OFF_THE_LAW.has(name)) continue;
      expect(Math.abs(move.hitstop - law(move.damage)), name).toBeLessThanOrEqual(3);
    }
  });

  it('never passes 30 ticks, CONTRE and extender added (the cap of Smash since Brawl)', () => {
    for (const { name, move } of blows()) {
      expect(move.hitstop + COUNTER_HITSTOP + EXTENDER_HITSTOP, name).toBeLessThanOrEqual(30);
    }
  });

  it('freezes a projectile less than a strike of the same damage', () => {
    const projectiles = blows().filter(({ move }) => move.projectile);
    expect(projectiles.length).toBeGreaterThan(0);
    for (const { name, move } of projectiles) {
      expect(move.hitstop, name).toBeLessThan(law(move.damage));
    }
  });
});
