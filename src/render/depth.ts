/**
 * Draw order of the fight, back to front (Phaser depth). The fighter attacking is drawn over
 * the other one; effects and projectiles over both; blood, then sparks, then the comic words
 * of the blows; debug boxes on top.
 */
export const DEPTH = {
  fighterBack: 1,
  fighterFront: 2,
  effects: 3,
  blood: 4,
  sparks: 5,
  words: 6,
  debug: 7,
} as const;
