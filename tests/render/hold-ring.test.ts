import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { HOLD_LIMIT_FRAMES } from '../../src/core/rules';
import type { GameState } from '../../src/core/state';
import { HoldRing, pendingHold } from '../../src/render/hold-ring';
import { Input } from '../../src/core/input';
import { step } from '../../src/core/step';
import { atHoldTick, grabbed, NAYO_MIRROR } from '../core/hold-helpers';

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
  stroke = 0;
  setStrokeStyle(_width: number, color: number): this {
    this.stroke = color;
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

  it('goes once a throw is under way, the choice made: it would circle empty space', () => {
    const at12 = atHoldTick(grabbed(), 12);
    expect(pendingHold(at12)).not.toBeNull();
    const knee = step(at12, [Input.Light, 0], NAYO_MIRROR);
    expect(pendingHold(knee)).not.toBeNull();
    const throwing = step(at12, [Input.Left | Input.Heavy, 0], NAYO_MIRROR);
    expect(throwing.fighters[0].move).toBe('throwBack');
    expect(throwing.hold).not.toBeNull();
    expect(pendingHold(throwing)).toBeNull();

    const { ring, arcs } = ringOn();
    ring.update(at12);
    ring.update(throwing);
    expect(arcs.map((arc) => arc.visible)).toEqual([false, false]);
  });

  it('blinks white in the clinch; calm, it stays white, then turns the holder color once', () => {
    const colors = (calm: boolean) => {
      const { ring, arcs } = ringOn();
      ring.calm = calm;
      return Array.from({ length: 40 }, (_, tick) => {
        ring.update(atHoldTick(grabbed(), tick));
        return arcs[1]?.stroke;
      });
    };
    const changes = (strokes: (number | undefined)[]) =>
      strokes.filter((stroke, tick) => tick > 0 && stroke !== strokes[tick - 1]).length;
    expect(changes(colors(false))).toBeGreaterThan(1);
    const calm = colors(true);
    expect(calm[0]).toBe(0xffffff);
    expect(changes(calm)).toBe(1);
  });
});
