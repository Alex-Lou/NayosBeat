/** Static help content for the "Commandes" screen. */

const CONTROLS: readonly (readonly [string, string, string, string])[] = [
  ['Action', 'Clavier J1', 'Manette', 'Tactile'],
  ['Se déplacer', 'ZQSD / WASD', 'Croix, stick', 'Joystick'],
  ['Sauter', 'Z / W, Espace', 'A / ✕', 'SAUT'],
  ['Coup léger', 'J', 'X / □', 'L'],
  ['Coup lourd', 'K', 'Y / △', 'H'],
  ['Spécial', 'L', 'B / ○', 'S'],
  ['Chope', 'J + K', 'RB / R1', 'CHOPE'],
  ['Garde', 'Arrière', 'Arrière', 'Arrière'],
  ['Pause', 'Échap / P', 'Start', 'II'],
];

const MOVES: readonly (readonly [string, string])[] = [
  ['Spécial neutre', 'S, ou ↓ ↘ → + coup'],
  ['Spécial avant', '→ + S'],
  ['Anti-air invincible', '↓ + S, ou → ↓ ↘ + coup'],
  ['Enchaîner', 'Léger → coup ou spécial, lourd → spécial'],
  ['Parer bas / sauté', 'Accroupi contre les coups bas, debout contre les sauts'],
];

export function controlsContent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'controls';
  container.append(table(CONTROLS, true), table(MOVES, false));

  const note = document.createElement('p');
  note.className = 'controls-note';
  note.textContent = 'Joueur 2 au clavier : flèches, pavé 1 / 2 / 3 (ou : ! ù en AZERTY).';
  container.appendChild(note);
  return container;
}

function table(rows: readonly (readonly string[])[], withHeader: boolean): HTMLTableElement {
  const element = document.createElement('table');
  rows.forEach((row, index) => {
    const tr = element.insertRow();
    for (const cell of row) {
      const td = document.createElement(withHeader && index === 0 ? 'th' : 'td');
      td.textContent = cell;
      tr.appendChild(td);
    }
  });
  return element;
}
