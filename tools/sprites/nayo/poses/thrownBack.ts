import type { Point } from '../../raster.ts';
import { BODY } from '../../skeleton.ts';
import { at, type Foot, type Pose } from './common.ts';
import { LEAD_TOE, onToes, REAR_TOE } from './held.ts';

/**
 * thrownBack (docs/combat-v2.md §4.3, §11.1): 4 frames, each one played with the same frame of
 * the thrower's throwBack up to the release (tick 14): 3, 3, 4, 4 ticks (ticks 0-2, 3-5, 6-9,
 * 10-13). Frames 0 and 1 are drawn in front of the thrower, facing him (centers 27.5 px apart);
 * frames 2 and 3 behind him, 27.5 px back, from their first tick (tick 6, the start of the
 * heave, when the collar goes over his head). He keeps facing the same way (the game turns
 * fighters only on their feet, in neutral), so the thrower is then on his back side, toward -x.
 * The thrower (not drawn) is drawn over him and holds his collar: the neck sits in the
 * thrower's fists on every tick, at (23.5, 51.5), (6.5, 64), (-5, 65) and (-25.5, 25) in the
 * thrower's space (hauled down in front, up over his back, on top of his shoulders behind his
 * neck, down behind his rear hip).
 *
 * One forward somersault around the collar, head first: yanked forward and down onto his toes,
 * the hands still fighting the grip; heaved face down across the thrower's back, the legs
 * trailing; upside down across the top of his shoulders, the legs splayed over; then dumped down
 * his back, on his back in the air, the head hanging clear behind the thrower's rear hip, the
 * legs whipping over and away. Arms and legs flail, never tucked: he is thrown, he does not
 * flip.
 *
 * Frame 3 is low, and the thrown flight goes on from it. It lies where the knockdown lands him
 * (the knockdown's body reaches 35 px back toward the thrower from its feet anchor, which lands
 * 66 px behind him): so it stays where it was let go, rising and falling with the flight while
 * the pushbox flies 3 px a tick, until airHit 2 (flight tick 11), airHit 3 (12) and the
 * knockdown (13) take over in the same place.
 */

/** What `airborne` places: the hands and feet (and the feet's angles) as they show. */
interface Airborne extends Omit<Pose, 'hip' | 'spin'> {
  /** Where the neck goes (the collar the thrower holds), in the cell. */
  readonly neck: Point;
  /** The spine's angle from upright (torso lean and spin together), + forward. */
  readonly turn: number;
}

/**
 * A body turned over in the air, placed by its neck and authored as it shows: the hips go
 * where the spine puts them, the hands and feet are turned back into the skeleton's frame
 * (it spins them around the hips again when it draws).
 */
function airborne(body: Airborne): Pose {
  const { neck, turn, nearFist, farFist, nearFoot, farFoot, ...rest } = body;
  const spin = turn - body.torso;
  const r = (turn * Math.PI) / 180;
  const hip = at(neck.x - BODY.neck * Math.sin(r), neck.y - BODY.neck * Math.cos(r));
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

// Frame 0 (3 ticks, the thrower's dip, in front of him): the collar hauled down, he is yanked
// forward and down onto his toes, the knees buckling, his head going in past the thrower's over
// the lead shoulder; the hands still fight the grip, the near one clutching the thrower's
// forearm, the far one his elbow, the shoulders hunched: the pull goes through the collar.
const YANKED: Pose = {
  hip: at(-14.3, 33.8),
  torso: 46,
  head: -27,
  shrug: 3,
  twist: 0.2,
  nearFoot: onToes(LEAD_TOE, -24),
  farFoot: onToes(REAR_TOE, -36),
  nearFist: at(7.5, 44.5),
  farFist: at(13.5, 42),
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

// Frame 1 (3 ticks, the load, in front of him): heaved up face down across the thrower's back,
// the arms hanging over it; the feet leave the floor (a puff where the rear one pushed off), one
// leg hanging, the other trailing out behind.
const LOADED: Pose = airborne({
  neck: at(21, 64),
  turn: 72,
  torso: 10,
  head: -6,
  shrug: 2,
  nearFist: at(34, 48),
  farFist: at(27, 57),
  nearFoot: { x: -21, y: 33, angle: -75 },
  farFoot: { x: -36, y: 57, angle: -20 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [{ kind: 'dust', x: REAR_TOE, size: 2.6, progress: 0.25 }],
});

// Frame 2 (4 ticks, the heave, drawn behind him): upside down across the top of the thrower's
// shoulders, the collar in his fists behind his neck, the head hanging down his back, the legs
// splayed up over the top.
const OVER: Pose = airborne({
  neck: at(-22.5, 65),
  turn: 138,
  torso: 5,
  head: -30,
  shrug: 1,
  nearFist: at(-12, 50),
  farFist: at(-30, 66),
  nearFoot: { x: -36, y: 111, angle: 100 },
  farFoot: { x: -54, y: 97, angle: 60 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
});

// Frame 3 (4 ticks, over and down, drawn behind him; the thrown flight goes on from it): dumped
// down the thrower's back, on his back in the air, the collar down behind the thrower's rear
// hip, the head hanging clear below his fists; the legs still whipping over and away, the arms
// flung toward the floor.
const DOWN: Pose = airborne({
  neck: at(-2, 25),
  turn: 252,
  torso: 0,
  head: -20,
  shrug: 1,
  nearFist: at(2, 7),
  farFist: at(-6, 10),
  nearFoot: { x: 38, y: 62, angle: 200 },
  farFoot: { x: 46, y: 50, angle: 220 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
});

export const POSES: readonly Pose[] = [YANKED, LOADED, OVER, DOWN];
