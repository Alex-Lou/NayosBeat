import type { Action, Refusal } from '../input/bindings';

/**
 * What the « Touches » screen says (docs/polish/AUDIT-ET-PLAN.md, P24), in the pixel font: no
 * capital accented letter, no ← nor → (tests/render/glyphs.test.ts).
 */

/** Each action, short, as its cell of the screen names it. */
export const ACTION_LABELS: Readonly<Record<Action, string>> = {
  up: 'Haut',
  down: 'Bas',
  left: 'Gauche',
  right: 'Droite',
  jump: 'Saut',
  light: 'Léger',
  heavy: 'Lourd',
  special: 'Spécial',
  grab: 'Prise',
  dash: 'Dash',
  boost: 'Boost',
};

/**
 * What a drawn key or button wears for its action: the touch buttons' own labels
 * (src/input/touch-layout.ts), so that L, H and S read the same on every device; the directions
 * as arrows (← and → drawn as a turned ↑, controls-content.ts).
 */
export const ACTION_TAGS: Readonly<Record<Action, string>> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  jump: 'SAUT',
  light: 'L',
  heavy: 'H',
  special: 'S',
  grab: 'PRISE',
  dash: 'DASH',
  boost: 'BOOST',
};

/** How long the screen waits for a key or a button before it gives the hand back. */
export const LISTEN_SECONDS = 5;

export type Device = 'keys' | 'pad';

/** `name`: the key or the button refused, as the screen calls it. */
export function refusalText(refusal: Refusal, device: Device, name: string): string {
  const what = device === 'keys' ? `La touche ${name}` : `Le bouton ${name}`;
  switch (refusal.kind) {
    case 'fixed':
      return device === 'keys'
        ? `${name} met le combat en pause : elle reste fixe`
        : 'Start met le combat en pause : il reste fixe';
    case 'directions':
      return 'La croix sert aux directions : elle reste fixe';
    case 'unavailable':
      return device === 'keys'
        ? `La touche ${name} ne peut pas servir en combat`
        : 'Ce bouton ne peut pas servir en combat';
    case 'taken':
      return `${what} sert déjà à ${ACTION_LABELS[refusal.action]}`;
    case 'other':
      return `${what} est au joueur ${refusal.player + 1}`;
  }
}

export function listeningText(action: Action, device: Device, seconds: number): string {
  const what = device === 'keys' ? 'une touche' : 'un bouton';
  return `${ACTION_LABELS[action]} : appuie sur ${what} (${seconds} s) · Echap ou Start annule`;
}

export function assignedText(action: Action, name: string): string {
  return `${ACTION_LABELS[action]} : ${name}`;
}

export const CANCELLED_TEXT = 'Annulé : rien ne change';
export const TIMEOUT_TEXT = 'Temps écoulé : rien ne change';
export const RETRY_TEXT = 'Essaie une autre, ou Echap';

/** What the screen says before anything is chosen, per device. */
export const IDLE_TEXTS: Readonly<Record<Device, string>> = {
  keys: 'Choisis une action, puis appuie sur sa nouvelle touche',
  pad: 'Choisis une action, puis appuie sur son nouveau bouton',
};

/** What stays fixed, under each drawing. */
export const FIXED_TEXTS: Readonly<Record<Device, string>> = {
  keys: 'Fixes : Echap et P mettent en pause',
  pad: 'Fixes : Start met en pause, la croix et le stick gauche donnent les directions',
};

export function resetText(player: 0 | 1, device: Device): string {
  return device === 'keys'
    ? `Touches du joueur ${player + 1} remises par défaut`
    : `Manette du joueur ${player + 1} remise par défaut`;
}

/** « Par défaut » refused: one of those keys is the other player's now. */
export function resetRefusedText(player: 0 | 1): string {
  const other = player === 0 ? 2 : 1;
  return `Une touche par défaut du joueur ${player + 1} est au joueur ${other} : change-la d'abord`;
}

export const NOT_STANDARD_TEXT =
  "Une manette n'a pas la disposition standard : ses boutons peuvent différer du dessin";

/** The touch tab and « Disposition » (player 1's touch buttons). */
export const TOUCH_TEXTS = {
  idle: 'Disposition : place les boutons au doigt, change leur taille et leur opacité',
  fixed: 'Le joystick reste sous le pouce gauche, sur la moitié gauche',
  reset: 'Boutons tactiles remis par défaut',
  layout: 'Disposition',
  title: 'Disposition',
  drag: 'Glisse un bouton pour le déplacer',
  overlap: 'Deux boutons ne peuvent pas se chevaucher : il revient à sa place',
  noRoom: 'Plus grand, il ne tient pas sur cet écran',
} as const;

export function movedText(label: string): string {
  return `${label} déplacé`;
}
