import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ART_SCALE } from '../../src/art/types';
import { MAX_CLOSE_UP, PUSHED_CLOSE_UP } from '../../src/render/camera-framing';
import type { FightEvent } from '../../src/render/fight-events';
import type { RoundState } from '../../src/core/state';
import { ROSTER } from '../../src/data/roster';
import {
  blowAsk,
  CALM_STAMP_AREA,
  CALM_WORD_AREAS,
  GRAZE_AREA,
  SPARK_AREAS,
  STAMP_AREA,
  stampArea,
  WORD_AREAS,
  wordArea,
  type SparkLook,
  type WordArea,
} from '../../src/render/flash-areas';
import { FLASH_MARGIN, FLASH_RULES } from '../../src/render/flash-budget';
import type { HitKind } from '../../src/render/hit-fx';
import { hitStyleOf, hudColorOf } from '../../src/render/hit-styles';
import { ANNOUNCE_LETTER_AREA } from '../../src/render/hud';
import { BOOST_WORD, FINISH_PLATE_AREA, FINISH_WORD, MAX_WORD } from '../../src/render/boost-gauge';
import { announcementOf, koTallyText } from '../../src/render/hud-text';
import { freshPixels, litPixels, luminanceDelta } from '../../src/render/luminance';
import {
  CALM_WORD_SIZES,
  TALLY_INK,
  tallySize,
  WORD_INK,
  WORD_SIZES,
  wordFor,
  type BlowKind,
} from '../../src/render/onomatopoeia';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import {
  boostStamp,
  CALM_STAMP_SIZE,
  STAMP_INK,
  STAMP_SIZE,
  STAMP_TEXTS,
} from '../../src/render/stamps';
import { FX_DARK, glowFlashArea, koVeil, superHalo, VEIL_DELTA } from '../../src/render/veils';
import { outlinesOf, type Outlines } from './font-outlines';
import { fxStrips } from './fx-strips';
import { comic, litArea, plain } from './lettering';
import { SparkMeter } from './spark-area';

vi.mock('phaser', () => ({
  default: { BlendModes: { NORMAL: 0, ADD: 1 }, Textures: { FilterMode: { LINEAR: 0 } } },
}));

/** World px² become this many px² of the view at the closest framing of the game. */
const CLOSEST = MAX_CLOSE_UP ** 2;
/**
 * And at the closest a strong blow's push takes it (camera-framing.ts, P12), with the flashes
 * normal only: the push never plays with them calm.
 */
const PUSHED = PUSHED_CLOSE_UP ** 2;

type Blow = Extract<FightEvent, { type: 'hit' | 'ko' }>;
type Hit = Extract<FightEvent, { type: 'hit' }>;

/** What every blow of player 1 below shares. */
const IMPACT = {
  x: 0,
  y: 0,
  away: 1,
  by: 0,
  low: false,
  damage: 60,
  held: false,
  counter: null,
  tier: 0,
  pulse: false,
  freeze: 10,
  aim: 0,
} as const;

/** A blow of player 1, as fight-events.ts reports it. */
function blow(overrides: Partial<Hit> = {}): Hit {
  return { type: 'hit', heavy: false, ...IMPACT, ...overrides };
}

/** The final blow of player 1. */
function ko(finish: 'plain' | 'ultimate', low = false): Blow {
  return { type: 'ko', finish, ...IMPACT, low };
}

describe('what a spark lights (docs/flashs.md §1.1)', () => {
  it('never lights more than its table says, in any colorway', () => {
    // A special's spark (P5) on its own meter: the others keep the chance they were measured with.
    for (const kinds of [
      ['light', 'heavy', 'ko', 'pulse', 'koMuted', 'block'],
      ['pinpoint'],
    ] as const satisfies readonly (readonly HitKind[])[]) {
      const meter = new SparkMeter();
      for (const fighter of ['nayo', 'riff'] as const) {
        for (const colorway of ['main', 'alt'] as const) {
          const style = hitStyleOf(fighter, colorway);
          for (const kind of kinds) {
            const measured = meter.peak(style, kind);
            expect(measured, `${fighter} ${colorway} ${kind}`).toBeLessThanOrEqual(
              SPARK_AREAS[style.shape][kind],
            );
            // The table is a measure, not a guess: its brightest colorway is within 10 %.
            if (colorway === 'main' && kind !== 'block') {
              expect(measured, `${fighter} ${kind}`).toBeGreaterThan(
                SPARK_AREAS[style.shape][kind] * 0.9,
              );
            }
          }
        }
      }
    }
  }, 60_000);

  // P3, P4: a heavy guard bigger, its spark refused two streaks, a whiff two faint ripples.
  it('measures the guards and the whiff under their table, the streaks and the ripples next to nothing', () => {
    const kinds = ['blockHeavy', 'blockMuted', 'whiff'] as const;
    for (const mode of ['full', 'simple'] as const) {
      const meter = new SparkMeter(mode);
      for (const fighter of ['nayo', 'riff'] as const) {
        for (const colorway of ['main', 'alt'] as const) {
          const style = hitStyleOf(fighter, colorway);
          for (const kind of kinds) {
            expect(
              meter.peak(style, kind),
              `${mode} ${fighter} ${colorway} ${kind}`,
            ).toBeLessThanOrEqual(SPARK_AREAS[style.shape][kind]);
          }
        }
      }
    }
    for (const areas of Object.values(SPARK_AREAS)) {
      expect(areas.blockHeavy).toBeGreaterThan(areas.block);
      expect(areas.blockMuted).toBeLessThan(60);
      expect(areas.whiff).toBeLessThan(150);
    }
    // Nayo's heavy guard, the brightest, is measured: within 10 %.
    const nayo = new SparkMeter().peak(hitStyleOf('nayo'), 'blockHeavy');
    expect(nayo).toBeGreaterThan(SPARK_AREAS.slash.blockHeavy * 0.9);
  }, 60_000);

  it('drawn by Canvas (no WebGL), never lights more than its table either: tinted pieces are cut', () => {
    const kinds: HitKind[] = ['light', 'heavy', 'ko', 'pulse', 'koMuted', 'block', 'pinpoint'];
    const blows = (['nayo', 'riff'] as const).flatMap((fighter) =>
      (['main', 'alt'] as const).flatMap((colorway) =>
        kinds.map((kind) => ({ name: `${fighter} ${colorway} ${kind}`, kind, fighter, colorway })),
      ),
    );
    // One meter after the other: the atlas is painted once a game, by the last HitFx made.
    const simple = new SparkMeter('simple');
    const lit = blows.map(({ fighter, colorway, kind }) =>
      simple.peak(hitStyleOf(fighter, colorway), kind),
    );
    blows.forEach(({ name, fighter, kind }, i) => {
      expect(lit[i], name).toBeLessThanOrEqual(SPARK_AREAS[hitStyleOf(fighter).shape][kind]);
    });
    // Nayo's painted burst still shows.
    expect(lit[blows.findIndex(({ name }) => name === 'nayo main ko')]).toBeGreaterThan(0);
    // What the cut prevents: every piece played, drawn by Canvas, its tint lost (white).
    const uncut = new SparkMeter('full', 'canvas');
    const beyond = blows.filter(
      ({ fighter, colorway, kind }) =>
        uncut.peak(hitStyleOf(fighter, colorway), kind) >
        SPARK_AREAS[hitStyleOf(fighter).shape][kind],
    );
    expect(beyond.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['nayo main ko', 'riff main ko']),
    );
  }, 120_000);
});

const FONTS = new URL('../../node_modules/@fontsource/', import.meta.url);
const COMIC = new URL('bangers/files/bangers-latin-400-normal.woff', FONTS);
const PIXEL = new URL('press-start-2p/files/press-start-2p-latin-400-normal.woff', FONTS);
/** Every colorway: the fill's foot (its strike color) and the drop (its energy) light apart. */
const STYLES = (['nayo', 'riff'] as const).flatMap((fighter) =>
  (['main', 'alt'] as const).map((colorway) => hitStyleOf(fighter, colorway)),
);
const KINDS: readonly BlowKind[] = ['light', 'heavy', 'ko', 'pulse'];
const DIGITS = Array.from({ length: 10 }, (_, digit) => String(digit));

describe('what the words and the stamps light (docs/flashs.md §4)', () => {
  let font: Outlines;
  beforeAll(async () => {
    font = await outlinesOf(COMIC);
  });

  /** World px² the brightest colorway of `texts` lights at `size`, inked and dropped. */
  const widest = (texts: readonly string[], size: number, ink: { stroke: number; drop: number }) =>
    Math.max(
      ...STYLES.flatMap((style) =>
        texts.map((text) =>
          litArea(font, text, comic(style, size, ink.stroke, ink.drop), FIGHT_STAGE_COLORS),
        ),
      ),
    );
  /** The table is a measure, not a guess: above it, within 5 %. */
  const near = (table: number, measured: number, name: string) => {
    expect(measured, name).toBeLessThanOrEqual(table);
    expect(measured, name).toBeGreaterThan(table * 0.95);
  };

  it('measures every word and its tally, popping and calm', () => {
    for (const [sizes, areas] of [
      [WORD_SIZES, WORD_AREAS],
      [CALM_WORD_SIZES, CALM_WORD_AREAS],
    ] as const) {
      for (const kind of KINDS) {
        const words = [...new Set([1, 2, 3, 4].map((count) => `${wordFor(kind, count)} !`))];
        const size = sizes[kind];
        const table: WordArea = areas[kind];
        near(table.word, widest(words, size, WORD_INK), `${kind} ${size}`);
        const tally = tallySize(size);
        near(table.x, widest(['x'], tally, TALLY_INK), `x ${kind} ${size}`);
        near(table.digit, widest(DIGITS, tally, TALLY_INK), `digit ${kind} ${size}`);
        // A tally lights no more than its « x » and its digits on their own.
        const tallies = ['x88', 'x40', 'x177'];
        const measured = Math.max(...tallies.map((text) => widest([text], tally, TALLY_INK)));
        expect(measured).toBeLessThanOrEqual(table.x + 3 * table.digit);
      }
    }
  }, 60_000);

  it('measures every stamp, the Boost moves named included, slammed and calm', () => {
    // The Rewind and the super say their own names.
    const named = ROSTER.flatMap(({ template }) =>
      [template.moves.boostCancel, template.moves.super].flatMap((move) =>
        move ? [boostStamp(move.name)] : [],
      ),
    );
    expect(named).toEqual(expect.arrayContaining(['REWIND !', 'POGO !', 'MÉGABASSE !', 'SLAM !']));
    const stamps = [...Object.values(STAMP_TEXTS), ...named];
    near(STAMP_AREA, widest(stamps, STAMP_SIZE, STAMP_INK), 'stamp');
    near(CALM_STAMP_AREA, widest(stamps, CALM_STAMP_SIZE, STAMP_INK), 'calm stamp');
  }, 60_000);

  it('never flashes calm on its own close up: what a muted blow or the calm options show', () => {
    const limit = (FLASH_RULES.reduced.area * FLASH_MARGIN) / CLOSEST;
    for (const kind of KINDS) {
      // A tally of two digits: x99 at the most.
      expect(wordArea(kind, 99, true), kind).toBeLessThan(limit);
    }
    expect(stampArea(true)).toBeLessThan(limit);
    // Pushed in on a strong blow, the flashes normal: a muted blow's calm word and stamp neither.
    const pushed = (FLASH_RULES.normal.area * FLASH_MARGIN) / PUSHED;
    for (const kind of KINDS) expect(wordArea(kind, 99, true), kind).toBeLessThan(pushed);
    expect(stampArea(true)).toBeLessThan(pushed);
    // With the flashes normal, the words and stamps that pop are flashes close up: counted.
    expect(wordArea('ko', 1, false) * CLOSEST).toBeGreaterThan(FLASH_RULES.normal.area);
    expect(stampArea(false) * CLOSEST).toBeGreaterThan(FLASH_RULES.normal.area);
  });

  it("counts every character of the HUD's announcements at most as its widest letter", async () => {
    const pixel = await outlinesOf(PIXEL);
    const names = [ROSTER[0]?.template.name ?? '', ROSTER[1]?.template.name ?? ''] as const;
    const round = (overrides: Partial<RoundState>): RoundState => ({
      number: 3,
      wins: [2, 0],
      timer: 0,
      phase: 'roundEnd',
      phaseFrame: 0,
      result: null,
      ...overrides,
    });
    const texts = [
      round({ phase: 'intro' }),
      round({ phase: 'intro', phaseFrame: 1000 }),
      ...([0, 1, null] as const).flatMap((winner) =>
        (['ko', 'timeout'] as const).map((reason) => round({ result: { winner, reason } })),
      ),
      round({ phase: 'matchEnd', wins: [2, 0] }),
      round({ phase: 'matchEnd', wins: [1, 2] }),
    ].map((state) => announcementOf(state, names));
    expect(texts).toContain('DOUBLE K.O.');
    // The KO's count under it (P10), « x8 », is counted as the announcer's letters.
    texts.push(koTallyText(8));
    const characters = [...new Set(Array.from(texts.join('')).concat(DIGITS))].filter(
      (c) => c !== ' ',
    );
    const areas = characters.map((c) => litArea(pixel, c, plain(24), FIGHT_STAGE_COLORS));
    for (const [index, area] of areas.entries()) {
      expect(area, characters[index]).toBeLessThanOrEqual(ANNOUNCE_LETTER_AREA);
    }
    expect(Math.max(...areas)).toBeGreaterThan(ANNOUNCE_LETTER_AREA * 0.95);
  });

  it("lights no more with the gauge's word than the FINISH plate: its letters and rim", async () => {
    const pixel = await outlinesOf(PIXEL);
    /** The gauge's 8 px word, its stroke of 2 dark (it lights nothing) or `rim`. */
    const word = (text: string, fill: number, rim = 0) =>
      litArea(
        pixel,
        text,
        { size: 8, stroke: 2, drop: 0, fill: { top: fill, bottom: fill }, ink: rim, energy: 0 },
        FIGHT_STAGE_COLORS,
      );
    const platine = 0xf2f6ff;
    const plates = STYLES.map((style) => word(FINISH_WORD, platine, hudColorOf(style)));
    for (const plate of plates) expect(plate).toBeLessThanOrEqual(FINISH_PLATE_AREA);
    expect(Math.max(...plates)).toBeGreaterThan(FINISH_PLATE_AREA * 0.95);
    // BOOST in the energy, MAX in white: less than the plate.
    for (const style of STYLES) {
      expect(word(BOOST_WORD, hudColorOf(style))).toBeLessThan(FINISH_PLATE_AREA);
    }
    expect(word(MAX_WORD, 0xffffff)).toBeLessThan(FINISH_PLATE_AREA);
    // Never a flash on its own, even with the flashes reduced: room for as much again beside it.
    expect(FINISH_PLATE_AREA * 2).toBeLessThan(FLASH_RULES.reduced.area * FLASH_MARGIN);
  });
});

describe('what a blow asks the budget (docs/flashs.md §4)', () => {
  it("shows a special's contact, muted or not; the Ultime, the Finisher and every KO keep their own (P5)", () => {
    const look = (event: Blow) => {
      const ask = blowAsk(event, 'slash', false, 1);
      return [ask.look, ask.muted];
    };
    expect(look(blow({ tier: 1 }))).toEqual(['pinpoint', 'pinpoint']);
    expect(look(blow({ tier: 2, heavy: true, counter: 'counter' }))).toEqual([
      'pinpoint',
      'pinpoint',
    ]);
    expect(look(blow({ tier: 3, heavy: true }))).toEqual(['heavy', 'pulse']);
    expect(look({ ...ko('plain'), tier: 1 })).toEqual(['ko', 'koMuted']);
    expect(look(blow({ tier: 0, heavy: true }))).toEqual(['heavy', 'pulse']);
  });

  it('plays a heavy blow muted as the pulse, a KO as its own, a light one as it is', () => {
    const muted = (event: Blow): SparkLook => blowAsk(event, 'slash', false, 1).muted;
    expect(muted(blow({ heavy: true }))).toBe('pulse');
    expect(muted(blow({ counter: 'counter' }))).toBe('pulse');
    expect(muted(blow())).toBe('light');
    expect(muted(ko('plain'))).toBe('koMuted');
  });

  it("counts a KO and a super's last blow as climaxes, its blows before not", () => {
    const climax = (event: Blow): boolean => blowAsk(event, 'slash', false, 1).climax;
    expect(climax(blow({ tier: 3, heavy: true }))).toBe(true);
    expect(climax(blow({ tier: 3, heavy: true, pulse: true }))).toBe(false);
    expect(climax(blow({ tier: 1, heavy: true }))).toBe(false);
    expect(climax(ko('plain'))).toBe(true);
  });

  it('asks for its spark, word and stamp lit; muted, for the spark alone, the rest calm later', () => {
    const ask = blowAsk(blow({ heavy: true, counter: 'counter' }), 'slash', false, 12);
    expect(ask.area).toBe(
      SPARK_AREAS.slash.heavy + wordArea('heavy', 12, false) + stampArea(false, true),
    );
    expect(ask.mutedArea).toBe(SPARK_AREAS.slash.pulse);
    expect(ask.later).toEqual({ word: wordArea('heavy', 12, true), stamp: stampArea(true) });
    const low = blowAsk(blow({ low: true }), 'slash', true, 1);
    expect(low.area).toBe(GRAZE_AREA + CALM_WORD_AREAS.light.word);
    expect(low.later.stamp).toBe(0);
  });

  it('counts the tally its word shows, one digit after the other', () => {
    const { word, x, digit } = WORD_AREAS.light;
    expect(wordArea('light', 1, true)).toBe(CALM_WORD_AREAS.light.word);
    expect(wordArea('light', 9, false)).toBeCloseTo((word + x + digit) * 1.24 ** 2);
    expect(wordArea('light', 120, false)).toBeCloseTo((word + x + 3 * digit) * 1.24 ** 2);
  });

  it('keeps every muted blow under every area at the closest framing: it never flashes', () => {
    const blows: Blow[] = [
      blow(),
      blow({ heavy: true }),
      blow({ heavy: true, low: true }),
      ko('ultimate'),
      ko('plain', true),
    ];
    for (const shape of ['slash', 'claw'] as const) {
      for (const event of blows) {
        const { mutedArea } = blowAsk(event, shape, true, 1);
        expect(mutedArea * CLOSEST, `${shape} ${JSON.stringify(event)}`).toBeLessThan(
          FLASH_RULES.reduced.area,
        );
        // Pushed in, which only the flashes normal allow.
        expect(mutedArea * PUSHED, `${shape} ${JSON.stringify(event)}`).toBeLessThan(
          FLASH_RULES.normal.area,
        );
      }
    }
  });

  it("flashes close up on a light blow and its calm word: Nayo's, not Riff's", () => {
    const limit = FLASH_RULES.reduced.area * FLASH_MARGIN;
    expect(blowAsk(blow(), 'slash', true, 1).area * CLOSEST).toBeGreaterThan(limit);
    expect(blowAsk(blow(), 'claw', true, 1).area * CLOSEST).toBeLessThan(limit);
    // A heavy one, with its pop, asks in every mode.
    const heavy = blowAsk(blow({ heavy: true }), 'slash', false, 1);
    expect(heavy.area * CLOSEST).toBeGreaterThan(FLASH_RULES.normal.area);
  });
});

describe('what the veils light (docs/flashs.md §4)', () => {
  it("flashes the super's halo on less than 1 200 px², the éclat on far more", () => {
    const halo = glowFlashArea(superHalo(FIGHT_STAGE_COLORS), FIGHT_STAGE_COLORS);
    expect(halo).toBeGreaterThan(300);
    expect(halo).toBeLessThan(1200);
    for (const energy of [0x30e8ff, 0xff4fc8, 0xff3ca0, 0xffc83a]) {
      const eclat = koVeil('ultimate', energy, FIGHT_STAGE_COLORS);
      if (!eclat) throw new Error('No éclat');
      expect(glowFlashArea(eclat, FIGHT_STAGE_COLORS) * CLOSEST).toBeGreaterThan(
        FLASH_RULES.normal.area,
      );
      // Reduced, it lights without flashing; off, or refused, it darkens.
      for (const [mode, lit] of [
        ['reduced', true],
        ['off', true],
        ['normal', false],
      ] as const) {
        const soft = koVeil('ultimate', energy, FIGHT_STAGE_COLORS, mode, lit);
        if (!soft) throw new Error('No éclat');
        expect(glowFlashArea(soft, FIGHT_STAGE_COLORS), `${mode} ${lit}`).toBe(0);
      }
    }
  });
});

describe('what the front effects light (docs/flashs.md §4)', () => {
  it('counts a pixel that flashes over the sky or the ground', () => {
    const pixels = new Uint8ClampedArray([
      // Platine, opaque: it flashes. Half transparent: still. The HUD's black: never.
      0xf2, 0xf6, 0xff, 255, 0xf2, 0xf6, 0xff, 128, 0x0c, 0x06, 0x14, 255, 0, 0, 0, 0,
    ]);
    expect(litPixels(pixels, FIGHT_STAGE_COLORS)).toBe(2);
  });

  it('counts anew only what changes over the frame before, at the same place', () => {
    // Platine where it was already, platine where nothing was, white over a dark violet.
    const before = new Uint8ClampedArray([
      0xf2, 0xf6, 0xff, 255, 0, 0, 0, 0, 0x3a, 0x20, 0x5a, 255,
    ]);
    const after = new Uint8ClampedArray([
      0xf2, 0xf6, 0xff, 255, 0xf2, 0xf6, 0xff, 255, 0xff, 0xff, 0xff, 255,
    ]);
    expect(litPixels(after, FIGHT_STAGE_COLORS)).toBe(3);
    expect(freshPixels(before, after, FIGHT_STAGE_COLORS)).toBe(2);
    // A cyan held a frame more, a little lighter: nothing new.
    const cyan = new Uint8ClampedArray([0x30, 0xe8, 0xff, 255]);
    const lighter = new Uint8ClampedArray([0x40, 0xf0, 0xff, 255]);
    expect(freshPixels(cyan, lighter, FIGHT_STAGE_COLORS)).toBe(0);
  });

  it('lights more than 300 world px² in the specials that rise and the super only', async () => {
    const bright: string[] = [];
    let rings = 0;
    for (const fighter of ['nayo', 'riff'] as const) {
      for (const colorway of ['main', 'alt'] as const) {
        for (const [sheet, frames] of await fxStrips(fighter, colorway)) {
          const peak = Math.max(
            ...frames.map((pixels) => litPixels(pixels, FIGHT_STAGE_COLORS) / ART_SCALE ** 2),
          );
          if (peak > 300) bright.push(`${fighter}/${colorway}/${sheet}`);
          if (fighter === 'nayo' && sheet === 'super') rings = Math.max(rings, peak);
        }
      }
    }
    expect(bright.sort()).toEqual([
      'nayo/alt/specialAntiAir',
      'nayo/alt/specialAntiAirBoost',
      'nayo/alt/super',
      'nayo/main/specialAntiAir',
      'nayo/main/specialAntiAirBoost',
      'nayo/main/super',
      'riff/alt/super',
      'riff/main/super',
    ]);
    // The Mégabasse's last rings flash on their own close up: the budget counts them.
    expect(rings * CLOSEST).toBeGreaterThan(FLASH_RULES.normal.area);
  });

  it('draws them dark under VEIL_DELTA over the stage: no pixel lighter than FX_DARK', () => {
    for (const backdrop of FIGHT_STAGE_COLORS) {
      expect(luminanceDelta(FX_DARK, backdrop, 1)).toBeLessThanOrEqual(VEIL_DELTA);
      expect(luminanceDelta(0x000000, backdrop, 1)).toBeLessThanOrEqual(VEIL_DELTA);
    }
  });
});
