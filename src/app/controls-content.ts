/** Help content for the "Commandes" screen, adapted to the devices in use. */

import type { FighterTemplate } from '../core/config';
import { ROSTER } from '../data/roster';
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
    ['J', 'Coup léger : rapide'],
    ['K', 'Coup lourd : fort mais lent'],
    ['L', 'Coup spécial'],
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
    ['X (Carré)', 'Coup léger : rapide'],
    ['Y (Triangle)', 'Coup lourd : fort mais lent'],
    ['B (Rond)', 'Coup spécial'],
    ['RB (R1), X + Y', "Prise : saisir et projeter l'adversaire de près"],
    ['LB (L1)', 'Dash ; avec arrière : bond en retrait. Deux fois avant ou arrière aussi'],
    ['Start', 'Pause'],
  ],
};

/** "Onde sonore / Ruée": the same move for every fighter of the roster. */
function moveNames(pick: (moves: FighterTemplate['moves']) => { readonly name: string }): string {
  return ROSTER.map((entry) => pick(entry.template.moves).name).join(' / ');
}

/** What every fighter can do, whatever the device ("Les bases"). */
function basicsSection(): HelpSection {
  return {
    title: 'Les bases',
    rows: [
      [
        'Parer',
        "Maintiens arrière (loin de l'adversaire) : accroupi contre les coups bas, debout contre les sauts",
      ],
      [
        'DASH',
        "Ou deux fois avant : un bond rapide vers l'adversaire. Avec arrière (ou deux fois arrière), un bond en retrait qui fait rater les prises, mais pas les coups",
      ],
      ['Spécial seul', moveNames((m) => m.special)],
      ['Avant + spécial', moveNames((m) => m.specialForward)],
      ['Bas + spécial', `${moveNames((m) => m.specialAntiAir)} : invincible, contre les sauts`],
      ['Enchaîner', "Un léger qui touche s'enchaîne sur un coup ou un spécial"],
      [
        'PRISE',
        "Ou L + H, de tout près : imparable ; deux prises simultanées s'annulent. On ne peut pas saisir quelqu'un qui sort d'un coup reçu ou paré",
      ],
    ],
  };
}

/** Shows only the devices in use: touch on phones, keyboard otherwise, gamepad if one is on. */
export function helpSections(devices: ControlDevices): HelpSection[] {
  const sections = [devices.touch ? TOUCH : KEYBOARD];
  if (devices.gamepad) sections.push(GAMEPAD);
  sections.push(basicsSection());
  return sections;
}

export function controlsContent(): HTMLElement {
  const devices = { touch: isTouchDevice(), gamepad: connectedGamepads().length > 0 };
  const container = document.createElement('div');
  container.className = 'controls';
  for (const section of helpSections(devices)) container.appendChild(sectionElement(section));
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
