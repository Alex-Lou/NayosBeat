import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import type { FighterArt } from '../../src/art/types';
import type { MatchConfig } from '../../src/core/config';
import { px, toPx } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import type { FightEvent } from '../../src/render/fight-events';
import { FxRandom } from '../../src/render/fx-random';
import { hitStyleOf } from '../../src/render/hit-styles';
import { LightRig, POOL_FLATNESS } from '../../src/render/light-rig';
import {
  addAlphaFor,
  addedDelta,
  brightestBackdrop,
  relativeLuminance,
} from '../../src/render/luminance';
import { MoveEcho } from '../../src/render/move-echo';
import {
  castOn,
  collectLights,
  lightPool,
  poolScale,
  type Cast,
  type Light,
  type Pool,
} from '../../src/render/move-lights';
import { PLATINE, signatureOf } from '../../src/render/signatures';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { CALM_DELTA, glowProfile, VEIL_DELTA } from '../../src/render/veils';
import { playCombo } from '../core/combo-helpers';
import { facingOff } from '../core/helpers';

/** The afterimages' sprites: what MoveEcho sets on them. */
const sprites = vi.hoisted(
  () =>
    [] as {
      alpha: number;
      visible: boolean;
      x: number;
      fill: number;
      added: boolean;
    }[],
);
vi.mock('../../src/render/anchored-sprite', () => ({
  AnchoredSprite: class {
    private readonly state = { alpha: 1, visible: false, x: 0, fill: -1, added: false };
    constructor() {
      sprites.push(this.state);
    }
    setDepth() {
      return this;
    }
    fill(color: number) {
      this.state.fill = color;
      return this;
    }
    added() {
      this.state.added = true;
      return this;
    }
    hide() {
      this.state.visible = false;
    }
    show(_sheet: string, _frame: number, x: number) {
      this.state.visible = true;
      this.state.x = x;
    }
    setAlpha(alpha: number) {
      this.state.alpha = alpha;
      return this;
    }
  },
}));
vi.mock('phaser', () => ({
  default: {
    BlendModes: { NORMAL: 0, ADD: 1 },
    TintModes: { MULTIPLY: 0, FILL: 1 },
    Textures: { FilterMode: { LINEAR: 0 } },
  },
}));

const { Special: S, Down: D, Heavy: H, Light: L } = Input;
const NR: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const RN: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };
const CYAN = hitStyleOf('nayo').energy;
const MAGENTA = hitStyleOf('riff').energy;
const NAYO_RIFF = [signatureOf('nayo'), signatureOf('riff')] as const;
const RIFF_NAYO = [signatureOf('riff'), signatureOf('nayo')] as const;

function route(config: MatchConfig, distance: number, steps: InputBits[]) {
  return playCombo(facingOff(distance, config), config, steps).states;
}

describe('the lights of the moves (docs/art/nayo-vfx.md §2)', () => {
  it("lights Nayo's Uppercut from its start, rising with the fist, and puts it out", () => {
    const lights = lightPool();
    const lit: number[] = [];
    const heights: number[] = [];
    for (const state of route(NR, 30, [D | S])) {
      const count = collectLights(state, NR, NAYO_RIFF, [CYAN, MAGENTA], lights);
      const light = lights[0];
      lit.push(count > 0 ? (light?.strength ?? 0) : 0);
      if (count > 0 && light) {
        expect(light).toMatchObject({ by: 0, color: CYAN });
        heights.push(light.height);
      }
    }
    expect(Math.max(...lit)).toBe(1);
    expect(lit.at(-1)).toBe(0);
    expect(heights.at(-1)).toBeGreaterThan(heights[0] ?? Infinity);
  });

  it('carries a light with the Vinyle in flight, where the disc is', () => {
    const lights = lightPool();
    let seen = 0;
    for (const state of route(NR, 220, [S])) {
      const count = collectLights(state, NR, NAYO_RIFF, [CYAN, MAGENTA], lights);
      const disc = state.projectiles[0];
      if (!disc) continue;
      seen++;
      const found = lights.slice(0, count).some((light) => light.x === toPx(disc.x));
      expect(found).toBe(true);
    }
    expect(seen).toBeGreaterThan(10);
  });

  it("lights nothing of Riff's: she keeps her look", () => {
    const lights = lightPool();
    for (const steps of [[D | S], [S], [H], [L]]) {
      for (const state of route(RN, 40, steps)) {
        expect(collectLights(state, RN, RIFF_NAYO, [MAGENTA, CYAN], lights)).toBe(0);
      }
    }
  });
});

describe('the shadows and the glows the lights cast', () => {
  const light = (x: number, height: number, by: 0 | 1 = 0, strength = 1): Light => ({
    x,
    height,
    color: CYAN,
    strength,
    by,
  });
  const cast = (): Cast => ({ lean: 0, glowColor: 0, glow: 0 });

  it('leans a shadow away from the light, more the nearer and the lower it is', () => {
    const near = cast();
    castOn(1, 200, 0, [light(170, 10)], 1, near);
    expect(near.lean).toBeGreaterThan(0);
    const left = cast();
    castOn(1, 200, 0, [light(230, 10)], 1, left);
    expect(left.lean).toBeLessThan(0);
    const far = cast();
    castOn(1, 200, 0, [light(60, 10)], 1, far);
    expect(far.lean).toBeLessThan(near.lean);
    const high = cast();
    castOn(1, 200, 0, [light(170, 150)], 1, high);
    expect(high.lean).toBeLessThan(near.lean);
  });

  it("glows on a fighter near the other one's light only, in its color", () => {
    const other = cast();
    castOn(1, 200, 0, [light(185, 40, 0)], 1, other);
    expect(other).toMatchObject({ glowColor: CYAN });
    expect(other.glow).toBeGreaterThan(0.5);
    const own = cast();
    castOn(0, 200, 0, [light(185, 40, 0)], 1, own);
    expect(own.glow).toBe(0);
    // Its own still leans its shadow.
    expect(own.lean).not.toBe(0);
  });
});

describe('the pools of light on the floor never flash (docs/flashs.md §1.2)', () => {
  const backdrop = brightestBackdrop(FIGHT_STAGE_COLORS);
  /** The pools as the glow texture draws them, added, at their most over the brightest backdrop. */
  function peakDelta(pools: readonly Pool[], alpha: (pool: Pool) => number): number {
    let peak = 0;
    for (let x = 0; x < 640; x += 1) {
      for (let y = -12; y <= 12; y += 1) {
        let red = (backdrop >> 16) & 0xff;
        let green = (backdrop >> 8) & 0xff;
        let blue = backdrop & 0xff;
        for (const pool of pools) {
          const height = pool.width * POOL_FLATNESS;
          const r = Math.hypot((x - pool.x) / (pool.width / 2), y / (height / 2));
          const a = alpha(pool) * glowProfile(r);
          red += ((pool.color >> 16) & 0xff) * a;
          green += ((pool.color >> 8) & 0xff) * a;
          blue += (pool.color & 0xff) * a;
        }
        const color =
          (Math.min(255, Math.round(red)) << 16) |
          (Math.min(255, Math.round(green)) << 8) |
          Math.min(255, Math.round(blue));
        peak = Math.max(peak, relativeLuminance(color) - relativeLuminance(backdrop));
      }
    }
    return peak;
  }

  it('the brightest backdrop is where an added light shows the most', () => {
    for (const color of [CYAN, MAGENTA, PLATINE]) {
      for (const alpha of [0.05, 0.1, 0.2]) {
        for (const stage of FIGHT_STAGE_COLORS) {
          expect(addedDelta(color, stage, alpha)).toBeLessThanOrEqual(
            addedDelta(color, backdrop, alpha) + 1e-9,
          );
        }
      }
    }
  });

  it('keeps pools crowding together under VEIL_DELTA, CALM_DELTA calm', () => {
    const random = new FxRandom(7);
    for (const delta of [VEIL_DELTA, CALM_DELTA]) {
      const full = new Map(
        [CYAN, MAGENTA, PLATINE].map((color) => {
          let low = 0;
          let high = 1;
          for (let i = 0; i < 20; i++) {
            const mid = (low + high) / 2;
            if (addedDelta(color, backdrop, mid) <= delta) low = mid;
            else high = mid;
          }
          return [color, low] as const;
        }),
      );
      for (let round = 0; round < 40; round++) {
        const count = 1 + Math.floor(random.next() * 5);
        const pools: Pool[] = Array.from({ length: count }, () => ({
          x: 260 + random.between(-40, 40),
          width: random.between(56, 110),
          color: [CYAN, MAGENTA, PLATINE][Math.floor(random.next() * 3)] ?? CYAN,
          weight: random.between(0.3, 1),
        }));
        const fullOf = (color: number) => full.get(color) ?? 0;
        const scale = poolScale(pools, count, fullOf, FIGHT_STAGE_COLORS, delta);
        const peak = peakDelta(pools, (pool) => fullOf(pool.color) * pool.weight * scale);
        expect(peak, `round ${round}`).toBeLessThanOrEqual(delta + 0.002);
      }
    }
  });
});

/** A scene whose images and sprites keep how they were last set. */
function fakeScene() {
  const made: Record<string, unknown>[] = [];
  const object = () => {
    const state: Record<string, unknown> = { visible: true, alpha: 1 };
    made.push(state);
    const chain: Record<string, unknown> = {};
    const set =
      (...keys: string[]) =>
      (...values: unknown[]) => {
        keys.forEach((key, i) => (state[key] = values[i]));
        return chain;
      };
    Object.assign(chain, {
      setBlendMode: set('blend'),
      setDepth: set('depth'),
      setVisible: set('visible'),
      setTint: set('tint'),
      setTintMode: set('tintMode'),
      setPosition: set('x', 'y'),
      setDisplaySize: set('width', 'height'),
      setAlpha: set('alpha'),
      setScale: set('scale'),
      setOrigin: set('originX', 'originY'),
      setTexture: set('key', 'frame'),
      setFlipX: set('flip'),
      clearTint: set(),
      get visible() {
        return state.visible;
      },
    });
    return chain;
  };
  const scene = {
    add: { image: object, sprite: object },
    textures: { exists: () => true },
  } as unknown as Phaser.Scene;
  return { scene, made };
}

describe('the light rig', () => {
  const look = (mode: 'full' | 'simple' = 'full') =>
    ({
      groundY: 230,
      signatures: NAYO_RIFF,
      energies: [CYAN, MAGENTA],
      stage: FIGHT_STAGE_COLORS,
      mode,
    }) as const;
  const blow = (by: 0 | 1, heavy: boolean): FightEvent => ({
    type: 'hit',
    heavy,
    x: px(200),
    y: px(50),
    away: 1,
    by,
    low: false,
    damage: 60,
    held: false,
    counter: null,
    tier: 0,
    pulse: false,
    freeze: 10,
    aim: 0,
  });
  const quiet = facingOff(200, NR);

  it("flares a heavy blow of Nayo's at its impact, a moment; not a light one, nor Riff's", () => {
    for (const [event, flares] of [
      [blow(0, true), true],
      [blow(0, false), false],
      [blow(1, true), false],
    ] as const) {
      const { scene, made } = fakeScene();
      const rig = new LightRig(scene, NR, look());
      rig.react(event);
      rig.update(quiet, 1, false);
      const shown = made.filter((image) => image.visible);
      expect(shown.length, JSON.stringify(event)).toBe(flares ? 1 : 0);
      if (flares) expect(shown[0]).toMatchObject({ x: 200, y: 230, tint: CYAN, blend: 1 });
      rig.update(quiet, 30, false);
      rig.update(quiet, 1, false);
      expect(made.filter((image) => image.visible)).toHaveLength(0);
    }
  });

  it('shows no light without tints, nor in the Finisher’s scene: no pool, no lean, no glow', () => {
    const states = route(NR, 30, [D | S]).slice(0, 8);
    for (const [mode, off] of [
      ['simple', false],
      ['full', true],
    ] as const) {
      const { scene, made } = fakeScene();
      const rig = new LightRig(scene, NR, look(mode));
      rig.react(blow(0, true));
      for (const state of states) rig.update(state, 1, off);
      expect(made.filter((image) => image.visible)).toHaveLength(0);
      expect(rig.casts[1]).toMatchObject({ lean: 0, glow: 0 });
    }
    // Lit, the Uppercut leans Riff's shadow and glows on her.
    const { scene } = fakeScene();
    const rig = new LightRig(scene, NR, look());
    for (const state of states) rig.update(state, 1, false);
    expect(rig.casts[1].lean).toBeGreaterThan(0);
    expect(rig.casts[1].glow).toBeGreaterThan(0);
  });

  it('dims the pools and the glow with the flashes calm', () => {
    const states = route(NR, 30, [D | S]).slice(0, 8);
    const brightest = (calm: boolean) => {
      const { scene, made } = fakeScene();
      const rig = new LightRig(scene, NR, look());
      rig.calm = calm;
      for (const state of states) rig.update(state, 1, false);
      const alphas = made.filter((image) => image.visible).map((image) => image.alpha as number);
      return { pool: Math.max(...alphas), glow: rig.casts[1].glow };
    };
    expect(brightest(true).pool).toBeLessThan(brightest(false).pool);
    expect(brightest(true).glow).toBeLessThan(brightest(false).glow);
  });
});

describe("the afterimages of Nayo's specials", () => {
  const spec = { from: 0, to: 12, every: 2, life: 8, tone: 'energy' } as const;

  it('add up to no more than VEIL_DELTA together, the newest the brightest; calm, CALM_DELTA', () => {
    for (const calm of [false, true]) {
      sprites.length = 0;
      const echo = new MoveEcho(
        {} as Phaser.Scene,
        {} as FighterArt,
        CYAN,
        FIGHT_STAGE_COLORS,
        'full',
      );
      echo.calm = calm;
      const total = addAlphaFor(CYAN, FIGHT_STAGE_COLORS, calm ? CALM_DELTA : VEIL_DELTA);
      let shownMost = 0;
      for (let clock = 0; clock < 14; clock++) {
        echo.update(clock, spec, clock, 'idle', 0, clock * 4, 100, false);
        const shown = sprites.filter((sprite) => sprite.visible);
        const sum = shown.reduce((all, sprite) => all + sprite.alpha, 0);
        expect(sum).toBeLessThanOrEqual(total + 1e-9);
        shownMost = Math.max(shownMost, shown.length);
        // The newest, left last, is the brightest.
        const newest = sprites.find(
          (sprite) => sprite.visible && sprite.x === Math.max(...shown.map((each) => each.x)),
        );
        expect(newest?.alpha).toBe(Math.max(...shown.map((sprite) => sprite.alpha)));
      }
      expect(shownMost).toBeGreaterThan(2);
      // Added, in its energy, as a light.
      expect(sprites.every((sprite) => sprite.fill === CYAN && sprite.added)).toBe(true);
      // The move over, they fade out and hide.
      for (let clock = 14; clock < 30; clock++)
        echo.update(clock, null, 0, 'idle', 0, 0, 100, false);
      expect(sprites.some((sprite) => sprite.visible)).toBe(false);
    }
  });
});
