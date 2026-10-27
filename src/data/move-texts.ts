/**
 * What the "Commandes" screen says about each move and about the basics (docs/combat-v2.md §17),
 * in French, outside the core: the simulation carries no presentation. The moves' names come
 * from their data (`MoveData.name`), the words here say how to do them and what they are for.
 * Written as players read them on every device: L, H and S are the light, heavy and special
 * buttons (J, K, L on a keyboard), "avant" is toward the opponent. They describe the moves as
 * they play today, and change with them.
 */

import type { MoveId } from '../core/move-data';
import type { FighterId } from './roster';

export interface MoveText {
  /** How to do it. */
  readonly input: string;
  /** What it does and what it is for. */
  readonly text: string;
}

export interface FighterTexts {
  /** Who the fighter is, in a line. */
  readonly title: string;
  readonly moves: Readonly<Record<MoveId, MoveText>>;
}

/** The order of a fighter's page: the specials first, then the normals, the grab, the dashes. */
export const MOVE_ORDER: readonly MoveId[] = [
  'special',
  'specialForward',
  'specialAntiAir',
  'standLight',
  'standHeavy',
  'crouchLight',
  'crouchHeavy',
  'jumpLight',
  'jumpHeavy',
  'grab',
  'pummel',
  'throwForward',
  'throwBack',
  'dashForward',
  'dashBack',
];

const SPECIAL = 'S, ou ↓↘→ + un coup';
const ANTI_AIR = 'Bas + S, ou →↓↘ + un coup';
const GRAB = 'PRISE, ou L + H';
const PUMMEL = 'En tenant, L';
const THROW_FORWARD = 'En tenant, H, S ou PRISE';
const THROW_BACK = 'En tenant, ← + H, S ou PRISE';
const DASH = 'DASH, ou 2 fois avant';
const BACKDASH = 'Arrière + DASH, ou 2 fois arrière';

export const MOVE_TEXTS: Readonly<Record<FighterId, FighterTexts>> = {
  nayo: {
    title: 'Le boxeur-DJ : calme, il te tient à distance et te punit',
    moves: {
      special: {
        input: SPECIAL,
        text: "Nayo lance un disque de lumière qui file droit devant, à hauteur de poitrine. C'est un projectile : de loin, il t'oblige à sauter (et Nayo t'attend avec l'Uppercut) ou à parer. Il touche debout comme accroupi ; pour l'éviter, saute par-dessus. Un seul disque à la fois. C'est l'ancienne « onde sonore ».",
      },
      specialForward: {
        input: 'Avant + S',
        text: "Un coup de pied volant qui avance d'un grand pas. Parfait pour finir un combo. S'il est paré, Nayo se fait punir.",
      },
      specialAntiAir: {
        input: ANTI_AIR,
        text: "Il jaillit, poing vers le ciel. Invincible au départ : il bat les sauts et les attaques au réveil. S'il le rate ou se fait parer, il reste longtemps sans défense.",
      },
      standLight: {
        input: 'L',
        text: "Son coup le plus rapide. S'il touche ou s'il est paré, enchaîne sur un autre coup ou un spécial.",
      },
      standHeavy: {
        input: 'H',
        text: "Sa plus longue portée sans bouger. S'il touche ou s'il est paré, enchaîne sur un spécial.",
      },
      crouchLight: {
        input: 'Bas + L',
        text: "Un petit coup de pied au tibia, aussi rapide que le Direct. Se pare accroupi ; s'enchaîne comme un coup léger.",
      },
      crouchHeavy: {
        input: 'Bas + H',
        text: 'Fauche les jambes et met au sol. Se pare accroupi ; raté ou paré, il se punit.',
      },
      jumpLight: { input: "En l'air, L", text: 'Un genou rapide en plein saut. Se pare debout.' },
      jumpHeavy: {
        input: "En l'air, H",
        text: 'Plus lent que le genou, plus loin et plus fort. Se pare debout.',
      },
      grab: {
        input: GRAB,
        text: "De tout près, il saisit l'adversaire, même s'il pare, et le tient : à toi de choisir la suite. Ratée, la prise le laisse ouvert un moment.",
      },
      pummel: {
        input: PUMMEL,
        text: "Un coup de genou dans le ventre. Deux au plus avant que la prise lâche ; un seul si l'adversaire se débat.",
      },
      throwForward: {
        input: THROW_FORWARD,
        text: "Il le repousse et l'envoie au sol d'un direct, loin devant : Nayo retrouve sa distance. C'est aussi le lancer qui part si tu ne choisis rien.",
      },
      throwBack: {
        input: THROW_BACK,
        text: "Par-dessus l'épaule : l'adversaire tombe derrière lui, dans le coin si Nayo y avait le dos.",
      },
      dashForward: { input: DASH, text: "Un bond vers l'adversaire, qu'il ne peut pas couper." },
      dashBack: {
        input: BACKDASH,
        text: 'Un bond en retrait qui fait rater les prises, pas les coups.',
      },
    },
  },
  riff: {
    title: 'La punk de rue : elle breake, cogne et te nargue',
    moves: {
      special: {
        input: SPECIAL,
        text: "Elle fonce poing en avant et avale la distance d'un coup. Pour punir de loin ; parée, elle se fait punir.",
      },
      specialForward: {
        input: 'Avant + S',
        text: "Une vrille qui retombe sur ta tête. Coup d'en haut : pare-le debout.",
      },
      specialAntiAir: {
        input: ANTI_AIR,
        text: 'Un genou explosif vers le haut, contre les sauts. Invincible au départ ; raté ou paré, elle reste sans défense.',
      },
      standLight: {
        input: 'L',
        text: "Le coup le plus rapide du jeu. S'il touche ou s'il est paré, enchaîne sur un autre coup ou un spécial.",
      },
      standHeavy: {
        input: 'H',
        text: "Un coude tournant. S'il touche ou s'il est paré, enchaîne sur un spécial.",
      },
      crouchLight: {
        input: 'Bas + L',
        text: "Un coup de pied vif au ras du sol. Se pare accroupi ; s'enchaîne comme un coup léger.",
      },
      crouchHeavy: {
        input: 'Bas + H',
        text: 'Fauche les jambes et met au sol. Se pare accroupi.',
      },
      jumpLight: { input: "En l'air, L", text: 'Un genou rapide en plein saut. Se pare debout.' },
      jumpHeavy: {
        input: "En l'air, H",
        text: 'Un talon qui tombe sur la tête. Se pare debout.',
      },
      grab: {
        input: GRAB,
        text: "De tout près, elle saisit l'adversaire, même s'il pare, et le tient : à toi de choisir la suite. Ratée, la prise la laisse ouverte un moment.",
      },
      pummel: {
        input: PUMMEL,
        text: "Des coups de tête rapides. Trois au plus avant que la prise lâche ; deux si l'adversaire se débat.",
      },
      throwForward: {
        input: THROW_FORWARD,
        text: "Un ciseau de jambes : l'adversaire tombe tout près d'elle, de quoi presser son réveil. C'est aussi le lancer qui part si tu ne choisis rien.",
      },
      throwBack: {
        input: THROW_BACK,
        text: 'Elle roule en arrière et le fait passer par-dessus elle : il tombe derrière elle, dans le coin si elle y avait le dos.',
      },
      dashForward: {
        input: DASH,
        text: 'Un bond plus long que celui de Nayo, coupé à mi-course par un coup ou une prise qui garde son élan.',
      },
      dashBack: {
        input: BACKDASH,
        text: 'Un bond en retrait qui fait rater les prises, pas les coups.',
      },
    },
  },
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
    "L → H → S : un coup léger qui touche (ou qui est paré) s'enchaîne sur un autre coup ou un spécial, un coup lourd sur un spécial",
  ],
  ['Spéciaux', 'S seul, avant + S, bas + S : trois spéciaux par combattant (voir sa page)'],
  [
    'Manips',
    "↓↘→ + un coup donne aussi le spécial, →↓↘ + un coup l'anti-air, d'un seul geste. Jamais obligatoire, aucun bonus",
  ],
];
