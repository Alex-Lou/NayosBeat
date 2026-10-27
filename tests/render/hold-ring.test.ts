import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { HOLD_LIMIT_FRAMES } from '../../src/core/rules';
import type { GameState } from '../../src/core/state';
import { HoldRing } from '../../src/render/hold-ring';
import { atHoldTick, grabbed } from '../core/hold-helpers';

/** An engine arc standing in for the real one: it records how it was last drawn. */
class FakeArc {
  visible = true;
  closePath = true;
  endAngle = 0;
  anticlockwise = false;
  setClosePath(value: boolean): this {
    this.closePath = value;
    return this;
  }
  setEndAngle(value: number, anticlockwise?: boolean): this {
    this.endAngle = value;
    if (anticlockwise !== undefined) this.anticlockwise = anticlockwise;
    return this;
  }
  setVisible(value: boolean): this {
    this.visible = value;
    return this;
  }
  setStrokeStyle(): this {
    return this;
  }
  setDepth(): this {
    return this;
  }
  setPosition(): this {
    return this;
  }
  setScale(): this {
    return this;
  }
}

/** A ring on a fake scene: the track first, then the ring that drains. */
function ringOn(): { readonly ring: HoldRing; readonly arcs: FakeArc[] } {
  const arcs: FakeArc[] = [];
  const scene = {
    add: {
      arc: () => {
        const arc = new FakeArc();
        arcs.push(arc);
        return arc;
      },
    },
  } as unknown as Phaser.Scene;
  return { ring: new HoldRing(scene, 400, [0xff0000, 0x0000ff]), arcs };
}

/** The same hold with the pair swapped round: the held fighter on the holder's left. */
function heldOnTheLeft(state: GameState): GameState {
  const [holder, held] = state.fighters;
  return {
    ...state,
    fighters: [
      { ...holder, x: held.x, facing: -1 },
      { ...held, x: holder.x, facing: 1 },
    ],
  };
}

describe('the hold ring (docs/combat-v2.md §4.5)', () => {
  const halfway = atHoldTick(grabbed(), HOLD_LIMIT_FRAMES / 2);

  it('leaves its stroke open: no chord from the end of the arc back to the top', () => {
    const { arcs } = ringOn();
    expect(arcs.map((arc) => arc.closePath)).toEqual([false, false]);
  });

  it('drains from the holder side, mirrored when held on the left', () => {
    const right = ringOn();
    right.ring.update(halfway);
    expect(right.arcs[1]).toMatchObject({ endAngle: -90 + 180, anticlockwise: false });

    const left = ringOn();
    left.ring.update(heldOnTheLeft(halfway));
    expect(left.arcs[1]).toMatchObject({ endAngle: -90 - 180, anticlockwise: true });
  });
});
