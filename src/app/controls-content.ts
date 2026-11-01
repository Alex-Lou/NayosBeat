/**
 * Help content for the "Commandes" screen, in pages: the controls of the devices in use, the
 * basics, then one page per fighter with every move (docs/combat-v2.md §17).
 */

import { BASICS, MOVE_ORDER, MOVE_TEXTS } from '../data/move-texts';
import { ROSTER, type FighterId, type RosterEntry } from '../data/roster';
import { connectedGamepads } from '../input/gamepad';
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

/** Physical key positions: the AZERTY names come first, QWERTY ones in parentheses. */
const KEYBOARD: HelpSection = {
  title: 'Clavier',
  rows: [
    ['Z Q S D', 'Se déplacer (W A S D en QWERTY)'],
    ['Z, Espace', 'Sauter'],
    ['S', "S'accroupir"],
    ['J', 'Coup léger (L) : rapide'],
    ['K', 'Coup lourd (H) : fort mais lent'],
    ['L', 'Coup spécial (S)'],
    ['I, J + K', "Prise : saisir l'adversaire de près, puis le frapper ou le lancer"],
    ['O', 'Boost : un Remix de ton spécial, ou ta super avec arrière (la jauge sous ta vie)'],
    ['Maj gauche', 'Dash ; avec arrière : bond en retrait'],
    ['2 fois avant', 'Dash aussi (2 fois arrière : bond en retrait)'],
    ['Echap, P', 'Pause'],
  ],
};

/** Player 2 on the same keyboard (input/keyboard.ts): the keypad, or the keys around right Shift. */
const PLAYER2: HelpSection = {
  title: 'Joueur 2',
  rows: [
    ['Flèches', 'Se déplacer, haut pour sauter'],
    ['Pavé 1 (ou :)', 'Coup léger (L)'],
    ['Pavé 2 (ou !)', 'Coup lourd (H)'],
    ['Pavé 3 (ou ù)', 'Coup spécial (S)'],
    ['Pavé 4 (ou M)', 'Prise'],
    ['Pavé 6 (ou ^)', 'Boost'],
    ['Pavé 0 (ou Maj droite)', 'Dash'],
  ],
};

const GAMEPAD: HelpSection = {
  title: 'Manette',
  rows: [
    ['Flèches, stick', 'Se déplacer'],
    ['A (Croix)', 'Sauter'],
    ['X (Carré)', 'Coup léger (L) : rapide'],
    ['Y (Triangle)', 'Coup lourd (H) : fort mais lent'],
    ['B (Rond)', 'Coup spécial (S)'],
    ['RB (R1), X + Y', "Prise : saisir l'adversaire de près, puis le frapper ou le lancer"],
    ['RT (R2)', 'Boost : un Remix de ton spécial, ou ta super avec arrière (la jauge sous ta vie)'],
    ['LB (L1)', 'Dash ; avec arrière : bond en retrait. Deux fois avant ou arrière aussi'],
    ['Start', 'Pause'],
  ],
};

/**
 * The devices in use: touch on phones, keyboard otherwise (player 2's too), gamepad if one is on.
 * Named after them, its tab says what it shows (docs/polish/AUDIT-ET-PLAN.md, L23).
 */
function devicePage(devices: ControlDevices): HelpPage {
  const sections = devices.touch ? [TOUCH] : [KEYBOARD, PLAYER2];
  if (devices.gamepad) sections.push(GAMEPAD);
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

/** The pages of the screen, in order: devices, « Les bases », then each fighter. */
export function helpPages(devices: ControlDevices): HelpPage[] {
  return [
    devicePage(devices),
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
