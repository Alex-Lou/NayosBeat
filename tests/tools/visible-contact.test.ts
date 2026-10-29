import { describe, expect, it } from 'vitest';
import { ANCHOR, ART_SCALE, CELL_SIZE, clipOf, type ClipId } from '../../src/art/types';
import { overlaps } from '../../src/core/boxes';
import { hurtboxesOf } from '../../src/core/combat';
import type { Box, MatchConfig } from '../../src/core/config';
import { px, toPx } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import type { MoveId } from '../../src/core/move-data';
import { moveOf } from '../../src/core/moves';
import type { Contact, GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { TRAINING_STAGE } from '../../src/data/stages';
import { activeFrames } from '../../tools/sprites/clips';
import { POSTURE_CLIPS, postureFrames, type Posture } from '../../tools/sprites/measure';
import { fightState, makeFighter, repeat } from '../core/helpers';
import { DRAWN_FIGHTERS, DRAWN_NAYO, stripOf, type DrawnFighter } from './fighters';
import { reach } from './strip-pixels';

/**
 * Low blows touch what they hit, visibly (docs/combat-v2.md §9.5): at the farthest distance
 * where a low blow hits, computed from the boxes, the attacker's drawing and the defender's,
 * side by side, touch (1 px apart at most), against each posture, for each fighter against
 * each one. The defender faces left: its strips are mirrored around the feet anchor, as the game
 * draws them (render/anchor-origin.ts). And the spark of the hit (the contact the core reports)
 * shows at the drawn toe.
 */

/** How far apart the two drawings may stay, and the spark from the toe, in world pixels. */
const TOUCH = 1;
const SPARK_FROM_TOE = 2;
/** §15: the spark of a low blow shows this close to the floor at most. */
const SPARK_HEIGHT = 14;

/** The fighter's low blows that strike with a hitbox (the Glissade too). */
function lowHits(fighter: DrawnFighter): MoveId[] {
  const { template } = fighter;
  return (Object.keys(template.moves) as MoveId[]).filter(
    (id) => moveOf(template, id).guard === 'low' && moveOf(template, id).hitbox !== undefined,
  );
}

/**
 * The drawn extent of one cell, row by row (a row of the cell is half a world pixel), toward
 * the side it faces: the farthest pixel edge facing right, or the nearest one once mirrored.
 */
function edges(fighter: DrawnFighter, sheet: string, frame: number, mirrored: boolean): number[] {
  const canvas = stripOf(fighter, sheet);
  return Array.from({ length: CELL_SIZE }, (_, row) => {
    let edge = mirrored ? Infinity : -Infinity;
    for (let column = 0; column < CELL_SIZE; column++) {
      if (canvas.pixels[row * canvas.width + frame * CELL_SIZE + column] === 0) continue;
      // Facing right, the column's right edge; mirrored around the anchor, its left edge.
      const x = (column + 1 - ANCHOR.x) / ART_SCALE;
      edge = mirrored ? Math.min(edge, -x) : Math.max(edge, x);
    }
    return edge;
  });
}

/** The frames of a move that show while it can hit. */
function shownActive(fighter: DrawnFighter, move: MoveId): number[] {
  return activeFrames(clipOf(fighter.art, move), moveOf(fighter.template, move));
}

/** The posture's hurtboxes, through the core (a defender standing, crouching or jumping). */
function hurtboxes(fighter: DrawnFighter, posture: Posture): readonly Box[] {
  const defender = makeFighter({
    crouching: posture === 'crouching',
    y: posture === 'air' ? px(30) : 0,
  });
  return hurtboxesOf(defender, fighter.template);
}

/** The farthest distance (sub-pixels, centre to centre) at which `hitbox` touches a hurtbox. */
function farthestHit(hitbox: Box, boxes: readonly Box[]): number {
  let distance = 0;
  for (const hurtbox of boxes) {
    // Just short of the sum of the two reaches: the boxes overlap by one sub-pixel.
    const far = hitbox.x + hitbox.width + hurtbox.x + hurtbox.width - 1;
    if (overlaps(hitbox, 0, 0, 1, hurtbox, far, 0, -1)) distance = Math.max(distance, far);
  }
  return distance;
}

describe('low blows', () => {
  it('are found in the data', () => {
    expect(DRAWN_FIGHTERS.map(lowHits)).toEqual([
      ['crouchLight', 'crouchHeavy'],
      ['crouchLight', 'crouchHeavy', 'special', 'specialBoost'],
    ]);
  });
});

/**
 * At the farthest distance where `move` hits `defender` in `posture`, computed from the boxes,
 * the two drawings touch, on every active frame of the move against every frame the posture's
 * `clips` show (all its calibration poses by default).
 */
function expectTouch(
  attacker: DrawnFighter,
  move: MoveId,
  defender: DrawnFighter,
  posture: Posture,
  clips: readonly ClipId[] = POSTURE_CLIPS[posture].body,
): void {
  const hitbox = moveOf(attacker.template, move).hitbox;
  if (!hitbox) throw new Error(`${move} has no hitbox`);
  const distance = toPx(farthestHit(hitbox, hurtboxes(defender, posture)));
  expect(distance).toBeGreaterThan(0);
  const sheet = clipOf(attacker.art, move).sheet;
  for (const attackFrame of shownActive(attacker, move)) {
    const near = edges(attacker, sheet, attackFrame, false);
    for (const clip of clips) {
      const shown = postureFrames(defender.art.clips, clip);
      for (const frame of shown.frames) {
        const far = edges(defender, shown.sheet, frame, true);
        // Rows (half pixels) within TOUCH of each other: the gap across, the smallest.
        let gap = Infinity;
        near.forEach((right, row) => {
          for (let other = row - 2; other <= row + 2; other++) {
            const left = far[other] ?? Infinity;
            gap = Math.min(gap, distance + left - right);
          }
        });
        expect(gap, `${clip} frame ${frame}, ${move} frame ${attackFrame}`).toBeLessThanOrEqual(
          TOUCH,
        );
      }
    }
  }
}

describe.each(DRAWN_FIGHTERS)("$name's low blows touch visibly", (attacker) => {
  for (const move of lowHits(attacker)) {
    for (const defender of DRAWN_FIGHTERS) {
      for (const posture of ['standing', 'crouching'] as const) {
        it(`${move} against ${defender.name} ${posture}`, () => {
          expectTouch(attacker, move, defender, posture);
        });
      }
    }
  }
});

/**
 * The Crochet au foie, a mid blow at belly height, hits a crouching body (docs/combos-v3.md
 * §2.2): it touches it visibly too (§6.2), the crouch it lands on. Not the reactions: at belly
 * height they recoil from the blow (the guard's impact, the fold of a hit), their shins only
 * staying on their marks, where the low blows above touch them.
 */
describe("Nayo's Crochet au foie touches a crouching body visibly", () => {
  it.each(DRAWN_FIGHTERS)('against $name crouching', (defender) => {
    expectTouch(DRAWN_NAYO, 'chainHeavy', defender, 'crouching', ['crouch']);
  });
});

/** Plays a crouching low blow from `attackerX` on a standing defender at `defenderX`: its contact. */
function contactOf(
  config: MatchConfig,
  move: MoveId,
  attackerX: number,
  defenderX: number,
): Contact {
  const start = fightState(config);
  const facing = attackerX < defenderX ? 1 : -1;
  let state: GameState = {
    ...start,
    fighters: [
      { ...start.fighters[0], x: attackerX, facing },
      { ...start.fighters[1], x: defenderX, facing: facing === 1 ? -1 : 1 },
    ],
  };
  const press = move === 'crouchLight' ? Input.Down | Input.Light : Input.Down | Input.Heavy;
  for (const input of [press, ...repeat(Input.Down, 20)]) {
    state = step(state, [input, 0], config);
    const contact = state.contacts[0];
    if (contact) return contact;
  }
  throw new Error(`${move} did not hit`);
}

describe.each(DRAWN_FIGHTERS)("the spark of $name's low blows", (attacker) => {
  // The blows struck from where they started (the Glissade travels: not one of them).
  const sweeps = lowHits(attacker).filter(
    (move) => moveOf(attacker.template, move).motion === undefined,
  );
  for (const defender of DRAWN_FIGHTERS) {
    it.each(sweeps)(
      `%s on ${defender.name}: at the shin, by the drawn toe, either side`,
      (move) => {
        const config: MatchConfig = {
          stage: TRAINING_STAGE,
          fighters: [attacker.template, defender.template],
        };
        const hitbox = moveOf(attacker.template, move).hitbox;
        if (!hitbox) throw new Error(`${move} has no hitbox`);
        const distance = farthestHit(hitbox, defender.template.standingHurtboxes);
        const band = { from: toPx(hitbox.y), to: toPx(hitbox.y + hitbox.height) };
        const strip = stripOf(attacker, clipOf(attacker.art, move).sheet);
        const toe = Math.min(
          ...shownActive(attacker, move).map((frame) => reach([strip], frame, band, false)),
        );
        const center = px(480);
        for (const facing of [1, -1] as const) {
          const contact = contactOf(config, move, center, center + facing * distance);
          expect(toPx(contact.y)).toBeLessThanOrEqual(SPARK_HEIGHT);
          const ahead = toPx((contact.x - center) * facing);
          expect(
            Math.abs(ahead - toe),
            `spark ${ahead} px ahead, toe at ${toe}`,
          ).toBeLessThanOrEqual(SPARK_FROM_TOE);
        }
      },
    );
  }
});
