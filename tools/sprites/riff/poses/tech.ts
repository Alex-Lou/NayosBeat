import { at, GUARD, onBall, onHeel, planted, smear, type Effect, type Pose } from './common.ts';
import { guarded } from './jump.ts';

export const ANIMATED: boolean = true;

/**
 * tech (the grab broken, docs/combat-v2.md §4.1, §4.2, §11.1): 4 frames, 3, 3, 4, 4 ticks (14,
 * the stun of a tech), played by both fighters from the clinch: « mains écartées, recul », the
 * grip torn off and the recoil (the game slides both apart at 4 px a tick, slowed by the
 * friction: about 33 px over the 14 ticks). Back to the guard.
 *
 * Not a boxer stripping a grip (Nayo's forearm sweep): a punk tearing loose, and her rear arm
 * carries the move from start to end.
 * - 0, the break: the rear fist chops down from under the chin through his wrists and whips on, open, down
 *   and back past her hip (a short magenta trail behind the hand); the lead palm shoves him off
 *   at arm's length, the arm straight and level with her chest. The hips thrown back and down,
 *   the torso leaning away from him, the legs flung wide, the lead heel driving in with the toes
 *   up: an X leaning away from the slap, the recoil already under way; the chin down, the eyes
 *   on him, `effort`. Mirrored, the two shoving palms meet halfway (13.5 px out, at contact 26
 *   to 27 apart) on one slap, her magenta star over his (the « deux claques » of §4.5).
 * - 1, the skid: the recoil drops her into her b-girl base, wide and low, the knees open, the
 *   rear heel up, the lead heel braking with its toes up; the rear arm swings on behind her for
 *   balance, the lead hand drops low in front of the knee; dust off both feet.
 * - 2, the reload: rising out of the plié as the slide dies, the rear fist coming back to its
 *   place under the chin, the lead fist to its, the look from under the lid (`cool`: nice try).
 * - 3: rocked forward into the guard, popped up a hair high and back, where the idle takes over
 *   (its first frame is the guard).
 *
 * The dust the feet kick up at the start of the skid stays on the floor where it rose while she
 * slides on: in the cell it drifts forward by the distance she has slid since (`slid`), the
 * rear foot's puff stays at the foot that keeps skidding.
 *
 * Her fringe and chain swing in the cell (sheet.ts), blind to the slide: the body is held back
 * in the cell through the skid and the reload (the base of the neck at -16.4 and -16.1, never in
 * front of the break's -16.1), so the fringe streams a hair forward with the slide instead of
 * trailing back against it; it swings back as she rocks forward into the guard, the one move of
 * the strip toward the opponent.
 */

/** How far the tech has slid her back by `tick` (4 px a tick, minus 0.25 a tick: combat.ts). */
function slid(tick: number): number {
  return 4 * tick - (tick * (tick - 1)) / 8;
}

/** Dust kicked up by a foot skidding, `x` in the cell. */
function skid(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

/** Where the lead foot kicks up its dust at the start of the skid (frame 1, tick 3). */
const KICKED = 15;
/** The same dust in the cell at `tick`, left behind as she slides on. */
const kicked = (tick: number): number => KICKED + slid(tick) - slid(3);

// Frame 0 (3 ticks): the break. The rear hand chopped down through his wrists and whipped on
// down and back past the hip, open, a trail behind it, the arm long and the elbow soft (bent
// the way an elbow bends: the forearm trails a touch under the upper arm); the lead palm shoves him off, the arm
// straight and level, the slap where the two palms meet. The hips back and down, the torso
// leaning away, the legs wide, the lead heel in with its toes up; the chin down, eyes on him.
const BREAK: Pose = {
  ...GUARD,
  hip: at(-12.5, 30.5),
  torso: -9,
  head: 12,
  shrug: 0.8,
  reach: { far: 0.5 },
  twist: 0.55,
  nearFoot: planted(-30, -6),
  farFoot: onHeel(planted(6.5), 16),
  nearFist: at(-32, 32),
  farFist: at(11.2, 52.8),
  nearHand: 'open',
  farHand: 'open',
  face: 'effort',
  bends: { ...GUARD.bends, nearElbow: 'up' },
  effects: [
    smear(4, [-12, 37], [-22, 30.5], [-32, 32]),
    { kind: 'flash', center: at(13, 53), radius: 4, tone: 'sound' },
  ],
};

// Frame 1 (3 ticks): the skid. Dropped into her b-girl base, wide and low, the knees open, the
// rear heel up, the lead heel braking with its toes up, the upper body still carried back; the
// rear arm swung on behind her for balance, long, as far back as a shoulder takes it (swung up
// behind her, it would wrench out of the back of the shoulder), the lead hand low in front of
// the knee, the elbow soft; dust off both feet.
const SKID: Pose = {
  ...GUARD,
  hip: at(-14, 31),
  torso: -6,
  head: 9,
  shrug: 1.6,
  twist: 0.5,
  nearFoot: onBall(-24, -16),
  farFoot: onHeel(planted(9), 14),
  nearFist: at(-34.7, 35.6),
  farFist: at(3, 35),
  nearHand: 'open',
  farHand: 'open',
  bends: { ...GUARD.bends, nearElbow: 'up' },
  effects: [skid(kicked(3), 3, 0.15), skid(-25, 2.4, 0.15)],
};

// Frame 2 (4 ticks): rising out of the plié as the slide dies, the rear fist back up under
// the chin (the guard's, turned with the chest), the lead fist coming to its place, the lead heel
// still braking, the toes a touch up; the look from under the lid: nice try.
const GATHER: Pose = {
  ...guarded(
    {
      ...GUARD,
      hip: at(-15.5, 30.5),
      torso: -1.5,
      head: 5,
      shrug: 2.6,
      twist: 0.5,
      nearFoot: onBall(-23, -12),
      farFoot: onHeel(planted(6), 6),
      face: 'cool',
    },
    at(-0.5, -1),
    at(2, -2),
  ),
  effects: [skid(kicked(6), 3, 0.55), skid(-24, 2.2, 0.35)],
};

// Frame 3 (4 ticks): rocked forward into the guard, a hair high and back, the fists a hair past
// their marks; the last of the dust.
const SETTLE: Pose = {
  ...GUARD,
  hip: at(GUARD.hip.x - 0.6, GUARD.hip.y + 0.7),
  torso: GUARD.torso - 2,
  nearFist: at(GUARD.nearFist.x - 0.6, GUARD.nearFist.y + 0.8),
  farFist: at(GUARD.farFist.x - 0.4, GUARD.farFist.y + 0.6),
  effects: [skid(kicked(10), 3, 0.85), skid(-21, 2.2, 0.7)],
};

export const POSES: readonly Pose[] = [BREAK, SKID, GATHER, SETTLE];
