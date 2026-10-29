import {
  ANTI_AIR,
  ANTI_AIR_REMIX,
  BACK_HEAVY,
  BACKDASH,
  CHAIN,
  CHAIN_HEAVY,
  CHAIN_HIGH,
  CHAIN_LAUNCH,
  DASH,
  FINISHER,
  FORWARD_HEAVY,
  FORWARD_LIGHT,
  FORWARD_REMIX,
  GRAB,
  PUMMEL,
  REMIX,
  REWIND,
  SPECIAL,
  SUPER,
  SUPER_COMBO,
  THROW_BACK,
  THROW_FORWARD,
  type FighterTexts,
} from './shared';

/** Riff's help page (docs/combos-v3.md §4), as she plays today. */
export const RIFF_TEXTS: FighterTexts = {
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
      text: "Un genou explosif vers le haut, contre les sauts. Il n'est invincible que contre les attaques en l'air : au sol, Riff n'a pas de coup magique pour se sortir d'une pression. Il finit aussi les jongles.",
    },
    specialBoost: {
      input: REMIX,
      text: 'Le Remix de la Glissade, à fond : plus forte, plus longue à parer. Toujours un coup bas, à parer accroupi.',
    },
    specialForwardBoost: {
      input: FORWARD_REMIX,
      text: "Le Remix du Saut de l'ange, à fond : la vrille retombe plus fort et met au sol. Toujours un coup d'en haut.",
    },
    specialAntiAirBoost: {
      input: ANTI_AIR_REMIX,
      text: "Le Remix du Genou montant, à fond : invincible contre tout au départ, il lance l'adversaire. Le seul reversal de Riff au sol, et il coûte une barre.",
    },
    super: {
      input: SUPER,
      text: "La super. Riff bondit dans la foule et retombe rangers en avant sur l'adversaire, une onde au sol. Un coup d'en haut, sans invincibilité : une fin de combo, pas un reversal.",
    },
    standLight: {
      input: 'L',
      text: "Le coup le plus rapide du jeu. S'il touche (ou s'il est paré) : L encore, même avec avant ou arrière, donne le Revers ; bas + L le Coup bas, H le Coup de coude.",
    },
    chainLight: {
      input: CHAIN,
      text: 'Un revers tournant, la frange qui fouette, un petit pas en avant. Puis la fin : L le Swipe, H le Coup de coude, avant + H la Hache, bas + H le Windmill, arrière + H le Retourné sauté.',
    },
    lightFinisher: {
      input: FINISHER,
      text: "Le corps bascule, un coup de pied circulaire balaie l'adversaire et le met au sol. Sur un adversaire en l'air, il le fait tournoyer (la Vrille) : rattrape-le, une fois par combo.",
    },
    forwardLight: {
      input: FORWARD_LIGHT,
      text: "Le Toprock : un pas de danse vers l'avant, puis un jab. Paré, il la laisse un poil en avance et s'enchaîne sur un autre coup : de quoi presser et tendre des pièges. Puis L : le Revers.",
    },
    standHeavy: {
      input: 'H',
      text: "Un coude tournant. S'il touche ou s'il est paré : H encore donne le Coup de boule, arrière + H le Retourné, ou enchaîne sur un spécial.",
    },
    chainHeavy: {
      input: CHAIN_HEAVY,
      text: 'Le coup de boule de la rue, la frange en avant. Finis avec S, ou bas + S.',
    },
    chainHigh: {
      input: CHAIN_HIGH,
      text: "La Hache : le Talon, la jambe déjà haute, retombe sur la tête. Un coup d'en haut dans l'enchaînement, à parer debout.",
    },
    forwardHeavy: {
      input: FORWARD_HEAVY,
      text: "Le Talon : la jambe monte tendue puis retombe en coup de hache. Un coup d'en haut, à parer debout, plus rapide que celui de Nayo.",
    },
    backHeavy: {
      input: BACK_HEAVY,
      text: "Un coup de pied en scorpion, la jambe par-dessus la tête, qui couvre aussi derrière elle. Il fait décoller haut : enchaîne le Genou montant (bas + S), ou laisse Riff se remettre et recommence L, L, L en l'air. Il passe au-dessus d'un adversaire accroupi.",
    },
    chainLaunch: {
      input: CHAIN_LAUNCH,
      text: "Le Retourné après un bond d'appel : il fait décoller même après un Revers qui a repoussé.",
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
    boostCancel: {
      input: REWIND,
      text: "Riff rebondit : le coup, qu'il touche ou soit paré, se coupe en un bond en avant, la cible s'arrête, et ta phrase repart du début. Une fois par combo.",
    },
    dashBack: {
      input: BACKDASH,
      text: 'Un bond en retrait qui fait rater les prises, pas les coups.',
    },
  },
  // docs/combos-v3.md §4: her measured routes without gauge, easiest first.
  combos: [
    { input: 'L, L, L', text: 'Jab, Revers, Swipe : partout où le Jab touche.' },
    { input: 'Bas + L, bas + L, H, S', text: "En partant bas, jusqu'à la Glissade." },
    {
      input: 'L, L, H, H, bas + S',
      text: 'Le combo de base : le Coup de boule, puis le Genou montant.',
    },
    {
      input: 'Arrière + H, puis L, L, L',
      text: "Le premier jongle : en l'air, le Swipe fait tournoyer l'adversaire (la Vrille).",
    },
    {
      input: 'Arrière + H, puis L, L, L, puis L, L, bas + S',
      text: 'Après la Vrille, rattrape-le : deux coups encore, puis le Genou montant.',
    },
    { input: SUPER_COMBO, text: 'Le combo de base qui finit sur le Slam.' },
  ],
};
