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
    ['PRISE', "Saisir et projeter l'adversaire de près"],
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
    ['I, J + K', "Prise : saisir et projeter l'adversaire de près"],
    ['Maj gauche', 'Dash ; avec arrière : bond en retrait'],
    ['2 fois avant', 'Dash aussi (2 fois arrière : bond en retrait)'],
    ['Echap, P', 'Pause'],
    [
      'Joueur 2',
      'Flèches ; pavé 1 / 2 / 3 (ou : ! ù) léger, lourd, spécial ; pavé 4 (ou M) prise ; pavé 0 (ou Maj droite) dash',
    ],
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
    ['RB (R1), X + Y', "Prise : saisir et projeter l'adversaire de près"],
    ['LB (L1)', 'Dash ; avec arrière : bond en retrait. Deux fois avant ou arrière aussi'],
    ['Start', 'Pause'],
  ],
};

/** The devices in use: touch on phones, keyboard otherwise, gamepad if one is on. */
function devicePage(devices: ControlDevices): HelpPage {
  const sections = [devices.touch ? TOUCH : KEYBOARD];
  if (devices.gamepad) sections.push(GAMEPAD);
  return { title: 'Commandes', sections };
}

/** Every move of a fighter: how to do it, its name (from its data), what it is for. */
function fighterPage({ id, template }: RosterEntry): HelpPage {
  const texts = MOVE_TEXTS[id];
  const rows = MOVE_ORDER.map((move): readonly [string, string] => {
    const { input, text } = texts.moves[move];
    return [input, `${template.moves[move].name} : ${text}`];
  });
  return { title: template.name, sections: [{ title: texts.title, rows }], fighter: id };
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
  container.className = 'controls';
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
    tr.insertCell().textContent = control;
    tr.insertCell().textContent = effect;
  }
  section.append(heading, table);
  return section;
}
