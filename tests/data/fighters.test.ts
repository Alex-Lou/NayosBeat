import { describe, expect, it } from 'vitest';
import type { FighterTemplate } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { assertValidMatch, validateStage, validateTemplate } from '../../src/core/validate';
import { TRAINING_STAGE } from '../../src/data/stages';
import { MATCH } from '../core/helpers';
import { POLYVALENT, RUSHDOWN } from '../../src/data/fighters';

/** A jump attack firing the fireball: valid types, invalid data. */
function withProjectileOnJumpLight(): FighterTemplate {
  const { name, kind, startup, active, recovery, damage, hitstun, blockstun, hitstop } =
    POLYVALENT.moves.jumpLight;
  const { pushback, guard } = POLYVALENT.moves.jumpLight;
  const jumpLight = { name, kind, startup, active, recovery, damage, hitstun, blockstun, hitstop };
  const projectile = POLYVALENT.moves.special.projectile;
  if (!projectile) throw new Error('The fireball must have a projectile');
  return {
    ...POLYVALENT,
    moves: { ...POLYVALENT.moves, jumpLight: { ...jumpLight, pushback, guard, projectile } },
  };
}

describe('fighter templates', () => {
  it('are valid', () => {
    expect(validateTemplate(POLYVALENT)).toEqual([]);
    expect(validateTemplate(RUSHDOWN)).toEqual([]);
  });

  it('play differently: rushdown is faster but frailer and shorter-ranged', () => {
    expect(RUSHDOWN.walkForwardSpeed).toBeGreaterThan(POLYVALENT.walkForwardSpeed);
    expect(RUSHDOWN.maxHealth).toBeLessThan(POLYVALENT.maxHealth);
    expect(RUSHDOWN.moves.standLight.startup).toBeLessThan(POLYVALENT.moves.standLight.startup);
    const reach = (t: typeof POLYVALENT) =>
      (t.moves.standHeavy.hitbox?.x ?? 0) + (t.moves.standHeavy.hitbox?.width ?? 0);
    expect(reach(RUSHDOWN)).toBeLessThan(reach(POLYVALENT));
  });

  it('reports every authoring mistake at once', () => {
    const broken = {
      ...POLYVALENT,
      maxHealth: 0,
      moves: { ...POLYVALENT.moves, standLight: { ...POLYVALENT.moves.standLight, active: 0 } },
    };
    expect(validateTemplate(broken)).toHaveLength(2);
    expect(() => {
      assertValidMatch({ ...MATCH, fighters: [broken, RUSHDOWN] });
    }).toThrow(/standLight\.active/);
  });

  it('rejects data the simulation cannot handle', () => {
    const { moves } = POLYVALENT;
    const cases: [string, FighterTemplate][] = [
      ['fractional speed', { ...POLYVALENT, walkForwardSpeed: 1.5 }],
      ['jump landing at once', { ...POLYVALENT, jumpVelocity: POLYVALENT.gravity }],
      [
        'blockable throw',
        { ...POLYVALENT, moves: { ...moves, throw: { ...moves.throw, kind: 'normal' } } },
      ],
      ['projectile on an air move', withProjectileOnJumpLight()],
      [
        'invincibility longer than the move',
        {
          ...POLYVALENT,
          moves: {
            ...moves,
            specialAntiAir: { ...moves.specialAntiAir, invincible: { from: 0, to: 999 } },
          },
        },
      ],
    ];
    for (const [label, template] of cases) {
      expect(validateTemplate(template), label).not.toEqual([]);
    }
  });

  it('rejects a stage narrower than the screen', () => {
    expect(validateStage({ width: px(400), startDistance: px(100) })).not.toEqual([]);
    expect(validateStage(TRAINING_STAGE)).toEqual([]);
  });
});
