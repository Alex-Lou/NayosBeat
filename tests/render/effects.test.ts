import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { COLOR_GAP, Effects } from '../../src/render/effects';
import { DEPTH } from '../../src/render/depth';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { koVeil, superDim, superHalo, veilLife } from '../../src/render/veils';

vi.mock('phaser', () => ({ default: { Textures: { FilterMode: { LINEAR: 1 } } } }));

/** A game object standing in for the engine's: it keeps how it was last set. */
class FakeObject {
  alpha = 1;
  visible = true;
  depth = 0;
  scrollFactor = 1;
  tint = -1;
  fill = -1;
  x = 0;
  y = 0;
  setOrigin(): this {
    return this;
  }
  setDisplaySize(): this {
    return this;
  }
  setDepth(depth: number): this {
    this.depth = depth;
    return this;
  }
  setScrollFactor(factor: number): this {
    this.scrollFactor = factor;
    return this;
  }
  setAlpha(alpha: number): this {
    this.alpha = alpha;
    return this;
  }
  setVisible(visible: boolean): this {
    this.visible = visible;
    return this;
  }
  setTint(tint: number): this {
    this.tint = tint;
    return this;
  }
  setFillStyle(fill: number): this {
    this.fill = fill;
    return this;
  }
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
}

/** The dark, the halo, the éclat and the vignette, in the order Effects makes them. */
function effects(): {
  effects: Effects;
  dim: FakeObject;
  halo: FakeObject;
  eclat: FakeObject;
  vignette: FakeObject;
} {
  const made: FakeObject[] = [];
  const make = () => {
    const object = new FakeObject();
    made.push(object);
    return object;
  };
  const texture = {
    setFilter: vi.fn(),
    refresh: vi.fn(),
    context: {
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
    },
  };
  const scene = {
    add: { rectangle: make, image: make },
    textures: { exists: () => false, createCanvas: () => texture },
  } as unknown as Phaser.Scene;
  const fx = new Effects(scene, { stageWidth: 640, shake: 1 });
  const [dim, halo, eclat, vignette] = made;
  if (!dim || !halo || !eclat || !vignette) throw new Error('Missing layers');
  return { effects: fx, dim, halo, eclat, vignette };
}

const CYAN = 0x30e8ff;
const MAGENTA = 0xff3ca0;

describe('the veils over the fight (docs/flashs.md §2)', () => {
  it('places the dark and the glows behind the fighters, the vignette under the HUD', () => {
    const { dim, halo, eclat, vignette } = effects();
    expect(dim.depth).toBe(DEPTH.dim);
    expect(halo.depth).toBe(DEPTH.backdrop);
    expect(eclat.depth).toBe(DEPTH.backdrop);
    expect(DEPTH.backdrop).toBeLessThan(DEPTH.trail);
    expect(vignette.scrollFactor).toBe(0);
    expect(vignette.depth).toBeLessThan(10);
    for (const layer of [dim, halo, eclat, vignette]) expect(layer.visible).toBe(false);
  });

  it('shows a veil from its first frame, then hides it once over', () => {
    const { effects: fx, dim, halo } = effects();
    const look = superDim(FIGHT_STAGE_COLORS);
    fx.veil(look);
    fx.veil(superHalo(FIGHT_STAGE_COLORS), { x: 120, y: 190 });
    fx.update();
    expect(dim.visible).toBe(true);
    expect(dim.fill).toBe(look.color);
    expect(dim.alpha).toBeGreaterThan(0);
    expect(dim.alpha).toBeLessThan(look.alpha);
    expect([halo.x, halo.y]).toEqual([120, 190]);
    for (let frame = 1; frame <= veilLife(look); frame++) fx.update();
    expect(dim.visible).toBe(false);
  });

  it('never follows a colored veil with one of another color within a second', () => {
    const { effects: fx, eclat, vignette } = effects();
    const cyan = koVeil('finisher', CYAN, FIGHT_STAGE_COLORS);
    const magenta = koVeil('combo', MAGENTA, FIGHT_STAGE_COLORS);
    if (!cyan || !magenta) throw new Error('Missing veils');
    fx.veil(cyan, { x: 0, y: 0 });
    fx.veil(magenta);
    fx.update();
    expect(eclat.visible).toBe(true);
    expect(vignette.visible).toBe(false);
    // The same color again is no alternation; another one, a second later, is welcome.
    const cyanVignette = koVeil('combo', CYAN, FIGHT_STAGE_COLORS);
    if (!cyanVignette) throw new Error('Missing veil');
    fx.veil(cyanVignette);
    fx.update();
    expect(vignette.visible).toBe(true);
    expect(vignette.tint).toBe(CYAN);
    for (let frame = 0; frame < COLOR_GAP; frame++) fx.update();
    fx.veil(magenta);
    fx.update();
    expect(vignette.visible).toBe(true);
    expect(vignette.tint).toBe(MAGENTA);
  });
});
