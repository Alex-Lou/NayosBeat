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

/** Koda's help page, listing every move and his 7 core combos. */
export const KODA_TEXTS: FighterTexts = {
  title: "L'accordeur d'acier : il glisse, entrechoque ses brassards et frappe à paume ouverte",
  moves: {
    special: {
      input: SPECIAL,
      text: "Le Diapason : Koda avance d'un pas et entrechoque ses deux brassards d'argent pour libérer une onde acoustique de courte portée qui laisse l'adversaire debout sous pression.",
    },
    specialForward: {
      input: 'Avant + S',
      text: "La Fente d'acier : une longue fente martiale au sol, paume en lance, qui traverse l'espace et couche la cible. S'il touche, arrière + BOOST lance l'Octave.",
    },
    specialAntiAir: {
      input: ANTI_AIR,
      text: 'La Cymbale : il jaillit vers le ciel, brassards levés. Invincible contre les attaques aériennes dès le départ pour cueillir les sauts.',
    },
    specialBoost: {
      input: REMIX,
      text: 'Le Diapason platine : ses brassards absorbent un coup en chemin et son onde blanche projette au sol.',
    },
    specialForwardBoost: {
      input: FORWARD_REMIX,
      text: "La Fente platine : invincible en cours de fente pour traverser les projectiles, elle fait décoller l'adversaire très haut.",
    },
    specialAntiAirBoost: {
      input: ANTI_AIR_REMIX,
      text: 'La Cymbale platine : devient totalement invincible dès la première image, un vrai réveil qui ne pardonne pas.',
    },
    super: {
      input: SUPER,
      text: "L'Octave : tout se fige, puis Koda frappe trois fois le sol de ses brassards d'argent et libère une onde totale. Avec FINISH allumé, c'est son Finisher, Accord Final : l'accord résonne et scelle le match.",
    },
    standLight: {
      input: 'L',
      text: "La Paume vive : son attaque rapide à main ouverte. Enchaîne L pour le Revers d'acier, arrière + L pour la Double paume, ou bas + L pour la Pointe basse.",
    },
    jabRepeat: {
      input: 'L, puis arrière + L',
      text: "La Double paume : la main ouverte repart aussitôt et garde l'avantage même sur une garde. Enchaîne L pour le Revers d'acier.",
    },
    chainLight: {
      input: CHAIN,
      text: "Le Revers d'acier : son deuxième temps. Continue avec L pour la Frappe du manteau, H pour la Manchette, avant + H pour l'Enclume, bas + H pour la Fauche du manteau, ou arrière + H pour le Sursaut chassé.",
    },
    lightFinisher: {
      input: LIGHT_FINISHER,
      text: "La Frappe du manteau : un large revers circulaire à paume ouverte qui couche la cible dans un anneau d'émeraude.",
    },
    forwardLight: {
      input: FORWARD_LIGHT,
      text: "Le Pas d'accord : un pas glissé suivi d'une paume sèche pour ouvrir la garde à mi-distance.",
    },
    standHeavy: {
      input: 'H',
      text: "La Manchette : un coup lourd du brassard d'argent. En CONTRE, il plie l'adversaire sur place et ouvre toute la phrase.",
    },
    chainHeavy: {
      input: CHAIN_HEAVY,
      text: 'La Percussion basse : genoux fléchis, le brassard plonge sous les côtes et touche même accroupi.',
    },
    chainHigh: {
      input: CHAIN_HIGH,
      text: "L'Enclume : le brassard retombe par-dessus la garde. En l'air, il écrase la cible au sol et la fait rebondir une fois par combo.",
    },
    forwardHeavy: {
      input: FORWARD_HEAVY,
      text: "Le Marteau d'argent : une frappe haute par-dessus la garde qui ouvre un adversaire accroupi.",
    },
    backHeavy: {
      input: BACK_HEAVY,
      text: 'Le Sursaut : un coup montant qui fait décoller haut pour démarrer un jongle.',
    },
    chainLaunch: {
      input: `${CHAIN_LAUNCH} (ou H, puis arrière + H)`,
      text: "Le Sursaut chassé : le lanceur précédé d'un pas d'appel pour lever la cible en bout de corde.",
    },
    crouchLight: {
      input: 'Bas + L',
      text: 'La Pointe basse : un coup rapide au ras du sol qui se pare accroupi et lance tes cordes légères.',
    },
    crouchHeavy: {
      input: 'Bas + H',
      text: "La Fauche du manteau : fauche les appuis et couche l'adversaire sur le dos.",
    },
    jumpLight: {
      input: "En l'air, L",
      text: 'Le Genou vif : un coup sauté rapide à parer debout.',
    },
    jumpHeavy: {
      input: "En l'air, H",
      text: 'La Lame sautée : un grand coup de pied sauté à longue portée.',
    },
    grab: {
      input: GRAB,
      text: "La Prise : saisit l'adversaire au col de près, à travers sa garde.",
    },
    pummel: {
      input: PUMMEL,
      text: "Le Coup de coude : frappe l'adversaire tenu avant de le projeter.",
    },
    throwForward: {
      input: THROW_FORWARD,
      text: "Le Rejet : repousse violemment la cible loin devant d'une paume résonnante.",
    },
    throwBack: {
      input: THROW_BACK,
      text: "La Volte d'épaule : fait passer l'adversaire par-dessus l'épaule pour inverser les côtés.",
    },
    dashForward: {
      input: DASH,
      text: "Le Pas glissé : un bond rapide vers l'avant, annulable dès le dixième tic par un coup.",
    },
    boostCancel: {
      input: REWIND,
      text: 'Le Tempo : coupe le coup en un pas vif de 24 px et relance toute ta phrase.',
    },
    dashBack: {
      input: BACKDASH,
      text: 'Le Retrait : un bond arrière qui esquive les prises au départ.',
    },
  },
  combos: [
    { input: 'L, L, L', text: 'La corde de base, partout où la Paume vive touche.' },
    { input: 'L, L, H, S', text: 'La corde qui finit sur le choc de brassards du Diapason.' },
    {
      input: 'L, L, H, H, avant + S',
      text: "Le combo complet sans jauge, conclu par la Fente d'acier.",
    },
    {
      input: 'Arrière + H, puis L, L, L',
      text: 'Le jongle après le Sursaut : attends la reprise et enchaîne en plein vol.',
    },
    {
      input: 'L, L, arrière + H, puis L, L, avant + H, puis L, L, L',
      text: "Le grand jongle avec rebond de l'Enclume au milieu de la phrase.",
    },
    { input: SUPER_COMBO, text: "Le combo de base qui s'annule dans l'Octave." },
    {
      input: `L, L, H, H, arrière + BOOST ${FINISH_LIT}`,
      text: "Accord Final : trois frappes d'argent et l'accord résonne dans toute la salle.",
    },
  ],
};
