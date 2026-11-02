import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { toPx } from '../../src/core/constants';
import { FlashBudget } from '../../src/render/flash-budget';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import type { Cast } from '../../src/render/move-lights';
import { SHADOW_SHIFT, SpriteFighterView } from '../../src/render/sprite-fighter-view';
import { facingOff, MIRROR_MATCH } from '../core/helpers';

vi.mock('phaser', () => ({
  default: { TintModes: { MULTIPLY: 0, FILL: 1 }, BlendModes: { NORMAL: 0, ADD: 1 } },
}));
// What a fighter draws besides its body and the outlines around it: not looked at here.
vi.mock('../../src/render/dash-trail', () => ({
  DashTrail: class {
    calm = false;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/boost-echo', () => ({
  BoostEcho: class {
    calm = false;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/fx-dissolve', () => ({
  FxDissolve: class {
    still = false;
    follow = vi.fn();
  },
}));
vi.mock('../../src/render/fx-pixels', () => ({
  FxPixels: class {
    lightsAnew = () => 0;
  },
}));

const FILL = 1;

/** An engine sprite: what it shows, where, and how. */
class FakeSprite {
  visible = true;
  alpha = 1;
  x = 0;
  y = 0;
  flipX = false;
  key = '';
  frame = 0;
  origin = { x: 0, y: 0 };
  tint = 0xffffff;
  tintMode = 0;
  depth = 0;
  setScale(): this {
    return this;
  }
  setOrigin(x: number, y: number): this {
    this.origin = { x, y };
    return this;
  }
  setTexture(key: string, frame: number): this {
    this.key = key;
    this.frame = frame;
    return this;
  }
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  setFlipX(flip: boolean): this {
    this.flipX = flip;
    return this;
  }
  setAlpha(alpha: number): this {
    this.alpha = alpha;
    return this;
  }
  setDepth(depth: number): this {
    this.depth = depth;
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
  clearTint(): this {
    this.tint = 0xffffff;
    return this;
  }
  setTintMode(mode: number): this {
    this.tintMode = mode;
    return this;
  }
  blend = 0;
  setBlendMode(blend: number): this {
    this.blend = blend;
    return this;
  }
}

/** The shadow's layers and the Finisher's halo: where they stand and how they are scaled. */
interface FakeEllipse {
  visible: boolean;
  x: number;
  scaleX: number;
  scaleY: number;
}
const ellipses: FakeEllipse[] = [];
const ellipse = () => {
  const shape = {
    visible: false,
    x: 0,
    scaleX: 1,
    scaleY: 1,
    setVisible(visible: boolean) {
      shape.visible = visible;
      return shape;
    },
    setPosition(x: number) {
      shape.x = x;
      return shape;
    },
    setScale(x: number, y = x) {
      shape.scaleX = x;
      shape.scaleY = y;
      return shape;
    },
  };
  ellipses.push(shape);
  return shape;
};

/** Nayo drawn as player 1, the moves' lights on (`lit`), the sprites and shadow it made. */
function lit(on = true) {
  ellipses.length = 0;
  const sprites: FakeSprite[] = [];
  const scene = {
    add: {
      sprite: (_x: number, _y: number, key: string, frame: number) => {
        const sprite = new FakeSprite().setTexture(key, frame);
        sprites.push(sprite);
        return sprite;
      },
      ellipse,
    },
  } as unknown as Phaser.Scene;
  const view = new SpriteFighterView(scene, NAYO, 0, 230, 0x30e8ff, MIRROR_MATCH, {
    dissolve: 'rise',
    stage: GREYBOX_COLORS,
    budget: new FlashBudget('normal'),
    mode: 'full',
    contour: null,
    lit: on,
  });
  // The Finisher's halo first, then the two layers of the shadow.
  const shadow = ellipses.slice(1);
  return { view, sprites, shadow };
}

describe('the shadow and the glow the moves cast on a fighter (docs/art/nayo-vfx.md §2)', () => {
  const state = facingOff(60, MIRROR_MATCH);
  const feet = toPx(state.fighters[0].x);

  it('leans its shadow away from the light: shifted that way, stretched wider', () => {
    const { view, shadow } = lit();
    view.update(state);
    for (const layer of shadow) expect(layer).toMatchObject({ x: feet, scaleX: 1, scaleY: 1 });
    const cast: Cast = { lean: 1, glowColor: 0, glow: 0 };
    view.light(cast);
    view.update(state);
    for (const layer of shadow) {
      expect(layer.x).toBe(feet + SHADOW_SHIFT);
      expect(layer.scaleX).toBeGreaterThan(1.5);
      expect(layer.scaleY).toBe(1);
    }
    cast.lean = -0.5;
    view.update(state);
    for (const layer of shadow) expect(layer.x).toBe(feet - SHADOW_SHIFT / 2);
  });

  it("glows in the other fighter's light: its body filled with it, added, as strong as cast", () => {
    const { view, sprites } = lit();
    const [body] = sprites;
    const glow = sprites.find((sprite) => sprite.blend === 1);
    if (!glow || !body) throw new Error('No glow');
    view.light({ lean: 0, glowColor: 0xf2f6ff, glow: 0.12 });
    view.update(state);
    expect(glow).toMatchObject({
      visible: true,
      alpha: 0.12,
      tint: 0xf2f6ff,
      tintMode: FILL,
      key: body.key,
      frame: body.frame,
      x: body.x,
      y: body.y,
    });
    expect(glow.depth).toBeGreaterThan(body.depth);
    view.light({ lean: 0, glowColor: 0, glow: 0 });
    view.update(state);
    expect(glow.visible).toBe(false);
  });

  it('makes no glow at all without the lights, and its shadow stays under it', () => {
    const { view, sprites, shadow } = lit(false);
    expect(sprites.some((sprite) => sprite.blend === 1)).toBe(false);
    view.update(state);
    for (const layer of shadow) expect(layer.x).toBe(feet);
  });
});
