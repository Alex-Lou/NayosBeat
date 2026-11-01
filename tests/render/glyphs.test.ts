import { describe, expect, it } from 'vitest';
import { DUMMY_HEALTHS, TRAINING_FINISHERS } from '../../src/app/match-setup';
import { FLASH_LABELS, NOTICE, SHAKE_LABELS, STAGING_LABELS } from '../../src/app/comfort';
import { helpPages, withArrows } from '../../src/app/controls-content';
import type { RoundState } from '../../src/core/state';
import { ROSTER } from '../../src/data/roster';
import { BOOST_WORD, FINISH_WORD, MAX_WORD } from '../../src/render/boost-gauge';
import { announcementOf, comboText, HOLD_PROMPT, NO_TIMER } from '../../src/render/hud-text';
import { advantageText } from '../../src/render/advantage-meter';
import { buttonsOf } from '../../src/render/input-history';
import { Input } from '../../src/core/input';
import { wordFor, type BlowKind } from '../../src/render/onomatopoeia';
import { boostStamp, STAMP_TEXTS } from '../../src/render/stamps';
import { noteText } from '../../src/render/training-combo';
import { NOTES } from './finisher-notes';
import { glyphsOf } from './font-glyphs';

/**
 * Canvas text is drawn once, in its font, without a fallback that would show (docs/combat-v2.md
 * §7.9): every string the HUD can write uses only letters Press Start 2P has, and no capital
 * accented one (its 8 px cell leaves no room above the capital: the accent is lost), every
 * comic word only letters Bangers has. The subsets the game loads (main.ts), read from their
 * files.
 */

const FONTS = new URL('../../node_modules/@fontsource/', import.meta.url);
const PIXEL = new URL('press-start-2p/files/press-start-2p-latin-400-normal.woff', FONTS);
const COMIC = new URL('bangers/files/bangers-latin-400-normal.woff', FONTS);

function missing(glyphs: ReadonlySet<number>, texts: readonly string[]): string[] {
  return texts.filter((text) =>
    Array.from(text).some((char) => !glyphs.has(char.codePointAt(0) ?? 0)),
  );
}

/** Capital letters with an accent, "É" and the like: written "E" on the HUD ("EGALITE"). */
const CAPITAL_ACCENTED = /[\u00c0-\u00d6\u00d8-\u00de\u0152]/u;

const round = (overrides: Partial<RoundState>): RoundState => ({
  number: 1,
  wins: [0, 0],
  timer: 0,
  phase: 'fight',
  phaseFrame: 0,
  result: null,
  ...overrides,
});

/** Every string the HUD and the training captions can show. */
function hudTexts(): string[] {
  const names = [ROSTER[0]?.template.name ?? '', ROSTER[1]?.template.name ?? ''] as const;
  const rounds: RoundState[] = [
    round({ phase: 'intro', number: 3 }),
    round({ phase: 'intro', phaseFrame: 80 }),
    ...([0, 1, null] as const).flatMap((winner) =>
      (['ko', 'timeout'] as const).map((reason) =>
        round({ phase: 'roundEnd', result: { winner, reason } }),
      ),
    ),
    round({ phase: 'matchEnd', wins: [2, 0], result: { winner: 0, reason: 'ko' } }),
    round({ phase: 'matchEnd', wins: [1, 2], result: { winner: 1, reason: 'ko' } }),
  ];
  return [
    ...rounds.map((state) => announcementOf(state, names)),
    NO_TIMER,
    '0123456789',
    // The training reminder of a hold, and its arrow (a turned ↑).
    HOLD_PROMPT,
    '↑',
    comboText(1, 30),
    comboText(12, 345),
    // What the training line says of its super (docs/finisher.md §1.12).
    ...NOTES.map((note) => comboText(12, 1000, noteText(note))),
    // The advantage of an exchange (advantage-meter.ts): ahead, behind, even.
    advantageText(2),
    advantageText(-23),
    advantageText(0),
    // The input history of training (input-history.ts): every button and two-digit ticks.
    buttonsOf(
      Input.Light |
        Input.Heavy |
        Input.Special |
        Input.Grab |
        Input.Dash |
        Input.Boost |
        Input.Jump,
    ),
    // The Boost gauge under each health bar (docs/combos-v3.md §1.8.6), and the Finisher's
    // plate (docs/finisher.md §1.2).
    BOOST_WORD,
    MAX_WORD,
    FINISH_WORD,
    ...ROSTER.flatMap(({ template }) => [
      template.name,
      ...Object.values(template.moves).map((move) => move.name),
    ]),
  ];
}

describe('glyphs', () => {
  it('of every HUD string and move name are in the pixel font', async () => {
    const texts = hudTexts();
    expect(texts).toContain('EGALITE');
    expect(missing(await glyphsOf(PIXEL), texts)).toEqual([]);
  });

  it('of the HUD have no capital accented letter', () => {
    expect(hudTexts().filter((text) => CAPITAL_ACCENTED.test(text))).toEqual([]);
    expect(CAPITAL_ACCENTED.test('ÉGALITÉ')).toBe(true);
  });

  it('of every help text are in the pixel font, its arrows drawn as a turned ↑', async () => {
    const devices = [false, true].flatMap((touch) =>
      [false, true].map((gamepad) => ({ touch, gamepad })),
    );
    const texts = devices.flatMap((device) =>
      helpPages(device).flatMap((page) => [
        page.title,
        ...page.sections.flatMap((section) => [section.title, ...section.rows.flat()]),
      ]),
    );
    const shown = texts.map((text) =>
      withArrows(text)
        .map((part) => (typeof part === 'string' ? part : '↑'))
        .join(''),
    );
    expect(texts.some((text) => text.includes('↘'))).toBe(true);
    expect(missing(await glyphsOf(PIXEL), shown)).toEqual([]);
  });

  it('of the options and the notice are in the pixel font, without a capital accented', async () => {
    const texts = [
      NOTICE.title,
      NOTICE.text,
      ...Object.values(FLASH_LABELS).flatMap(({ label, hint }) => [
        `Effets de flash : ${label}`,
        hint,
      ]),
      ...Object.values(SHAKE_LABELS).flatMap(({ label, hint }) => [
        `Tremblement de l'écran : ${label}`,
        hint,
      ]),
      ...Object.values(STAGING_LABELS).flatMap(({ label, hint }) => [
        `Mise en scène : ${label}`,
        hint,
      ]),
      // Training's menu (docs/finisher.md §5.7).
      ...TRAINING_FINISHERS.map(({ label }) => `Finisher : ${label}`),
      ...DUMMY_HEALTHS.map((health) => `Vie du mannequin : ${health} %`),
    ];
    expect(missing(await glyphsOf(PIXEL), texts)).toEqual([]);
    expect(texts.filter((text) => CAPITAL_ACCENTED.test(text))).toEqual([]);
  });

  it('of every comic word, its tally and the stamps are in the comic font', async () => {
    const kinds: BlowKind[] = ['light', 'heavy', 'ko', 'pulse'];
    const words = kinds.flatMap((kind) =>
      Array.from({ length: 8 }, (_, count) => `${wordFor(kind, count + 1)} !`),
    );
    // The Boost moves that say their names: the Rewinds and the supers.
    const named = ROSTER.flatMap(({ template }) =>
      [template.moves.boostCancel, template.moves.super].flatMap((move) =>
        move ? [boostStamp(move.name)] : [],
      ),
    );
    const stamps = [...Object.values(STAMP_TEXTS), ...named];
    expect(stamps).toContain('DÉGAGEMENT !');
    expect(stamps).toContain('MÉGABASSE !');
    expect(missing(await glyphsOf(COMIC), [...words, ...stamps, 'x0123456789'])).toEqual([]);
  });
});
