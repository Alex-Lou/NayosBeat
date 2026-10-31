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
  FORWARD_HEAVY,
  FORWARD_LIGHT,
  FORWARD_REMIX,
  GRAB,
  LIGHT_FINISHER,
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

/** Nayo's help page (docs/combos-v3.md §3.2), as he plays today. */
export const NAYO_TEXTS: FighterTexts = {
  title: 'Le boxeur-DJ : il compte les temps, te fait décoller et lâche les basses',
  moves: {
    special: {
      input: SPECIAL,
      text: "Nayo lance un disque de lumière qui file droit devant, à hauteur de poitrine. C'est un projectile : de loin, il t'oblige à sauter (et Nayo t'attend avec l'Uppercut) ou à parer. Il touche debout comme accroupi ; pour l'éviter, saute par-dessus, ou, avec Riff, glisse dessous. Un seul disque à la fois. C'est l'ancienne « onde sonore ».",
    },
    specialForward: {
      input: 'Avant + S',
      text: "Un coup de pied volant qui avance d'un grand pas et met au sol : la fin de tes combos. S'il touche, ← + BOOST lance la Mégabasse. Paré, il se fait punir.",
    },
    specialAntiAir: {
      input: ANTI_AIR,
      text: 'Il jaillit, poing vers le ciel. Invincible au départ : il bat les sauts et les attaques au réveil. Il finit aussi les jongles. Paré, il reste longtemps sans défense.',
    },
    specialBoost: {
      input: REMIX,
      text: 'Le Remix du Vinyle : un disque blanc deux fois plus rapide, qui met au sol. Plus dur à sauter.',
    },
    specialForwardBoost: {
      input: FORWARD_REMIX,
      text: "Le Remix du Pied fendu : l'adversaire s'envole très haut au lieu de tomber. Laisse-le redescendre, puis L et bas + S.",
    },
    specialAntiAirBoost: {
      input: ANTI_AIR_REMIX,
      text: "Le Remix de l'Uppercut : plus fort, invincible plus longtemps. Le réveil qui ne pardonne pas, mais toujours puni s'il est paré.",
    },
    super: {
      input: SUPER,
      text: "La super. Tout se fige, puis Nayo frappe trois fois le sol : BOUM, BOUM, BOUUUM. Invincible au départ, elle touche du sol jusqu'au-dessus d'un saut et rattrape un adversaire en l'air dans un combo.",
    },
    standLight: {
      input: 'L',
      text: "Le jab, ton « un ». S'il touche (ou s'il est paré) : L encore donne la Cross, arrière + L le Double direct, bas + L le Coup bas, H le Crochet, arrière + H le Remontant.",
    },
    jabRepeat: {
      input: 'L, puis arrière + L',
      text: "Le jab repart aussitôt du bout du bras. Il laisse l'avantage même paré. Puis L : la Cross.",
    },
    chainLight: {
      input: CHAIN,
      text: "Ton « deux ». Puis choisis la fin : L met au tapis, H continue au Crochet, avant + H tombe d'en haut (Marteau), bas + H fauche en bas (Balayage), arrière + H fait décoller (Remontant chassé).",
    },
    lightFinisher: {
      input: LIGHT_FINISHER,
      text: 'Le crochet large qui met au sol. Les trois L passent partout où le premier touche.',
    },
    forwardLight: {
      input: FORWARD_LIGHT,
      text: "Un pas glissé et un jab sec, garde haute : il s'approche en frappant, pour commencer un combo de loin. Puis L : la Cross ; paré, il reste presque sûr.",
    },
    standHeavy: {
      input: 'H',
      text: "Le gros crochet. H encore : le Crochet au foie. S'il coupe une attaque (CONTRE), l'adversaire se plie en deux : tu as le temps de tout lui mettre.",
    },
    chainHeavy: {
      input: CHAIN_HEAVY,
      text: 'Genoux pliés, le poing sous les côtes : il touche aussi un adversaire accroupi. Finis avec S.',
    },
    chainHigh: {
      input: CHAIN_HIGH,
      text: "Le poing déjà armé retombe sur la tête : à parer debout. Sur un adversaire en l'air, il l'écrase au sol et le fait rebondir, une fois par combo.",
    },
    forwardHeavy: {
      input: FORWARD_HEAVY,
      text: "L'Overhand : il monte sur la pointe des pieds et le poing retombe par-dessus la garde, sur la tête. Un coup d'en haut, à parer debout : il ouvre une garde basse. Lent et visible, mélange-le avec le Balayage.",
    },
    backHeavy: {
      input: BACK_HEAVY,
      text: "L'uppercut court qui fait décoller haut. Enchaîne S tout de suite, ou laisse Nayo se remettre et recommence L, L en l'air. Il rate un adversaire accroupi.",
    },
    chainLaunch: {
      input: `${CHAIN_LAUNCH} (ou H, puis arrière + H)`,
      text: "Le Remontant avec un pas d'appel : il fait décoller même après une Cross qui a repoussé.",
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
    boostCancel: {
      input: REWIND,
      text: "Nayo rembobine : le coup, qu'il touche ou soit paré, se coupe en un plongeon, la cible s'arrête, et ta phrase repart du début (L, L, H…). Une fois par combo.",
    },
    dashBack: {
      input: BACKDASH,
      text: 'Un bond en retrait qui fait rater les prises, pas les coups.',
    },
  },
  // docs/combos-v3.md §3.1: D1, I1, I8, I6, A2, E3.
  combos: [
    { input: 'L, L, L', text: 'Le premier mot, partout où le Direct touche, debout ou accroupi.' },
    { input: 'L, L, H, avant + S', text: 'La une-deux qui finit au crochet, puis le Pied fendu.' },
    { input: 'L, L, H, H, avant + S', text: 'Le combo de base, sans jauge.' },
    {
      input: 'Arrière + H, puis L, L, L',
      text: "Le premier jongle : attends que Nayo se remette, puis rejoue la phrase en l'air.",
    },
    {
      input: 'L, L, arrière + H, puis L, L, avant + H, puis L, L, L',
      text: "Les Quatre temps : en l'air, le Marteau écrase l'adversaire au sol ; il rebondit, et tu recommences.",
    },
    { input: SUPER_COMBO, text: 'Le combo de base qui finit sur la Mégabasse.' },
  ],
};
