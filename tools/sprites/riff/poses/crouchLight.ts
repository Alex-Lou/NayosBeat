import type { Bend, Effect } from '../../skeleton.ts';
import { at, GUARD, onBall, planted, smear, toeOf, type Pose } from './common.ts';
import { atChin, ANIMATED as CROUCH_ANIMATED, POSES as CROUCH_STRIP } from './crouch.ts';

export const ANIMATED: boolean = true;

/**
 * crouchLight (Coup bas): 5 frames, 1, 2, 2, 3, 4 ticks (12), the kick on frame 2 (ticks 3-4),
 * hitbox 10..32 / 4..14. A b-girl's kick-out « sur une main »: out of the crouch she pounces
 * forward onto her rear hand, slapped flat on the floor under her chest, and the lead boot
 * fires out low at the shin like a piston; the head stays up, the eyes on the opponent, the lead
 * fist up by the chin. Then the boot snaps back, the hand pushes off the floor and she sits back
 * into the crouch. Her fastest low (3 ticks): no wind-up beyond the dip of the shoulder, the
 * whole body going forward and down at once.
 *
 * - 0 (1 tick): the dip: the rear shoulder rolls forward and the open rear hand drops for the
 *   floor, the hips go forward over the rear knee, the lead heel comes off the floor.
 * - 1: the hand slaps the floor, the chest pitched over it, the lead knee coming through, the
 *   boot half way out.
 * - 2: the kick: the leg long and low, the boot cocked up 50 degrees, the ball and the sole into
 *   the shin; a short trail skimming the floor, a tick of a flash, dust under the hand. The rear
 *   arm, straight under the shoulder (the elbow soft, its crook forward), carries her.
 * - 3: the boot snaps back, the knee folding; the hand has pushed off the floor and comes up
 *   open, the elbow down, half way back to the chin.
 * - 4: back in the crouch, the hand closed into the fist under the chin, the elbow down on the
 *   ribs (atChin, crouch.ts): the crouch's loop (or its restart) follows without a pop.
 *
 * The rear leg keeps the crouch's: the knee forward and low over the floor, never on it, the
 * boot on its ball, its heel only as low as the ankle lets it come (MIN_ANKLE, common.ts): the
 * hand reaches the floor because the chest pitches over it (55 to 60 degrees) and the rear
 * shoulder rolls down after it, not because the hips sink, which would drive the rear knee into
 * the floor. While the lead knee comes through (1), the chest stays at 55 and the boot already
 * low and long: a steeper chest over a higher knee would fold the thigh into the belly. The rear foot never leaves its ball (the
 * heel pumps), the lead foot leaves the floor on the dip and lands back on its own print.
 */

const TOE = toeOf(GUARD.nearFoot);

/** Her crouch as crouch.ts draws it, for as long as that strip is not animated. */
const FALLBACK: Pose = atChin({
  ...GUARD,
  hip: at(-13, 17.5),
  torso: 35,
  head: -24,
  shrug: 2.6,
  nearFoot: onBall(TOE, -70),
  farFoot: GUARD.farFoot,
  farFist: at(10, 29),
  twist: 0.4,
});

/** The crouch at rest (the first frame of its loop): where the move starts and lands. */
const REST: Pose = (CROUCH_ANIMATED ? CROUCH_STRIP[3] : undefined) ?? FALLBACK;
/** The head's on-screen tilt in the crouch: she keeps it while she pounces. */
const LOOK = REST.torso + REST.head;

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/** Where the rear hand lands, flat on the floor under her chest, below the rear shoulder. */
const PALM = at(11.5, 2.6);

type Hand =
  | { readonly at: ReturnType<typeof at>; readonly elbow?: Bend }
  | { readonly chin: readonly [number, number] };

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** Extra head tilt on screen over the crouch's. */
  readonly look?: number;
  readonly shrug: number;
  /** The rear shoulder rolled down toward the floor. */
  readonly roll: number;
  readonly heel: number;
  readonly lead: Pose['farFoot'];
  /** The rear hand: open at a point (on the floor), or the fist under the chin (nudged). */
  readonly hand: Hand;
  readonly fist: readonly [number, number];
  readonly twist: number;
  readonly effects?: readonly Effect[];
}

function key(k: Key): Pose {
  const pose: Pose = {
    ...REST,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: LOOK + (k.look ?? 0) - k.torso,
    shrug: k.shrug,
    reach: { near: k.roll },
    nearFoot: onBall(TOE, k.heel),
    farFoot: k.lead,
    farFist: at(k.fist[0], k.fist[1]),
    twist: k.twist,
    ...(k.effects ? { effects: k.effects } : {}),
  };
  if ('at' in k.hand) {
    return {
      ...pose,
      nearFist: k.hand.at,
      nearHand: 'open',
      bends: { ...REST.bends, nearElbow: k.hand.elbow ?? 'back' },
    };
  }
  return atChin(pose, k.hand.chin[0], k.hand.chin[1]);
}

const KEYS: readonly Key[] = [
  // 0: the dip: the rear shoulder rolls forward, the open rear hand drops for the floor, the
  // hips go forward and down over the floating rear knee, the lead heel comes off the floor.
  {
    hip: [-12.4, 16.6],
    torso: 46,
    look: 1,
    shrug: 2,
    roll: 3,
    heel: -76,
    lead: { x: 7.9, y: 6.6, angle: 8 },
    hand: { at: at(5, 14), elbow: 'back' },
    fist: [9.5, 33],
    twist: 0.3,
  },
  // 1: the hand slaps the floor under the chest, the chest pitched over it, the lead knee
  // coming through, the boot half way out.
  {
    hip: [-11.4, 16.4],
    torso: 55,
    look: 2,
    shrug: 1,
    roll: 10.5,
    heel: -80,
    lead: { x: 17.2, y: 7.8, angle: 44 },
    hand: { at: PALM },
    fist: [14.5, 28],
    twist: 0.15,
    effects: [smear(3, [9, 8], [12, 9.5], [16.5, 10]), dust(PALM.x, 2, 0.05)],
  },
  // 2: the kick: the lead leg long and low, the boot cocked up 50 degrees, the ball and the sole
  // driven into the shin; a short trail skimming the floor, a tick of a flash, dust under the
  // hand. The rear arm straight under the shoulder carries her, the elbow soft.
  {
    hip: [-11, 16.5],
    torso: 61,
    look: 2,
    shrug: 0.6,
    roll: 9.5,
    heel: -82,
    lead: { x: 21.6, y: 8.2, angle: 50 },
    hand: { at: PALM },
    fist: [16, 27],
    twist: 0.1,
    effects: [
      smear(4, [9, 9], [15, 9], [21, 8.5], [26, 8]),
      { kind: 'flash', center: at(32.5, 9), radius: 2.5, tone: 'strike' },
      dust(PALM.x, 2.5, 0.2),
    ],
  },
  // 3: the boot snaps back, the knee folding; the hand has pushed off the floor and comes up
  // open, half way back to the chin.
  {
    hip: [-12.2, 16.8],
    torso: 47,
    look: 1,
    shrug: 1.8,
    roll: 3.5,
    heel: -76,
    lead: { x: 11.5, y: 7.4, angle: 6 },
    hand: { at: at(5, 23), elbow: 'back' },
    fist: [10.5, 32.5],
    twist: 0.25,
    effects: [dust(PALM.x, 2.5, 0.55)],
  },
  // 4: back in the crouch.
  {
    hip: [REST.hip.x + 0.2, REST.hip.y - 0.3],
    torso: REST.torso + 1.5,
    shrug: (REST.shrug ?? 0) + 0.2,
    roll: 0.4,
    heel: (REST.nearFoot.angle ?? 0) - 1,
    lead: planted(GUARD.farFoot.x),
    hand: { chin: [0.3, -0.8] },
    fist: [REST.farFist.x + 0.2, REST.farFist.y - 0.4],
    twist: (REST.twist ?? 0) - 0.04,
    effects: [dust(PALM.x, 2.5, 0.85)],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
