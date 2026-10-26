import type { BoxSize, FighterTemplate } from './config';

/**
 * Checks a template's data for authoring mistakes. Returns the list of problems
 * (empty when valid) so every mistake is reported at once.
 */
export function validateTemplate(template: FighterTemplate): string[] {
  const errors: string[] = [];
  const expect = (condition: boolean, message: string): void => {
    if (!condition) errors.push(`${template.name}: ${message}`);
  };
  const isTicks = (value: number, min: number): boolean => Number.isInteger(value) && value >= min;
  const isPositiveBox = (box: BoxSize): boolean =>
    Number.isInteger(box.width) && Number.isInteger(box.height) && box.width > 0 && box.height > 0;

  expect(isTicks(template.maxHealth, 1), 'maxHealth must be a positive integer');
  expect(template.gravity > 0, 'gravity must be positive');
  expect(template.jumpVelocity > 0, 'jumpVelocity must be positive');
  expect(isTicks(template.preJumpFrames, 1), 'preJumpFrames must be >= 1');
  expect(isTicks(template.landingFrames, 1), 'landingFrames must be >= 1');
  expect(isTicks(template.knockdownFrames, 0), 'knockdownFrames must be >= 0');
  for (const name of [
    'standingPushbox',
    'crouchingPushbox',
    'standingHurtbox',
    'crouchingHurtbox',
    'airHurtbox',
  ] as const) {
    expect(isPositiveBox(template[name]), `${name} must have a positive integer size`);
  }

  for (const [id, move] of Object.entries(template.moves)) {
    expect(isTicks(move.startup, 0), `${id}.startup must be an integer >= 0`);
    expect(isTicks(move.active, 1), `${id}.active must be an integer >= 1`);
    expect(isTicks(move.recovery, 0), `${id}.recovery must be an integer >= 0`);
    expect(isTicks(move.damage, 0), `${id}.damage must be an integer >= 0`);
    expect(isTicks(move.hitstun, 0), `${id}.hitstun must be an integer >= 0`);
    expect(isTicks(move.blockstun, 0), `${id}.blockstun must be an integer >= 0`);
    expect(isTicks(move.hitstop, 0), `${id}.hitstop must be an integer >= 0`);
    expect(isTicks(move.pushback, 0), `${id}.pushback must be an integer >= 0`);
    expect(move.name.length > 0, `${id}.name must not be empty`);
    expect(
      (move.hitbox === undefined) !== (move.projectile === undefined),
      `${id} must have either a hitbox or a projectile`,
    );
    if (move.hitbox) {
      expect(isPositiveBox(move.hitbox), `${id}.hitbox must have a positive integer size`);
    }
    if (move.projectile) {
      expect(isTicks(move.projectile.speed, 1), `${id}.projectile.speed must be >= 1`);
      expect(
        isPositiveBox(move.projectile.hitbox),
        `${id}.projectile.hitbox must have a positive integer size`,
      );
    }
    for (const [label, range] of [
      ['advance', move.advance],
      ['invincible', move.invincible],
    ] as const) {
      if (!range) continue;
      expect(
        isTicks(range.from, 0) && isTicks(range.to, range.from + 1),
        `${id}.${label} must be a non-empty frame range`,
      );
    }
    if (move.advance) {
      expect(isTicks(move.advance.speed, 1), `${id}.advance.speed must be >= 1`);
    }
  }
  return errors;
}

/** Fails fast at startup instead of producing a subtly broken match. */
export function assertValidTemplates(templates: readonly FighterTemplate[]): void {
  const errors = templates.flatMap(validateTemplate);
  if (errors.length > 0) throw new Error(`Invalid fighter data:\n${errors.join('\n')}`);
}
