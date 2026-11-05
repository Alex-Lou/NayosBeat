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

/** Feline's help page, listing every move and her 7 core combos. */
export const FELINE_TEXTS: FighterTexts = {
  title: 'La chasseresse des portails : elle bondit à travers les brèches et tranche d’argent',
  moves: {
    special: {
      input: SPECIAL,
      text: "La Lame de portail : Feline ouvre un portail vertical devant elle et projette une lame orbitale blanc-argenté qui laisse l'adversaire debout sous pression.",
    },
    specialForward: {
      input: 'Avant + S',
      text: "Le Rush dimensionnel : elle plonge dans un portail d'entrée et jaillit du portail de sortie en course féline pour coucher la cible. S'il touche, arrière + BOOST lance la Déchirure.",
    },
    specialAntiAir: {
      input: ANTI_AIR,
      text: 'Le Portail ascendant : un portail horizontal s’ouvre au sol et Feline jaillit vers le ciel dans un vortex argenté, invincible aux attaques aériennes.',
    },
    specialBoost: {
      input: REMIX,
      text: 'La Lame astrale : double lame orbitale de platine qui projette l’adversaire au sol.',
    },
    specialForwardBoost: {
      input: FORWARD_REMIX,
      text: 'Le Rush astral : invincible en pleine traversée dimensionnelle pour passer à travers les projectiles, il fait décoller la cible très haut.',
    },
    specialAntiAirBoost: {
      input: ANTI_AIR_REMIX,
      text: 'Le Vortex astral : totalement invincible dès la première image pour punir au réveil.',
    },
    super: {
      input: SUPER,
      text: "La Déchirure : trois portails dimensionnels s'entrelacent autour de Feline et déchirent l'espace en trois décharges d'argent. Avec FINISH allumé, c'est son Finisher, Eclipse Astrale.",
    },
    standLight: {
      input: 'L',
      text: 'La Griffe vive : son attaque féline la plus rapide. Enchaîne L pour le Direct félin, arrière + L pour la Double griffe, ou bas + L pour la Patte basse.',
    },
    jabRepeat: {
      input: 'L, puis arrière + L',
      text: "La Double griffe : une seconde griffe rapide qui garde l'avantage sur la garde. Enchaîne L pour le Direct félin.",
    },
    chainLight: {
      input: CHAIN,
      text: "Le Direct félin : son deuxième temps. Continue avec L pour le Fouet lunaire, H pour la Chasse haute, avant + H pour l'Enclume astrale, bas + H pour le Balayage félin, ou arrière + H pour l'Elan chassé.",
    },
    lightFinisher: {
      input: LIGHT_FINISHER,
      text: "Le Fouet lunaire : un grand coup de pied circulaire haut tendu qui couche la cible dans un anneau d'argent.",
    },
    forwardLight: {
      input: FORWARD_LIGHT,
      text: 'Le Pas de velours : un pas glissé suivi d’un direct vif à mi-distance.',
    },
    standHeavy: {
      input: 'H',
      text: "La Chasse haute : un grand coup de pied latéral haut tendu. En CONTRE, il plie l'adversaire sur place et ouvre toute la phrase.",
    },
    chainHeavy: {
      input: CHAIN_HEAVY,
      text: 'La Frappe à genou : Feline plonge un genou au sol et frappe bas sous la garde debout.',
    },
    chainHigh: {
      input: CHAIN_HIGH,
      text: "L'Enclume astrale : un coup sauté retombant par-dessus la garde. En l'air, il écrase la cible au sol et la fait rebondir une fois par combo.",
    },
    forwardHeavy: {
      input: FORWARD_HEAVY,
      text: 'Le Plongeon félin : un coup de talon plongeant par-dessus la garde qui ouvre un adversaire accroupi.',
    },
    backHeavy: {
      input: BACK_HEAVY,
      text: "L'Uppercut astral : un coup montant entouré d'un halo argenté qui lance haut en jongle.",
    },
    chainLaunch: {
      input: `${CHAIN_LAUNCH} (ou H, puis arrière + H)`,
      text: "L'Elan chassé : le lanceur précédé d'un pas d'appel pour lever la cible en bout de corde.",
    },
    crouchLight: {
      input: 'Bas + L',
      text: 'La Patte basse : un coup rapide au ras du sol qui se pare accroupi et lance tes cordes légères.',
    },
    crouchHeavy: {
      input: 'Bas + H',
      text: "Le Balayage félin : une main posée au sol, sa jambe tendue fauche les appuis et couche l'adversaire.",
    },
    jumpLight: {
      input: "En l'air, L",
      text: 'La Griffe sautée : un coup aérien rapide à parer debout.',
    },
    jumpHeavy: {
      input: "En l'air, H",
      text: 'Le Coup de pied volant : un grand coup de pied sauté horizontal à longue portée.',
    },
    grab: {
      input: GRAB,
      text: "La Capture : saisit l'adversaire de près à travers sa garde.",
    },
    pummel: {
      input: PUMMEL,
      text: "La Griffure : frappe l'adversaire tenu avant de le projeter.",
    },
    throwForward: {
      input: THROW_FORWARD,
      text: 'La Projection astrale : soulève et projette la cible loin devant à travers un anneau dimensionnel.',
    },
    throwBack: {
      input: THROW_BACK,
      text: "La Bascule du portail : fait passer l'adversaire par-dessus l'épaule pour inverser les côtés.",
    },
    dashForward: {
      input: DASH,
      text: 'Le Bond astral : un bond félin rasant à travers une brèche, annulable dès le neuvième tic.',
    },
    boostCancel: {
      input: REWIND,
      text: "L'Eclipse : coupe le coup en un éclair astral de 26 px et relance toute ta phrase.",
    },
    dashBack: {
      input: BACKDASH,
      text: "L'Esquive féline : un bond arrière souple qui esquive les prises au départ.",
    },
  },
  combos: [
    {
      input: 'L, L, L',
      text: 'La corde de base conclue par le grand coup de pied du Fouet lunaire.',
    },
    { input: 'L, L, H, S', text: 'La corde qui finit sur la Lame de portail.' },
    {
      input: 'L, L, H, H, avant + S',
      text: 'Le combo complet sans jauge, conclu par le Rush astral.',
    },
    {
      input: 'Arrière + H, puis L, L, L',
      text: "Le jongle après l'Uppercut astral : attends la reprise et enchaîne en plein vol.",
    },
    {
      input: 'L, L, arrière + H, puis L, L, avant + H, puis L, L, L',
      text: "Le grand jongle avec rebond de l'Enclume astrale au milieu de la phrase.",
    },
    { input: SUPER_COMBO, text: "Le combo de base qui s'annule dans la Déchirure." },
    {
      input: `L, L, H, H, arrière + BOOST ${FINISH_LIT}`,
      text: 'Eclipse Astrale : trois portails astraux entrelacés déchirent la scène et scellent le match.',
    },
  ],
};
