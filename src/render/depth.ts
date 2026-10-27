/**
 * Draw order of the fight, back to front (Phaser depth). A dash's afterimages and the ring of a
 * hold behind both fighters; the fighter attacking is drawn over the other one; effects, projectiles and dust over
 * both; blood, then sparks, then the comic words of the blows; debug boxes on top.
 */
export const DEPTH = {
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
