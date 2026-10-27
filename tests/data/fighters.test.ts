import { describe, expect, it } from 'vitest';
import type { FighterTemplate } from '../../src/core/config';
import type { MoveData, MoveId } from '../../src/core/move-data';
import { px } from '../../src/core/constants';
import { assertValidMatch, validateStage, validateTemplate } from '../../src/core/validate';
import { TRAINING_STAGE } from '../../src/data/stages';
import { MATCH } from '../core/helpers';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { box } from '../../src/data/fighters/shared';

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

/** `template` with `id` changed by `change`. */
function withMove(
  template: FighterTemplate,
  id: MoveId,
  change: (move: MoveData) => Partial<MoveData>,
): FighterTemplate {
  const move = template.moves[id];
  if (!move) throw new Error(`${template.name} has no ${id}`);
  return { ...template, moves: { ...template.moves, [id]: { ...move, ...change(move) } } };
}

/** Riff's Saut de l'ange with its heights changed by `change`. */
function withLeap(change: (heights: number[]) => number[]): FighterTemplate {
  return withMove(RIFF, 'specialForward', ({ motion }) => {
    if (!motion?.y) throw new Error("The Saut de l'ange must leave the ground");
    return { motion: { ...motion, y: change([...motion.y]) } };
  });
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

  it('rejects moves v2 data the simulation cannot handle, each by its own rule', () => {
    const slide = box(-20, 0, 40, 26);
    const cases: [string, FighterTemplate, RegExp][] = [
      ['leap one frame short', withLeap((y) => y.slice(1)), /specialForward\.motion\.y must have/],
      ['leap below the floor', withLeap((y) => y.map((h) => -h)), /specialForward\.motion\.y must/],
      ['leap a fractional height', withLeap((y) => y.map((h) => h + 0.5)), /motion\.y must have/],
      [
        'leap ending in the air',
        withLeap((y) => [...y.slice(0, -1), px(1)]),
        /specialForward\.motion\.y must be back on the ground/,
      ],
      [
        'slide body past the move',
        withMove(RIFF, 'special', () => ({
          hurtboxes: [{ frames: { from: 2, to: 99 }, boxes: [slide] }],
        })),
        /special\.hurtboxes must fit within the move/,
      ],
      [
        'slide without a body',
        withMove(RIFF, 'special', () => ({
          hurtboxes: [{ frames: { from: 2, to: 21 }, boxes: [] }],
        })),
        /special\.hurtboxes must have one or 2 valid boxes/,
      ],
      [
        'slide with three boxes',
        withMove(RIFF, 'special', () => ({
          hurtboxes: [{ frames: { from: 2, to: 21 }, boxes: [slide, slide, slide] }],
        })),
        /special\.hurtboxes must have one or 2 valid boxes/,
      ],
      [
        'special chaining',
        withMove(NAYO, 'special', () => ({ chain: 'chainLight' })),
        /special: only a normal chains/,
      ],
      [
        'direction move as a special',
        withMove(NAYO, 'forwardLight', () => ({ kind: 'special' })),
        /forwardLight: the direction normals and the chain are normals/,
      ],
    ];
    for (const [label, template, rule] of cases) {
      expect(validateTemplate(template).join('\n'), label).toMatch(rule);
    }
  });

  it('keeps the dashes movements: they never strike, and only they cancel freely', () => {
    const { moves } = NAYO;
    const { dashForward, standLight } = moves;
    const hitbox = standLight.hitbox;
    if (!hitbox) throw new Error('The jab must have a hitbox');
    const cases: [string, FighterTemplate][] = [
      [
        'dash with a hitbox',
        {
          ...NAYO,
          moves: { ...moves, dashForward: { ...dashForward, hitbox } },
        },
      ],
      [
        'dash that deals damage',
        { ...NAYO, moves: { ...moves, dashForward: { ...dashForward, damage: 10 } } },
      ],
      [
        'jab as a movement',
        { ...NAYO, moves: { ...moves, standLight: { ...standLight, kind: 'movement' } } },
      ],
      [
        'jab cancelled without contact',
        { ...NAYO, moves: { ...moves, standLight: { ...standLight, freeCancelFrom: 3 } } },
      ],
      [
        'jab cancelled into a grab',
        { ...NAYO, moves: { ...moves, standLight: { ...standLight, cancelInto: ['grab'] } } },
      ],
      [
        'dash cancelled into a dash',
        { ...NAYO, moves: { ...moves, dashForward: { ...dashForward, cancelInto: ['movement'] } } },
      ],
      [
        'grab-proof frames past the move',
        {
          ...NAYO,
          moves: {
            ...moves,
            dashBack: { ...moves.dashBack, throwInvincible: { from: 0, to: 99 } },
          },
        },
      ],
      [
        'air pushbox with a fractional lift',
        { ...NAYO, airPushbox: { ...NAYO.airPushbox, lift: 0.5 } },
      ],
      ['flat lying pushbox', { ...NAYO, lyingPushbox: { width: px(28), height: 0 } }],
    ];
    for (const [label, template] of cases) {
      expect(validateTemplate(template), label).not.toEqual([]);
    }
  });

  it('gives Riff the better mobility: faster walk, longer and cancellable dash', () => {
    expect(RIFF.walkBackSpeed).toBeGreaterThan(NAYO.walkBackSpeed);
    expect(RIFF.moves.dashForward.freeCancelFrom).toBe(8);
    expect(NAYO.moves.dashForward.freeCancelFrom).toBeUndefined();
    expect(RIFF.landingFrames).toBeLessThan(NAYO.landingFrames);
  });

  it('rejects a stage narrower than the screen', () => {
    expect(validateStage({ width: px(400), startDistance: px(100) })).not.toEqual([]);
    expect(validateStage(TRAINING_STAGE)).toEqual([]);
  });
});
