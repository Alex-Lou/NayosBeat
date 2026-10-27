import type { Point } from '../../raster.ts';
import {
  at,
  GUARD,
  lifted,
  onBall,
  planted,
  smear,
  toeOf,
  type Effect,
  type Foot,
  type Pose,
} from './common.ts';
import { HOLD, LEAD_IN, REAR_TOE } from './hold.ts';

export const ANIMATED: boolean = true;

/**
 * throwForward (Ciseaux, docs/combat-v2.md §4.3, §11.3): 7 frames, 3, 3, 4, [1], 7, 7, 7 ticks
 * (32), the release on frame 3 (tick 10). From hold: a flying leg scissor (the capoeira
 * tesoura, the judoka's kani basami) that drops the opponent on his back right in front of her
 * (he lands about 49 px away). Back to the guard.
 *
 * She yanks him in by the lapel and dips, the rear hand letting go of the collar and swinging
 * back past her ribs (a faint trail); then she springs off the lead foot, the body already
 * turning sideways, and swings the rear leg up nearly straight and level across his belly:
 * the scissor opening, not a knee. For 4 ticks she hangs in the air, flat on her back at his
 * belt, the hands already reaching for the floor behind her head: the near leg high across his
 * belt, the far one low at his heels, reaping his ankles (the two blades about 30 px apart, both
 * readable over his dark legs). The release is the snap: the high leg drives through his belly,
 * the low one reaps his heels back, two violet trails crossing the other way and a yellow star
 * where her boot sinks in. She drops to the floor and lands sitting up, b-girl style: the rear
 * leg tucked under her, its knee up and the boot planted by her hip, the lead leg long toward
 * him, propped on the rear hand, the lead wrist on its knee, the lid half down on him (`cool`):
 * no hurry. Then she rises over the tucked foot into a deep plié, the weight going forward, the
 * arms swinging up from the floor (dust under the boots), and settles into the guard, a hair
 * low: no foot moves more than 14 px between two of these held frames. The fringe and the
 * belt's chain flail through the fall by themselves; the head turns past 20 degrees only while
 * she is in the air.
 *
 * The body is turned over in the air (`shown`): hands and feet are authored where they show,
 * the spine by its angle on screen. The victim (Nayo's held, then his thrown airHit) is drawn
 * under her: her legs show over him, the near one across his belt, the far one at his heels.
 */

/** What `shown` places: hands and feet (and the feet's angles) as they show on screen. */
export interface Shown extends Omit<Pose, 'spin'> {
  /** The spine's angle from upright as it shows (torso lean and spin together), + forward. */
  readonly turn: number;
}

/**
 * A body turned over (a fall, a roll, a flip), authored as it shows: the hips where they go,
 * the spine at `turn`, the hands and feet where they show. They are turned back into the
 * skeleton's frame, which spins them around the hips again when it draws.
 */
export function shown(body: Shown): Pose {
  const { turn, hip, nearFist, farFist, nearFoot, farFoot, ...rest } = body;
  const spin = turn - body.torso;
  const a = (spin * Math.PI) / 180;
  const unspin = (p: Point): Point => {
    const dx = p.x - hip.x;
    const dy = p.y - hip.y;
    return at(
      hip.x + dx * Math.cos(a) - dy * Math.sin(a),
      hip.y + dx * Math.sin(a) + dy * Math.cos(a),
    );
  };
  const foot = (f: Foot): Foot => ({ ...unspin(f), angle: (f.angle ?? 0) + spin });
  return {
    ...rest,
    hip,
    spin,
    nearFist: unspin(nearFist),
    farFist: unspin(farFist),
    nearFoot: foot(nearFoot),
    farFoot: foot(farFoot),
  };
}

/** Dust off the floor at `x`. */
export function dust(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

/** The settle at the end of both throws: the guard, a hair low, the fists a hair past it. */
export const SETTLE: Pose = {
  ...GUARD,
  hip: at(GUARD.hip.x + 0.2, GUARD.hip.y - 1.4),
  torso: GUARD.torso + 1,
  head: GUARD.head - 0.5,
  shrug: (GUARD.shrug ?? 0) + 0.4,
  nearFist: at(GUARD.nearFist.x - 0.4, GUARD.nearFist.y - 0.4),
  farFist: at(GUARD.farFist.x + 0.3, GUARD.farFist.y - 0.6),
};

/** Where the toes of the lead foot stand through the hold: it springs off them. */
const LEAD_TOE = toeOf(planted(LEAD_IN));

// Frame 0 (3 ticks): the set. The lead fist yanks the lapel in, the hips dip, the rear heel up;
// the rear hand lets go of the collar and swings back past her ribs, open, the elbow trailing
// (a faint trail from the collar).
const SET: Pose = {
  ...HOLD,
  hip: at(-3.6, 29.6),
  torso: 26,
  head: -13,
  shrug: 3.2,
  twist: 0.5,
  nearFoot: onBall(REAR_TOE, -30),
  nearFist: at(0, 45),
  farFist: at(18.5, 46),
  nearHand: 'open',
  bends: { nearElbow: 'up', farElbow: 'down', nearKnee: 'back' },
  face: 'effort',
  effects: [smear(3, [17, 55], [9, 51], [2, 46])],
};

// Frame 1 (3 ticks): the leap. Off the lead foot's toes, the body tipping back and turning
// sideways, the rear leg swung up nearly straight and level across his belly (a trail after it),
// the lead fist still in his lapel, the rear hand swung back.
const LEAP: Pose = shown({
  ...GUARD,
  hip: at(3, 37),
  turn: -45,
  torso: 0,
  head: 22,
  shrug: 2.6,
  twist: 0.2,
  nearFoot: { x: 32, y: 45, angle: 0 },
  farFoot: lifted(onBall(LEAD_TOE, -55), 1.5),
  nearFist: at(-18, 38),
  farFist: at(17, 52),
  nearHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'front', nearElbow: 'down' },
  face: 'effort',
  effects: [smear(4, [4, 22], [18, 36], [30, 44])],
});

// Frame 2 (4 ticks): the scissor set. Flat on her back in the air at his belt, the near leg high
// across it, the far leg low at his heels; the hands reaching for the floor.
const CLAMP: Pose = shown({
  ...GUARD,
  hip: at(6, 26),
  turn: -88,
  torso: 0,
  head: 10,
  shrug: 2,
  twist: 0.2,
  nearFoot: { x: 34, y: 37, angle: 0 },
  farFoot: { x: 26, y: 7, angle: -10 },
  nearFist: at(-14, 16),
  farFist: at(-20, 12),
  nearHand: 'open',
  farHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'down' },
  face: 'effort',
});

// Frame 3 (1 tick, the release): the snap. The high leg drives through his belly, the low one
// reaps his heels back toward her: the blades cross, a star where the boot sinks in.
const SNAP: Pose = shown({
  ...GUARD,
  hip: at(5, 23),
  turn: -100,
  torso: 0,
  head: 10,
  shrug: 2,
  twist: 0.2,
  nearFoot: { x: 38, y: 33, angle: -10 },
  farFoot: { x: 22.5, y: 7, angle: -10 },
  nearFist: at(-14, 8),
  farFist: at(-19, 6),
  nearHand: 'open',
  farHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'down' },
  face: 'effort',
  effects: [
    smear(5, [25, 45], [32, 41], [38, 35]),
    smear(5, [32, 8], [27, 7], [22.5, 6.5]),
    { kind: 'flash', center: at(32, 39), radius: 5, tone: 'strike' },
  ],
});

// Frame 4 (7 ticks): down. Landed sitting up, b-girl style: the rear leg tucked under her, the
// knee up, the boot planted by her hip; the lead leg long toward him, its wrist on the knee; the
// rear hand propping her on the floor behind; unimpressed. Dust under her, the blow's ring fading
// where he was.
const DOWN: Pose = {
  ...GUARD,
  hip: at(-2, 8),
  torso: -24,
  head: 14,
  shrug: 2.6,
  twist: 0.4,
  nearFoot: planted(-10),
  farFoot: { x: 24, y: 5.4, angle: 12 },
  nearFist: at(-17, 3.6),
  farFist: at(10, 16),
  nearHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'up', nearElbow: 'down', farElbow: 'down' },
  face: 'cool',
  effects: [
    dust(-4, 4, 0.25),
    { kind: 'ring', center: at(33, 40), radius: 9, progress: 0.55, tone: 'strike' },
  ],
};

// Frame 5 (7 ticks): the pop. Up over the tucked foot into a deep plié, the rear foot a step
// back, the lead one in, the weight going forward, the arms swinging up from the floor; dust
// under the boots. The guard's marks come in the settle.
const POP: Pose = {
  ...GUARD,
  hip: at(-5, 19.5),
  torso: 22,
  head: -10,
  shrug: 3,
  twist: 0.5,
  nearFoot: onBall(REAR_TOE + 4, -14),
  farFoot: planted(10),
  nearFist: at(-14, 33),
  farFist: at(8, 33),
  nearHand: 'open',
  effects: [dust(12, 4, 0.3), dust(-13, 3.5, 0.3)],
};

// Frame 6 (7 ticks): the guard, a hair low.
export const POSES: readonly Pose[] = [SET, LEAP, CLAMP, SNAP, DOWN, POP, SETTLE];
