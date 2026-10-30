import type { FighterTemplate } from '../../core/config';
import { px } from '../../core/constants';
import { GRAB_HITSTOP } from '../../core/rules';
import {
  advance,
  box,
  dash,
  glide,
  HEAVY_CANCELS,
  kd,
  leapArc,
  LIGHT_CANCELS,
  strike,
  throwMove,
} from './shared';
import { riffBoost } from './riff-boost';
import { RIFF_STRINGS } from './riff-strings';

/**
 * Riff, the rushdown, « la punk qui breake et cogne » (docs/combat-v2.md §5.3, §5.5, §10.2): the
 * quickest normals, a slide under projectiles, two overheads, the only blow behind her in the
 * air; less health, a short reach, no reversal on the ground. Her blows spin and kick where
 * Nayo's go straight. Her Boost moves are written from her plain specials (`RIFF`, below).
 */
const RIFF_PLAIN: FighterTemplate = {
  name: 'Riff',
  maxHealth: 900,
  walkForwardSpeed: px(1.9),
  walkBackSpeed: px(1.4),
  // A quicker, lower jump: 27 ticks above the ground, 66.5 px high, 73 px forward. Jump-ins
  // hard to catch on reaction: the rushdown's identity.
  jumpVelocity: px(10),
  gravity: px(0.7),
  jumpForwardSpeed: px(2.6),
  jumpBackSpeed: px(2.1),
  preJumpFrames: 3,
  landingFrames: 2,
  knockdownFrames: 40,
  standingPushbox: { width: px(26), height: px(74) },
  crouchingPushbox: { width: px(30), height: px(46) },
  airPushbox: { width: px(22), height: px(40), lift: px(26) },
  lyingPushbox: { width: px(26), height: px(20) },
  // Calibrated on the drawing (`npm run measure-boxes`, docs/combat-v2.md §9.2): the front edge
  // at the farthest the body reaches (the toes of the boots, 16 px; a pixel inside them, so a
  // low blow at its farthest still meets the boot, never the air before it), the back at the
  // rear heel (her wide b-girl base, as far back in the guard as under a blow), the top at
  // the fringe. In the air the knees drive 3.5 px ahead of the chest: legs and torso get a box
  // each.
  standingHurtboxes: [box(-29, 0, 44, 75)],
  crouchingHurtboxes: [box(-25, 0, 40, 57.5)],
  airHurtboxes: [box(-28, 4, 46, 40), box(-21, 44, 35.5, 37)],
  moves: {
    ...RIFF_STRINGS,
    // → + H: the leg rises straight, then chops down like an axe. An overhead quicker than
    // Nayo's (17 ticks), −4 on block.
    forwardHeavy: strike({
      name: 'Talon',
      frames: [17, 3, 14],
      damage: 60,
      stun: [17, 12],
      hitstop: 11,
      // Pushed 14 px in all: a CONTRE still links into the Jab (§7.3).
      pushbackPx: 2.5,
      guard: 'overhead',
      hitbox: box(8, 34, 26, 36),
      motion: advance(34, { from: 4, to: 14, distancePx: 15 }),
    }),
    // ← + H: a scorpion kick, the leg over her head, covering behind her too (against
    // cross-ups). The launcher, about 60 px up with 4 juggle points; it whiffs on a crouching
    // opponent (57 px at most). She hops
    // into it: on its active frames her body is 16 px off the floor (measured, §9.2), and a
    // low blow passes under her feet (§10.2; a default decision, §18.3).
    backHeavy: strike({
      name: 'Retourné',
      frames: [6, 5, 15],
      damage: 55,
      stun: [0, 13],
      hitstop: 10,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(-12, 58, 34, 42),
      hurtboxes: [{ frames: { from: 6, to: 11 }, boxes: [box(-15, 16, 30, 80)] }],
      knockdown: kd(8, 0.5, { juggle: 4 }),
      cancelInto: HEAVY_CANCELS,
    }),
    crouchLight: strike({
      name: 'Coup bas',
      frames: [3, 2, 7],
      damage: 20,
      stun: [12, 8],
      hitstop: 6,
      pushbackPx: 2,
      guard: 'low',
      hitbox: box(10, 4, 22, 10),
      cancelInto: LIGHT_CANCELS,
      crouching: true,
    }),
    // A breakdance windmill along the floor: it sweeps.
    crouchHeavy: strike({
      name: 'Windmill',
      frames: [7, 3, 18],
      damage: 65,
      stun: [0, 13],
      hitstop: 10,
      pushbackPx: 3,
      guard: 'low',
      hitbox: box(10, 2, 34, 12),
      knockdown: kd(2, 3, { trip: true }),
      crouching: true,
    }),
    // The splits in the air: the only blow of the duo that hits behind (a cross-up).
    jumpLight: strike({
      name: 'Ciseau aérien',
      frames: [3, 6, 5],
      damage: 25,
      stun: [13, 9],
      hitstop: 7,
      pushbackPx: 2,
      guard: 'overhead',
      hitbox: box(-14, 6, 40, 18),
    }),
    jumpHeavy: strike({
      name: 'Talon sauté',
      frames: [6, 5, 9],
      damage: 65,
      stun: [17, 11],
      hitstop: 10,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(2, -4, 30, 22),
    }),
    // She dives and slides on her hip, feet first, 64 px: her body, under 29 px high from frame
    // 2 to 20 (measured: her head on the floor behind her, the boots she strikes with ahead),
    // goes under the Vinyle and the high blows. A low that sweeps: block it crouching, or
    // hit it low (the Coup bas catches it).
    special: strike({
      name: 'Glissade',
      kind: 'special',
      frames: [10, 8, 16],
      damage: 70,
      stun: [0, 14],
      hitstop: 10,
      pushbackPx: 3.5,
      guard: 'low',
      hitbox: box(6, 2, 30, 12),
      motion: glide(34, { from: 1, to: 18, distancePx: 64 }),
      hurtboxes: [{ frames: { from: 2, to: 21 }, boxes: [box(-42, 0, 62, 28.5)] }],
      knockdown: kd(2, 3.5, { trip: true }),
    }),
    // A spin that really leaves the ground (34 px high at frame 11) and lands heels first: an
    // overhead over the low blows (frames 4-18) and the grabs (in the air on frames 3-19). An
    // anti-air brings her down. At the top of the spin (frames 12-15) she is balled up high,
    // 32 px over her feet: her body there is all there is to hit.
    specialForward: strike({
      name: "Saut de l'ange",
      kind: 'special',
      frames: [16, 4, 14],
      damage: 70,
      stun: [18, 10],
      hitstop: 11,
      pushbackPx: 3,
      guard: 'overhead',
      hitbox: box(0, 16, 30, 40),
      hurtboxes: [{ frames: { from: 12, to: 16 }, boxes: [box(-24, 32, 54.5, 46)] }],
      motion: {
        ...advance(34, { from: 4, to: 20, distancePx: 35 }),
        y: leapArc(34, { from: 3, to: 20, apexPx: 34 }),
      },
    }),
    specialAntiAir: strike({
      name: 'Genou montant',
      kind: 'special',
      frames: [4, 6, 24],
      damage: 95,
      stun: [0, 12],
      hitstop: 12,
      pushbackPx: 3,
      guard: 'mid',
      hitbox: box(4, 30, 24, 62),
      // Against attacks from the air only: no reversal on the ground, her weakness.
      invincible: { from: 0, to: 6, against: 'air' },
      // Her freeze is drawn leaping, the engine keeps her on the floor (§9.2): over ticks 4-9 her
      // body hangs 32 px over her feet, arched to 111 (the knee out front is a limb), then 24 px
      // up on its way down over ticks 10-15. A low blow there passes under her boots; a meaty
      // low on ticks 0-3 still beats it, and a mid or a high blow still hits it after.
      hurtboxes: [
        { frames: { from: 4, to: 10 }, boxes: [box(-24, 32, 37.5, 79)] },
        { frames: { from: 10, to: 16 }, boxes: [box(-16.5, 24, 29.5, 82)] },
      ],
      motion: advance(34, { from: 0, to: 8, speed: 1.5 }),
      knockdown: kd(3, 3),
    }),
    // The grab, then what she does with the opponent she holds (docs/combat-v2.md §4.3).
    grab: {
      name: 'Prise',
      kind: 'grab',
      startup: 5,
      active: 3,
      recovery: 19,
      damage: 0,
      hitstun: 0,
      blockstun: 0,
      hitstop: GRAB_HITSTOP,
      pushback: 0,
      guard: 'mid',
      hitbox: box(6, 20, 22, 36),
    },
    // Quick headbutts: three fit in a hold the opponent does not struggle against.
    pummel: throwMove({ name: 'Coup de tête', startup: 4, recovery: 7, damage: 10, hitstop: 5 }),
    // A scissor of the legs: the opponent falls close by, for the pressure on the wake-up.
    throwForward: throwMove({
      name: 'Ciseaux',
      startup: 10,
      recovery: 21,
      damage: 85,
      hitstop: 10,
      knockdown: kd(3, 2),
    }),
    // The monkey flip: over her, about 66 px behind. The sides switch on tick 6, like Nayo's
    // (the same first frames: the arc goes over the head there).
    throwBack: throwMove({
      name: 'Roulade',
      startup: 14,
      recovery: 25,
      damage: 80,
      hitstop: 10,
      knockdown: kd(3.5, 3),
      sideSwitchFrame: 6,
    }),
    // Footwork: from frame 8 (53 px covered) it cancels into a normal or the grab, which glides
    // on with half the dash's speed. No run state: the cancel does that job.
    dashForward: dash({
      name: 'Footwork',
      duration: 16,
      frames: 12,
      distancePx: 64,
      freeCancelFrom: 8,
    }),
    // Grab-proof on frames 0-10 (the answer to the grab), but strikes still hit it. Its flip
    // lifts her feet 12 px off the floor on frames 5-8: a low blow only grazes them.
    dashBack: dash({
      name: 'Retrait',
      duration: 20,
      frames: 14,
      distancePx: 48,
      back: true,
      throwInvincible: { from: 0, to: 11 },
      hurtboxes: [{ frames: { from: 5, to: 9 }, boxes: [box(-21, 12, 35, 63)] }],
    }),
  },
};

/** Riff with her Boost moves (docs/combos-v3.md §4): the Remixes « à fond », Pogo, Slam. */
export const RIFF: FighterTemplate = {
  ...RIFF_PLAIN,
  moves: { ...RIFF_PLAIN.moves, ...riffBoost(RIFF_PLAIN.moves) },
};
