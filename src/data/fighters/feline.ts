import type { FighterTemplate } from '../../core/config';
import { px } from '../../core/constants';
import { GRAB_HITSTOP } from '../../core/rules';
import { advance, box, dash, HEAVY_CANCELS, kd, LIGHT_CANCELS, strike, throwMove } from './shared';
import { felineBoost } from './feline-boost';
import { FELINE_STRINGS } from './feline-strings';

/**
 * Feline, « la chasseresse des portails » (issue #155 comment 6660565057): an agile dimensional
 * cat-fighter with silver-white mane & tail, black techwear with a glowing cyan shoulder triangle,
 * and astral portal specials:
 * - Lame de portail (`S`): summons a vertical portal and projects an orbital silver blade;
 * - Rush dimensionnel (`→ + S`): lunges through an entry/exit portal pair across 42 px;
 * - Portail ascendant (`↓ + S`): erupts from a floor portal in a rising vortex uppercut;
 * - Bond astral (`dashForward`): predator four-point dash through a portal, cancellable from f9.
 */
const FELINE_PLAIN: FighterTemplate = {
  name: 'Feline',
  maxHealth: 950,
  walkForwardSpeed: px(1.95),
  walkBackSpeed: px(1.5),
  jumpVelocity: px(10.8),
  gravity: px(0.65),
  jumpForwardSpeed: px(2.4),
  jumpBackSpeed: px(2.0),
  preJumpFrames: 4,
  landingFrames: 3,
  knockdownFrames: 40,
  standingPushbox: { width: px(28), height: px(80) },
  crouchingPushbox: { width: px(32), height: px(50) },
  airPushbox: { width: px(24), height: px(44), lift: px(30) },
  lyingPushbox: { width: px(28), height: px(20) },
  standingHurtboxes: [box(-27, 0, 40.5, 79.5)],
  crouchingHurtboxes: [box(-18.5, 0, 32.5, 57)],
  airHurtboxes: [box(-22, 4, 44, 40), box(-11, 44, 30.5, 42.5)],
  moves: {
    ...FELINE_STRINGS,
    forwardHeavy: strike({
      name: 'Plongeon felin',
      frames: [19, 3, 15],
      damage: 70,
      stun: [18, 13],
      hitstop: 12,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(12, 36, 28, 36),
      motion: advance(37, { from: 6, to: 14, distancePx: 8 }),
    }),
    backHeavy: strike({
      name: 'Uppercut astral',
      frames: [7, 4, 17],
      damage: 65,
      stun: [0, 14],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(4, 58, 26, 46),
      knockdown: kd(8, 0.5, { juggle: 4 }),
      counter: { knockdown: kd(8, 0.5, { juggle: 5 }) },
      cancelInto: HEAVY_CANCELS,
    }),
    crouchLight: strike({
      name: 'Patte basse',
      frames: [4, 2, 8],
      damage: 25,
      stun: [12, 8],
      hitstop: 7,
      pushbackPx: 2.5,
      guard: 'low',
      hitbox: box(12, 4, 26, 10),
      cancelInto: LIGHT_CANCELS,
      crouching: true,
    }),
    crouchHeavy: strike({
      name: 'Balayage felin',
      frames: [9, 3, 20],
      damage: 70,
      stun: [0, 14],
      hitstop: 11,
      pushbackPx: 3.5,
      guard: 'low',
      hitbox: box(12, 2, 39, 12),
      knockdown: kd(2, 3.5, { trip: true }),
      crouching: true,
    }),
    jumpLight: strike({
      name: 'Griffe sautée',
      frames: [4, 6, 6],
      damage: 30,
      stun: [14, 10],
      hitstop: 8,
      pushbackPx: 2,
      guard: 'overhead',
      hitbox: box(4, 10, 24, 16),
    }),
    jumpHeavy: strike({
      name: 'Coup de pied volant',
      frames: [7, 5, 10],
      damage: 70,
      stun: [18, 12],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(2, -4, 34, 22),
    }),
    // S: Lame de portail (05_Lame_de_Portail) — opens a vertical portal and slashes with an orbital
    // dimensional blade that keeps the opponent standing (+1 on hit).
    special: strike({
      name: 'Lame de portail',
      kind: 'special',
      frames: [10, 4, 20],
      damage: 75,
      stun: [24, 14],
      hitstop: 12,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(8, 30, 37, 26),
      motion: advance(34, { from: 2, to: 10, distancePx: 26 }),
    }),
    // → + S: Rush dimensionnel (04_Teleportation_Offensive_Rush) — dives into an upright entry
    // portal, jumps 42 px unseen (ticks 8 and 9) and rises out of a floor portal to floor the
    // opponent.
    specialForward: strike({
      name: 'Rush dimensionnel',
      kind: 'special',
      frames: [12, 4, 18],
      damage: 80,
      stun: [0, 12],
      hitstop: 13,
      pushbackPx: 3.5,
      guard: 'mid',
      hitbox: box(10, 32, 39, 20),
      motion: advance(34, { from: 8, to: 10, distancePx: 42 }),
      knockdown: kd(3, 3.5),
    }),
    // ↓ + S: Portail ascendant (02_Portail_Horizontal_Sortie & 09_Coups_Speciaux_Annexes/01_uppercut_portail).
    specialAntiAir: strike({
      name: 'Portail ascendant',
      kind: 'special',
      frames: [3, 8, 28],
      damage: 105,
      stun: [0, 12],
      hitstop: 15,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(4, 30, 20, 70),
      invincible: { from: 0, to: 8, against: 'air' },
      knockdown: kd(3, 3),
    }),
    grab: {
      name: 'Capture',
      kind: 'grab',
      startup: 5,
      active: 3,
      recovery: 20,
      damage: 0,
      hitstun: 0,
      blockstun: 0,
      hitstop: GRAB_HITSTOP,
      pushback: 0,
      guard: 'mid',
      hitbox: box(6, 20, 24, 40),
    },
    pummel: throwMove({ name: 'Griffure', startup: 6, recovery: 9, damage: 15, hitstop: 6 }),
    throwForward: throwMove({
      name: 'Projection astrale',
      startup: 10,
      recovery: 25,
      damage: 100,
      hitstop: 10,
      knockdown: kd(3.5, 3.5),
    }),
    throwBack: throwMove({
      name: 'Bascule du portail',
      startup: 14,
      recovery: 27,
      damage: 90,
      hitstop: 10,
      knockdown: kd(3.5, 3),
      sideSwitchFrame: 6,
    }),
    // Predator dash through a dimensional rift, cancellable from frame 9.
    dashForward: dash({
      name: 'Bond astral',
      duration: 16,
      frames: 12,
      distancePx: 56,
      freeCancelFrom: 9,
    }),
    dashBack: dash({
      name: 'Esquive feline',
      duration: 22,
      frames: 16,
      distancePx: 46,
      back: true,
      throwInvincible: { from: 0, to: 12 },
    }),
  },
};

export const FELINE: FighterTemplate = {
  ...FELINE_PLAIN,
  moves: { ...FELINE_PLAIN.moves, ...felineBoost(FELINE_PLAIN.moves) },
};
