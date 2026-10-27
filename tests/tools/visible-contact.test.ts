import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types';
import { overlaps } from '../../src/core/boxes';
import { hurtboxesOf } from '../../src/core/combat';
import type { Box } from '../../src/core/config';
import { px, toPx } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import type { MoveId } from '../../src/core/move-data';
import type { Contact, GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { POSTURE_CLIPS, postureFrames, type Posture } from '../../tools/sprites/measure';
import type { PosedSheet } from '../../tools/sprites/nayo/poses/index';
import type { PixelCanvas } from '../../tools/sprites/raster';
import { drawSheet } from '../../tools/sprites/sheet';
import { fightState, makeFighter, MIRROR_MATCH, repeat } from '../core/helpers';
import { reach } from './strip-pixels';

/**
 * Low blows touch what they hit, visibly (docs/combat-v2.md §9.5): at the farthest distance
 * where a low blow hits, computed from the boxes, the attacker's drawing and the defender's,
 * side by side, touch (1 px apart at most), against each posture. The defender faces left: its
 * strips are mirrored around the feet anchor, as the game draws them (render/anchor-origin.ts).
 * And the spark of the hit (the contact the core reports) shows at the drawn toe.
 */

const LOW_HITS = (Object.keys(NAYO.moves) as MoveId[]).filter(
  (id) => NAYO.moves[id].guard === 'low' && NAYO.moves[id].hitbox !== undefined,
);
/** How far apart the two drawings may stay, and the spark from the toe, in world pixels. */
const TOUCH = 1;
const SPARK_FROM_TOE = 2;
/** §15: the spark of a low blow shows this close to the floor at most. */
const SPARK_HEIGHT = 14;

const strips = new Map<string, PixelCanvas>();
function strip(sheet: string): PixelCanvas {
  const known = strips.get(sheet);
  if (known) return known;
  const canvas = drawSheet(sheet as PosedSheet);
  strips.set(sheet, canvas);
  return canvas;
}

/**
 * The drawn extent of one cell, row by row (a row of the cell is half a world pixel), toward
 * the side it faces: the farthest pixel edge facing right, or the nearest one once mirrored.
 */
function edges(sheet: string, frame: number, mirrored: boolean): number[] {
  const canvas = strip(sheet);
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
function activeFrames(move: MoveId): number[] {
  const { startup, active } = NAYO.moves[move];
  const clip = NAYO_CLIPS[move];
  const frames: number[] = [];
  let tick = 0;
  clip.ticks.forEach((ticks, index) => {
    if (tick < startup + active && tick + ticks > startup) frames.push(clip.frames[index] ?? -1);
    tick += ticks;
  });
  return frames;
}

/** The posture's hurtboxes, through the core (a defender standing, crouching or jumping). */
function hurtboxes(posture: Posture): readonly Box[] {
  const defender = makeFighter({
    crouching: posture === 'crouching',
    y: posture === 'air' ? px(30) : 0,
  });
  return hurtboxesOf(defender, NAYO);
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

describe('low blows touch visibly', () => {
  it('are found in the data', () => {
    expect(LOW_HITS).toEqual(['crouchLight', 'crouchHeavy']);
  });

  for (const move of LOW_HITS) {
    for (const posture of ['standing', 'crouching'] as const) {
      it(`${move} against a ${posture} defender`, () => {
        const hitbox = NAYO.moves[move].hitbox;
        if (!hitbox) throw new Error(`${move} has no hitbox`);
        const distance = toPx(farthestHit(hitbox, hurtboxes(posture)));
        expect(distance).toBeGreaterThan(0);
        for (const attackFrame of activeFrames(move)) {
          const attacker = edges(NAYO_CLIPS[move].sheet, attackFrame, false);
          for (const clip of POSTURE_CLIPS[posture].body) {
            const { sheet, frames } = postureFrames(clip);
            for (const frame of frames) {
              const defender = edges(sheet, frame, true);
              // Rows (half pixels) within TOUCH of each other: the gap across, the smallest.
              let gap = Infinity;
              attacker.forEach((right, row) => {
                for (let other = row - 2; other <= row + 2; other++) {
                  const left = defender[other] ?? Infinity;
                  gap = Math.min(gap, distance + left - right);
                }
              });
              expect(
                gap,
                `${clip} frame ${frame}, ${move} frame ${attackFrame}`,
              ).toBeLessThanOrEqual(TOUCH);
            }
          }
        }
      });
    }
  }
});

describe('the spark of a low blow', () => {
  /** Plays a low kick from `attackerX` on a standing Nayo at `defenderX`; the contact made. */
  function contactOf(move: MoveId, attackerX: number, defenderX: number): Contact {
    const start = fightState(MIRROR_MATCH);
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
      state = step(state, [input, 0], MIRROR_MATCH);
      const contact = state.contacts[0];
      if (contact) return contact;
    }
    throw new Error(`${move} did not hit`);
  }

  it.each(LOW_HITS)('%s: at the shin, by the drawn toe, on either side', (move) => {
    const hitbox = NAYO.moves[move].hitbox;
    if (!hitbox) throw new Error(`${move} has no hitbox`);
    const distance = farthestHit(hitbox, NAYO.standingHurtboxes);
    const band = { from: toPx(hitbox.y), to: toPx(hitbox.y + hitbox.height) };
    const toe = Math.min(
      ...activeFrames(move).map((frame) =>
        reach([strip(NAYO_CLIPS[move].sheet)], frame, band, false),
      ),
    );
    const center = px(480);
    for (const facing of [1, -1] as const) {
      const contact = contactOf(move, center, center + facing * distance);
      expect(toPx(contact.y)).toBeLessThanOrEqual(SPARK_HEIGHT);
      const ahead = toPx((contact.x - center) * facing);
      expect(Math.abs(ahead - toe), `spark ${ahead} px ahead, toe at ${toe}`).toBeLessThanOrEqual(
        SPARK_FROM_TOE,
      );
    }
  });
});
