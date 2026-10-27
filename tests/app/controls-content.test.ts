import { describe, expect, it } from 'vitest';
import { helpPages, withArrows, type ControlDevices } from '../../src/app/controls-content';
import { MOVE_IDS } from '../../src/core/move-data';
import { MOVE_ORDER, MOVE_TEXTS } from '../../src/data/move-texts';
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

  it('shows the keyboard on a computer', () => {
    expect(deviceTitles({ touch: false, gamepad: false })).toEqual(['Clavier']);
  });

  it('adds the gamepad when one is connected', () => {
    expect(deviceTitles({ touch: false, gamepad: true })).toEqual(['Clavier', 'Manette']);
  });

  it('has a page « Les bases », then one page per fighter (§17)', () => {
    expect(helpPages(PHONE).map((page) => page.title)).toEqual([
      'Commandes',
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

  it('calls the special of the button and of ↓↘→ the Vinyle, for Nayo', () => {
    expect(textOf('Nayo')).toContain('Vinyle');
    expect(textOf('Nayo')).not.toMatch(/onde sonore :/i);
  });
});

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
