import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { AnchoredSprite } from '../../src/render/anchored-sprite';
import { BoostEcho } from '../../src/render/boost-echo';
import { DashTrail } from '../../src/render/dash-trail';
import { FinisherCard, type CardLook } from '../../src/render/finisher-card';
import { scriptOf } from '../../src/render/finisher-scripts';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import {
  isContextLost,
  renderModeOf,
  rendererTypeFromUrl,
  type RenderMode,
} from '../../src/render/render-mode';
import { FX_DARK } from '../../src/render/veils';
import { fakeStage, type FakeObject } from './finisher-fakes';

vi.mock('phaser', () => ({
  default: { AUTO: 0, CANVAS: 1, WEBGL: 2, TintModes: { MULTIPLY: 0, FILL: 1 } },
}));

/**
 * What the game draws by Canvas, without tints (docs/qualite-adaptative.md §2.3): the veils are
 * tested in effects.test.ts, the ghosts in fx-dissolve.test.ts, the sparks in flash-areas.test.ts.
 */

describe('the render mode, read once from the renderer', () => {
  it('is simple by Canvas, full by WebGL', () => {
    expect(renderModeOf({ type: 1 })).toBe('simple');
    expect(renderModeOf({ type: 2 })).toBe('full');
  });

  it('asks Phaser for Canvas with ?rendu=canvas, else for the best it has', () => {
    expect(rendererTypeFromUrl('?rendu=canvas')).toBe(1);
    expect(rendererTypeFromUrl('?debug&rendu=canvas')).toBe(1);
    expect(rendererTypeFromUrl('')).toBe(0);
    expect(rendererTypeFromUrl('?rendu=webgl')).toBe(0);
  });

  it('knows the picture is lost from the context at once, until Phaser has rebuilt it', () => {
    const webgl = (contextLost: boolean, lost: boolean) =>
      ({ contextLost, gl: { isContextLost: () => lost } }) as unknown as Parameters<
        typeof isContextLost
      >[0];
    // Lost, its event not yet dispatched to Phaser.
    expect(isContextLost(webgl(false, true))).toBe(true);
    expect(isContextLost(webgl(true, true))).toBe(true);
    // Restored, Phaser still rebuilding.
    expect(isContextLost(webgl(true, false))).toBe(true);
    expect(isContextLost(webgl(false, false))).toBe(false);
    // The Canvas renderer has no GPU context to lose.
    expect(isContextLost({} as Parameters<typeof isContextLost>[0])).toBe(false);
  });
});

/** An engine sprite standing in for the real one: whether it shows, and how it is tinted. */
class FakeSprite {
  visible = true;
  tint = 0xffffff;
  /** Phaser's TintModes: 0 multiplies, 1 fills. */
  tintMode = 0;
  setScale(): this {
    return this;
  }
  setOrigin(): this {
    return this;
  }
  setTexture(): this {
    return this;
  }
  setPosition(): this {
    return this;
  }
  setFlipX(): this {
    return this;
  }
  setAlpha(): this {
    return this;
  }
  setDepth(): this {
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
}

/** A scene that keeps every sprite made. */
function spriteScene(): { scene: Phaser.Scene; sprites: FakeSprite[] } {
  const sprites: FakeSprite[] = [];
  const scene = {
    add: {
      sprite: () => {
        const sprite = new FakeSprite();
        sprites.push(sprite);
        return sprite;
      },
    },
  } as unknown as Phaser.Scene;
  return { scene, sprites };
}

const SHEET = NAYO.clips.idle.sheet;
const CYAN = 0x30e8ff;

describe('the sprites drawn without tints', () => {
  it('shows front effects dark with WebGL, hides them while dark by Canvas', () => {
    const shown = (mode: RenderMode, dark: boolean) => {
      const { scene, sprites } = spriteScene();
      const sprite = new AnchoredSprite(scene, NAYO, 'body', mode);
      sprite.dark(dark).show(SHEET, 0, 10, 20, false);
      return sprites[0];
    };
    expect(shown('full', true)).toMatchObject({ visible: true, tint: FX_DARK });
    expect(shown('simple', true)?.visible).toBe(false);
    expect(shown('simple', false)).toMatchObject({ visible: true, tint: 0xffffff });
    // Lit again, they show again.
    const { scene, sprites } = spriteScene();
    const sprite = new AnchoredSprite(scene, NAYO, 'body', 'simple');
    sprite.dark(true).show(SHEET, 0, 10, 20, false);
    sprite.dark(false).show(SHEET, 1, 10, 20, false);
    expect(sprites[0]?.visible).toBe(true);
  });

  it('never shows a flat silhouette by Canvas: it would be the fighter in its colors', () => {
    const full = spriteScene();
    new AnchoredSprite(full.scene, NAYO, 'body', 'full').fill(CYAN).show(SHEET, 0, 0, 0, false);
    expect(full.sprites[0]).toMatchObject({ visible: true, tint: CYAN, tintMode: 1 });
    const simple = spriteScene();
    new AnchoredSprite(simple.scene, NAYO, 'body', 'simple').fill(CYAN).show(SHEET, 0, 0, 0, false);
    expect(simple.sprites[0]).toMatchObject({ visible: false, tint: 0xffffff });
  });

  /** Every sprite of the Boost's echoes and of a dash's afterimages ever shown, 12 ticks long. */
  function afterimages(mode: RenderMode): number {
    const { scene, sprites } = spriteScene();
    const echo = new BoostEcho(scene, NAYO, mode);
    const trail = new DashTrail(scene, NAYO, CYAN, GREYBOX_COLORS, mode);
    let shown = 0;
    for (let clock = 0; clock < 12; clock++) {
      echo.update(clock, true, SHEET, 0, clock, 0, false);
      trail.update(clock, true, SHEET, 0, clock, 0, false);
      shown += sprites.filter((sprite) => sprite.visible).length;
    }
    return shown;
  }

  it('leaves no echo of the Boost and no afterimage of a dash by Canvas', () => {
    expect(afterimages('full')).toBeGreaterThan(0);
    expect(afterimages('simple')).toBe(0);
  });
});

describe("the Finisher's card drawn without tints", () => {
  /** Whether each fighter's card shows once in, in `look`. */
  function shows(mode: RenderMode, look: CardLook): boolean[] {
    return (['nayo', 'riff'] as const).map((fighter) => {
      const { scene, made } = fakeStage();
      const card = new FinisherCard(scene, scriptOf(fighter).card, CYAN, 0x202020, mode);
      card.prepare(fighter === 'nayo' ? 'riff' : 'nayo', look);
      card.update({ shown: true, entered: 1, alpha: 1 }, 100, 100, false, 10);
      return (made.containers[0] as FakeObject).visible;
    });
  }

  it('hides a dark card by Canvas: its letters would stay lit', () => {
    expect(shows('simple', 'dark')).toEqual([false, false]);
    expect(shows('simple', 'lit')).toEqual([true, true]);
    expect(shows('simple', 'fade')).toEqual([true, true]);
  });

  it('shows it dark with WebGL', () => {
    expect(shows('full', 'dark')).toEqual([true, true]);
  });
});
