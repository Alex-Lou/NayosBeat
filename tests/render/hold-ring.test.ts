import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { HOLD_LIMIT_FRAMES } from '../../src/core/rules';
import type { GameState } from '../../src/core/state';
import { HoldRing, pendingHold } from '../../src/render/hold-ring';
import { arcStrip, sweepOf } from '../../src/render/smooth-stroke';
import { Input } from '../../src/core/input';
import { step } from '../../src/core/step';
import { atHoldTick, grabbed, mash, NAYO_MIRROR, play } from '../core/hold-helpers';
import { FakeTextures } from './finisher-fakes';

/** An engine arc standing in for the real one: it records how it was last drawn. */
class FakeArc {
  visible = true;
  closePath = true;
  x = 0;
  y = 0;
  scale = 1;
  width = 1;
  alpha = 1;
  constructor(
    readonly radius = 0,
    readonly startAngle = 0,
    public endAngle = 0,
    public anticlockwise = false,
  ) {}
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
  setStrokeStyle(width: number, color: number, alpha: number): this {
    this.width = width;
    this.stroke = color;
    this.alpha = alpha;
    return this;
  }
  setDepth(): this {
    return this;
  }
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  setScale(value: number): this {
    this.scale = value;
    return this;
  }
}

/** An engine mesh standing in for the real one: what a smooth arc draws with (WebGL). */
class FakeMesh {
  visible = true;
  tint = 0xffffff;
  alpha = 1;
  x = 0;
  y = 0;
  scale = 1;
  constructor(
    readonly texture: string,
    readonly vertices: number[],
  ) {}
  buildOrderedIndices(): this {
    return this;
  }
  setTint(color: number): this {
    this.tint = color;
    return this;
  }
  setAlpha(value: number): this {
    this.alpha = value;
    return this;
  }
  setDepth(): this {
    return this;
  }
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  setScale(value: number): this {
    this.scale = value;
    return this;
  }
  setVisible(value: boolean): this {
    this.visible = value;
    return this;
  }
}

/** A ring on a fake scene, drawn by Canvas: the track first, then the ring that drains. */
function ringOn(): { readonly ring: HoldRing; readonly arcs: FakeArc[] } {
  const arcs: FakeArc[] = [];
  const scene = {
    add: {
      arc: (
        _x: number,
        _y: number,
        radius: number,
        start: number,
        end: number,
        anticlockwise: boolean,
      ) => {
        const arc = new FakeArc(radius, start, end, anticlockwise);
        arcs.push(arc);
        return arc;
      },
    },
  } as unknown as Phaser.Scene;
  return { ring: new HoldRing(scene, 400, [0xff0000, 0x0000ff], 'simple'), arcs };
}

/** The same ring drawn with WebGL: smooth arcs on their meshes, their texture made. */
function smoothRingOn(): {
  readonly ring: HoldRing;
  readonly meshes: FakeMesh[];
  readonly textures: FakeTextures;
} {
  const meshes: FakeMesh[] = [];
  const textures = new FakeTextures();
  const scene = {
    textures,
    add: {
      mesh2d: (_x: number, _y: number, texture: string, vertices: number[]) => {
        const mesh = new FakeMesh(texture, vertices);
        meshes.push(mesh);
        return mesh;
      },
    },
  } as unknown as Phaser.Scene;
  return { ring: new HoldRing(scene, 400, [0xff0000, 0x0000ff], 'full'), meshes, textures };
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

  it('draws the same ring with WebGL, smooth: where, how big, its color, its arc, frame by frame', () => {
    // The held fighter struggles (the ring jumps), then is thrown (it goes); on both sides.
    const struggle = play(grabbed(), 90, (tick) => [0, mash(Input.Light, tick)]);
    const frames = [...struggle, ...struggle.map(heldOnTheLeft)];
    const engine = ringOn();
    const smooth = smoothRingOn();
    let drawn = 0;
    const seen = { scales: new Set<number>(), colors: new Set<number>(), ways: new Set<boolean>() };
    for (const state of frames) {
      engine.ring.update(state);
      smooth.ring.update(state);
      engine.arcs.forEach((arc, i) => {
        const mesh = smooth.meshes[i];
        if (!mesh) throw new Error('as many meshes as arcs');
        expect(mesh.visible).toBe(arc.visible);
        if (!arc.visible) return;
        drawn++;
        seen.scales.add(arc.scale);
        seen.colors.add(arc.stroke);
        seen.ways.add(arc.anticlockwise);
        expect([mesh.x, mesh.y, mesh.scale, mesh.tint, mesh.alpha]).toEqual([
          arc.x,
          arc.y,
          arc.scale,
          arc.stroke,
          arc.alpha,
        ]);
        const strip = new Array<number>(mesh.vertices.length).fill(0);
        const sweep = sweepOf(arc.startAngle, arc.endAngle, arc.anticlockwise);
        arcStrip(strip, arc.radius, arc.width, arc.startAngle, sweep);
        expect(mesh.vertices).toEqual(strip);
      });
    }
    // Shown on most frames, popped, blinking white then in the holder's color, both ways round.
    expect(drawn).toBeGreaterThan(100);
    expect([...seen.scales].some((scale) => scale > 1)).toBe(true);
    expect([...seen.colors]).toEqual(expect.arrayContaining([0xffffff, 0xff0000]));
    expect([...seen.ways].sort()).toEqual([false, true]);
  });

  it('draws its track and its ring with WebGL on one texture, which it made', () => {
    const smooth = smoothRingOn();
    const [texture] = smooth.textures.keys();
    expect(smooth.textures.keys()).toHaveLength(1);
    expect(smooth.meshes.map((mesh) => mesh.texture)).toEqual([texture, texture]);
    expect(smooth.textures.made.get(texture ?? '')?.smoothPixelArt).toBe(true);
  });
});
