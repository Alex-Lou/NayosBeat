import type { Point } from '../../raster.ts';
import { BODY } from '../../skeleton.ts';
import { at, type Foot, type Pose } from './common.ts';
import { LEAD_TOE, onToes, REAR_TOE } from './held.ts';

/**
 * thrownBack (docs/combat-v2.md §4.3, §11.1): 4 frames, each one played with the same frame of
 * the thrower's throwBack up to the release (tick 14): 3, 3, 4, 4 ticks (ticks 0-2, 3-5, 6-9,
 * 10-13). Frames 0 and 1 are drawn in front of the thrower, facing him (centers 28 px apart,
 * the bodies touching); frames 2 and 3 behind him, 28 px back, from their first tick (tick 6,
 * the start of the heave, when the collar goes over his head). He keeps facing the same way
 * (the game turns fighters only on their feet, in neutral), so the thrower is then on his back
 * side, toward -x.
 * The thrower (not drawn) is drawn over him and holds his collar: the neck sits in the
 * thrower's fists on every tick, at (23.5, 51.5), (6.5, 64), (-3, 62) and (-26, 25) in the
 * thrower's space (hauled down in front, hoisted over his head, behind his neck, down behind
 * him).
 *
 * One forward somersault around the collar, head first: yanked forward and down onto his toes,
 * the hands still fighting the grip; hoisted face down across above the thrower's head, the
 * legs trailing; upside down across the top of his shoulders, the legs splayed over; then dumped
 * down behind him, on his back in the air, the head hanging clear below the thrower's fists, the
 * legs whipping over and away, the arms flung up as airHit's are. Arms and legs flail, never
 * tucked: he is thrown, he does not flip. Every joint stays a human one (tools/sprites/
 * anatomy.ts): the elbows fold no further than 140 degrees, no arm goes behind the back, the
 * feet keep a live ankle (pointed at most 35 degrees, never folded up onto the shin).
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
// forearm (the arm hanging down the body, the forearm forward to it), the far one his elbow,
// the shoulders hunched: the pull goes through the collar.
const YANKED: Pose = {
  hip: at(-14.3, 33.8),
  torso: 46,
  head: -27,
  shrug: 3,
  twist: 0.2,
  nearFoot: onToes(LEAD_TOE, -24),
  farFoot: onToes(REAR_TOE, -36),
  nearFist: at(9.5, 41.5),
  farFist: at(13.5, 42),
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
};

// Frame 1 (3 ticks, the load, in front of him): heaved up face down across the thrower's back,
// the arms hanging over it; the feet leave the floor (a puff where the rear one pushed off), one
// leg hanging, the other trailing out behind, its foot loose along the shin.
const LOADED: Pose = airborne({
  neck: at(21, 64),
  turn: 72,
  torso: 10,
  head: -6,
  shrug: 2,
  nearFist: at(34, 48),
  farFist: at(27, 57),
  nearFoot: { x: -21, y: 33, angle: -75 },
  farFoot: { x: -36, y: 57, angle: -135 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [{ kind: 'dust', x: REAR_TOE, size: 2.6, progress: 0.25 }],
});

// Frame 2 (4 ticks, the heave, drawn behind him): upside down across the top of the thrower's
// shoulders, the collar in his fists behind his neck, the head hanging down his back, the legs
// splayed up over the top in a V, the far arm flung out wide.
const OVER: Pose = airborne({
  neck: at(-25, 62),
  turn: 138,
  torso: 5,
  head: -30,
  shrug: 1,
  nearFist: at(-14.5, 47),
  farFist: at(-38.5, 60.5),
  nearFoot: { x: -38.5, y: 108, angle: 100 },
  farFoot: { x: -52, y: 110, angle: 165 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
});

// Frame 3 (4 ticks, over and down, drawn behind him; the thrown flight goes on from it): dumped
// down the thrower's back, on his back in the air, the collar down behind the thrower's rear
// hip, the head hanging clear below his fists; the legs still whipping over and away, the feet
// pointed; the arms flung up and out off the chest (airHit's, which takes over from it): the
// near one up, the far one up past the head.
const DOWN: Pose = airborne({
  neck: at(-2, 25),
  turn: 252,
  torso: 0,
  head: -20,
  shrug: 1,
  nearFist: at(-9.7, 49.1),
  farFist: at(-20.1, 34.4),
  nearFoot: { x: 38, y: 62, angle: 98 },
  farFoot: { x: 46, y: 50, angle: 70 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
});

export const POSES: readonly Pose[] = [YANKED, LOADED, OVER, DOWN];
