import type { Box, BoxSize, FighterTemplate, MatchConfig, StageConfig } from './config';
import { CAMERA_WIDTH_PX, px } from './constants';
import { AIR_MOVE_IDS, CORE_MOVE_IDS, MOVEMENT_MOVE_IDS, type FrameRange } from './move-data';
import { moveDuration } from './moves';

/**
 * Checks match data for authoring mistakes. Returns the list of problems (empty when valid)
 * so every mistake is reported at once. Everything the simulation relies on is checked here:
 * integer sub-pixels and ticks, consistent frame ranges, coherent move kinds.
 */
export function validateTemplate(template: FighterTemplate): string[] {
  const errors: string[] = [];
  const expect = (condition: boolean, message: string): void => {
    if (!condition) errors.push(`${template.name}: ${message}`);
  };

  for (const name of [
    'walkForwardSpeed',
    'walkBackSpeed',
    'jumpForwardSpeed',
    'jumpBackSpeed',
    'knockdownFrames',
  ] as const) {
    expect(isInteger(template[name], 0), `${name} must be an integer >= 0`);
  }
  for (const name of ['maxHealth', 'gravity', 'preJumpFrames', 'landingFrames'] as const) {
    expect(isInteger(template[name], 1), `${name} must be an integer >= 1`);
  }
  expect(
    isInteger(template.jumpVelocity, template.gravity + 1),
    'jumpVelocity must be an integer greater than gravity (or the jump lands at once)',
  );
  for (const name of [
    'standingPushbox',
    'crouchingPushbox',
    'airPushbox',
    'lyingPushbox',
  ] as const) {
    expect(isPositiveSize(template[name]), `${name} must have a positive integer size`);
  }
  expect(isInteger(template.airPushbox.lift, 0), 'airPushbox.lift must be an integer >= 0');
  for (const name of ['standingHurtboxes', 'crouchingHurtboxes', 'airHurtboxes'] as const) {
    const boxes = template[name];
    expect(boxes.length > 0, `${name} must have at least one box`);
    expect(boxes.every(isValidBox), `${name} must have integer offsets and a positive size`);
  }

  for (const id of CORE_MOVE_IDS) {
    const move = template.moves[id];
    const duration = moveDuration(move);
    expect(move.name.length > 0, `${id}.name must not be empty`);
    const movement = move.kind === 'movement';
    expect(
      (id === 'grab') === (move.kind === 'grab'),
      `${id}: only the grab move may (and must) be of kind "grab"`,
    );
    expect(
      MOVEMENT_MOVE_IDS.includes(id) === movement,
      `${id}: only the dashes may (and must) be of kind "movement"`,
    );
    for (const name of [
      'startup',
      'recovery',
      'damage',
      'hitstun',
      'blockstun',
      'hitstop',
    ] as const) {
      expect(isInteger(move[name], 0), `${id}.${name} must be an integer >= 0`);
    }
    expect(isInteger(move.active, 1), `${id}.active must be an integer >= 1`);
    expect(isInteger(move.pushback, 0), `${id}.pushback must be an integer >= 0`);

    if (movement) {
      expect(
        move.hitbox === undefined && move.projectile === undefined && move.damage === 0,
        `${id}: a movement never strikes (no hitbox, no projectile, no damage)`,
      );
      expect(move.motion !== undefined, `${id}: a movement must have a motion`);
    } else {
      expect(
        (move.hitbox === undefined) !== (move.projectile === undefined),
        `${id} must have either a hitbox or a projectile`,
      );
    }
    if (move.hitbox) {
      expect(isValidBox(move.hitbox), `${id}.hitbox must have integer offsets and a positive size`);
    }
    if (move.projectile) {
      expect(!AIR_MOVE_IDS.includes(id), `${id}: projectiles can only be fired from the ground`);
      expect(isInteger(move.projectile.speed, 1), `${id}.projectile.speed must be an integer >= 1`);
      expect(
        isInteger(move.projectile.spawnX, 0),
        `${id}.projectile.spawnX must be an integer >= 0`,
      );
      expect(
        isValidBox(move.projectile.hitbox),
        `${id}.projectile.hitbox must have integer offsets and a positive size`,
      );
    }
    if (move.motion) {
      expect(
        move.motion.dx.length === duration,
        `${id}.motion.dx must have one entry per frame of the move (${duration})`,
      );
      expect(move.motion.dx.every(Number.isInteger), `${id}.motion.dx must be integers`);
    }
    for (const name of ['invincible', 'throwInvincible'] as const) {
      const range = move[name];
      if (range) expect(isRangeWithin(range, duration), `${id}.${name} must fit within the move`);
    }
    if (move.freeCancelFrom !== undefined) {
      expect(movement, `${id}: only a movement can be cancelled without contact`);
      expect(
        isInteger(move.freeCancelFrom, 1) && move.freeCancelFrom < duration,
        `${id}.freeCancelFrom must be a frame of the move`,
      );
    }
    if (move.cancelInto) {
      expect(!move.cancelInto.includes('movement'), `${id} cannot be cancelled into a movement`);
      expect(
        movement || !move.cancelInto.includes('grab'),
        `${id}: only a movement can be cancelled into a grab`,
      );
    }
  }
  return errors;
}

export function validateStage(stage: StageConfig): string[] {
  const errors: string[] = [];
  if (!isInteger(stage.width, px(CAMERA_WIDTH_PX))) {
    errors.push(`stage: width must be an integer of at least one screen (${px(CAMERA_WIDTH_PX)})`);
  }
  if (!isInteger(stage.startDistance, 0) || stage.startDistance >= stage.width) {
    errors.push('stage: startDistance must be an integer smaller than the stage width');
  }
  return errors;
}

/** Fails fast at startup instead of producing a subtly broken match. */
export function assertValidMatch(config: MatchConfig): void {
  const errors = [...validateStage(config.stage), ...config.fighters.flatMap(validateTemplate)];
  if (errors.length > 0) throw new Error(`Invalid match data:\n${errors.join('\n')}`);
}

function isInteger(value: number, min: number): boolean {
  return Number.isInteger(value) && value >= min;
}

function isPositiveSize(box: BoxSize): boolean {
  return isInteger(box.width, 1) && isInteger(box.height, 1);
}

function isValidBox(box: Box): boolean {
  return Number.isInteger(box.x) && Number.isInteger(box.y) && isPositiveSize(box);
}

function isRangeWithin(range: FrameRange, duration: number): boolean {
  return isInteger(range.from, 0) && isInteger(range.to, range.from + 1) && range.to <= duration;
}
