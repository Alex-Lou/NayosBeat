import type { Point } from '../../raster.ts';
import { at, GUARD, onBall, smear, type Effect, type Foot, type Pose } from './common.ts';
import { byNeck, REAR_TOE } from './held.ts';

export const ANIMATED: boolean = true;

/**
 * thrownBack (docs/combat-v2.md §4.3, §11.1): 4 frames, each one played with the same frame of
 * the thrower's throwBack up to the release (Nayo's Projection d'épaule: 3, 3, 4, 4 ticks, ticks
 * 0-2, 3-5, 6-9, 10-13; her own Roulade too, src/art/riff/clips.ts). Frames 0 and 1
 * are drawn in front of the thrower, facing him (centers 27 px apart); frames 2 and 3 behind him,
 * 27 px back, from their first tick (tick 6). She keeps facing the same way, so the thrower is
 * then on her back side, toward -x. The thrower (not drawn) is drawn over her and holds her
 * collar: the base of her neck rides his fists, at (24, 50), (8, 65), (-3.5, 64) and (-25.2, 26)
 * in his space: hauled down in front, heaved up onto his back, on top of his shoulders behind
 * his neck, and down behind his rear hip. The first three sit within 0.5 px of the middle of
 * the fists of his throwBack; the last is its low release (the phase 2 fix: his fists at about
 * (-25, 26) on the over and the release frames, 1 px away), where Nayo's own thrownBack frame 3
 * lies (her monkey flip lets go of the collar there too).
 *
 * One forward somersault around the collar, head first, the spin speeding up (38, 75, 155, 252
 * degrees on screen). The collar's path is the throw's; her limbs are hers, and she never stops
 * fighting until the floor comes up:
 * - 0, hauled: pitched forward over the collar onto the tips of her toes, the knees buckling,
 *   the rear toe where it stood, the lead boot dragged on its tip under the thrower; one hand
 *   still clamped on his wrist, the rear arm flung back and down past her hip for her balance.
 * - 1, loaded: heaved face down across his back, and still at it: the rear hand clawing at the
 *   grip on her collar, the lead arm reaching down his side, a knee driving in, the other leg
 *   kicking out long behind; a puff where the rear foot left the floor. `effort`, not `hurt`.
 * - 2, over: upside down over the top of his shoulders, and a silhouette only a b-girl makes:
 *   the legs flung into a wide inverted V, the boots far apart, the arms flung wide; a short
 *   magenta arc behind the leading boot as it whips over the top.
 * - 3, down: dumped down his back, on her back in the air, the head hanging low behind his rear
 *   knee; the breaker's reflex, the rear hand posting for the floor as for a freeze, the knees
 *   open, one leg long toward where she flies; the face gives (`hurt`).
 * The head turns past 20 degrees once she leaves her feet (RotSprite).
 *
 * Frame 3 is low, and the thrown flight goes on from it: the game keeps it on screen, rising and
 * falling, until airHit 2 takes over 33 px on (flight tick 11). It lies the way the knockdown
 * does, the head toward the thrower, the long leg reaching on toward where airHit 2's legs swing
 * up (to 54.5 px; airHit 2 spans -12..57.5 there). It carries no motion trail: a trail frozen on a
 * sprite held for 15 ticks reads as a stain.
 */

/** What `airborne` places: the hands and feet (and the feet's angles) as they show. */
interface Airborne extends Omit<Pose, 'hip' | 'spin'> {
  /** Where the base of her neck goes (the collar the thrower holds). */
  readonly neck: Point;
  /** The spine's angle on screen (torso lean and spin together), + forward. */
  readonly turn: number;
}

/**
 * A body turned over in the air, placed by its neck and authored as it shows: the hips go where
 * the spine puts them, the hands and feet are turned back into the skeleton's frame (it spins
 * them around the hips again when it draws).
 */
function airborne(body: Airborne): Pose {
  const { neck, turn, nearFist, farFist, nearFoot, farFoot, ...rest } = body;
  const spin = turn - body.torso;
  const hip = byNeck(neck, turn);
  const a = (spin * Math.PI) / 180;
  const unspin = (p: Point): Point => {
    const dx = p.x - hip.x;
    const dy = p.y - hip.y;
    return at(
      hip.x + dx * Math.cos(a) - dy * Math.sin(a),
      hip.y + dx * Math.sin(a) + dy * Math.cos(a),
    );
  };
  const foot = (f: Foot): Foot => ({
    ...unspin(f),
    angle: (f.angle ?? 0) + spin,
  });
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
function dust(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

// Frame 0 (3 ticks, the thrower's dip, in front of him): hauled forward over the collar onto the
// balls of her feet, the knees buckling: the rear toe on the spot it held, the heel up; the lead
// boot dragged in under him on its ball, the knee over it (a boot points no further). The lead
// hand still clamps his wrist; the rear arm trails back and down past her hip, open, for her
// balance, the elbow soft (never up behind her at shoulder height).
// The head keeps upright (20 degrees on screen), set.
const HAULED: Pose = {
  ...GUARD,
  hip: byNeck(at(3, 50), 38),
  torso: 38,
  head: -18,
  shrug: 3,
  twist: 0.3,
  nearFoot: onBall(REAR_TOE, -38),
  farFoot: onBall(9, -30),
  nearFist: at(-19.5, 43),
  farFist: at(10, 48.5),
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'back', farElbow: 'down', nearKnee: 'front' },
  face: 'effort',
};

// Frame 1 (3 ticks, the load, in front of him): heaved up face down across his back, still
// fighting: the rear hand claws at the grip on her collar, the lead arm reaches down his side,
// the rear knee drives in under her, the lead leg kicks out long behind, the boot pointed back
// along it as far as a boot points; a puff where the rear foot pushed off the floor.
const LOADED: Pose = airborne({
  ...GUARD,
  neck: at(19, 65),
  turn: 75,
  torso: 10,
  head: -6,
  shrug: 3,
  twist: 0.2,
  nearFist: at(22, 61),
  farFist: at(28, 47),
  nearFoot: { x: -8, y: 42, angle: -40 },
  farFoot: { x: -32, y: 60, angle: -140 },
  nearHand: 'open',
  farHand: 'open',
  bends: { nearKnee: 'front' },
  face: 'effort',
  effects: [dust(REAR_TOE, 2.6, 0.25)],
});

// Frame 2 (4 ticks, the heave, drawn behind him): upside down over the top of his shoulders, the
// collar in his fists behind his neck, the head hanging down his back; the legs flung into a
// wide inverted V, the boots far apart, square to the shins (a combat boot does not point), the
// leading one already over the top on a short trail; the arms flung wide, the lead one out in
// front of her, the rear one back along her side toward the hips (never up over the head behind
// her back).
const OVER: Pose = airborne({
  ...GUARD,
  neck: at(-23.5, 64),
  turn: 155,
  torso: 5,
  head: -25,
  shrug: 1,
  twist: 0.2,
  nearFist: at(-14, 88.5),
  farFist: at(-44, 54),
  nearFoot: { x: -11, y: 108, angle: 92 },
  farFoot: { x: -53, y: 107, angle: 168 },
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'back' },
  face: 'effort',
  effects: [smear(4, [-30, 110], [-20, 109.5], [-11, 107])],
});

// Frame 3 (4 ticks, over and down, drawn behind him; the thrown flight goes on from it): dumped
// down his back, on her back in the air, the collar down behind his rear hip, the head hanging
// below it; the rear arm reaching down under her for the floor (the freeze reflex), the lead arm
// flung up, the elbow soft; the knees open, the lead leg reaching long toward where she flies,
// the toes up.
const DOWN: Pose = airborne({
  ...GUARD,
  neck: at(-1.8, 26),
  turn: 252,
  torso: 0,
  head: -20,
  shrug: 1,
  twist: 0.2,
  nearFist: at(21, 14),
  farFist: at(-13, 48),
  nearFoot: { x: 41, y: 49, angle: 80 },
  farFoot: { x: 51, y: 37, angle: 75 },
  nearHand: 'open',
  farHand: 'open',
  bends: { nearElbow: 'back', farElbow: 'down' },
  face: 'hurt',
});

export const POSES: readonly Pose[] = [HAULED, LOADED, OVER, DOWN];
