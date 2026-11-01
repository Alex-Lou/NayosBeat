import type Phaser from 'phaser';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { hudComfortOf, type Comfort } from '../../src/app/comfort';
import { NAYO as NAYO_ART, NAYO_ALT } from '../../src/art/nayo';
import { RIFF as RIFF_ART } from '../../src/art/riff';
import { ART_SCALE, clipOf, effectsOf, type FighterArt } from '../../src/art/types';
import type { Sfx } from '../../src/audio/sfx';
import { toPx } from '../../src/core/constants';
import type { GameState } from '../../src/core/state';
import { clipFrameAt, showFighter, type Shown } from '../../src/render/animation';
import { FightFeedback } from '../../src/render/fight-feedback';
import { FinisherProps } from '../../src/render/finisher-props';
import { OUTLINE_AREA, type FinisherScene } from '../../src/render/finisher-scene';
import { NAYO_SCRIPT, RIFF_SCRIPT } from '../../src/render/finisher-scripts';
import {
  FIVE_SECONDS,
  FLASH_MERGE,
  FLASH_RULES,
  FlashBudget,
  FxGate,
  SECOND,
  type FlashMode,
} from '../../src/render/flash-budget';
import { GREYBOX_COLORS, GROUND_Y } from '../../src/render/greybox-stage';
import { hitStyleOf, hudColorOf } from '../../src/render/hit-styles';
import { Hud } from '../../src/render/hud';
import {
  FLASH_DELTA,
  freshPixels,
  luminanceDelta,
  over,
  redRatio,
  SATURATED_RED,
} from '../../src/render/luminance';
import type { TickTally } from '../../src/render/onomatopoeia';
import { koVeil, VEIL_DELTA } from '../../src/render/veils';
import { armed, film, LARSEN, LE_QUATRE, type Route } from './finisher-harness';
import { fxStrips, outlineRings } from './fx-strips';
import { fakeScene } from './hud-fakes';

/**
 * The Finisher's flashes (docs/finisher.md §4, §5.8 test 15): its chronology, from the combo's
 * first blow and at the zoom the scene frames, through the real flash budget: the real effects
 * of the blows (FightFeedback), the front effects of the real strips through their gates (the
 * scene's poses included), the real HUD, and the director's stamps, landing and card. What is
 * counted is what shows, on the frame it shows. Then the colors it lays: no flat and no glow
 * « not counted » at ΔL ≥ 0.10, no veil in a saturated red, no blood at the close up.
 */

const blood = vi.hoisted(() => vi.fn());
vi.mock('../../src/render/hit-fx', () => ({
  HitFx: class {
    play = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/graze', () => ({
  Graze: class {
    play = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/dust', () => ({
  Dust: class {
    kick = vi.fn();
    puff = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/blood', () => ({
  BLEEDS: { heavyHit: {}, ko: {} },
  Blood: class {
    bleed = blood;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/effects', () => ({
  Effects: class {
    kick = vi.fn();
    jolt = vi.fn();
    veil = vi.fn();
    setShake = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/stamps', async (original) => ({
  ...(await original<typeof import('../../src/render/stamps')>()),
  Stamps: class {
    show = vi.fn();
    dismiss = vi.fn();
    setCloseUp = vi.fn();
    update = vi.fn();
    settle = vi.fn();
  },
}));
vi.mock('../../src/render/onomatopoeia', async (original) => {
  const real = await original<typeof import('../../src/render/onomatopoeia')>();
  return {
    ...real,
    Onomatopoeia: class {
      private tally: TickTally = real.NO_TALLY;
      beginTick(): void {
        this.tally = real.startTick(this.tally);
      }
      countOf(by: 0 | 1): number {
        return real.landHit(this.tally, by).count;
      }
      blow(_kind: string, hit: { by: 0 | 1 }): void {
        this.tally = real.landHit(this.tally, hit.by).tally;
      }
      setCloseUp = vi.fn();
      reset = vi.fn();
      update = vi.fn();
      settle = vi.fn();
    },
  };
});

const SILENT = { play: () => undefined } as unknown as Sfx;

/** The pixels of each frame of each strip of front effects, by fighter. */
const STRIPS = new Map<FighterArt, Map<string, Uint8ClampedArray[]>>();
/** The outline of each frame of each body strip, by fighter (the same shape in every colorway). */
const RINGS = new Map<FighterArt, Map<string, Int16Array[]>>();

beforeAll(async () => {
  for (const [art, fighter, colorway] of [
    [NAYO_ART, 'nayo', 'main'],
    [NAYO_ALT, 'nayo', 'alt'],
    [RIFF_ART, 'riff', 'main'],
  ] as const) {
    STRIPS.set(art, new Map(await fxStrips(fighter, colorway)));
  }
  for (const [art, fighter] of [
    [NAYO_ART, 'nayo'],
    [RIFF_ART, 'riff'],
  ] as const) {
    const rings = new Map<string, Int16Array[]>();
    for (const clip of Object.values(art.clips)) {
      if (!rings.has(clip.sheet))
        rings.set(clip.sheet, await outlineRings(fighter, 'main', clip.sheet));
    }
    RINGS.set(art, rings);
  }
});

/**
 * The view keys of the outline of `sheet`'s frame `frame` drawn at `at` (planche pixels of the
 * world, ART_SCALE a world px): where it lights.
 */
function ringAt(
  art: FighterArt,
  sheet: string,
  frame: number,
  at: { readonly x: number; readonly y: number; readonly flip: boolean },
): Set<number> {
  const ring = RINGS.get(art)?.get(sheet)?.[frame];
  if (!ring) throw new Error(`No outline for ${sheet} ${frame}`);
  const x = Math.round(at.x * ART_SCALE);
  const y = Math.round(at.y * ART_SCALE);
  const keys = new Set<number>();
  for (let i = 0; i < ring.length; i += 2) {
    const dx = ring[i] ?? 0;
    keys.add((y + (ring[i + 1] ?? 0) + 4096) * 8192 + (at.flip ? x - dx - 1 : x + dx) + 4096);
  }
  return keys;
}

/** World px² frame `to` of a strip lights that frame `from` did not (-1: all it lights). */
function lightsAnew(art: FighterArt, sheet: string, from: number, to: number): number {
  const frames = STRIPS.get(art)?.get(sheet);
  const after = frames?.[to];
  if (!after) return 0;
  return freshPixels(from < 0 ? undefined : frames[from], after, GREYBOX_COLORS) / ART_SCALE ** 2;
}

interface Counted {
  /** The frames (from the press) a flash started on, as shown; and which took a climax's slot. */
  readonly flashes: readonly number[];
  readonly climaxes: readonly number[];
  /** The frame the lock took (from the press). */
  readonly lock: number;
  /** World px² the winner's outline lit anew, by frame (from the press). */
  readonly outlines: ReadonlyMap<number, number>;
}

/**
 * Plays `route`'s Finisher in full with the flashes in `mode` and the screen shaking `shake`,
 * counting what shows.
 */
function counted(route: Route, mode: FlashMode, shake: Comfort['shake'] = 'normal'): Counted {
  blood.mockClear();
  const budget = new FlashBudget(mode);
  const lit = new Map<number, number>();
  const climaxes: number[] = [];
  let now = 0;
  const show = budget.show.bind(budget);
  // The outline's ask is a bound (OUTLINE_AREA): what it lights is measured instead, below.
  let outlineAsks = false;
  budget.show = (area: number, delay?: number) => {
    show(area, delay);
    const at = now + (delay ?? 0);
    if (area > 0 && !outlineAsks) lit.set(at, (lit.get(at) ?? 0) + area * zoom ** 2);
  };
  const admit = budget.admit.bind(budget);
  budget.admit = (area: number) => {
    outlineAsks = area === OUTLINE_AREA;
    const answer = admit(area);
    outlineAsks = false;
    return answer;
  };
  const request = budget.request.bind(budget);
  budget.request = (area: number, climax?: boolean) => {
    const slot = !budget.fits(area);
    const answer = request(area, climax);
    if (slot && climax === true && answer === 'lit') climaxes.push(now);
    return answer;
  };
  let zoom = 1.45;
  const comfort = { flashes: mode, shake, staging: 'full' } as const;
  const flat = (route.fighters[0] === 'nayo' ? NAYO_SCRIPT : RIFF_SCRIPT).flats.main;
  const outlines = new Map<number, number>();
  // What each outline lit on the frame before (view keys), and the flat under it, as shown.
  const ringBefore: [Set<number>, Set<number>] = [new Set(), new Set()];
  const flatShown = vi.spyOn(FinisherProps.prototype, 'showFlat');
  const styles = [hitStyleOf(route.fighters[0]), hitStyleOf(route.fighters[1])] as const;
  const arts = route.fighters.map((id) => (id === 'nayo' ? NAYO_ART : RIFF_ART));
  const { config } = armed(route);
  const hud = new Hud(
    fakeScene().scene,
    config,
    [hudColorOf(styles[0]), hudColorOf(styles[1])],
    hudComfortOf(comfort),
    budget,
  );
  const feedback = new FightFeedback({} as Phaser.Scene, GROUND_Y, SILENT, styles, {
    width: 640,
    colors: GREYBOX_COLORS,
    budget,
    comfort,
    mode: 'full',
    knockOut: (player, finish, still) => {
      hud.knockOut(player, finish, still);
    },
  });
  const gates = [new FxGate(), new FxGate()] as const;
  const nowhere = { x: Number.NaN, y: Number.NaN, flip: false };
  const before: [typeof nowhere, typeof nowhere] = [nowhere, nowhere];
  const shown: Shown = { clip: 'idle', tick: 0, x: 0 };
  // Set from the ticks' events (closures): typed wide, or the checker would narrow them to null.
  let press = null as number | null;
  let lock = null as number | null;
  let frame = -1;
  film(route, {
    comfort,
    feedback,
    budget,
    onFrame: (closeUp) => {
      frame++;
      now++;
      budget.advance(1);
      zoom = closeUp;
      budget.setZoom(closeUp);
    },
    onTick: (_previous: GameState, next: GameState, events) => {
      feedback.beginTick(next.frame);
      for (const event of events) {
        if (event.type === 'super' && press === null) press = frame;
        if (event.type === 'finisherLock' && lock === null) lock = frame;
        feedback.react(event, toPx(next.cameraX) - 240);
      }
      feedback.endTick();
    },
    onShown: (state: GameState, director: FinisherScene) => {
      feedback.update(1);
      for (const player of [0, 1] as const) {
        const art = arts[player] as FighterArt;
        showFighter(state, player, config, art, shown);
        const pose = director.lookOf(player).pose;
        if (pose) {
          shown.clip = pose.clip;
          shown.tick = pose.tick;
        }
        const clip = clipOf(art, shown.clip);
        const index = clipFrameAt(clip, shown.tick);
        const strip = clip.frames[index] ?? 0;
        const sheet = effectsOf(clip);
        const fighter = state.fighters[player];
        const lift = pose?.lift ?? 0;
        const at = {
          x: toPx(shown.x),
          y: GROUND_Y - toPx(fighter.y) - lift,
          flip: fighter.facing < 0,
        };
        const last = before[player];
        const still = last.x === at.x && last.y === at.y && last.flip === at.flip;
        before[player] = at;
        const shows = STRIPS.get(art)?.has(sheet) ?? false;
        gates[player].show(budget, shows ? sheet : null, index, strip, (from) =>
          lightsAnew(art, sheet, still ? from : -1, strip),
        );
        // The silhouette's outline (the scene's, never through a gate): what it lights anew, at
        // ΔL ≥ 0.10 over the flat as shown, on the sky or the ground, its body moved or not.
        // Counted whole: neither the victim in front of it nor its effects over it are taken out.
        const look = director.lookOf(player);
        const color = look.outline;
        const [shade, alpha] = flatShown.mock.lastCall ?? [flat, 0];
        const lights =
          color !== null &&
          GREYBOX_COLORS.some(
            (stage) =>
              luminanceDelta(color, over(shade, stage, alpha), look.silhouette) >= FLASH_DELTA,
          );
        const ring = lights ? ringAt(art, clip.sheet, strip, at) : new Set<number>();
        let fresh = 0;
        for (const key of ring) if (!ringBefore[player].has(key)) fresh++;
        ringBefore[player] = ring;
        if (fresh > 0) {
          const area = fresh / ART_SCALE ** 2;
          outlines.set(now, (outlines.get(now) ?? 0) + area);
          lit.set(now, (lit.get(now) ?? 0) + area * zoom ** 2);
        }
      }
      hud.update(state);
    },
  });
  flatShown.mockRestore();
  if (press === null || lock === null) throw new Error(`${route.name}: no Finisher`);
  const flashes: number[] = [];
  const end = Math.max(0, ...lit.keys());
  for (let at = 0; at <= end; at++) {
    if (!(lit.get(at) ?? 0)) continue;
    let sum = 0;
    for (let back = 0; back <= FLASH_MERGE; back++) sum += lit.get(at - back) ?? 0;
    const last = flashes[flashes.length - 1];
    const over = sum >= FLASH_RULES[mode].area;
    if (over && (last === undefined || at - last > FLASH_MERGE)) flashes.push(at);
  }
  const from = press;
  return {
    flashes: flashes.map((at) => at - 1 - from),
    climaxes: climaxes.map((at) => at - 1 - from),
    lock: lock - press,
    outlines: new Map([...outlines].map(([at, area]) => [at - 1 - from, area])),
  };
}

/** The most flashes started within any `window` frames. */
function most(flashes: readonly number[], window: number): number {
  return Math.max(
    0,
    ...flashes.map((at) => flashes.filter((t) => t >= at && t < at + window).length),
  );
}

describe("the Finisher's flashes, as shown (§4.3, §5.8 test 15)", () => {
  for (const [route, own] of [
    [LE_QUATRE, 3],
    [LARSEN, 2],
  ] as const) {
    it(`${route.name}: never more than the rules, ${own} at most of its own, 30 frames apart, no two climaxes in a second`, () => {
      const { flashes, climaxes, lock, outlines } = counted(route, 'normal');
      // From the combo's first blow: the budget's rules, at the zoom shown.
      expect(most(flashes, SECOND), flashes.join(', ')).toBeLessThanOrEqual(3);
      expect(most(flashes, FIVE_SECONDS)).toBeLessThanOrEqual(8);
      const scene = flashes.filter((at) => at >= lock);
      expect(scene.length, scene.join(', ')).toBeLessThanOrEqual(own);
      // The registry (§4.3), measured: TROIS's rings, QUATRE's éclat, the card; the reprise's
      // éclat, the card. Its blows before the last stay under the threshold, at × 0.725.
      expect(scene).toEqual(route === LE_QUATRE ? [82, 142, 172] : [93, 123]);
      for (let i = 1; i < scene.length; i++) {
        expect((scene[i] ?? 0) - (scene[i - 1] ?? 0), scene.join(', ')).toBeGreaterThanOrEqual(30);
      }
      for (let i = 1; i < climaxes.length; i++) {
        expect((climaxes[i] ?? 0) - (climaxes[i - 1] ?? 0)).toBeGreaterThanOrEqual(SECOND);
      }
      // Its landing is one of them: the éclat, the climax of the scene.
      expect(climaxes.some((at) => at >= lock)).toBe(true);
      // The winner's outline lights once, as its silhouette darkens, within what it asked for:
      // never as it leaves, its pose moving (TROIS's flash takes it in; Riff's, alone, makes none).
      expect([...outlines.keys()]).toEqual([route === LE_QUATRE ? 83 : 51]);
      expect(Math.max(...outlines.values())).toBeLessThanOrEqual(OUTLINE_AREA);
      // No blood once it locks: the close up would make it four times larger.
      expect(blood).toHaveBeenCalledTimes(route === LE_QUATRE ? 2 : 1);
    });
  }

  it('shows less with the flashes reduced, nothing that flashes with them off', () => {
    for (const route of [LE_QUATRE, LARSEN]) {
      const reduced = counted(route, 'reduced');
      expect(most(reduced.flashes, SECOND)).toBeLessThanOrEqual(FLASH_RULES.reduced.perSecond);
      // No flash counted out of the card (§4.5); Nayo's outline, which would make one with TROIS,
      // is refused and drawn in a tone that never flashes, Riff's lights alone, under the threshold.
      const scene = reduced.flashes.filter((at) => at >= reduced.lock);
      expect(scene).toEqual(route === LE_QUATRE ? [172] : [123]);
      expect(reduced.outlines.size).toBe(route === LE_QUATRE ? 0 : 1);
      expect(counted(route, 'off').flashes).toEqual([]);
    }
  });

  it('keeps the registry with the screen kept still, the default of reduced motion included', () => {
    // No close up, but its blows still at × 0.725: at their size, UN darkened TROIS's rings, and
    // Larsen's KO took a slot with the flashes reduced.
    expect(counted(LE_QUATRE, 'normal', 'off').flashes).toEqual([-33, -12, 82, 142, 172]);
    expect(counted(LARSEN, 'normal', 'off').flashes).toEqual([-12, 93, 123]);
    for (const route of [LE_QUATRE, LARSEN]) {
      const reduced = counted(route, 'reduced', 'off');
      const scene = reduced.flashes.filter((at) => at >= reduced.lock);
      expect(scene).toEqual(route === LE_QUATRE ? [172] : [123]);
      expect(reduced.climaxes).toEqual([]);
    }
  });
});

describe('the colors the scene lays (§4.2)', () => {
  const scripts = [NAYO_SCRIPT, RIFF_SCRIPT];

  it('lays flats that are never a flash over the sky or the ground, nor a saturated red', () => {
    for (const script of scripts) {
      for (const flat of Object.values(script.flats)) {
        for (const backdrop of GREYBOX_COLORS) {
          expect(Math.abs(luminanceDelta(flat, backdrop, 1))).toBeLessThan(FLASH_DELTA);
        }
        expect(redRatio(flat)).toBeLessThan(SATURATED_RED);
        // The crowd, black on it: under ΔL 0.08 too.
        expect(Math.abs(luminanceDelta(0x000000, flat, 1))).toBeLessThan(VEIL_DELTA);
      }
    }
  });

  it('veils the landing in an energy that is never a saturated red, its éclat bounded', () => {
    const energies = [
      hitStyleOf('nayo').energy,
      hitStyleOf('nayo', 'alt').energy,
      hitStyleOf('riff').energy,
      hitStyleOf('riff', 'alt').energy,
    ];
    for (const energy of energies) {
      const look = koVeil('finale', energy, GREYBOX_COLORS);
      expect(look?.kind).toBe('eclat');
      expect(redRatio(look?.color ?? 0)).toBeLessThan(SATURATED_RED);
      const reduced = koVeil('finale', energy, GREYBOX_COLORS, 'reduced');
      for (const backdrop of GREYBOX_COLORS) {
        expect(luminanceDelta(energy, backdrop, reduced?.alpha ?? 1)).toBeLessThanOrEqual(
          VEIL_DELTA + 1e-9,
        );
      }
    }
  });
});
