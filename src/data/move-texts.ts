/**
 * What the "Commandes" screen says about each move and about the basics (docs/combat-v2.md §17),
 * in French, outside the core: the simulation carries no presentation. The moves' names come
 * from their data (`MoveData.name`), the words here say how to do them and what they are for.
 * Written as players read them on every device: L, H and S are the light, heavy and special
 * buttons (J, K, L on a keyboard), "avant" is toward the opponent. They describe the moves as
 * they play today, and change with them.
 */

import type { CoreMoveId, MoveId, OptionalMoveId } from '../core/move-data';
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
  /** Every move the fighter has: the core ones, and its optional ones. */
  readonly moves: Readonly<Record<CoreMoveId, MoveText>> &
    Readonly<Partial<Record<OptionalMoveId, MoveText>>>;
}

/**
 * The order of a fighter's page: the specials first, then the normals (the chain after the jab,
 * the direction normals after the plain ones), the grab, the dashes.
 */
export const MOVE_ORDER: readonly MoveId[] = [
  'special',
  'specialForward',
  'specialAntiAir',
  'standLight',
  'chainLight',
  'lightFinisher',
  'forwardLight',
  'standHeavy',
  'forwardHeavy',
  'backHeavy',
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
const CHAIN = 'L, puis L (quand il touche)';
const FINISHER = 'L, L, L';
const FORWARD_LIGHT = 'Avant + L';
const FORWARD_HEAVY = 'Avant + H';
const BACK_HEAVY = 'Arrière + H';
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
        text: "Nayo lance un disque de lumière qui file droit devant, à hauteur de poitrine. C'est un projectile : de loin, il t'oblige à sauter (et Nayo t'attend avec l'Uppercut) ou à parer. Il touche debout comme accroupi ; pour l'éviter, saute par-dessus, ou, avec Riff, glisse dessous. Un seul disque à la fois. C'est l'ancienne « onde sonore ».",
      },
      specialForward: {
        input: 'Avant + S',
        text: "Un coup de pied volant qui avance d'un grand pas et met au sol. Parfait pour finir un combo. S'il est paré, Nayo se fait punir.",
      },
      specialAntiAir: {
        input: ANTI_AIR,
        text: "Il jaillit, poing vers le ciel. Invincible au départ : il bat les sauts et les attaques au réveil. S'il le rate ou se fait parer, il reste longtemps sans défense.",
      },
      standLight: {
        input: 'L',
        text: "Son coup le plus rapide. S'il touche ou s'il est paré, appuie encore sur L : le Cross suit. Il s'enchaîne aussi sur un autre coup ou un spécial.",
      },
      chainLight: {
        input: CHAIN,
        text: "Le « deux » du boxeur : le bras arrière part, l'épaule tourne, un petit pas en avant. Il prolonge le Direct et s'enchaîne sur un spécial, ou sur L pour la Mise au tapis.",
      },
      lightFinisher: {
        input: FINISHER,
        text: "Un crochet large qui envoie au sol : la fin de la chaîne, Direct, Cross, Mise au tapis. Facile à sortir, il met l'adversaire au tapis.",
      },
      forwardLight: {
        input: FORWARD_LIGHT,
        text: "Un pas glissé et un jab sec, garde haute : il s'approche en frappant, pour commencer un combo de loin. S'enchaîne sur un spécial ; paré, il reste presque sûr.",
      },
      standHeavy: {
        input: 'H',
        text: "Sa plus longue portée sans bouger. S'il touche ou s'il est paré, enchaîne sur un spécial.",
      },
      forwardHeavy: {
        input: FORWARD_HEAVY,
        text: "L'Overhand : il monte sur la pointe des pieds et le poing retombe par-dessus la garde, sur la tête. Un coup d'en haut, à parer debout : il ouvre une garde basse. Lent et visible, mélange-le avec le Balayage.",
      },
      backHeavy: {
        input: BACK_HEAVY,
        text: "Un uppercut court, poing presque à la verticale, contre les sauts. Il fait décoller l'adversaire : enchaîne aussitôt avec l'Uppercut (bas + S) pendant qu'il est en l'air. Il passe au-dessus d'un adversaire accroupi.",
      },
      crouchLight: {
        input: 'Bas + L',
        text: "Un petit coup de pied au tibia, aussi rapide que le Direct. Se pare accroupi ; s'enchaîne comme un coup léger.",
      },
      crouchHeavy: {
        input: 'Bas + H',
        text: "Fauche les jambes : l'adversaire tombe sur le dos. Se pare accroupi ; raté ou paré, il se punit.",
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
        text: "Elle plonge et glisse pieds en avant, au ras du sol : elle passe sous le Vinyle de Nayo et sous les coups hauts. C'est un coup bas : pare-la accroupi. Si elle touche, tu tombes ; un coup bas l'arrête.",
      },
      specialForward: {
        input: 'Avant + S',
        text: "Une vrille en l'air qui retombe sur ta tête. Coup d'en haut : pare-le debout. Il passe au-dessus des coups bas et des prises, mais un anti-air la fait tomber.",
      },
      specialAntiAir: {
        input: ANTI_AIR,
        text: "Un genou explosif vers le haut, contre les sauts. Il n'est invincible que contre les attaques en l'air : au sol, Riff n'a pas de coup magique pour se sortir d'une pression.",
      },
      standLight: {
        input: 'L',
        text: "Le coup le plus rapide du jeu. S'il touche ou s'il est paré, appuie encore sur L : le Revers suit. Il s'enchaîne aussi sur un autre coup ou un spécial.",
      },
      chainLight: {
        input: CHAIN,
        text: "Un revers tournant, la frange qui fouette, un petit pas en avant. Il prolonge le Jab et s'enchaîne sur un spécial, ou sur L pour le Swipe.",
      },
      lightFinisher: {
        input: FINISHER,
        text: "Le corps bascule, un coup de pied circulaire balaie l'adversaire et le met au sol : la fin de la chaîne, Jab, Revers, Swipe.",
      },
      forwardLight: {
        input: FORWARD_LIGHT,
        text: "Le Toprock : un pas de danse vers l'avant, puis un jab. Paré, il la laisse un poil en avance et s'enchaîne sur un autre coup : de quoi presser et tendre des pièges.",
      },
      standHeavy: {
        input: 'H',
        text: "Un coude tournant. S'il touche ou s'il est paré, enchaîne sur un spécial.",
      },
      forwardHeavy: {
        input: FORWARD_HEAVY,
        text: "Le Talon : la jambe monte tendue puis retombe en coup de hache. Un coup d'en haut, à parer debout, plus rapide que celui de Nayo.",
      },
      backHeavy: {
        input: BACK_HEAVY,
        text: "Un coup de pied en scorpion, la jambe par-dessus la tête, qui couvre aussi derrière elle. Il fait décoller : enchaîne aussitôt avec le Genou montant (bas + S). Il passe au-dessus d'un adversaire accroupi.",
      },
      crouchLight: {
        input: 'Bas + L',
        text: "Un coup de pied vif au ras du sol. Se pare accroupi ; s'enchaîne comme un coup léger.",
      },
      crouchHeavy: {
        input: 'Bas + H',
        text: "Un moulinet au sol qui fauche les jambes : l'adversaire tombe sur le dos. Se pare accroupi.",
      },
      jumpLight: {
        input: "En l'air, L",
        text: "Un ciseau de jambes en plein saut. En sautant tout près, par-dessus l'adversaire, il le touche de dos : pare dans l'autre sens. Se pare debout.",
      },
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
    "L → H → S. Ou L, L, L. Un coup léger qui touche (ou qui est paré) s'enchaîne sur un autre coup ou un spécial, un coup lourd sur un spécial ; L, L, L finit au sol",
  ],
  [
    'Directions',
    "Avant + L : un coup qui avance. Avant + H : un coup d'en haut, à parer debout. Arrière + H fait décoller : enchaîne avec S pendant que l'adversaire est en l'air",
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
    'Manips',
    "↓↘→ + un coup donne aussi le spécial, →↓↘ + un coup l'anti-air, d'un seul geste. Jamais obligatoire, aucun bonus",
  ],
];
