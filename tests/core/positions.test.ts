import { describe, expect, it } from 'vitest';
import { CAMERA_WIDTH_PX, px } from '../../src/core/constants';
import { followCamera, resolvePositions } from '../../src/core/positions';
import type { FighterState } from '../../src/core/state';
import { Input } from '../../src/core/input';
import { NAYO as STATS } from '../../src/data/fighters/nayo';
import { TRAINING_STAGE as STAGE } from '../../src/data/stages';
import { fightState, makeFighter, MIRROR_MATCH, run } from './helpers';

const BOX = STATS.standingPushbox;
const HALF_BOX = BOX.width / 2;
const HALF_CAMERA = px(CAMERA_WIDTH_PX) / 2;

function at(x: number, overrides: Partial<FighterState> = {}): FighterState {
  return makeFighter({ x, ...overrides });
}

function resolve(a: FighterState, b: FighterState, cameraX = STAGE.width / 2) {
  return resolvePositions({ fighter: a, box: BOX }, { fighter: b, box: BOX }, cameraX, STAGE);
}

describe('resolvePositions', () => {
  it('leaves separated fighters untouched', () => {
    const a = at(px(400));
    const b = at(px(500));
    expect(resolve(a, b)).toEqual([a, b]);
  });

  it('pushes overlapping fighters apart equally', () => {
    const [a, b] = resolve(at(px(470)), at(px(480)));
    expect(b.x - a.x).toBe(BOX.width);
    expect(px(475) - a.x).toBe(b.x - px(475));
  });

  it('splits an odd overlap evenly, whichever player stands on the left', () => {
    // 1 sub-pixel off a round distance: an odd overlap.
    const [a, b] = resolve(at(px(470)), at(px(480) + 1));
    expect(px(470) - a.x).toBe(b.x - (px(480) + 1));
    // Both pushed the upper half: 1 sub-pixel apart from touching, never closer.
    expect(b.x - a.x).toBe(BOX.width + 1);
    const [right, left] = resolve(at(px(480) + 1), at(px(470)));
    expect([left.x, right.x]).toEqual([a.x, b.x]);
  });

  it('separates fighters standing on the same spot deterministically', () => {
    const [a, b] = resolve(at(px(480), { facing: -1 }), at(px(480), { facing: 1 }));
    expect(b.x).toBeLessThan(a.x);
    expect(a.x - b.x).toBe(BOX.width);
  });

  it('lets a fighter jump over a standing one', () => {
    const jumper = at(px(480), { y: BOX.height + 1 });
    const [a, b] = resolve(jumper, at(px(480)));
    expect(a.x).toBe(px(480));
    expect(b.x).toBe(px(480));
  });

  it('keeps fighters inside the camera', () => {
    const cameraX = STAGE.width / 2;
    const [a] = resolve(at(0), at(px(600)), cameraX);
    expect(a.x).toBe(cameraX - HALF_CAMERA + HALF_BOX);
  });

  it('transfers the push to the other fighter when one is against a wall', () => {
    const wall = HALF_BOX;
    const [a, b] = resolve(at(wall), at(wall + px(10)), HALF_CAMERA);
    expect(a.x).toBe(wall);
    expect(b.x).toBe(wall + BOX.width);
  });
});

describe('corner pushback', () => {
  it('pushes the opponent away when a sliding fighter is stopped by the wall', () => {
    const sliding = at(HALF_BOX - px(3), { action: 'hitstun', vx: px(-3) });
    const [a, b] = resolve(sliding, at(px(60)), HALF_CAMERA);
    expect(a.x).toBe(HALF_BOX);
    expect(b.x).toBe(px(63));
  });

  it('does not push the opponent for a fighter merely walking into the wall', () => {
    const walking = at(HALF_BOX - px(3), { action: 'walkBack', vx: px(-1) });
    const [, b] = resolve(walking, at(px(60)), HALF_CAMERA);
    expect(b.x).toBe(px(60));
  });
});

describe('followCamera', () => {
  it('centers on the midpoint between fighters', () => {
    expect(followCamera(at(px(400)), at(px(500)), STAGE)).toBe(px(450));
  });

  it('never shows outside the stage', () => {
    expect(followCamera(at(0), at(px(10)), STAGE)).toBe(HALF_CAMERA);
    expect(followCamera(at(STAGE.width), at(STAGE.width), STAGE)).toBe(STAGE.width - HALF_CAMERA);
  });
});

describe('walking away from each other', () => {
  it('stops at the screen edges instead of separating forever', () => {
    const [a, b] = run(
      600,
      [Input.Left, Input.Right],
      fightState(MIRROR_MATCH),
      MIRROR_MATCH,
    ).fighters;
    expect(b.x - a.x).toBeLessThanOrEqual(px(CAMERA_WIDTH_PX) - BOX.width);
  });

  it('can walk the whole stage when the opponent follows', () => {
    const [a] = run(
      1200,
      [Input.Left, Input.Left],
      fightState(MIRROR_MATCH),
      MIRROR_MATCH,
    ).fighters;
    expect(a.x).toBe(HALF_BOX);
  });
});
