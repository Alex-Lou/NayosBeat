import { describe, expect, it, vi } from 'vitest';
import type { FlashBudget } from '../../src/render/flash-budget';
import { hitStyleOf } from '../../src/render/hit-styles';
import { LIVE_LIGHTS, LightShow } from '../../src/render/light-show';
import {
  CALM_LIVE_DELTA,
  DIM_TIMING,
  FIGHTER_LIFT,
  glowAlpha,
  LIVE_DELTA,
  peakFalloff,
  SUPER_DIM,
  Z_RATIO,
} from '../../src/render/live-lights';
import type { Light } from '../../src/render/move-lights';
import { PLATINE } from '../../src/render/signatures';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { fake, recordedLiveScene, type Fake } from './live-fakes';

vi.mock('phaser', () => ({ default: { TintModes: { MULTIPLY: 0, FILL: 1 } } }));

const CYAN = hitStyleOf('nayo').energy;
const GROUND = 230;
const AREAS = [400, 490] as const;

function source(fields: Partial<Light> = {}): Light {
  return {
    x: 300,
    height: 44,
    color: CYAN,
    strength: 1,
    by: 0,
    source: 'move',
    radius: 120,
    ...fields,
  };
}

/** A show on a faked scene, its budget granting `grant` (or a function), two fighters' bodies. */
function show(grant: boolean | (() => boolean) = true) {
  const live = recordedLiveScene();
  const admit = vi.fn(typeof grant === 'function' ? grant : () => grant);
  const budget = { mode: 'normal', admit } as unknown as FlashBudget;
  const lights = new LightShow(live.scene, {
    stage: FIGHT_STAGE_COLORS,
    colors: [CYAN, PLATINE],
    budget,
    fighterAreas: AREAS,
    groundY: GROUND,
  });
  const bodies = [fake(), fake()];
  lights.lightFighters(bodies as never);
  return { live, lights, bodies, admit };
}

/** The opacity a glow shows at its heart (Phaser's PointLight takes it over 255). */
const opacity = (glow: Fake) => glow.intensity * 255;
/** The lift a Phaser light gives a fighter at its heart. */
const lift = (light: Fake) => light.intensity * peakFalloff(light.radius, light.radius * Z_RATIO);

describe('the live lights (docs/art/nayo-vivante.md §2)', () => {
  it('makes nothing while off (the adaptive quality, Canvas), and leaves the fighters unlit', () => {
    const { live, lights, bodies } = show();
    lights.update([source()], 1, 1, false);
    expect(live.lights).toHaveLength(0);
    expect(live.glows).toHaveLength(0);
    expect(bodies.every((body) => !body.lighting)).toBe(true);
  });

  it('makes its lights once on, hidden, the fighters lit from the start (the shader ready)', () => {
    const { live, lights, bodies } = show();
    lights.setTier('full');
    expect(live.lights).toHaveLength(LIVE_LIGHTS);
    expect(live.glows).toHaveLength(LIVE_LIGHTS);
    expect([...live.lights, ...live.glows].every((each) => !each.visible)).toBe(true);
    expect(bodies.every((body) => body.lighting)).toBe(true);
    expect(live.manager.active).toBe(true);
  });

  it('lights the street where the source is, as bright as its color may, alone', () => {
    const { live, lights } = show();
    lights.setTier('full');
    lights.update([source({ strength: 0.5 })], 1, 1, false);
    const [glow] = live.glows;
    expect(glow?.visible).toBe(true);
    expect([glow?.x, glow?.y]).toEqual([300, GROUND - 44]);
    expect(opacity(glow as Fake)).toBeCloseTo(
      0.5 * glowAlpha(CYAN, FIGHT_STAGE_COLORS, LIVE_DELTA),
    );
  });

  it('asks the budget once as it comes on, for both fighters, and lights them granted', () => {
    const { live, lights, admit } = show(true);
    lights.setTier('full');
    for (let frame = 0; frame < 10; frame++) lights.update([source()], 1, 1, false);
    expect(admit).toHaveBeenCalledTimes(1);
    expect(admit).toHaveBeenCalledWith(AREAS[0] + AREAS[1]);
    const [light] = live.lights;
    expect(light?.visible).toBe(true);
    expect(lift(light as Fake)).toBeCloseTo(FIGHTER_LIFT);
  });

  it('refused, leaves the fighters as they are for its whole life, the street still lit', () => {
    let grant = false;
    const { live, lights } = show(() => grant);
    lights.setTier('full');
    lights.update([source()], 1, 1, false);
    grant = true;
    for (let frame = 0; frame < 10; frame++) lights.update([source()], 1, 1, false);
    expect(live.lights.some((light) => light.visible)).toBe(false);
    expect(live.glows[0]?.visible).toBe(true);
    // Out, then on again: a new source, a new decision.
    lights.update([], 0, 1, false);
    lights.update([source()], 1, 1, false);
    expect(live.lights[0]?.visible).toBe(true);
  });

  it('calm, asks nothing, never lights the fighters, the street fainter', () => {
    const { live, lights, admit } = show(true);
    lights.setTier('full');
    lights.calm = true;
    lights.update([source()], 1, 1, false);
    expect(admit).not.toHaveBeenCalled();
    expect(live.lights.some((light) => light.visible)).toBe(false);
    expect(opacity(live.glows[0] as Fake)).toBeCloseTo(
      glowAlpha(CYAN, FIGHT_STAGE_COLORS, CALM_LIVE_DELTA),
    );
  });

  it('lets a move and its disc share a decision, a flare its own', () => {
    const { lights, admit } = show(true);
    lights.setTier('full');
    lights.update([source()], 1, 1, false);
    lights.update([source(), source({ source: 'disc', x: 340 })], 2, 1, false);
    expect(admit).toHaveBeenCalledTimes(1);
    lights.update([source({ source: 'disc' }), source({ source: 'flare' })], 2, 1, false);
    expect(admit).toHaveBeenCalledTimes(2);
  });

  it('never lifts the fighters past FIGHTER_LIFT where lights overlap, nor the street past its bound', () => {
    const { live, lights } = show(true);
    lights.setTier('full');
    const sources = [
      source(),
      source({ source: 'disc', x: 310 }),
      source({ by: 1, x: 320 }),
      source({ by: 1, source: 'flare', x: 305, color: PLATINE }),
    ];
    lights.update(sources, sources.length, 1, false);
    const lifted = live.lights
      .filter((light) => light.visible)
      .reduce((sum, light) => sum + lift(light), 0);
    expect(lifted).toBeLessThanOrEqual(FIGHTER_LIFT + 1e-9);
    const glows = live.glows.filter((glow) => glow.visible);
    expect(glows).toHaveLength(4);
    const alone = glowAlpha(CYAN, FIGHT_STAGE_COLORS, LIVE_DELTA);
    expect(Math.max(...glows.map(opacity))).toBeLessThan(alone);
  });

  it("shows nothing in the Finisher's scene", () => {
    const { live, lights, admit } = show(true);
    lights.setTier('full');
    lights.update([source()], 1, 1, true);
    expect([...live.lights, ...live.glows].some((each) => each.visible)).toBe(false);
    expect(admit).not.toHaveBeenCalled();
  });
});

describe("the super's dim (docs/art/nayo-vivante.md §2)", () => {
  const stageOf = () => ({
    layer: fake({
      texture: { key: 'stage/x/mid', getSourceImage: () => ({ width: 2, height: 1 }) },
    }),
    prop: fake({ depth: 0 }),
  });

  it('dims the whole stage, held while the super lights, then back; the fighters never tinted', () => {
    const { lights, bodies } = show(true);
    const { layer, prop } = stageOf();
    lights.lightStage([layer] as never, [prop] as never);
    lights.setTier('full');
    lights.react({ type: 'freeze', by: 0, x: 0, y: 0, toward: 1 } as never);
    for (let frame = 0; frame < 60; frame++) lights.update([source({ radius: 200 })], 1, 1, false);
    const gray = Math.round(255 * SUPER_DIM) * 0x010101;
    expect(layer.tint).toBe(gray);
    expect(prop.tint).toBe(gray);
    for (let frame = 0; frame < DIM_TIMING.hold + DIM_TIMING.release + 2; frame++) {
      lights.update([], 0, 1, false);
    }
    expect(layer.tint).toBeNull();
    expect(prop.tint).toBeNull();
    expect(bodies.every((body) => body.tint === null)).toBe(true);
  });

  it('lights no fighter granted while the stage is dimmed: their light needs no dim', () => {
    const { live, lights } = show(true);
    lights.setTier('full');
    lights.react({ type: 'freeze', by: 0, x: 0, y: 0, toward: 1 } as never);
    lights.update([source()], 1, 1, false);
    // The glow, under the dim, may shine brighter: the street relit around the fist.
    expect(opacity(live.glows[0] as Fake)).toBeGreaterThan(
      glowAlpha(CYAN, FIGHT_STAGE_COLORS, LIVE_DELTA),
    );
  });
});

describe('the stage that lights itself, over the glows', () => {
  /** A layer of 2 px: a dark wall, and a lit window (bright, warm). */
  const layer = () =>
    fake({
      depth: 0,
      texture: {
        key: 'stage/x/mid',
        getSourceImage: () => ({
          width: 2,
          height: 1,
          pixels: new Uint8ClampedArray([0x21, 0x1c, 0x37, 255, 0xf0, 0xc0, 0x70, 255]),
        }),
      },
    });

  it('draws its windows again over the glows only while one shows; its props raised then', () => {
    const { live, lights } = show(true);
    const image = layer();
    const prop = fake({ depth: 0 });
    const made: Fake[] = [];
    const add = live.scene.add as unknown as { image: () => Fake };
    add.image = () => {
      const emitters = fake({ visible: false });
      made.push(emitters);
      return emitters;
    };
    lights.lightStage([image] as never, [prop] as never);
    lights.setTier('full');
    expect(made).toHaveLength(1);
    expect(live.textures.has('stage/x/mid#emitters')).toBe(true);
    lights.update([source()], 1, 1, false);
    expect(made[0]?.visible).toBe(true);
    expect(prop.depth).toBeGreaterThan(0);
    lights.update([], 0, 1, false);
    expect(made[0]?.visible).toBe(false);
    expect(prop.depth).toBe(0);
  });

  it('frees everything it made: its lights, glows, textures, the culling it replaced', () => {
    const { live, lights, bodies } = show(true);
    const made: Fake[] = [];
    (live.scene.add as unknown as { image: () => Fake }).image = () => {
      const emitters = fake();
      made.push(emitters);
      return emitters;
    };
    lights.lightStage([layer()] as never, [] as never);
    lights.setTier('full');
    expect(Object.hasOwn(live.manager, 'getLights')).toBe(true);
    lights.update([source()], 1, 1, false);
    const glows = [...live.glows];
    lights.dispose();
    expect(live.manager.removed).toHaveLength(LIVE_LIGHTS);
    expect(live.lights).toHaveLength(0);
    expect(glows.every((glow) => glow.destroyed)).toBe(true);
    expect(made.every((emitters) => emitters.destroyed)).toBe(true);
    expect(live.textures.size).toBe(0);
    expect(live.manager.active).toBe(false);
    expect(Object.hasOwn(live.manager, 'getLights')).toBe(false);
    expect(bodies.every((body) => !body.lighting)).toBe(true);
  });
});
