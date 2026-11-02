/**
 * Draw order of the fight, back to front (Phaser depth). The stage's layers (in the order they are
 * added: far, middle, floor), the rain of a rainy stage over them (stage-rain.ts), the super's dark over the stage, the Finisher's flat over it (and
 * what its scene draws on it: the crowd, the needle, the cone), a glow (the super's halo, a KO's
 * éclat) over them, behind everything else. The pools of light the moves cast on the floor over
 * the dark (they shine through it), the signature effects drawn behind the bodies (a shock ring on
 * the floor, the equalizer: signature-fx.ts) over the glows. A dash's afterimages and the ring of a
 * hold behind both fighters; the fighter attacking is drawn over the other one; effects, projectiles and dust over
 * both; blood, then sparks, then the comic words of the blows; debug boxes on top.
 */
export const DEPTH = {
  stage: 0,
  rain: 0.1,
  dim: 0.25,
  flat: 0.26,
  pools: 0.28,
  backdrop: 0.3,
  signatureBack: 0.4,
  trail: 0.5,
  holdRing: 0.75,
  fighterBack: 1,
  fighterFront: 2,
  effects: 3,
  blood: 4,
  sparks: 5,
  words: 6,
  debug: 7,
} as const;
