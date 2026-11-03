import type { FighterTemplate } from '../../core/config';
import { px } from '../../core/constants';
import { GRAB_HITSTOP } from '../../core/rules';
import { advance, box, dash, HEAVY_CANCELS, kd, LIGHT_CANCELS, strike, throwMove } from './shared';
import { wattBoost } from './watt-boost';
import { WATT_STRINGS } from './watt-strings';

/**
 * Watt, « il attrape, il porte, il éteint » (docs/watt.md, docs/watt-arsenal.md): the
 * tournament's roadie, a lifting exoskeleton on both arms and a light bulb for a head. The
 * longest grab of the cast (53 px), the most health (1150) and the heaviest throws; slow, one
 * reversal only (his super). His own kit: the armor, the tension gauge, the cable, the
 * Branchement, the Plongeon, the caught Plafonnier and the Pas blindé. His Boost moves are
 * written from his plain specials (`WATT`, below). Hurtboxes are provisional until his drawing
 * measures them (docs/combat-v2.md §9.2).
 */
const WATT_PLAIN: FighterTemplate = {
  name: 'Watt',
  maxHealth: 1150,
  // The slowest walk of the cast.
  walkForwardSpeed: px(1.2),
  walkBackSpeed: px(1),
  // 33 ticks above the ground, 60.2 px high, 54.4 px forward.
  jumpVelocity: px(7.5),
  gravity: px(0.44),
  jumpForwardSpeed: px(1.6),
  jumpBackSpeed: px(1.4),
  preJumpFrames: 5,
  landingFrames: 4,
  knockdownFrames: 40,
  // His own gauge (docs/watt-arsenal.md §3.2): catching, absorbing and taking blows fill it,
  // staying out of contact empties it; full, his next special is electrified.
  tension: { max: 100, gains: { grab: 30, pummel: 5, armor: 20, hit: 10 }, decayEvery: 8 },
  // 28 px wide, the ceiling of the hold test (docs/art/perso-3.md §4.3.4): his mass is drawn.
  standingPushbox: { width: px(28), height: px(84) },
  crouchingPushbox: { width: px(32), height: px(54) },
  airPushbox: { width: px(24), height: px(46), lift: px(30) },
  lyingPushbox: { width: px(28), height: px(22) },
  // Provisional: the mock-up of the silhouette sheet (94 px standing, the bulb on top), until
  // `npm run measure-boxes -- watt` measures his drawing.
  standingHurtboxes: [box(-24, 0, 40, 86)],
  crouchingHurtboxes: [box(-22, 0, 38, 60)],
  airHurtboxes: [box(-22, 4, 44, 42), box(-14, 46, 30, 42)],
  moves: {
    ...WATT_STRINGS,
    // → + H: the fist rises high behind the bulb, then falls straight down. An overhead, 22
    // ticks, well telegraphed.
    forwardHeavy: strike({
      name: 'Coup de pilon',
      frames: [22, 3, 16],
      damage: 75,
      stun: [20, 14],
      hitstop: 12,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(12, 36, 34, 40),
      motion: advance(41, { from: 6, to: 18, distancePx: 12 }),
      // The armor of the descending fist (docs/watt-arsenal.md §3.1): one blow absorbed on f8-21.
      armor: { from: 8, to: 21 },
    }),
    // ← + H: both arms snatch upward. An anti-air without invincibility, and the launcher (4
    // juggle points); its box starts above a crouching body: it whiffs on it.
    backHeavy: strike({
      name: 'Arraché',
      frames: [8, 4, 18],
      damage: 65,
      stun: [0, 14],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(2, 58, 30, 46),
      knockdown: kd(8, 0.5, { juggle: 4 }),
      cancelInto: HEAVY_CANCELS,
    }),
    crouchLight: strike({
      name: 'Paume basse',
      frames: [5, 2, 9],
      damage: 24,
      stun: [12, 8],
      hitstop: 7,
      pushbackPx: 2,
      guard: 'low',
      hitbox: box(8, 2, 28, 12),
      cancelInto: LIGHT_CANCELS,
      crouching: true,
    }),
    // Crouched, the arm rakes the floor: it sweeps.
    crouchHeavy: strike({
      name: 'Ratissage',
      frames: [11, 3, 22],
      damage: 75,
      stun: [0, 14],
      hitstop: 12,
      pushbackPx: 3.5,
      guard: 'low',
      hitbox: box(10, 2, 38, 12),
      knockdown: kd(2, 3.5, { trip: true }),
      crouching: true,
    }),
    jumpLight: strike({
      name: 'Coude plongeant',
      frames: [5, 6, 8],
      damage: 32,
      stun: [14, 10],
      hitstop: 8,
      pushbackPx: 2,
      guard: 'overhead',
      hitbox: box(4, 6, 26, 18),
    }),
    // The whole body down, arms open.
    jumpHeavy: strike({
      name: 'Plaquage',
      frames: [8, 6, 12],
      damage: 78,
      stun: [18, 12],
      hitstop: 12,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(0, -4, 34, 24),
    }),
    // S: both clamps forward on a 16 px step; on contact, the exoskeleton discharges. It floors
    // (−12 once blocked).
    special: strike({
      name: 'Coup de jus',
      kind: 'special',
      frames: [10, 3, 22],
      damage: 90,
      stun: [0, 12],
      hitstop: 14,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(10, 30, 34, 30),
      motion: advance(35, { from: 2, to: 10, distancePx: 16 }),
      knockdown: kd(3, 3),
      // Electrified (docs/watt-arsenal.md §3.2): harder, and safe once blocked (−4).
      charged: { damage: 113, blockstun: 20 },
    }),
    // → + S: the shoulder rush of the source drawing, 56 px: his punish from far (107.5 px). It
    // floors; a projectile catches him on his way in.
    specialForward: strike({
      name: 'Surcharge',
      kind: 'special',
      frames: [14, 4, 20],
      damage: 85,
      stun: [0, 12],
      hitstop: 13,
      pushbackPx: 4,
      guard: 'mid',
      hitbox: box(8, 20, 30, 50),
      motion: advance(38, { from: 3, to: 18, distancePx: 56 }),
      knockdown: kd(3, 4),
      // One blow absorbed through the rush (docs/watt-arsenal.md §3.1); electrified, the whole
      // way (docs/watt-arsenal.md §3.2).
      armor: { from: 3, to: 14 },
      charged: { damage: 106, armor: { from: 0, to: 38 } },
    }),
    // ↓ + S: the clamps catch the jumper and slam him down (docs/watt-arsenal.md §4.4): a grab
    // of the air, invincible to attacks from the air on f0-9, played at once on the catch.
    specialAntiAir: {
      name: 'Plafonnier saisi',
      kind: 'grab',
      startup: 6,
      active: 6,
      recovery: 26,
      damage: 0,
      hitstun: 0,
      blockstun: 0,
      hitstop: GRAB_HITSTOP,
      pushback: 0,
      guard: 'mid',
      hitbox: box(-4, 50, 28, 40),
      invincible: { from: 0, to: 9, against: 'air' },
      catches: 'air',
      throw: 'throwCatch',
    },
    throwCatch: throwMove({
      name: 'Plaqué',
      startup: 10,
      recovery: 20,
      damage: 110,
      hitstop: 16,
      knockdown: kd(3.5, 2.5),
      charged: { damage: 138 },
    }),
    // S up close (40 px or less): the command grab, 140, played at once (docs/watt-arsenal.md
    // §4.1). It cannot be broken free of; missed, it leaves him wide open.
    specialClose: {
      name: 'Branchement',
      kind: 'grab',
      startup: 5,
      active: 2,
      recovery: 40,
      damage: 0,
      hitstun: 0,
      blockstun: 0,
      hitstop: GRAB_HITSTOP,
      pushback: 0,
      guard: 'mid',
      hitbox: box(6, 20, 30, 40),
      closeRange: px(40),
      throw: 'throwClose',
    },
    throwClose: throwMove({
      name: 'Branchement',
      startup: 10,
      recovery: 24,
      damage: 140,
      hitstop: 16,
      knockdown: kd(4, 3),
      charged: { damage: 175 },
    }),
    // ← + S: the cable, from 30 to 110 px, reeling the opponent in to 34 px on hit, +4 for him
    // (docs/watt-arsenal.md §4.2). Electrified: stunned long enough for a guaranteed combo.
    specialBack: strike({
      name: 'Câble',
      kind: 'special',
      frames: [14, 4, 28],
      damage: 40,
      stun: [32, 10],
      hitstop: 9,
      pushbackPx: 2,
      guard: 'mid',
      hitbox: box(30, 30, 80, 12),
      pull: px(34),
      charged: { damage: 50, hitstun: 36 },
    }),
    // S in the air: the whole weight down on the opponent on the ground, caught and crushed
    // (docs/watt-arsenal.md §4.3): a grab from above, played at once on the catch.
    jumpSpecial: {
      name: 'Plongeon',
      kind: 'grab',
      startup: 8,
      active: 4,
      recovery: 22,
      damage: 0,
      hitstun: 0,
      blockstun: 0,
      hitstop: GRAB_HITSTOP,
      pushback: 0,
      guard: 'mid',
      // The Plaquage's own box: his body as it falls, the catch at his feet.
      hitbox: box(0, -4, 34, 24),
      throw: 'throwDive',
    },
    throwDive: throwMove({
      name: 'Plongeon',
      startup: 10,
      recovery: 22,
      damage: 100,
      hitstop: 16,
      knockdown: kd(3.5, 2.5),
      charged: { damage: 125 },
    }),
    // His signature: the longest grab of the cast, the exoskeleton's clamps (up to 53 px on Nayo,
    // 54 on Riff, measured in the engine); a tick slower than the others'.
    grab: {
      name: 'Prise',
      kind: 'grab',
      startup: 6,
      active: 3,
      recovery: 22,
      damage: 0,
      hitstun: 0,
      blockstun: 0,
      hitstop: GRAB_HITSTOP,
      pushback: 0,
      guard: 'mid',
      hitbox: box(6, 20, 34, 40),
    },
    pummel: throwMove({ name: 'Serrage', startup: 7, recovery: 10, damage: 18, hitstop: 6 }),
    // He lifts the opponent and sets him down farther, like a crate unloaded.
    throwForward: throwMove({
      name: 'Déchargement',
      startup: 12,
      recovery: 24,
      damage: 120,
      hitstop: 16,
      knockdown: kd(3.5, 4),
    }),
    // A quarter turn, the way a bulb is screwed in, then over his shoulder: a standing throw, on
    // the victims' own strips. The sides switch on tick 6, like everyone's.
    throwBack: throwMove({
      name: 'Vissage',
      startup: 14,
      recovery: 26,
      damage: 110,
      hitstop: 15,
      knockdown: kd(3.5, 3),
      sideSwitchFrame: 6,
    }),
    // A heavy step, shoulders first, 36 px, that absorbs one blow on f3-14 (docs/watt-arsenal.md
    // §5): through the Vinyle, then the grab.
    dashForward: {
      ...dash({ name: 'Pas blindé', duration: 20, frames: 14, distancePx: 36 }),
      armor: { from: 3, to: 14 },
    },
    // 32 px back, and nothing against a grab: he gets out badly.
    dashBack: dash({ name: 'Recul', duration: 24, frames: 16, distancePx: 32, back: true }),
  },
};

/** Watt with his Boost moves (docs/watt.md §7): the Remixes « survolté », Rallumage, Plein feu. */
export const WATT: FighterTemplate = {
  ...WATT_PLAIN,
  moves: { ...WATT_PLAIN.moves, ...wattBoost(WATT_PLAIN.moves) },
};
