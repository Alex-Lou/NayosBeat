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
  FINISH_LIT,
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

/** Saphir's help page (docs/saphir.md §4, §5), as she plays in the grey box. */
export const SAPHIR_TEXTS: FighterTexts = {
  title: 'La disquaire : elle esquive, attend et punit',
  moves: {
    special: {
      input: SPECIAL,
      text: 'Un pas de swing, un fouetté qui claque de loin, et elle repart aussitôt en arrière. Paré tout près, il se punit ; au bout de sa portée, elle est déjà loin.',
    },
    specialForward: {
      input: 'Avant + S',
      text: "Elle retient son poids, puis fond sur toi et fouette, en retard exprès. Il punit un coup raté de très loin et met au sol. Un projectile l'arrête en route.",
    },
    specialAntiAir: {
      input: ANTI_AIR,
      text: "Elle bondit, la jambe tendue vers le ciel, contre les sauts. Il n'a pas d'invincibilité : Saphir n'a aucun coup magique pour se sortir d'une pression.",
    },
    specialBoost: {
      input: REMIX,
      text: 'Plus forte, elle met au sol. Elle repart toujours en arrière.',
    },
    specialForwardBoost: {
      input: FORWARD_REMIX,
      text: "Invincible pendant son élan, il passe à travers un projectile ou un coup de loin. Il ne l'est pas au tout début : ce n'est pas un reversal.",
    },
    specialAntiAirBoost: {
      input: ANTI_AIR_REMIX,
      text: "Invincible contre les attaques en l'air au départ, il lance l'adversaire. Un anti-air sûr, qui coûte une barre.",
    },
    super: {
      input: SUPER,
      text: "La super : un pied bas, un fouetté, puis un revers qui met au sol, l'orchestre qui revient. Sans invincibilité : une fin de combo, pas un reversal. Avec FINISH allumé, c'est son Finisher, Face B : si elle touche, le match est fini.",
    },
    standLight: {
      input: 'L',
      text: 'Une pointe du pied avant, vive et longue. Si elle touche (ou si elle est parée) : L encore, même avec avant ou arrière, donne le Fouetté ; bas + L le Coup de pied bas.',
    },
    chainLight: {
      input: CHAIN,
      text: 'La jambe arrière fouette, avec un petit pas. Puis la fin : L le Revers tournant, H le Chassé, avant + H le Plongé, bas + H la Fauche, arrière + H la Chandelle glissée.',
    },
    lightFinisher: {
      input: LIGHT_FINISHER,
      text: "Elle tourne sur sa jambe d'appui, le talon balaie les côtes et met au sol. Paré, il se punit.",
    },
    forwardLight: {
      input: FORWARD_LIGHT,
      text: "Elle glisse vers l'avant, puis une pointe. Paré, il la laisse à égalité. Puis L : le Fouetté.",
    },
    standHeavy: {
      input: 'H',
      text: 'La semelle en avant, la jambe tendue. La plus longue portée du jeu sans bouger : gagne les échanges de pieds. H encore donne le Chassé arrière, arrière + H la Chandelle, ou enchaîne sur un spécial.',
    },
    chainHeavy: {
      input: CHAIN_HEAVY,
      text: 'Elle pivote et pousse du talon. Finis avec S, ou avant + S.',
    },
    chainHigh: {
      input: CHAIN_HIGH,
      text: "Le pied passe par-dessus la garde. Un coup d'en haut dans l'enchaînement, à parer debout ; sur un adversaire en l'air, il le fait rebondir, une fois par combo.",
    },
    forwardHeavy: {
      input: FORWARD_HEAVY,
      text: "Le pied monte, puis plonge sur la tête. Un coup d'en haut, à parer debout.",
    },
    backHeavy: {
      input: BACK_HEAVY,
      text: "Un coup de pied droit vers le ciel, contre les sauts. Il fait décoller : enchaîne le Contre-ut (bas + S), ou laisse Saphir se remettre et recommence L, L, L en l'air. Il passe au-dessus d'un adversaire accroupi.",
    },
    chainLaunch: {
      input: CHAIN_LAUNCH,
      text: 'La Chandelle après un petit pas glissé : elle fait décoller même après un Fouetté.',
    },
    crouchLight: {
      input: 'Bas + L',
      text: 'Un coup de pied au tibia, au ras du sol. Se pare accroupi ; il arrête une glissade.',
    },
    crouchHeavy: {
      input: 'Bas + H',
      text: "Un revers bas aux chevilles, une main au sol. L'adversaire tombe sur le dos. Se pare accroupi.",
    },
    jumpLight: {
      input: "En l'air, L",
      text: 'La pointe tendue vers le bas, en plein saut. Se pare debout.',
    },
    jumpHeavy: {
      input: "En l'air, H",
      text: 'Un chassé en plein saut, la semelle en avant. Se pare debout.',
    },
    grab: {
      input: GRAB,
      text: "De tout près, elle saisit l'adversaire au revers de la veste, même s'il pare. Ratée, la prise la laisse ouverte un moment.",
    },
    pummel: {
      input: PUMMEL,
      text: 'Des petits coups de paume au plexus. Deux au plus avant que la prise lâche.',
    },
    throwForward: {
      input: THROW_FORWARD,
      text: "Un croc-en-jambe : l'adversaire tombe tout près d'elle. C'est aussi le lancer qui part si tu ne choisis rien.",
    },
    throwBack: {
      input: THROW_BACK,
      text: 'Un tour de valse, puis par-dessus son épaule : il tombe derrière elle, dans le coin si elle y avait le dos.',
    },
    dashForward: {
      input: DASH,
      text: 'La fente de la savate, un bond en avant, pour entrer à mi-distance.',
    },
    boostCancel: {
      input: REWIND,
      text: "Le coup, qu'il touche ou soit paré, se coupe en un pas de swing, la cible s'arrête, et ta phrase repart du début. Une fois par combo.",
    },
    dashBack: {
      input: BACKDASH,
      text: 'Le plus long bond en retrait du jeu. Il fait rater les prises, pas les coups.',
    },
  },
  // docs/saphir.md §5: her measured routes without gauge, easiest first, then the super and the
  // Finisher (docs/finisher.md §5.6).
  combos: [
    { input: 'L, L, L', text: 'Pointe, Fouetté, Revers tournant : partout où la Pointe touche.' },
    { input: 'L, H, S', text: 'La Syncope touche après le Chassé, et elle ressort aussitôt.' },
    {
      input: 'L, L, H, H, avant + S',
      text: 'Le combo de base : le Chassé arrière, puis le Rubato qui met au sol.',
    },
    { input: 'Bas + L, bas + L, H, S', text: 'En partant bas, puis dehors avec la Syncope.' },
    {
      input: 'L, L, arrière + H, puis L, L, L',
      text: "Le premier jongle : la Chandelle glissée fait décoller, puis L, L, L en l'air.",
    },
    { input: SUPER_COMBO, text: 'Le combo de base qui finit sur la Coda.' },
    {
      input: `L, L, H, H, arrière + BOOST ${FINISH_LIT}`,
      text: "Face B : le disque s'arrête net, un temps de silence, puis toute la salle danse sur l'autre face.",
    },
  ],
};
