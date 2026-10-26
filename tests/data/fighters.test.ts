import { describe, expect, it } from 'vitest';
import { assertValidTemplates, validateTemplate } from '../../src/core/validate';
import { POLYVALENT, RUSHDOWN } from '../../src/data/fighters';

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
      assertValidTemplates([broken]);
    }).toThrow(/standLight\.active/);
  });
});
