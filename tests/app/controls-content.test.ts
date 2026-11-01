import { describe, expect, it } from 'vitest';
import { helpPages, withArrows, type ControlDevices } from '../../src/app/controls-content';
import { MOVE_IDS } from '../../src/core/move-data';
import { BASICS, MOVE_ORDER, MOVE_TEXTS } from '../../src/data/move-texts';
import { ROSTER } from '../../src/data/roster';

const PHONE: ControlDevices = { touch: true, gamepad: false };

function deviceTitles(devices: ControlDevices): string[] {
  return helpPages(devices)[0]?.sections.map((section) => section.title) ?? [];
}

/** The text of a page, every row's cells put together. */
function textOf(title: string): string {
  const page = helpPages(PHONE).find((candidate) => candidate.title === title);
  if (!page) throw new Error(`No page ${title}`);
  return page.sections.flatMap((section) => section.rows.map((row) => row.join(' '))).join('\n');
}

describe('helpPages', () => {
  it('shows the touch controls on a phone, not the keyboard', () => {
    expect(deviceTitles(PHONE)).toEqual(['Tactile']);
  });

  it('shows the keyboard on a computer, player 2 in a table of their own (L23)', () => {
    expect(deviceTitles({ touch: false, gamepad: false })).toEqual(['Clavier', 'Joueur 2']);
    const player2 = helpPages({ touch: false, gamepad: false })[0]?.sections[1];
    expect(player2?.rows).toContainEqual(['Pavé 1 (ou :)', 'Coup léger (L)']);
    expect(player2?.rows.every(([keys, effect]) => keys.length > 0 && effect.length > 0)).toBe(
      true,
    );
  });

  it('adds the gamepad when one is connected', () => {
    expect(deviceTitles({ touch: false, gamepad: true })).toEqual([
      'Clavier',
      'Joueur 2',
      'Manette',
    ]);
  });

  it('names its first tab after the devices it shows, never « Commandes » again (L23)', () => {
    const tab = (devices: ControlDevices) => helpPages(devices)[0]?.title;
    expect(tab(PHONE)).toBe('Tactile');
    expect(tab({ touch: true, gamepad: true })).toBe('Tactile / manette');
    expect(tab({ touch: false, gamepad: false })).toBe('Clavier');
    expect(tab({ touch: false, gamepad: true })).toBe('Clavier / manette');
  });

  it('has a page « Les bases », then one page per fighter (§17)', () => {
    expect(helpPages(PHONE).map((page) => page.title)).toEqual([
      'Tactile',
      'Les bases',
      ...ROSTER.map((entry) => entry.template.name),
    ]);
    expect(
      helpPages(PHONE)
        .slice(2)
        .map((page) => page.fighter),
    ).toEqual(ROSTER.map((entry) => entry.id));
  });

  it('lists every move of each fighter on its page, by the name in its data', () => {
    for (const { template } of ROSTER) {
      const text = textOf(template.name);
      for (const move of Object.values(template.moves)) expect(text).toContain(move.name);
    }
  });

  it("ends each fighter's page on its combos to learn first, then the super, then its Finisher (combos-v3 §3.2, finisher §5.6)", () => {
    for (const page of helpPages(PHONE).slice(2)) {
      const combos = page.sections.at(-1);
      expect(combos?.title).toBe('Combos');
      expect(combos?.rows[0]).toEqual(['L, L, L', expect.any(String)]);
      expect(combos?.rows).toHaveLength(7);
      expect(combos?.rows.slice(0, -2).join(' ')).not.toMatch(/BOOST/);
      expect(combos?.rows.at(-2)?.[0]).toMatch(/arrière \+ BOOST \(3 barres\)$/);
      expect(combos?.rows.at(-1)?.[0]).toMatch(/arrière \+ BOOST \(FINISH allumé\)$/);
    }
  });

  it('tells the Finisher in « Les bases », in the super of each fighter, and in its demo line (finisher §5.6)', () => {
    expect(textOf('Les bases')).toMatch(/Finisher .*balle de match.*FINISH remplace MAX/);
    expect(textOf('Les bases')).toContain("tu vois le gel et tu n'attaques pas, pare");
    expect(textOf('Nayo')).toMatch(/Mégabasse : .*Le Quatre/);
    expect(textOf('Riff')).toMatch(/Slam : .*Larsen/);
    expect(textOf('Nayo')).toContain("l'adversaire tombe sur le quatre");
    expect(textOf('Riff')).toContain('toute la salle saute sur ton temps');
  });

  it('shows BOOST on every device (combos-v3 §1.8.5)', () => {
    const devices = [PHONE, { touch: false, gamepad: true }];
    const rows = devices.flatMap((device) => helpPages(device)[0]?.sections ?? []);
    for (const { title, rows: controls } of rows) {
      expect(controls.join(' '), title).toMatch(/Boost|BOOST/);
    }
    expect(textOf('Les bases')).toContain('BOOST');
  });

  it("fits each fighter's lists on a phone held sideways, one under the other", () => {
    // Press Start 2P draws every glyph 8 px wide at 8 px, and a cell has 4 px on each side. An
    // input never wraps; the text wraps between words. 536 px: a 568 px wide screen, less the
    // menu's 16 px on each side.
    const GLYPH = 8;
    const CELL = 8;
    const PHONE_PX = 536;
    const longest = (texts: readonly string[]): number =>
      Math.max(...texts.map((text) => text.length));
    for (const page of helpPages(PHONE).filter((candidate) => candidate.fighter)) {
      for (const { title, rows } of page.sections) {
        const inputs = rows.map(([input]) => input);
        const words = rows.flatMap(([, text]) => text.split(' '));
        const width = (longest(inputs) + longest(words)) * GLYPH + 2 * CELL;
        expect(width, `${page.title}, ${title}`).toBeLessThanOrEqual(PHONE_PX);
      }
    }
  });

  it('calls the special of the button and of ↓↘→ the Vinyle, for Nayo', () => {
    expect(textOf('Nayo')).toContain('Vinyle');
    expect(textOf('Nayo')).not.toMatch(/onde sonore :/i);
  });
});

/** Capital letters with an accent: Press Start 2P has none (its 8 px cell has no room). */
const CAPITAL_ACCENTED = /[\u00c0-\u00d6\u00d8-\u00de\u0152]/u;

describe('move texts', () => {
  it('give every move of each fighter a text and a way to do it, in page order', () => {
    expect([...MOVE_ORDER].sort()).toEqual([...MOVE_IDS].sort());
    for (const { id, template } of ROSTER) {
      for (const move of MOVE_IDS.filter((move) => template.moves[move])) {
        const text = MOVE_TEXTS[id].moves[move];
        expect(text?.input.length, `${id} ${move}`).toBeGreaterThan(0);
        expect(text?.text.length, `${id} ${move}`).toBeGreaterThan(20);
      }
    }
  });

  it('give every basic and every combo more than 20 characters, none a capital accented (finisher §5.8, test 18)', () => {
    const rows = [
      ...BASICS,
      ...ROSTER.flatMap(({ id }) => MOVE_TEXTS[id].combos.map(({ input, text }) => [input, text])),
    ];
    for (const [title, text] of rows) expect(text.length, title).toBeGreaterThan(20);
    const shown = helpPages(PHONE).flatMap((page) => [
      page.title,
      ...page.sections.flatMap((section) => [section.title, ...section.rows.flat()]),
    ]);
    expect(shown.filter((text) => CAPITAL_ACCENTED.test(text))).toEqual([]);
    expect(CAPITAL_ACCENTED.test('Écran')).toBe(true);
  });
});

describe('withArrows', () => {
  it('cuts a help text into plain text and turned arrows, in order', () => {
    expect(withArrows('↓↘→ + un coup')).toEqual([
      { turn: 180, label: 'bas' },
      { turn: 135, label: 'bas-avant' },
      { turn: 90, label: 'avant' },
      ' + un coup',
    ]);
    expect(withArrows('L → H')).toEqual(['L ', { turn: 90, label: 'avant' }, ' H']);
    expect(withArrows('Sans flèche')).toEqual(['Sans flèche']);
  });
});
