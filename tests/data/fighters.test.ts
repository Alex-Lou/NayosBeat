import { describe, expect, it } from 'vitest';
import type { FighterTemplate } from '../../src/core/config';
import type { Branch, BranchDir, MoveData, MoveId } from '../../src/core/move-data';
import { px } from '../../src/core/constants';
import { assertValidMatch, validateStage, validateTemplate } from '../../src/core/validate';
import { TRAINING_STAGE } from '../../src/data/stages';
import { MATCH } from '../core/helpers';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { box, kd } from '../../src/data/fighters/shared';

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
    // A jab without an active tick also leaves 4 on block (docs/combos-v3.md §1.12, rule 8).
    expect(validateTemplate(broken)).toHaveLength(3);
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
        'special with strings',
        withMove(NAYO, 'special', () => ({ branches: [{ button: 'light', move: 'chainLight' }] })),
        /special: only a normal opens strings/,
      ],
      [
        'direction move as a special',
        withMove(NAYO, 'forwardLight', () => ({ kind: 'special' })),
        /forwardLight must be of kind normal/,
      ],
    ];
    for (const [label, template, rule] of cases) {
      expect(validateTemplate(template).join('\n'), label).toMatch(rule);
    }
  });

  it('rejects combos v3 data that would let a combo run on, each by its own rule', () => {
    // docs/combos-v3.md §1.12, rules 1, 2 and 5 to 8.
    const string = (move: MoveId, dirs?: readonly BranchDir[]): Branch => ({
      button: 'light',
      move,
      ...(dirs && { dirs }),
    });
    const launch = kd(8, 0.5, { juggle: 6 });
    const cases: [string, FighterTemplate, RegExp][] = [
      [
        'strings in a loop',
        withMove(NAYO, 'lightFinisher', () => ({ branches: [string('standLight')] })),
        /strings from standLight loop/,
      ],
      [
        'two strings for one button and direction',
        withMove(NAYO, 'standLight', ({ branches = [] }) => ({
          branches: [...branches, string('forwardLight', ['back'])],
        })),
        /standLight: two strings for light back/,
      ],
      [
        'strings six moves deep',
        withMove(NAYO, 'chainHeavy', () => ({ branches: [string('crouchLight')] })),
        /strings from standLight run 6 moves \(5 at most\)/,
      ],
      [
        'a string to a special',
        withMove(NAYO, 'jabRepeat', () => ({ branches: [string('special')] })),
        /jabRepeat: a string leads to a normal it has/,
      ],
      [
        'a normal out of the phrase',
        withMove(NAYO, 'special', () => ({ kind: 'normal' })),
        /special: a normal must have its bit in the phrase/,
      ],
      [
        'six juggle points',
        withMove(NAYO, 'backHeavy', () => ({ knockdown: launch })),
        /backHeavy: a launcher gives from 1 to 5 juggle points/,
      ],
      [
        'a blow in the air for free',
        withMove(NAYO, 'standLight', () => ({ juggleCost: 0 })),
        /standLight\.juggleCost must be an integer >= 1/,
      ],
      [
        'an extender on a special',
        withMove(NAYO, 'specialForward', () => ({ extender: 'rebond' })),
        /specialForward: only a normal can be an extender/,
      ],
      [
        'both extenders',
        withMove(NAYO, 'lightFinisher', () => ({ extender: 'vrille' })),
        /one kind of extender per fighter/,
      ],
      [
        'a CONTRE that stuns too long',
        withMove(NAYO, 'standHeavy', () => ({ counter: { hitstun: 21 } })),
        /standHeavy\.counter\.hitstun must be an integer from 0 to 20/,
      ],
      [
        'a CONTRE launching with six points',
        withMove(NAYO, 'backHeavy', () => ({ counter: { knockdown: launch } })),
        /backHeavy\.counter: a launcher gives from 1 to 5 juggle points/,
      ],
      [
        'a normal at +3 on block',
        withMove(NAYO, 'jabRepeat', () => ({ blockstun: 11 })),
        /jabRepeat is 3 on block: a blocked string would never end \(2 at most\)/,
      ],
      [
        'a blow that does not push back',
        withMove(RIFF, 'chainHigh', () => ({ pushback: 0 })),
        /chainHigh: a blow must push back/,
      ],
    ];
    for (const [label, template, rule] of cases) {
      expect(validateTemplate(template).join('\n'), label).toMatch(rule);
    }
  });

  it('rejects Boost data that would break the ladder or the economy, each by its own rule', () => {
    // docs/combos-v3.md §1.12, rules 3, 4, 9, 10, 11 and 13.
    const pulses = NAYO.moves.super?.pulses ?? [];
    const cases: [string, FighterTemplate, RegExp][] = [
      [
        'a Remix retimed',
        withMove(NAYO, 'specialBoost', ({ recovery }) => ({ recovery: recovery + 1 })),
        /specialBoost: a Remix keeps the timing of its special \(D18\)/,
      ],
      [
        'a Remix at half a bar',
        withMove(NAYO, 'specialBoost', () => ({ boostCost: 500 })),
        /specialBoost must cost 1000 of the gauge, not 500/,
      ],
      [
        'a normal that costs a bar',
        withMove(NAYO, 'standLight', () => ({ boostCost: 1000 })),
        /standLight must cost 0 of the gauge, not 1000/,
      ],
      [
        'a special of tier 2 that is no Remix',
        withMove(NAYO, 'special', () => ({ tier: 2 })),
        /special: only the Remixes \(and all of them\) are of tier 2/,
      ],
      [
        'a Remix that cancels',
        withMove(RIFF, 'specialBoost', () => ({ cancelInto: ['special'] })),
        /specialBoost: a special or a projectile has no cancelInto/,
      ],
      [
        'a super that hits 3 ticks after its flash',
        withMove(NAYO, 'super', () => ({ startup: 3 })),
        /super: the super flashes, then hits 2 ticks after the freeze at most/,
      ],
      [
        'a super that spends juggle points',
        withMove(NAYO, 'super', () => ({ juggleCost: 1 })),
        /super: the super's blows spend no juggle point/,
      ],
      [
        'pulses out of order',
        withMove(NAYO, 'super', () => ({ pulses: [...pulses].reverse() })),
        /super: its pulses must follow each other within its active frames/,
      ],
      [
        // The Finisher's KO falls on a big blow (docs/finisher.md §1.6, §5.8 test 10).
        'a super whose last blow leaves the opponent standing',
        withMove(NAYO, 'super', () => ({
          pulses: pulses.map(({ frame }) => ({ frame, hit: pulses[0]?.hit ?? NAYO.moves.special })),
        })),
        /super: the super's last blow sends to the floor/,
      ],
      [
        // Its lock follows the body from blow to blow (docs/finisher.md §1.6).
        'a super whose first blow sends to the floor',
        withMove(NAYO, 'super', () => ({ knockdown: { vy: 600, vx: 200 } })),
        /super: the super's blows before its last hold the body until the next/,
      ],
      [
        'a super whose first blow stuns shorter than the gap to the next',
        withMove(NAYO, 'super', () => ({ hitstun: 11 })),
        /super: the super's blows before its last hold the body until the next/,
      ],
      [
        'pulses on a Remix',
        withMove(NAYO, 'specialForwardBoost', () => ({ pulses })),
        /specialForwardBoost: only the super has pulses/,
      ],
      [
        'a flash on a normal',
        withMove(NAYO, 'standHeavy', () => ({ flash: { frame: 0, ticks: 5 } })),
        /standHeavy: only the super and the Rewind freeze the game/,
      ],
      [
        'a Rewind that cancels into a grab',
        withMove(RIFF, 'boostCancel', () => ({ cancelInto: ['normal', 'throw'] })),
        /boostCancel: the Rewind is a movement cancelled freely into normals and specials/,
      ],
      [
        'a blow heavy enough for a combo to give back a bar',
        withMove(NAYO, 'specialAntiAir', () => ({ damage: 130 })),
        /a combo can give 1019 of the gauge \(a bar at most\)/,
      ],
      [
        'a throw heavy enough for a hold to give back a bar',
        withMove(NAYO, 'throwForward', () => ({ damage: 700 })),
        /a hold can give \d+ of the gauge \(a bar at most\)/,
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
