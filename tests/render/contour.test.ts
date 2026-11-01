import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { toPx } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { ANIM_OPTIONS } from '../../src/render/anim-options';
import { showFighter, type Shown } from '../../src/render/animation';
import { detectEvents, type FightEvent } from '../../src/render/fight-events';
import { FightMemory } from '../../src/render/fight-memory';
import { UNSTAGED, type StagedLook } from '../../src/render/finisher-scripts';
import { FlashBudget } from '../../src/render/flash-budget';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import type { RenderMode } from '../../src/render/render-mode';
import { SpriteFighterView } from '../../src/render/sprite-fighter-view';
import { facingOff, MIRROR_MATCH, repeat } from '../core/helpers';

vi.mock('phaser', () => ({
  default: { TintModes: { MULTIPLY: 0, FILL: 1 } },
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
const CONTOUR = 0x4d85ac;

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
}

/** The shadow and the Finisher's halo: never looked at here. */
const ellipse = () => ({
  visible: false,
  setVisible() {
    return this;
  },
  setPosition() {
    return this;
  },
  setScale() {
    return this;
  },
});

interface Drawn {
  readonly view: SpriteFighterView;
  /** The body: the first sprite a fighter makes (its afterimages are not made here). */
  readonly body: FakeSprite;
  /** Its contour: the body filled flat in the contour's color. */
  readonly contour: readonly FakeSprite[];
  readonly sprites: readonly FakeSprite[];
}

function drawn(player: 0 | 1, contour: number | null, mode: RenderMode = 'full'): Drawn {
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
  const view = new SpriteFighterView(scene, NAYO, player, 230, 0x30e8ff, MIRROR_MATCH, {
    dissolve: 'rise',
    stage: GREYBOX_COLORS,
    budget: new FlashBudget('normal'),
    mode,
    contour,
  });
  const [body] = sprites;
  if (!body) throw new Error('No body');
  return {
    view,
    body,
    contour: sprites.filter((sprite) => sprite.tintMode === FILL && sprite.tint === contour),
    sprites,
  };
}

/** Where each contour sprite stands from the body, and whether it shows its very pixels. */
function offsets(body: FakeSprite, contour: readonly FakeSprite[]): string[] {
  return contour.map((sprite) => {
    expect(sprite).toMatchObject({
      key: body.key,
      frame: body.frame,
      flipX: body.flipX,
      origin: body.origin,
    });
    return `${sprite.x - body.x},${sprite.y - body.y}`;
  });
}
const AROUND = ['1,0', '-1,0', '0,1', '0,-1'];

/** A jab that lands, then the victim reeling: frames change, the victim trembles. */
function jab(visit: (state: GameState, memory: FightMemory) => void): void {
  const memory = new FightMemory();
  const events: FightEvent[] = [];
  let state = facingOff(30, MIRROR_MATCH);
  for (const inputs of [[Input.Light, 0], ...repeat<[number, number]>([0, 0], 24)] as const) {
    const next = step(state, inputs, MIRROR_MATCH);
    detectEvents(state, next, MIRROR_MATCH, events);
    memory.note(next, events);
    state = next;
    visit(state, memory);
  }
}

describe('the contour around a fighter (option A, silhouette.ts)', () => {
  it('draws the body four more times at most: 8 sprites more for both fighters', () => {
    const plain = drawn(0, null).sprites.length;
    const outlined = drawn(0, CONTOUR);
    expect(outlined.sprites.length - plain).toBe(4);
    expect(outlined.contour).toHaveLength(4);
    // Behind the body, whether in front of the other fighter or not.
    for (const front of [true, false]) {
      outlined.view.setFront(front);
      for (const sprite of outlined.contour) {
        expect(sprite.depth).toBeLessThan(outlined.body.depth);
        expect(sprite.depth).toBeGreaterThan(outlined.body.depth - 0.5);
      }
    }
  });

  it('stays on the pixels of the body every tick: its frame, its side, its tremble', () => {
    for (const player of [0, 1] as const) {
      const { view, body, contour } = drawn(player, CONTOUR);
      const shown: Shown = { clip: 'idle', tick: 0, x: 0 };
      const frames = new Set<string>();
      let trembled = false;
      jab((state, memory) => {
        view.update(state, 1, 'off', { options: ANIM_OPTIONS, memory });
        expect(offsets(body, contour)).toEqual(AROUND);
        expect(contour.every((sprite) => sprite.visible && sprite.alpha === 1)).toBe(true);
        expect(body.flipX).toBe(player === 1);
        frames.add(`${body.key}#${body.frame}`);
        showFighter(state, player, MIRROR_MATCH, NAYO, shown);
        if (body.x !== toPx(shown.x)) trembled = true;
      });
      // The jab's frames and the victim's reaction were followed, the victim's tremble too.
      expect(frames.size).toBeGreaterThan(3);
      expect(trembled).toBe(player === 1);
    }
  });

  it('gives way to the Finisher’s silhouette as it comes, and comes back as it leaves', () => {
    const { view, body, contour } = drawn(0, CONTOUR);
    const state = facingOff(60, MIRROR_MATCH);
    const look = (silhouette: number): StagedLook => ({
      pose: { clip: 'idle', tick: 3, lift: 12 },
      silhouette,
      outline: 0x30e8ff,
    });
    view.update(state, 1, 'off', undefined, look(0.5));
    // Lifted with the pose the scene imposes, half faded.
    expect(offsets(body, contour)).toEqual(AROUND);
    expect(body.y).toBe(230 - 12);
    expect(contour.every((sprite) => sprite.visible && sprite.alpha === 0.5)).toBe(true);
    view.update(state, 1, 'off', undefined, look(1));
    expect(contour.some((sprite) => sprite.visible)).toBe(false);
    view.update(state, 1, 'off', undefined, UNSTAGED);
    expect(offsets(body, contour)).toEqual(AROUND);
    expect(contour.every((sprite) => sprite.visible && sprite.alpha === 1)).toBe(true);
  });

  it('is not drawn by Canvas, which cannot fill a silhouette (render-mode.ts)', () => {
    const shown = (contour: number | null, mode: RenderMode) => {
      const { view, sprites } = drawn(0, contour, mode);
      view.update(facingOff(60, MIRROR_MATCH));
      return sprites.filter((sprite) => sprite.visible).length;
    };
    expect(shown(CONTOUR, 'full')).toBe(shown(null, 'full') + 4);
    expect(shown(CONTOUR, 'simple')).toBe(shown(null, 'simple'));
  });
});
