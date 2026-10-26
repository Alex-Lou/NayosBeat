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
    ['CHOPE', "Saisir l'adversaire de près"],
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
    ['J + K', "Chope : saisir l'adversaire de près"],
    ['Echap, P', 'Pause'],
    ['Joueur 2', 'Flèches, et pavé 1 / 2 / 3 (ou : ! ù) pour léger, lourd, spécial'],
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
    ['RB (R1), X + Y', "Chope : saisir l'adversaire de près"],
    ['Start', 'Pause'],
  ],
};

/** "Onde sonore / Ruée": the same move for every fighter of the roster. */
function moveNames(pick: (moves: FighterTemplate['moves']) => { readonly name: string }): string {
  return ROSTER.map((entry) => pick(entry.template.moves).name).join(' / ');
}

function combatSection(): HelpSection {
  return {
    title: 'Combattre',
    rows: [
      [
        'Parer',
        "Maintiens arrière (loin de l'adversaire) : accroupi contre les coups bas, debout contre les sauts",
      ],
      ['Spécial seul', moveNames((m) => m.special)],
      ['Avant + spécial', moveNames((m) => m.specialForward)],
      ['Bas + spécial', `${moveNames((m) => m.specialAntiAir)} : invincible, contre les sauts`],
      ['Enchaîner', "Un léger qui touche s'enchaîne sur un coup ou un spécial"],
      ['Chope', "Imparable ; deux chopes simultanées s'annulent"],
    ],
  };
}

/** Shows only the devices in use: touch on phones, keyboard otherwise, gamepad if one is on. */
export function helpSections(devices: ControlDevices): HelpSection[] {
  const sections = [devices.touch ? TOUCH : KEYBOARD];
  if (devices.gamepad) sections.push(GAMEPAD);
  sections.push(combatSection());
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
