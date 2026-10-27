import { describe, expect, it } from 'vitest';
import type { FighterTemplate } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { assertValidMatch, validateStage, validateTemplate } from '../../src/core/validate';
import { TRAINING_STAGE } from '../../src/data/stages';
import { MATCH } from '../core/helpers';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';

/** A jump attack firing the fireball: valid types, invalid data. */
function withProjectileOnJumpLight(): FighterTemplate {
  const { name, kind, startup, active, recovery, damage, hitstun, blockstun, hitstop } =
    NAYO.moves.jumpLight;
  const { pushback, guard } = NAYO.moves.jumpLight;
  const jumpLight = { name, kind, startup, active, recovery, damage, hitstun, blockstun, hitstop };
  const projectile = NAYO.moves.special.projectile;
  if (!projectile) throw new Error('The fireball must have a projectile');
  return {
    ...NAYO,
    moves: { ...NAYO.moves, jumpLight: { ...jumpLight, pushback, guard, projectile } },
  };
}

describe('fighter templates', () => {
  it('are valid', () => {
    expect(validateTemplate(NAYO)).toEqual([]);
    expect(validateTemplate(RIFF)).toEqual([]);
  });

  it('play differently: rushdown is faster but frailer and shorter-ranged', () => {
    expect(RIFF.walkForwardSpeed).toBeGreaterThan(NAYO.walkForwardSpeed);
    expect(RIFF.maxHealth).toBeLessThan(NAYO.maxHealth);
    expect(RIFF.moves.standLight.startup).toBeLessThan(NAYO.moves.standLight.startup);
    const reach = (t: typeof NAYO) =>
      (t.moves.standHeavy.hitbox?.x ?? 0) + (t.moves.standHeavy.hitbox?.width ?? 0);
    expect(reach(RIFF)).toBeLessThan(reach(NAYO));
  });

  it('reports every authoring mistake at once', () => {
    const broken = {
      ...NAYO,
      maxHealth: 0,
      moves: { ...NAYO.moves, standLight: { ...NAYO.moves.standLight, active: 0 } },
    };
    expect(validateTemplate(broken)).toHaveLength(2);
    expect(() => {
      assertValidMatch({ ...MATCH, fighters: [broken, RIFF] });
    }).toThrow(/standLight\.active/);
  });

  it('rejects data the simulation cannot handle', () => {
    const { moves } = NAYO;
    const cases: [string, FighterTemplate][] = [
      ['fractional speed', { ...NAYO, walkForwardSpeed: 1.5 }],
      ['jump landing at once', { ...NAYO, jumpVelocity: NAYO.gravity }],
      [
        'blockable throw',
        { ...NAYO, moves: { ...moves, grab: { ...moves.grab, kind: 'normal' } } },
      ],
      ['projectile on an air move', withProjectileOnJumpLight()],
      [
        'invincibility longer than the move',
        {
          ...NAYO,
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
