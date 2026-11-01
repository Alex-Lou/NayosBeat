import { describe, expect, it } from 'vitest';
import type { Box, FighterTemplate } from '../../src/core/config';
import { toPx } from '../../src/core/constants';
import { MOVE_IDS, type MoveData } from '../../src/core/move-data';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { SAPHIR } from '../../src/data/fighters/saphir';

/**
 * The frozen reaches (docs/combat-v2.md §10.4): how far, from center to center, every strike of
 * both fighters touches each posture of both, standing and crouching, computed from the boxes
 * (the hitbox on each active frame, carried by the move's motion, raised by its leap) and
 * frozen in a snapshot: no reach changes by accident. A blank: the move never touches that
 * posture (a launcher on a crouching body). Re-record on purpose only (`vitest -u`).
 */

const FIGHTERS: readonly FighterTemplate[] = [NAYO, RIFF, SAPHIR];

/** The farthest any of `boxes` reaches forward, among those level with `from`..`to`. */
function frontAt(boxes: readonly Box[], from: number, to: number): number | null {
  let front: number | null = null;
  for (const box of boxes) {
    const level = box.y < to && from < box.y + box.height;
    if (level) front = Math.max(front ?? -Infinity, box.x + box.width);
  }
  return front;
}

/** The farthest reach of `move` against `body` (a posture's hurtboxes), in pixels, or null. */
function reachOf(move: MoveData, body: readonly Box[]): number | null {
  const { hitbox } = move;
  if (!hitbox) return null;
  let best: number | null = null;
  let carried = 0;
  for (let frame = 0; frame < move.startup + move.active; frame++) {
    carried += move.motion?.dx[frame] ?? 0;
    if (frame < move.startup) continue;
    const lift = move.motion?.y?.[frame] ?? 0;
    const from = lift + hitbox.y;
    const front = frontAt(body, from, from + hitbox.height);
    if (front === null) continue;
    const reach = carried + hitbox.x + hitbox.width + front;
    best = Math.max(best ?? -Infinity, reach);
  }
  return best === null ? null : toPx(best);
}

/** One line per strike: its reach against each fighter standing, then crouching. */
function table(attacker: FighterTemplate): string {
  const lines = MOVE_IDS.flatMap((id) => {
    const move = attacker.moves[id];
    if (!move?.hitbox) return [];
    const reaches = FIGHTERS.flatMap((defender) =>
      [defender.standingHurtboxes, defender.crouchingHurtboxes].map((body) => {
        const reach = reachOf(move, body);
        return (reach === null ? '-' : reach.toFixed(1)).padStart(6);
      }),
    );
    return [`${id.padEnd(20)}${reaches.join('')}`];
  });
  return ['against             Nayo  crouch  Riff  crouch  Saphir  crouch', ...lines].join('\n');
}

describe('reaches (§10.4)', () => {
  it("Nayo's", () => {
    expect(table(NAYO)).toMatchSnapshot();
  });

  it("Riff's", () => {
    expect(table(RIFF)).toMatchSnapshot();
  });

  it("Saphir's", () => {
    expect(table(SAPHIR)).toMatchSnapshot();
  });
});
