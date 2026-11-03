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
      text: "Les deux pinces en avant, un pas, et l'exosquelette décharge au contact : il met au sol. Paré, il se punit.",
    },
    specialForward: {
      input: 'Avant + S',
      text: "La charge, l'épaule d'abord, sur une longue distance : il punit un coup raté de loin et met au sol. Un projectile l'arrête en route.",
    },
    specialAntiAir: {
      input: ANTI_AIR,
      text: "Les pinces cueillent le sauteur et le plaquent au sol : une prise, impossible à dégager. Invincible contre les attaques en l'air au départ, pas contre le reste.",
    },
    specialClose: {
      input: 'S, tout près',
      text: "S à 40 px ou moins : il saisit des deux pinces, soulève, tourne et plante. Son coup le plus lourd, 140, impossible à dégager. Raté, il s'ouvre longtemps.",
    },
    specialBack: {
      input: 'Arrière + S',
      text: "Le câble part droit devant lui, de 30 à 110 px, et ramène l'adversaire à 34 px. Il garde l'avantage : prise, Branchement ou Marteau. Un projectile l'arrête au démarrage.",
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
      text: 'La pince avant pousse, paume à plat : son coup le plus rapide, de près. Si elle touche (ou si elle est parée) : L encore, même avec avant ou arrière, donne le Crochet court.',
    },
    chainLight: {
      input: CHAIN,
      text: 'Un crochet court, avec un petit pas. Puis la fin : L le Jeté, H le Marteau, avant + H le Coup de masse, bas + H le Ratissage, arrière + H le Soulevé.',
    },
    lightFinisher: {
      input: LIGHT_FINISHER,
      text: 'Les deux bras poussent, comme on jette une barre : il met au sol. Paré, il se punit.',
    },
    forwardLight: {
      input: FORWARD_LIGHT,
      text: 'Un pas lourd, puis la Paume. Puis L : le Crochet court.',
    },
    standHeavy: {
      input: 'H',
      text: "Le poing tombe de haut, à hauteur de poitrine. En CONTRE, il plie l'adversaire sur place. H encore donne le Double marteau, arrière + H l'Arraché, ou enchaîne sur un spécial.",
    },
    chainHeavy: {
      input: CHAIN_HEAVY,
      text: 'Les deux poings ensemble, un petit pas : il met au sol.',
    },
    chainHigh: {
      input: CHAIN_HIGH,
      text: "Le poing passe par-dessus la garde. Un coup d'en haut dans l'enchaînement, à parer debout ; sur un adversaire en l'air, il le fait rebondir, une fois par combo.",
    },
    forwardHeavy: {
      input: FORWARD_HEAVY,
      text: "Le poing monte derrière l'ampoule, puis tombe tout droit. Un coup d'en haut, lent, à parer debout.",
    },
    backHeavy: {
      input: BACK_HEAVY,
      text: "Les deux bras arrachent vers le ciel, contre les sauts. Il fait décoller : enchaîne le Plafonnier (bas + S). Il passe au-dessus d'un adversaire accroupi.",
    },
    chainLaunch: {
      input: CHAIN_LAUNCH,
      text: "Il ramasse l'adversaire par en dessous, après un petit pas : il fait décoller même après un Crochet court.",
    },
    crouchLight: {
      input: 'Bas + L',
      text: 'La pince à plat, au ras du sol. Se pare accroupi.',
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
      text: "Le Pas blindé, les épaules d'abord : il encaisse un coup au passage, même un projectile, à moitié de dégâts, et continue. Une prise le bat.",
    },
    boostCancel: {
      input: REWIND,
      text: "Le coup, qu'il touche ou soit paré, se coupe en un pas lourd, la cible s'arrête, et ta phrase repart du début. Une fois par combo.",
    },
    dashBack: {
      input: BACKDASH,
      text: 'Un pas en arrière, court, et rien contre les prises : il sort mal.',
    },
  },
  // docs/watt.md §6: his measured routes without gauge, easiest first, then the super and the
  // Finisher (docs/finisher.md §5.6).
  combos: [
    { input: 'L, L, L', text: 'Paume, Crochet court, Jeté : partout où la Paume touche.' },
    {
      input: 'L, L, H, avant + S',
      text: "Le combo de base : la Surcharge emporte l'adversaire.",
    },
    {
      input: 'S, tout près',
      text: "Le Branchement : 140 d'un geste, si tu es à 40 px.",
    },
    {
      input: 'Arrière + S, puis S',
      text: "Le câble ramène l'adversaire, puis le Branchement enchaîne.",
    },
    {
      input: "En l'air, S",
      text: "Le Plongeon écrase celui qui reste au sol, où qu'il garde.",
    },
    { input: SUPER_COMBO, text: 'Le combo lourd qui finit sur Plein feu.' },
    {
      input: `L, L, H, H, arrière + BOOST ${FINISH_LIT}`,
      text: "Couvre-feu : la salle s'éteint, il ne reste que son ampoule. Puis elle baisse.",
    },
  ],
};
