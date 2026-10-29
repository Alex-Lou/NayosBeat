import type { Point } from '../../raster.ts';
import { solve } from '../../skeleton.ts';
import { POSES as REMONTANT } from './backHeavy.ts';
import { at, GUARD, lifted, planted, type Effect, type Foot, type Pose } from './common.ts';

/** Drawn: the tests (tests/tools/nayo-v2-sprites.test.ts) check the strip. */
export const ANIMATED: boolean = true;

/**
 * chainLaunch (Remontant chassé, L, L, ← + H; docs/combos-v3.md §2.2, §5 row 2): the Remontant
 * (backHeavy) out of a call step. 7 frames, 2, 3, 2, [4], 5, 6, 6 ticks (28: 7/4/17,
 * tools/sprites/nayo/pending-timing.ts), active frame 3 (ticks 7-10), hitbox x 4..30 / y
 * 58..104 as the Remontant's, reached upward and forward. Chained (after the Cross, the
 * Crochet, the Double direct), it ends in the GUARD. The game moves him 12 px forward over
 * action frames 0-6: the poses stay anchored (the step is the feet's, the body never slides).
 *
 * The Remontant needs its target close: out of the punch that pushed it away, he takes it
 * back with one stamping step. Every way in is a punch leaning far in (the Cross, the Crochet)
 * or upright (the Double direct): the call keeps the chest over the lead knee while the gloves
 * snap home and the lead foot comes up, so out of the lean the head sinks on one arc onto the
 * stamp, and rises back with the rip. The foot comes down heel first, the weight drops onto it
 * into both knees, the lead glove sunk to the chest and the rear one tucked under the chin; and
 * from that stamp the legs drive the Remontant up. The rear foot is dragged up behind on its
 * ball, spinning up into the rip.
 *
 * - 0 (new): the lead foot steps in (a call step), knee up, the rear heel lifts, the body dips.
 * - 1 (new): the weight lands on the lead foot, the rear fist drops under the chin.
 * - 2-6: backHeavy's frames 2 to 6 (the rise, the active, the rising arc), with its effects;
 *   on frame 2 the stamp's dust carries on.
 *
 * Feet against the slide (1.7 px a tick over ticks 0-6): the lead foot steps ahead of it and
 * lands where the rip will find it, so its toe only ever drifts forward in the world, the heel
 * braking it; the rear foot drags up behind on its ball.
 */

/** Where the toe tip of a foot touches the floor (a foot on the ball pivots around it). */
function toeOf(foot: Foot): number {
  const a = ((foot.angle ?? 0) * Math.PI) / 180;
  return foot.x + 2.3 * Math.sin(a) + 7 * Math.cos(a);
}

/** A foot on the floor turned to `angle` around its toe tip at `toe`: the toe never slides. */
function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(toe - 2.3 * Math.sin(a) - 7 * Math.cos(a), angle);
}

const REAR_TOE = toeOf(GUARD.farFoot);

type Body = Omit<Pose, 'nearFist' | 'farFist'>;
const sketch = (body: Body): Pose => ({
  ...body,
  nearFist: GUARD.nearFist,
  farFist: GUARD.farFist,
});

/** The rear glove's place in the guard, from the head's centre: it rides the head. */
const CHEEK = ((): Point => {
  const { head } = solve(GUARD);
  return at(GUARD.farFist.x - head.x, GUARD.farFist.y - head.y);
})();

/** The rear glove at the cheek (plus `dx`, `dy`), whatever the head does. */
function atCheek(body: Body, dx = 0, dy = 0): Point {
  const { head } = solve(sketch(body));
  return at(head.x + CHEEK.x + dx, head.y + CHEEK.y + dy);
}

const dust = (x: number, size: number, progress: number): Effect => ({
  kind: 'dust',
  x,
  size,
  progress,
});

/**
 * Where the stamping lead foot lands: at the end of the stamp its toe is where the rip finds
 * it (the guard spot, once the game has carried him on), so it never pops back.
 */
const STAMP_X = 8;

/** The stamp's puff of dust, under the lead foot as it slaps down. */
const STAMP_DUST = STAMP_X + 2;

// Frame 0 (2 ticks): the call, the bridge out of the punch. Out of a Cross or a Crochet he is
// leaning far in: the chest stays over the lead knee and the hips sink under it while the
// gloves snap home, the rear one back to the chin, the lead one dropping low in front of the
// chest; the lead foot comes up off the floor, knee up, sole flat, to stamp down; the rear heel
// comes up off its spot. Out of the Double direct (upright) it reads as a lunge in.
const CALL_BODY: Body = {
  ...GUARD,
  hip: at(-4, 34.2),
  torso: 26.5,
  head: -8,
  shrug: 1.6,
  twist: 0.05,
  nearFoot: lifted(planted(STAMP_X - 0.8, -2), 4.5),
  farFoot: onToes(REAR_TOE - 2.4, -24),
};
const CALL: Pose = {
  ...CALL_BODY,
  nearFist: at(11, 48),
  farFist: atCheek(CALL_BODY, -0.5, -2),
};

// Frame 1 (3 ticks): the stamp, the low point. The lead foot down heel first (it brakes the
// slide), the weight dropped onto it into both knees, curled over the lead knee; the lead
// shoulder dips and the glove sinks to the chest, elbow in, the rear glove tucked under the
// chin; the rear foot dragging on its ball.
const STAMP_BODY: Body = {
  ...GUARD,
  hip: at(-4.4, 33.1),
  torso: 23.5,
  head: -4.5,
  shrug: 0.3,
  twist: -0.15,
  nearFoot: planted(STAMP_X, 4),
  farFoot: onToes(REAR_TOE - 3.4, -27),
};
const STAMP: Pose = {
  ...STAMP_BODY,
  nearFist: at(8.6, 46.4),
  farFist: atCheek(STAMP_BODY, -1.6, -4.2),
  effects: [dust(STAMP_DUST, 2.4, 0.2)],
};

/**
 * Frame 2, the Remontant's rip, with the dust carried on: the stamp's puff spreads where the
 * heel hit (back in his own space, as the game has carried him ~4 px on), and the rear foot,
 * dragged up on its ball, kicks its own puff up from the start.
 */
const [RIP = GUARD, ...RISING] = REMONTANT.slice(2);
const RIP_DRAGGED: Pose = {
  ...RIP,
  effects: [
    ...(RIP.effects ?? []).filter((effect) => effect.kind === 'smear'),
    dust(STAMP_DUST - 4, 2.4, 0.5),
    dust(REAR_TOE - 2, 2.2, 0.25),
  ],
};

export const POSES: readonly Pose[] = [CALL, STAMP, RIP_DRAGGED, ...RISING];
