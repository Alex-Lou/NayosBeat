/**
 * Help content for the "Commandes" screen, in pages: the controls of the devices in use, the
 * basics, then one page per fighter with every move (docs/combat-v2.md §17).
 */

import { BASICS, MOVE_ORDER, MOVE_TEXTS } from '../data/move-texts';
import { ROSTER, type FighterId, type RosterEntry } from '../data/roster';
import {
  DEFAULT_BINDINGS,
  DIRECTION_ACTIONS,
  PAD_ACTIONS,
  type Action,
  type Bindings,
  type KeyMap,
  type PadAction,
  type PadMap,
} from '../input/bindings';
import { connectedGamepads } from '../input/gamepad';
import { padButtonName } from '../input/gamepad-buttons';
import { keyName, qwertyName } from '../input/key-names';
import { isTouchDevice } from '../input/touch-controls';

export interface ControlDevices {
  readonly touch: boolean;
  readonly gamepad: boolean;
}

/** A titled list of [control, what it does] rows. */
export interface HelpSection {
  readonly title: string;
  readonly rows: readonly (readonly [string, string])[];
}

/** One page of the screen; a fighter's page tells whose it is. */
export interface HelpPage {
  readonly title: string;
  readonly sections: readonly HelpSection[];
  readonly fighter?: FighterId;
}

const TOUCH: HelpSection = {
  // The pixel font has no capital É: "Écran" would show as "écran".
  title: 'Tactile',
  rows: [
    ['Joystick', "Moitié gauche : bouger, haut pour sauter, bas pour s'accroupir"],
    ['L', 'Coup léger : rapide'],
    ['H', 'Coup lourd : fort mais lent'],
    ['S', 'Coup spécial'],
    ['SAUT', 'Sauter'],
    ['DASH', "Bond vers l'adversaire ; joystick en arrière + DASH : bond en retrait"],
    ['2 fois avant', 'Joystick, en repassant au centre : dash aussi (2 fois arrière : retrait)'],
    ['PRISE', "Saisir l'adversaire de près, puis le frapper ou le lancer"],
    [
      'BOOST',
      'Dépenser la jauge : un Remix de ton spécial, ou ta super avec le joystick en arrière',
    ],
    ['II', 'Pause'],
  ],
};

/** The four directions, in the order the help writes them (Z Q S D). */
const MOVE_ORDER_KEYS: readonly Action[] = ['up', 'left', 'down', 'right'];
const ARROW_KEYS: readonly string[] = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];

/** An action's keys, by name: the first, the others in parentheses (« Pavé 1 (ou :) »). */
function keysOf(keys: KeyMap, action: Action): string {
  const [first, ...others] = keys[action].map(keyName);
  if (first === undefined) return '';
  return others.length > 0 ? `${first} (ou ${others.join(', ')})` : first;
}

/** The four directions' keys: « Flèches » when they are the arrows, each named otherwise. */
function directionsOf(keys: KeyMap): string {
  const codes = MOVE_ORDER_KEYS.map((action) => keys[action][0] ?? '');
  if (codes.every((code, at) => code === ARROW_KEYS[at])) return 'Flèches';
  return codes.map(keyName).join(' ');
}

/** What the keys `codes` are called on QWERTY, when it differs: « (W A S D en QWERTY) ». */
function qwertyHint(codes: readonly string[]): string {
  if (codes.every((code) => qwertyName(code) === keyName(code))) return '';
  return ` (${codes.map(qwertyName).join(' ')} en QWERTY)`;
}

/**
 * A row for each action that has a key: `[keys, what it does]`, its keys in the player's
 * bindings. The QWERTY names follow where they differ, on the directions (the keys every player
 * looks for first) and on any other key that is not one of them.
 */
function keyRow(
  keys: KeyMap,
  actions: readonly Action[],
  text: string,
  hints = true,
): [string, string][] {
  const codes = actions.flatMap((action) => keys[action]);
  if (codes.length === 0) return [];
  const cell = actions.map((action) => keysOf(keys, action)).join(', ');
  if (!hints) return [[cell, text]];
  const directions = new Set(DIRECTION_ACTIONS.flatMap((action) => keys[action]));
  const others = codes.filter((code) => !directions.has(code));
  const isMove = actions.every((action) => DIRECTION_ACTIONS.includes(action));
  const hint = qwertyHint(isMove ? codes : others);
  return [[cell, `${text}${hint}`]];
}

/** Player 1 on the keyboard. Physical key positions: AZERTY names first, QWERTY ones after. */
function keyboardSection(keys: KeyMap): HelpSection {
  const moves = MOVE_ORDER_KEYS.flatMap((action) => keys[action]);
  return {
    title: 'Clavier',
    rows: [
      [directionsOf(keys), `Se déplacer${qwertyHint(moves)}`],
      ...keyRow(keys, ['up', 'jump'], 'Sauter'),
      ...keyRow(keys, ['down'], "S'accroupir"),
      ...keyRow(keys, ['light'], 'Coup léger (L) : rapide'),
      ...keyRow(keys, ['heavy'], 'Coup lourd (H) : fort mais lent'),
      ...keyRow(keys, ['special'], 'Coup spécial (S)'),
      ...grabRow(keys),
      ...keyRow(
        keys,
        ['boost'],
        'Boost : un Remix de ton spécial, ou ta super avec arrière (la jauge sous ta vie)',
      ),
      ...keyRow(keys, ['dash'], 'Dash ; avec arrière : bond en retrait'),
      ['2 fois avant', 'Dash aussi (2 fois arrière : bond en retrait)'],
      ['Echap, P', 'Pause'],
    ],
  };
}

/** The grab's key, and light + heavy together, which grab too. */
function grabRow(keys: KeyMap): [string, string][] {
  const light = keyName(keys.light[0] ?? '');
  const heavy = keyName(keys.heavy[0] ?? '');
  const both = keys.light.length > 0 && keys.heavy.length > 0 ? `${light} + ${heavy}` : '';
  const grab = keysOf(keys, 'grab');
  const cell = [grab, both].filter((part) => part !== '').join(', ');
  const hint = qwertyHint(keys.grab);
  return [[cell, `Prise : saisir l'adversaire de près, puis le frapper ou le lancer${hint}`]];
}

/**
 * Player 2 on the same keyboard (input/bindings.ts): the keypad, or the keys around right Shift.
 * A short table, without the QWERTY names: its keys are mostly the keypad's.
 */
function player2Section(keys: KeyMap): HelpSection {
  const row = (action: Action, text: string) => keyRow(keys, [action], text, false);
  return {
    title: 'Joueur 2',
    rows: [
      [directionsOf(keys), 'Se déplacer, haut pour sauter'],
      ...row('jump', 'Sauter'),
      ...row('light', 'Coup léger (L)'),
      ...row('heavy', 'Coup lourd (H)'),
      ...row('special', 'Coup spécial (S)'),
      ...row('grab', 'Prise'),
      ...row('boost', 'Boost'),
      ...row('dash', 'Dash'),
    ],
  };
}

/** A gamepad: the directions on the d-pad and the stick, the buttons as `pad` binds them. */
function gamepadSection(pad: PadMap, title: string): HelpSection {
  const name = (action: PadAction) => padButtonName(pad[action]);
  const short = (action: PadAction) => padButtonName(pad[action], true);
  return {
    title,
    rows: [
      ['Flèches, stick', 'Se déplacer'],
      [name('jump'), 'Sauter'],
      [name('light'), 'Coup léger (L) : rapide'],
      [name('heavy'), 'Coup lourd (H) : fort mais lent'],
      [name('special'), 'Coup spécial (S)'],
      [
        `${name('grab')}, ${short('light')} + ${short('heavy')}`,
        "Prise : saisir l'adversaire de près, puis le frapper ou le lancer",
      ],
      [
        name('boost'),
        'Boost : un Remix de ton spécial, ou ta super avec arrière (la jauge sous ta vie)',
      ],
      [name('dash'), 'Dash ; avec arrière : bond en retrait. Deux fois avant ou arrière aussi'],
      ['Start', 'Pause'],
    ],
  };
}

/** Player 2's gamepad, when it is not bound as player 1's: its own table. */
function samePad(a: PadMap, b: PadMap): boolean {
  return PAD_ACTIONS.every((action) => a[action] === b[action]);
}

/**
 * The devices in use: touch on phones, keyboard otherwise (player 2's too), gamepad if one is on.
 * Named after them, its tab says what it shows (docs/polish/AUDIT-ET-PLAN.md, L23).
 */
function devicePage(devices: ControlDevices, bindings: Bindings): HelpPage {
  const [keys1, keys2] = bindings.keyboard;
  const [pad1, pad2] = bindings.pad;
  const sections = devices.touch ? [TOUCH] : [keyboardSection(keys1), player2Section(keys2)];
  if (devices.gamepad) {
    const both = samePad(pad1, pad2);
    sections.push(gamepadSection(pad1, both ? 'Manette' : 'Manette J1'));
    if (!both) sections.push(gamepadSection(pad2, 'Manette J2'));
  }
  const title = `${devices.touch ? 'Tactile' : 'Clavier'}${devices.gamepad ? ' / manette' : ''}`;
  return { title, sections };
}

/**
 * Every move of a fighter: how to do it, its name (from its data), what it is for; then its
 * combos to learn first (docs/combos-v3.md §3.2).
 */
function fighterPage({ id, template }: RosterEntry): HelpPage {
  const texts = MOVE_TEXTS[id];
  const rows: (readonly [string, string])[] = [];
  for (const id of MOVE_ORDER) {
    // The optional moves it has: a fighter without one plays its standing normal instead.
    const move = template.moves[id];
    const help = texts.moves[id];
    if (move && help) rows.push([help.input, `${move.name} : ${help.text}`]);
  }
  const combos = texts.combos.map(({ input, text }) => [input, text] as const);
  return {
    title: template.name,
    sections: [
      { title: texts.title, rows },
      { title: 'Combos', rows: combos },
    ],
    fighter: id,
  };
}

/**
 * The pages of the screen, in order: devices, « Les bases », then each fighter. The devices'
 * page says the keys and buttons of `bindings`, the player's own.
 */
export function helpPages(
  devices: ControlDevices,
  bindings: Bindings = DEFAULT_BINDINGS,
): HelpPage[] {
  return [
    devicePage(devices, bindings),
    { title: 'Les bases', sections: [{ title: 'Les bases', rows: BASICS }] },
    ...ROSTER.map(fighterPage),
  ];
}

export function currentDevices(): ControlDevices {
  return { touch: isTouchDevice(), gamepad: connectedGamepads().length > 0 };
}

export function controlsContent(page: HelpPage): HTMLElement {
  const container = document.createElement('div');
  // A fighter's page: its lists one under the other (styles.css).
  container.className = page.fighter ? 'controls controls-fighter' : 'controls';
  for (const section of page.sections) container.appendChild(sectionElement(section));
  return container;
}

function sectionElement({ title, rows }: HelpSection): HTMLElement {
  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = title;
  const table = document.createElement('table');
  for (const [control, effect] of rows) {
    const tr = table.insertRow();
    fillWithArrows(tr.insertCell(), control);
    fillWithArrows(tr.insertCell(), effect);
  }
  section.append(heading, table);
  return section;
}

/** A direction written as an arrow: how far its ↑ turns, and what it says aloud. */
export interface Arrow {
  readonly turn: number;
  readonly label: string;
}

/**
 * The directions the help writes as arrows ("→" is toward the opponent). The pixel font only
 * has ↑ and ↓, and the browser's fallback draws the others tiny: each arrow is the font's ↑,
 * turned by steps of 45°.
 */
const ARROWS: Readonly<Record<string, Arrow>> = {
  '↑': { turn: 0, label: 'haut' },
  '↗': { turn: 45, label: 'haut-avant' },
  '→': { turn: 90, label: 'avant' },
  '↘': { turn: 135, label: 'bas-avant' },
  '↓': { turn: 180, label: 'bas' },
  '↙': { turn: 225, label: 'bas-arrière' },
  '←': { turn: 270, label: 'arrière' },
  '↖': { turn: 315, label: 'haut-arrière' },
};

/** A help text cut into plain text and arrows, in order. */
export function withArrows(text: string): (string | Arrow)[] {
  const parts: (string | Arrow)[] = [];
  let plain = '';
  for (const char of text) {
    const arrow = ARROWS[char];
    if (!arrow) {
      plain += char;
      continue;
    }
    if (plain) parts.push(plain);
    plain = '';
    parts.push(arrow);
  }
  if (plain) parts.push(plain);
  return parts;
}

function fillWithArrows(cell: HTMLElement, text: string): void {
  for (const part of withArrows(text)) {
    if (typeof part === 'string') {
      cell.append(part);
      continue;
    }
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.dataset['turn'] = String(part.turn);
    arrow.setAttribute('role', 'img');
    arrow.setAttribute('aria-label', part.label);
    arrow.textContent = '↑';
    cell.append(arrow);
  }
}
