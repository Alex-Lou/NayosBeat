import type Phaser from 'phaser';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { hudComfortOf } from '../../src/app/comfort';
import { NAYO as NAYO_ART, NAYO_ALT } from '../../src/art/nayo';
import { RIFF as RIFF_ART } from '../../src/art/riff';
import { ART_SCALE, clipOf, effectsOf, type FighterArt } from '../../src/art/types';
import type { Sfx } from '../../src/audio/sfx';
import type { MatchConfig } from '../../src/core/config';
import { px, toPx } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import type { FighterState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { clipFrameAt, showFighter, type Shown } from '../../src/render/animation';
import { MAX_CLOSE_UP } from '../../src/render/camera-framing';
import { detectEvents, type FightEvent } from '../../src/render/fight-events';
import { FightFeedback } from '../../src/render/fight-feedback';
import {
  FIVE_SECONDS,
  FLASH_MERGE,
  FLASH_RULES,
  FlashBudget,
  FxGate,
  SECOND,
  type FlashMode,
} from '../../src/render/flash-budget';
import { GROUND_Y } from '../../src/render/greybox-stage';
import { hitStyleOf, hudColorOf, type HitStyle } from '../../src/render/hit-styles';
import { Hud } from '../../src/render/hud';
import { freshPixels } from '../../src/render/luminance';
import type { TickTally } from '../../src/render/onomatopoeia';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { playCombo } from '../core/combo-helpers';
import { facingOff } from '../core/helpers';
import { fxStrips } from './fx-strips';
import { fakeScene } from './hud-fakes';

/**
 * The worst case of docs/flashs.md §4, on the real engine: combo routes played by the core, their
 * events through the real FightFeedback and its budget, the front effects of the real strips
 * through their gates, the real HUD (its bars' white, its announcements, its gauges blown up),
 * one tick a frame (the KO's slow motion only spreads them), at the closest framing. What is
 * counted is what shows, on the frame it shows: muted looks, the words and stamps that wait, and
 * what each new frame of an effect lights anew. The words and the stamps show on the frame the
 * budget keeps them for (tests/render/delayed-words.test.ts).
 */

const sparks = vi.hoisted(() => vi.fn());
vi.mock('../../src/render/hit-fx', () => ({
  HitFx: class {
    play = sparks;
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
    bleed = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/effects', () => ({
  Effects: class {
    kick = vi.fn();
    veil = vi.fn();
    setShake = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/stamps', async (original) => ({
  ...(await original<typeof import('../../src/render/stamps')>()),
  Stamps: class {
    show = vi.fn();
    update = vi.fn();
    settle = vi.fn();
  },
}));
// The words keep their real tally: how wide a word is depends on it.
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
      reset = vi.fn();
      update = vi.fn();
      settle = vi.fn();
    },
  };
});

const { Light: L, Heavy: H, Special: S, Down: D, Left: B, Right: F, Dash, Boost: X } = Input;
const SILENT = { play: () => undefined } as unknown as Sfx;
const NR: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const RN: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };
const NN: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, NAYO] };

type Overrides = Partial<FighterState>;
interface Route {
  readonly name: string;
  readonly config: MatchConfig;
  /** The distance it starts from, in world pixels. */
  readonly distance: number;
  /** The attacker's steps (playCombo), and what the other one presses on each tick. */
  readonly steps: InputBits[];
  readonly opponent?: (tick: number) => InputBits;
  readonly attacker?: Overrides;
  readonly victim?: Overrides;
}

/** The other one presses `input` on its first tick: caught attacking, or trading. */
const onFirstTick = (input: InputBits) => (tick: number) => (tick === 0 ? input : 0);

const ROUTES: readonly Route[] = [
  { name: 'Nayo H, H, →S', config: NR, distance: 55, steps: [H, H, F | S] },
  {
    name: 'Nayo E7, 12 blows',
    config: NR,
    distance: 40,
    steps: [L, L, H, Dash, L, L, B | H, L, L, F | H, L, L, L],
  },
  { name: 'Nayo L, ←L, ←L, ←L', config: NR, distance: 40, steps: [L, B | L, B | L, B | L] },
  { name: 'Nayo Mégabasse', config: NR, distance: 50, steps: [B | X], attacker: { boost: 3000 } },
  {
    name: 'Nayo Mégabasse, KO',
    config: NR,
    distance: 50,
    steps: [B | X],
    attacker: { boost: 3000 },
    victim: { health: 200 },
  },
  {
    name: 'Nayo E3 L, L, H, H, ←BOOST, KO',
    config: NR,
    distance: 40,
    steps: [L, L, H, H, B | X],
    attacker: { boost: 3000 },
    victim: { health: 280 },
  },
  // The Uppercut that lands: its fx held over the hitstop, then its next frames.
  { name: 'Nayo ↓S', config: NR, distance: 30, steps: [D | S] },
  {
    name: 'Nayo E6 ↓S, ←BOOST',
    config: NR,
    distance: 30,
    steps: [D | S, B | X],
    attacker: { boost: 3000 },
  },
  {
    name: 'Riff L, L, H, H, ←BOOST, KO',
    config: RN,
    distance: 36,
    steps: [L, L, H, H, B | X],
    attacker: { boost: 3000 },
    victim: { health: 230 },
  },
  {
    name: 'Riff Pogo',
    config: RN,
    distance: 36,
    steps: [L, L, H, Dash, L, L, H, H, D | S],
    attacker: { boost: 1000 },
  },
  // A CONTRE (the other one caught in its heavy's start-up), then light blows 15 frames apart.
  {
    name: 'Nayo CONTRE, ←L, ←L, ←L',
    config: NN,
    distance: 40,
    steps: [L, B | L, B | L, B | L],
    opponent: onFirstTick(H),
  },
  // Both press on the same tick: each blow catches the other attacking, two CONTRE.
  {
    name: 'Nayo, Nayo: a trade of L',
    config: NN,
    distance: 40,
    steps: [L],
    opponent: onFirstTick(L),
  },
  {
    name: 'Nayo, Nayo: a double KO',
    config: NN,
    distance: 40,
    steps: [H],
    opponent: onFirstTick(H),
    attacker: { health: 30 },
    victim: { health: 30 },
  },
];

/** The pixels of each frame of each strip of front effects, by fighter. */
const STRIPS = new Map<FighterArt, Map<string, Uint8ClampedArray[]>>();
/** What a frame of a strip lights over another (or over nothing), by fighter and `sheet#from>to`. */
const ANEW = new Map<FighterArt, Map<string, number>>();

beforeAll(async () => {
  for (const [art, fighter, colorway] of [
    [NAYO_ART, 'nayo', 'main'],
    [NAYO_ALT, 'nayo', 'alt'],
    [RIFF_ART, 'riff', 'main'],
  ] as const) {
    STRIPS.set(art, new Map(await fxStrips(fighter, colorway)));
  }
});

/** World px² frame `to` of a strip lights that frame `from` did not (-1: all it lights). */
function lightsAnew(art: FighterArt, sheet: string, from: number, to: number): number {
  const key = `${sheet}#${from}>${to}`;
  let known = ANEW.get(art);
  if (!known) ANEW.set(art, (known = new Map<string, number>()));
  const area = known.get(key);
  if (area !== undefined) return area;
  const frames = STRIPS.get(art)?.get(sheet);
  const after = frames?.[to];
  const lit = after
    ? freshPixels(from < 0 ? undefined : frames[from], after, FIGHT_STAGE_COLORS) / ART_SCALE ** 2
    : 0;
  known.set(key, lit);
  return lit;
}

/** A budget at the closest framing that keeps, frame by frame, what lights: what the screen shows. */
function watched(mode: FlashMode) {
  const budget = new FlashBudget(mode);
  budget.setZoom(MAX_CLOSE_UP);
  const lit = new Map<number, number>();
  let now = 0;
  const show = budget.show.bind(budget);
  budget.show = (area: number, delay?: number) => {
    show(area, delay);
    const at = now + (delay ?? 0);
    if (area > 0) lit.set(at, (lit.get(at) ?? 0) + area);
  };
  return {
    budget,
    advance(frames: number) {
      now += frames;
      budget.advance(frames);
    },
    /**
     * The frames a flash started on: something new lights where the last frames add up over the
     * area, not within the frames that merge with the last one.
     */
    flashes(): number[] {
      const flashes: number[] = [];
      const end = Math.max(0, ...lit.keys());
      for (let frame = 0; frame <= end; frame++) {
        if (!(lit.get(frame) ?? 0)) continue;
        let sum = 0;
        for (let back = 0; back <= FLASH_MERGE; back++) sum += lit.get(frame - back) ?? 0;
        const last = flashes[flashes.length - 1];
        const over = sum * MAX_CLOSE_UP ** 2 >= FLASH_RULES[mode].area;
        if (over && (last === undefined || frame - last > FLASH_MERGE)) flashes.push(frame);
      }
      return flashes;
    },
  };
}

/** Each fighter's look: the second one in its other colorway in a mirror match, as in a fight. */
function looksOf(config: MatchConfig): {
  styles: readonly [HitStyle, HitStyle];
  arts: readonly [FighterArt, FighterArt];
} {
  const [first, second] = config.fighters;
  const of = (fighter: { readonly name: string }, colorway: 'main' | 'alt') =>
    fighter.name === 'Riff'
      ? { style: hitStyleOf('riff', colorway), art: RIFF_ART }
      : { style: hitStyleOf('nayo', colorway), art: colorway === 'main' ? NAYO_ART : NAYO_ALT };
  const a = of(first, 'main');
  const b = of(second, first.name === second.name ? 'alt' : 'main');
  return { styles: [a.style, b.style], arts: [a.art, b.art] };
}

interface Played {
  /** The frames a flash started on, as the screen shows them. */
  readonly flashes: readonly number[];
  /** The sparks played, in order. */
  readonly sparks: readonly string[];
  /** The strips of front effects that played dark, by player. */
  readonly dark: readonly [ReadonlySet<string>, ReadonlySet<string>];
}

/** Plays `route`, everything shown at the closest framing. */
function play(route: Route, mode: FlashMode): Played {
  sparks.mockClear();
  const { config } = route;
  const start = facingOff(route.distance, config, [route.attacker ?? {}, route.victim ?? {}]);
  const run = playCombo(start, config, route.steps, route.opponent);
  const screen = watched(mode);
  const { budget } = screen;
  const { styles, arts } = looksOf(config);
  const comfort = { flashes: mode, shake: 'normal', staging: 'full' } as const;
  const hud = new Hud(
    fakeScene().scene,
    config,
    [hudColorOf(styles[0]), hudColorOf(styles[1])],
    hudComfortOf(comfort),
    budget,
  );
  const feedback = new FightFeedback({} as Phaser.Scene, GROUND_Y, SILENT, styles, {
    width: 640,
    colors: FIGHT_STAGE_COLORS,
    budget,
    comfort,
    knockOut: (player, finish, still) => {
      hud.knockOut(player, finish, still);
    },
  });
  const gates = [new FxGate(), new FxGate()] as const;
  const nowhere = { x: Number.NaN, y: Number.NaN, flip: false };
  const before: [typeof nowhere, typeof nowhere] = [nowhere, nowhere];
  const dark = [new Set<string>(), new Set<string>()] as const;
  const shown: Shown = { clip: 'idle', tick: 0, x: 0 };
  const events: FightEvent[] = [];
  let previous = start;
  for (const state of run.states) {
    screen.advance(1);
    detectEvents(previous, state, config, events);
    feedback.beginTick();
    for (const event of events) feedback.react(event, 0);
    feedback.endTick();
    feedback.update(1);
    // As SpriteFighterView: what a new frame lights anew, all of it if the body moved.
    for (const player of [0, 1] as const) {
      const art = arts[player];
      showFighter(state, player, config, art, shown);
      const clip = clipOf(art, shown.clip);
      const index = clipFrameAt(clip, shown.tick);
      const frame = clip.frames[index] ?? 0;
      const sheet = effectsOf(clip);
      const fighter = state.fighters[player];
      const at = { x: toPx(shown.x), y: GROUND_Y - toPx(fighter.y), flip: fighter.facing < 0 };
      const last = before[player];
      const still = last.x === at.x && last.y === at.y && last.flip === at.flip;
      before[player] = at;
      const shows = STRIPS.get(art)?.has(sheet) ?? false;
      const lit = (from: number) => lightsAnew(art, sheet, still ? from : -1, frame);
      if (gates[player].show(budget, shows ? sheet : null, index, frame, lit)) {
        dark[player].add(sheet);
      }
    }
    hud.update(state);
    previous = state;
  }
  return {
    flashes: screen.flashes(),
    sparks: sparks.mock.calls.map(([, kind]) => kind as string),
    dark,
  };
}

/** The most flashes started within any `window` frames. */
function most(flashes: readonly number[], window: number): number {
  return Math.max(
    0,
    ...flashes.map((at) => flashes.filter((t) => t >= at && t < at + window).length),
  );
}

/** The route named `name`. */
function route(name: string): Route {
  const found = ROUTES.find((each) => each.name === name);
  if (!found) throw new Error(`No route ${name}`);
  return found;
}

describe('the flashes of the combo routes, as shown (docs/flashs.md §4)', () => {
  for (const mode of ['normal', 'reduced', 'off'] as const) {
    it(`never shows more than the ${mode} mode allows`, () => {
      const rules = FLASH_RULES[mode];
      for (const each of ROUTES) {
        const { flashes } = play(each, mode);
        expect(most(flashes, SECOND), `${each.name}, a second`).toBeLessThanOrEqual(
          rules.perSecond,
        );
        expect(most(flashes, FIVE_SECONDS), `${each.name}, 5 s`).toBeLessThanOrEqual(
          rules.perFiveSeconds,
        );
        // Two ordinary flashes are never closer than the mode's gap (a climax may be).
        for (let i = 1; i < flashes.length; i++) {
          const gap = (flashes[i] ?? 0) - (flashes[i - 1] ?? 0);
          if (mode === 'reduced' && gap < rules.gap) {
            expect(i, `${each.name}: ${flashes.join(', ')}`).toBe(flashes.length - 1);
          }
        }
      }
    }, 30_000);
  }

  it('keeps the big bursts of a KO and of a super that kills, with the flashes normal', () => {
    for (const each of ROUTES) {
      if (each.victim?.health === undefined || each.attacker?.health !== undefined) continue;
      const played = play(each, 'normal');
      expect(played.sparks.at(-1), each.name).toBe('ko');
    }
  });

  it("plays the Mégabasse's blows before its last smaller, BOOM, BOOM, BOOOOM", () => {
    const played = play(route('Nayo Mégabasse, KO'), 'normal');
    expect(played.sparks).toEqual(['pulse', 'pulse', 'ko']);
    // The stamp and the halo, the first blow with its rings, the KO with its éclat: its second
    // blow, too soon, plays muted, its rings dark.
    expect(played.flashes).toHaveLength(3);
    const reduced = play(route('Nayo Mégabasse, KO'), 'reduced');
    expect(reduced.sparks.at(-1)).toBe('ko');
  });

  it('flashes once at most on light blows five a second: none normal, one reduced, close up', () => {
    const flashes = (mode: FlashMode) => play(route('Nayo L, ←L, ←L, ←L'), mode).flashes;
    expect(flashes('normal')).toEqual([]);
    expect(flashes('reduced').length).toBeLessThanOrEqual(1);
    expect(flashes('off')).toEqual([]);
  });

  it("keeps the Uppercut lit as it lands: its frames held over a hit light little that's new", () => {
    const played = play(route('Nayo ↓S'), 'normal');
    expect(played.sparks).toEqual(['heavy']);
    expect(played.dark[0].has('specialAntiAir')).toBe(false);
  });

  it('shows nothing that flashes with the flashes off: a CONTRE and the blows after, a trade, a double KO', () => {
    for (const name of [
      'Nayo CONTRE, ←L, ←L, ←L',
      'Nayo, Nayo: a trade of L',
      'Nayo, Nayo: a double KO',
    ]) {
      expect(play(route(name), 'off').flashes, name).toEqual([]);
    }
  });
});

describe('what waits to show, played tick by tick (docs/flashs.md §4)', () => {
  const NAYO_STYLE = hitStyleOf('nayo');
  const impact = (by: 0 | 1) =>
    ({
      x: px(200),
      y: px(50),
      away: by === 0 ? 1 : -1,
      by,
      low: false,
      damage: 25,
      held: false,
      tier: 1,
      pulse: false,
    }) as const;
  const light = (by: 0 | 1): FightEvent => ({
    type: 'hit',
    heavy: false,
    counter: null,
    ...impact(by),
  });
  const heavy = (by: 0 | 1): FightEvent => ({
    type: 'hit',
    heavy: true,
    counter: null,
    ...impact(by),
  });
  const contre = (by: 0 | 1): FightEvent => ({
    type: 'hit',
    heavy: false,
    counter: 'counter',
    ...impact(by),
  });
  const ko = (by: 0 | 1): FightEvent => ({
    type: 'ko',
    finish: 'plain',
    counter: null,
    ...impact(by),
  });

  /** Plays the events of each tick (by frame), one tick a frame. */
  function script(mode: FlashMode, ticks: Readonly<Record<number, readonly FightEvent[]>>) {
    const screen = watched(mode);
    const feedback = new FightFeedback(
      {} as Phaser.Scene,
      GROUND_Y,
      SILENT,
      [NAYO_STYLE, NAYO_STYLE],
      {
        width: 640,
        colors: FIGHT_STAGE_COLORS,
        budget: screen.budget,
        comfort: { flashes: mode, shake: 'normal', staging: 'full' },
      },
    );
    for (let frame = 1; frame <= 120; frame++) {
      screen.advance(1);
      feedback.beginTick();
      for (const event of ticks[frame] ?? []) feedback.react(event, 0);
      feedback.endTick();
      feedback.update(1);
    }
    return screen.flashes();
  }

  const SCRIPTS: Readonly<Record<string, Readonly<Record<number, readonly FightEvent[]>>>> = {
    // The jab after a CONTRE, 15 frames later: as its stamp is about to show.
    'a CONTRE, a light blow 15 frames later': { 30: [contre(0)], 45: [light(0)] },
    // The second CONTRE's word on the first one's stamp.
    'a CONTRE, another 8 frames later': { 30: [contre(0)], 38: [contre(0)] },
    'a trade of two CONTRE': { 10: [contre(0), contre(1)] },
    'a double KO': { 10: [ko(0), ko(1)] },
    'a heavy blow, a CONTRE refused, a light blow': {
      10: [heavy(0)],
      30: [contre(0)],
      45: [light(0)],
    },
  };

  for (const mode of ['normal', 'reduced', 'off'] as const) {
    it(`keeps the words and stamps that wait out of the flashes, ${mode}`, () => {
      const rules = FLASH_RULES[mode];
      for (const [name, ticks] of Object.entries(SCRIPTS)) {
        const flashes = script(mode, ticks);
        expect(most(flashes, SECOND), `${name}: ${flashes.join(', ')}`).toBeLessThanOrEqual(
          rules.perSecond,
        );
        if (mode !== 'normal') {
          // Never an ordinary flash within the gap of another (a KO may come sooner).
          const close = flashes.filter((at, i) => i > 0 && at - (flashes[i - 1] ?? 0) < rules.gap);
          expect(close.length, `${name}: ${flashes.join(', ')}`).toBeLessThanOrEqual(
            name === 'a double KO' ? 1 : 0,
          );
        }
      }
    });
  }
});
