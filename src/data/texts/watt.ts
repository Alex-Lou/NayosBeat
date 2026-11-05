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

/** Watt's help page (docs/watt.md §5, §6), as he plays in the grey box. */
export const WATT_TEXTS: FighterTexts = {
  title: 'Le roadie : il attrape, il porte et il éteint',
  moves: {
    special: {
      input: SPECIAL,
      text: "Les deux pinces en avant, un pas, et l'exosquelette décharge au contact : il met au sol. VU-mètre plein (SURTENSION, 10 LED blanches sous le Boost), il frappe à 113 et devient presque sûr en garde.",
    },
    specialForward: {
      input: 'Avant + S',
      text: "La charge blindée, l'épaule d'abord : elle encaisse un coup et punit de loin. VU-mètre plein, elle est blindée dès la 1re image sur toute sa course.",
    },
    specialAntiAir: {
      input: ANTI_AIR,
      text: "Les pinces cueillent le sauteur et le plaquent au sol : une prise, impossible à dégager. Invincible contre les attaques en l'air au départ, pas contre le reste.",
    },
    specialClose: {
      input: 'S, tout près',
      text: 'S à 40 px ou moins : il saisit des deux pinces, soulève, tourne à 360° et plante. Son coup le plus lourd : 140 (175 avec le VU-mètre plein), impossible à dégager.',
    },
    specialBack: {
      input: 'Arrière + S',
      text: "Le câble part droit devant lui jusqu'à 110 px, s'enchaîne après ses coups lourds et ramène l'adversaire à 34 px (+4, à portée du Branchement). VU-mètre plein, l'adversaire ramené est électrocuté assez longtemps pour tout un combo gratuit.",
    },
    jumpSpecial: {
      input: "En l'air, S",
      text: "Il se laisse tomber de tout son poids et écrase l'adversaire au sol, jusqu'à 30 px de son point de chute. C'est une prise : la garde ne le protège pas.",
    },
    specialBoost: {
      input: REMIX,
      text: 'Plus fort, et presque sûr une fois paré : la pression continue.',
    },
    specialForwardBoost: {
      input: FORWARD_REMIX,
      text: "Invincible pendant presque toute la charge, il passe à travers un projectile. Il ne l'est pas au tout début : ce n'est pas un reversal.",
    },
    specialAntiAirBoost: {
      input: ANTI_AIR_REMIX,
      text: "Invincible plus longtemps contre les attaques en l'air, il lance l'adversaire au lieu de le rabattre.",
    },
    super: {
      input: SUPER,
      text: "La super : deux crochets, puis les deux poings au sol. Invincible dès le départ, c'est son seul reversal, et sa portée est courte. Ampoule pleine, tout le monde la voit venir. Avec FINISH allumé, c'est son Finisher, Couvre-feu : si elle touche, le match est fini.",
    },
    standLight: {
      input: 'L',
      text: 'La pince avant pousse, paume à plat : son coup le plus rapide, de près. Si elle touche (ou si elle est parée) : L donne le Crochet court, arrière + L la Secousse, bas + L la Paume basse, avant + H le Disjoncteur.',
    },
    backLight: {
      input: 'Arrière + L',
      text: 'Le revers électrifié de la pince avant : rapide (4 tics), avance de 6 px, +2 en garde, et ouvre toutes ses cordes et ses lanceurs.',
    },
    jabRepeat: {
      input: 'L, arrière + L',
      text: "La pince avant repart aussitôt d'un coup sec électrifié : +2 en garde, et ouvre toutes ses cordes (L, bas + L, H, avant + H, bas + H, arrière + H).",
    },
    chainLight: {
      input: CHAIN,
      text: 'Un crochet court, avec un petit pas. Puis la fin : L le Jeté, bas + L la Prise de terre, H le Marteau, avant + H le Coup de masse, bas + H le Ratissage, arrière + H le Soulevé.',
    },
    chainLow: {
      input: 'L, L, bas + L (ou H, bas + L)',
      text: "Un coup de botte et de pince au ras du sol qui garde l'adversaire debout pour enchaîner sur n'importe quel spécial, Remix ou Plein feu.",
    },
    lightFinisher: {
      input: LIGHT_FINISHER,
      text: 'Les deux bras poussent, comme on jette une barre : il met au sol. Paré, il se punit.',
    },
    forwardLight: {
      input: FORWARD_LIGHT,
      text: 'Un pas rapide de 16 px (7 tics), puis la Paume. Enchaîne sur le Crochet court, le Marteau ou le Coup de masse.',
    },
    standHeavy: {
      input: 'H',
      text: "Le poing tombe de haut, à hauteur de poitrine. En CONTRE, il plie l'adversaire sur place. Bas + L donne la Prise de terre, H le Double marteau (2 coups), arrière + H l'Arraché.",
    },
    chainHeavy: {
      input: CHAIN_HEAVY,
      text: "Double frappe de pistons en 2 coups (crochet montant puis impact à deux poings) : laisse l'adversaire debout pour enchaîner le Coup de jus, la Surcharge, le Câble ou Plein feu.",
    },
    chainHigh: {
      input: CHAIN_HIGH,
      text: "Le poing passe par-dessus la garde (13 tics). Un coup d'en haut dans l'enchaînement, à parer debout ; sur un adversaire en l'air, il le fait rebondir, une fois par combo.",
    },
    forwardHeavy: {
      input: FORWARD_HEAVY,
      text: "Le poing monte derrière l'ampoule (18 tics), blindé dès la 5e image, puis tombe tout droit. Un coup d'en haut à parer debout, qui s'annule en spécial.",
    },
    downForwardHeavy: {
      input: 'Bas-avant + H (ou L, avant + H)',
      text: 'Uppercut de piston au plexus en 9 tics : touche aussi un adversaire accroupi et le fait décoller (4 points de jongle, 5 en CONTRE).',
    },
    backHeavy: {
      input: BACK_HEAVY,
      text: "Les deux bras arrachent vers le ciel, contre les sauts. Il fait décoller pour enchaîner L, L, L ou le Plafonnier saisi en l'air. Il passe au-dessus d'un adversaire accroupi.",
    },
    chainLaunch: {
      input: CHAIN_LAUNCH,
      text: "Il ramasse l'adversaire par en dessous, après un petit pas : il fait décoller même après un Crochet court.",
    },
    crouchLight: {
      input: 'Bas + L',
      text: 'La pince à plat, au ras du sol. Se pare accroupi, et enchaîne sur L (Crochet court), avant + H (Disjoncteur) ou bas + H (Ratissage).',
    },
    crouchHeavy: {
      input: 'Bas + H',
      text: "Accroupi, le bras ratisse le sol. L'adversaire tombe sur le dos. Se pare accroupi.",
    },
    jumpLight: {
      input: "En l'air, L",
      text: 'Le coude vers le bas, en plein saut. Se pare debout.',
    },
    jumpHeavy: {
      input: "En l'air, H",
      text: 'Tout le corps vers le bas, les bras ouverts. Se pare debout.',
    },
    jumpDownHeavy: {
      input: "En l'air, bas + H",
      text: 'Les deux pinces tirées droit sous ses bottes comme une enclume (6 tics) : touche bas et dans le dos en cross-up.',
    },
    grab: {
      input: GRAB,
      text: "Les pinces se referment sur les épaules, même s'il pare : la prise la plus longue du jeu. Un peu plus lente que les autres ; ratée, elle le laisse ouvert.",
    },
    pummel: {
      input: PUMMEL,
      text: 'Les pinces serrent, et ses diodes montent. Deux au plus avant que la prise lâche.',
    },
    throwForward: {
      input: THROW_FORWARD,
      text: "Il soulève l'adversaire et le pose plus loin, comme une caisse qu'on décharge. C'est aussi le lancer qui part si tu ne choisis rien.",
    },
    throwBack: {
      input: THROW_BACK,
      text: "Un quart de tour, comme on visse une ampoule, puis par-dessus l'épaule : il tombe derrière lui, dans le coin s'il y avait le dos.",
    },
    throwClose: {
      input: 'Branchement réussi',
      text: "Soulevé, un tour complet, planté : 140, le coup le plus lourd du jeu. Aucun dégagement possible : c'est la prise de commande.",
    },
    throwDive: {
      input: 'Plongeon réussi',
      text: "Il lui tombe dessus de tout son poids : 100. Le Plongeon ne se dégage pas, la garde ne l'arrête pas.",
    },
    throwCatch: {
      input: 'Plafonnier réussi',
      text: "Cueilli en l'air et plaqué au sol : 110, sans dégagement possible.",
    },
    dashForward: {
      input: DASH,
      text: "Le Pas blindé, les épaules d'abord : il encaisse un coup ou un projectile à moitié de dégâts, remplit son VU-mètre de tension et s'annule dès la mi-course en coup ou en prise.",
    },
    boostCancel: {
      input: REWIND,
      text: "Le coup, qu'il touche ou soit paré, se coupe en un pas lourd, la cible s'arrête, et ta phrase repart du début. Une fois par combo.",
    },
    dashBack: {
      input: BACKDASH,
      text: 'Un recul de 36 px en 20 tics, invincible aux prises au départ.',
    },
  },
  // docs/watt.md §6: his measured routes without gauge, easiest first, then the super and the
  // Finisher (docs/finisher.md §5.6).
  combos: [
    { input: 'L, L, L', text: 'Paume, Crochet court, Jeté : partout où la Paume touche.' },
    {
      input: 'Bas + L, L, H, puis S',
      text: 'Ouverture basse qui enchaîne toute la corde jusqu’au Coup de jus.',
    },
    {
      input: 'L, L, H, arrière + S, puis S',
      text: "Le Câble en fin de combo ramène l'adversaire à 34 px, pile dans le Branchement (140).",
    },
    {
      input: 'L, L, arrière + H, puis L, L, avant + H, puis L, L, L',
      text: 'Soulevé, jongle, Rebond du Coup de masse au sol et reprise en l’air.',
    },
    {
      input: 'Arrière + S (VU-mètre plein), puis L, L, H, S',
      text: 'En SURTENSION (10 LED blanches), le Câble électrocute assez longtemps pour un combo complet gratuit.',
    },
    { input: SUPER_COMBO, text: 'Le combo lourd qui finit sur Plein feu.' },
    {
      input: `L, L, H, H, arrière + BOOST ${FINISH_LIT}`,
      text: "Couvre-feu : la salle s'éteint, il ne reste que son ampoule. Puis elle baisse.",
    },
  ],
};
