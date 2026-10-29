/**
 * What the "Commandes" screen says about each move and about the basics (docs/combat-v2.md §17),
 * in French, outside the core: the simulation carries no presentation. The moves' names come
 * from their data (`MoveData.name`), the words here say how to do them and what they are for,
 * each fighter's on its own page (texts/). They describe the moves as they play today, and
 * change with them.
 */

import type { MoveId } from '../core/move-data';
import type { FighterId } from './roster';
import { NAYO_TEXTS } from './texts/nayo';
import { RIFF_TEXTS } from './texts/riff';
import type { FighterTexts } from './texts/shared';

export type { FighterTexts, MoveText } from './texts/shared';

/**
 * The order of a fighter's page: the specials first, then their Remixes and the super, then the
 * normals (each string after the move it starts from, the direction normals after the plain
 * ones), the grab, the dashes and the Boost's one between them.
 */
export const MOVE_ORDER: readonly MoveId[] = [
  'special',
  'specialForward',
  'specialAntiAir',
  'specialBoost',
  'specialForwardBoost',
  'specialAntiAirBoost',
  'super',
  'standLight',
  'jabRepeat',
  'chainLight',
  'lightFinisher',
  'forwardLight',
  'standHeavy',
  'chainHeavy',
  'chainHigh',
  'forwardHeavy',
  'backHeavy',
  'chainLaunch',
  'crouchLight',
  'crouchHeavy',
  'jumpLight',
  'jumpHeavy',
  'grab',
  'pummel',
  'throwForward',
  'throwBack',
  'dashForward',
  'boostCancel',
  'dashBack',
];

export const MOVE_TEXTS: Readonly<Record<FighterId, FighterTexts>> = {
  nayo: NAYO_TEXTS,
  riff: RIFF_TEXTS,
};

/** The « Les bases » page: what every fighter can do, whatever the device (§17.3). */
export const BASICS: readonly (readonly [string, string])[] = [
  [
    'Parer',
    "Maintiens arrière (loin de l'adversaire) : accroupi contre les coups bas, debout contre les coups d'en haut et les sauts",
  ],
  [
    'DASH',
    "Ou deux fois avant : un bond rapide vers l'adversaire. Avec arrière (ou deux fois arrière), un bond en retrait qui fait rater les prises, mais pas les coups",
  ],
  [
    'PRISE',
    "Ou L + H, de tout près : tu saisis l'adversaire, même s'il pare. Puis L pour le frapper, H (ou S, ou PRISE) pour le lancer devant, ← + H pour le lancer derrière toi. Si tu ne choisis rien, tu le lances devant. Deux prises en même temps s'annulent",
  ],
  [
    'Si on te saisit',
    "Appuie tout de suite sur PRISE (ou L + H) pour te dégager ; ensuite, tape sur les boutons pour qu'on te lâche plus vite. Sur une PUNITION (tu finissais un coup, un dash ou une prise ratée), impossible de te dégager",
  ],
  [
    'Enchaîner',
    "L, L, L. Puis L, L, H, H, S. Un coup qui touche (ou qui est paré) s'enchaîne : chaque coup une fois par enchaînement (les légers deux fois), puis un spécial, puis la super",
  ],
  [
    'Directions',
    "Après un coup qui touche, la direction choisit la suite : avant pour le haut ou l'élan, bas pour le bas, arrière pour faire décoller. Haut ne choisit jamais rien",
  ],
  [
    'Jongler',
    "Un adversaire envoyé en l'air prend encore quelques coups, de moins en moins haut. Le Marteau de Nayo et le Swipe de Riff le relancent une fois par combo. Au 12e coup, il tombe",
  ],
  [
    'CONTRE',
    "Frappe quelqu'un qui attaque : ça fait plus mal. PUNITION : frappe-le quand il rate son coup. Seul le premier coup d'un combo peut en être un",
  ],
  [
    'Spéciaux',
    'S seul, avant + S, bas + S : trois spéciaux par combattant (voir sa page). Même parés, ils grignotent un peu de vie, jamais le dernier point',
  ],
  [
    'BOOST',
    "La jauge sous ta vie : 3 barres, remplies en frappant, en parant et en encaissant, gardées d'un round à l'autre. BOOST + direction donne le Remix de ton spécial (1 barre), arrière + BOOST ta super (3 barres). DASH pendant un coup qui touche : le Rewind de Nayo, le Pogo de Riff (1 barre). Sans assez de barres, rien ne sort",
  ],
  [
    'Manips',
    "↓↘→ + un coup donne aussi le spécial, →↓↘ + un coup l'anti-air, d'un seul geste. Jamais obligatoire, aucun bonus",
  ],
];
