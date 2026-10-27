import { solve, type Effect } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, onBall, planted, smear, toeOf, type Pose } from './common.ts';
import { ANIMATED as CROUCH_ANIMATED, POSES as CROUCH_STRIP } from './crouch.ts';

export const ANIMATED: boolean = true;

/**
 * crouchLight (Coup bas): 5 frames, 1, 2, 2, 3, 4 ticks (12), the kick on frame 2 (ticks 3-4),
 * hitbox 10..32 / 4..14. A b-girl's kick-out « sur une main »: out of the crouch she pounces
 * forward onto her rear hand, slapped flat on the floor under her chest, and the lead boot
 * fires out low at the shin like a piston, heel first; the head stays up, the eyes on the
 * opponent, the lead fist up by the chin. Then the boot snaps back, the hand pushes off the
 * floor and she sits back into the crouch. Her fastest low (3 ticks): no wind-up beyond the dip
 * of the shoulder, the whole body going forward and down at once.
 *
 * - 0 (1 tick): the dip: the rear shoulder rolls forward and the cocked fist drops for the
 *   floor, the hips go, the lead heel comes off the floor.
 * - 1: the hand slaps the floor, the chest pitched over it, the lead knee coming through, the
 *   boot half way out.
 * - 2: the kick: the leg long and low, the boot flexed up, the heel leading and the sole at the
 *   shin (a stomp, not a toe poke); a short trail skimming the floor, a tick of a flash, dust
 *   under the hand.
 * - 3: the boot snaps back, the knee folding; the hand has pushed off the floor and comes up
 *   open, half way to the ear.
 * - 4: back in the crouch, the hand closed into the cocked fist by the ear: the crouch's loop
 *   (or its restart) follows without a pop.
 *
 * The rear foot never leaves its ball (the heel pumps), the lead foot leaves the floor on the
 * dip and lands back on its own print.
 */

const TOE = toeOf(GUARD.nearFoot);

/** Where the cocked rear fist sits from the rear shoulder in the guard. */
const COCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

/** The loaded rear fist carried by its shoulder, nudged by (dx, dy). */
function cocked(pose: Pose, dx = 0, dy = 0): Pose {
  const shoulder = solve(pose, RIFF_BODY).near.shoulder;
  return { ...pose, nearFist: at(shoulder.x + COCKED.x + dx, shoulder.y + COCKED.y + dy) };
}

/** Her crouch as crouch.ts draws it, for as long as that strip is not animated. */
const FALLBACK: Pose = cocked({
  ...GUARD,
  hip: at(-8.5, 15.5),
  torso: 26,
  head: -15,
  shrug: 2.6,
  nearFoot: onBall(TOE, -20),
  farFoot: GUARD.farFoot,
  farFist: at(8.5, 24.5),
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

/** Where the rear hand lands, flat on the floor under the chest. */
const PALM = at(3, 3);

type Hand = { readonly at: ReturnType<typeof at> } | { readonly cocked: readonly [number, number] };

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
  /** The rear hand: open at a point (on the floor), or cocked by the ear (nudged). */
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
      bends: { ...REST.bends, nearElbow: 'back' },
    };
  }
  return cocked(pose, k.hand.cocked[0], k.hand.cocked[1]);
}

const KEYS: readonly Key[] = [
  // 0: the dip.
  {
    hip: [-7.6, 14.6],
    torso: 32,
    look: 1,
    shrug: 2.2,
    roll: 2.5,
    heel: -24,
    lead: { x: 7.9, y: 6.6, angle: 8 },
    hand: { at: at(-8.5, 27) },
    fist: [10.5, 29],
    twist: 0.3,
  },
  // 1: the hand slaps down, the boot comes through.
  {
    hip: [-6.8, 11.8],
    torso: 38,
    look: 2,
    shrug: 1.2,
    roll: 7,
    heel: -30,
    lead: { x: 17, y: 9, angle: 24 },
    hand: { at: PALM },
    fist: [11.5, 34],
    twist: 0.15,
    effects: [smear(3, [9, 8], [13, 9.5], [18, 9.5]), dust(PALM.x, 2, 0.05)],
  },
  // 2: the kick.
  {
    hip: [-6.2, 11.2],
    torso: 40,
    look: 2,
    shrug: 0.8,
    roll: 7.5,
    heel: -32,
    lead: { x: 24.8, y: 8, angle: 40 },
    hand: { at: PALM },
    fist: [12, 34],
    twist: 0.1,
    effects: [
      smear(4, [9, 9], [16, 9], [23, 8.5], [30, 7.5]),
      { kind: 'flash', center: at(35, 7), radius: 2.5, tone: 'strike' },
      dust(PALM.x, 2.5, 0.2),
    ],
  },
  // 3: the boot snaps back, the hand comes up off the floor.
  {
    hip: [-7.4, 13.8],
    torso: 34,
    look: 1,
    shrug: 1.8,
    roll: 3.5,
    heel: -27,
    lead: { x: 12, y: 7.4, angle: 6 },
    hand: { at: at(-5, 24) },
    fist: [11, 29],
    twist: 0.25,
    effects: [dust(PALM.x, 2.5, 0.55)],
  },
  // 4: back in the crouch.
  {
    hip: [REST.hip.x + 0.2, REST.hip.y - 0.5],
    torso: REST.torso + 1.5,
    shrug: (REST.shrug ?? 0) + 0.2,
    roll: 0.4,
    heel: -21,
    lead: planted(GUARD.farFoot.x),
    hand: { cocked: [0.3, -0.8] },
    fist: [REST.farFist.x + 0.2, REST.farFist.y - 0.4],
    twist: (REST.twist ?? 0) - 0.04,
    effects: [dust(PALM.x, 2.5, 0.85)],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
