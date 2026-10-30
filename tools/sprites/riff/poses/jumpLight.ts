import type { Point } from '../../raster.ts';
import { solve, type Bend } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, smear, type Effect, type Foot, type Pose } from './common.ts';
import { FALL, guarded } from './jump.ts';

export const ANIMATED: boolean = true;

/**
 * jumpLight (Ciseau aérien, docs/combat-v2.md §3.5, §10.2, §11.3): 5 frames, 1, 2, 6, 2, 3 ticks
 * (14), the split on frame 2 (ticks 3-8), hitbox -14..26 / 6..24: her cross-up, the only air
 * attack in the cast that also hits behind its owner. The last frame (the jump's FALL) is held
 * until she lands, so the jump's landing takes over from it.
 *
 * A pair of scissors snapping open under her. The legs gather long and crossed under the seat,
 * then swing open around the hips like two blades, the front one long out in front of her, the
 * rear one driven down under her seat, the toes pointed: 60 degrees apart, each boot on its edge
 * of the hitbox, held through the six active ticks; then the blades swing shut, the boots
 * closing on each other under her, before the legs reach down into the fall. The rear boot
 * stops on the hitbox's back edge (-14, §9.5's -3 / +4 like the front one): flung back long, it
 * swept through an opponent 50 px behind her that the cross-up only hits up to 27 px. The in-between stays close to the cross so the split snaps open. A
 * b-girl's air split with a brawler on top, a star at 1x: the hips dropped through the legs, the
 * chest tipped back, the rear fist kept tucked under the chin, the elbow down along the ribs (the
 * guard turned with the chest, the glove sunk as the chest tips back and brings the chin down to
 * it: the face stays clear; Riff's rear shoulder sits at the back of her silhouette, three
 * quarters on, so that arm flung up and back would read as coming out of her back), the lead arm out low along the front leg, the look down at the target, the face
 * focused (a light). The boots point along the shins as far as a combat boot lets them.
 *
 * - 0 (1 tick): the blades cross: both legs long under her, the lead boot swung behind the rear
 *   one, the back over them, the fists drawn in. It follows any jump frame.
 * - 1 (2 ticks): the blades fly open, under halfway, on a wide smear from the cross; the arms
 *   start to open, a frame behind the legs.
 * - 2 (6 ticks, active): the split, the arms open against the legs; a fan of trails under it, a
 *   spark at each boot.
 * - 3 (2 ticks): shutting, both legs long, the boots closing in under the hips, the knees soft;
 *   the arms coming back to the guard.
 * - 4 (3 ticks, held): the airborne guard (the jump's FALL).
 *
 * The head stays the source drawing (under 20 degrees on screen), the chin down on the target;
 * the fringe and the belt's chain swing on their springs.
 */

/** The guard's on-screen head tilt. */
const LOOK = GUARD.torso + GUARD.head;

const rad = (degrees: number): number => (degrees * Math.PI) / 180;

/** The hip joint of one leg, for hips at `hip` leaning `torso` degrees (see skeleton.ts). */
export function hipJoint(hip: Point, torso: number, side: 'near' | 'far'): Point {
  const across = (side === 'near' ? 1 : -1) * RIFF_BODY.hipSpread;
  return at(hip.x + Math.cos(rad(torso)) * across, hip.y - Math.sin(rad(torso)) * across);
}

/**
 * The ankle of a leg reaching `length` px from its hip joint along `angle` degrees (0 forward,
 * -90 straight down, -180 back), the foot pointed along the leg.
 */
export function legAt(
  hip: Point,
  torso: number,
  side: 'near' | 'far',
  angle: number,
  length: number,
): Foot {
  const joint = hipJoint(hip, torso, side);
  return {
    x: joint.x + Math.cos(rad(angle)) * length,
    y: joint.y + Math.sin(rad(angle)) * length,
    angle,
  };
}

/**
 * A trail along the arc a boot sweeps around its hip joint, from `from` to `to` degrees,
 * `radius` px out (tail first, ending at the boot).
 */
export function sweep(
  hip: Point,
  torso: number,
  side: 'near' | 'far',
  from: number,
  to: number,
  radius: number,
  width: number,
): Effect {
  const joint = hipJoint(hip, torso, side);
  const points = [0, 0.25, 0.5, 0.75, 1].map((t): [number, number] => {
    const a = rad(from + (to - from) * t);
    return [joint.x + Math.cos(a) * radius, joint.y + Math.sin(a) * radius];
  });
  return smear(width, ...points);
}

interface Key {
  readonly hip: Point;
  readonly torso: number;
  /** The look on screen, in degrees chin down from the guard's. */
  readonly chin: number;
  readonly shrug: number;
  readonly twist: number;
  /** The rear (near) and lead (far) legs: angle from the hip joint, length to the ankle. */
  readonly rear: readonly [number, number];
  readonly lead: readonly [number, number];
  /**
   * The fists: nudged off the guard's (the rear under the chin, the lead low, both turned with
   * the chest: jump.ts's `guarded`), or the lead one placed outright.
   */
  readonly rearFist: Point;
  readonly leadFist: Point | { readonly at: Point };
  readonly knees: { readonly nearKnee: Bend; readonly farKnee: Bend };
}

/**
 * The angle a pointed boot keeps between the shin and the sole (90: square), in degrees: the toes
 * follow the leg, but a combat boot does not let the foot stretch flat along the shin.
 */
export const POINTED = 58;

/**
 * `pose` with its feet (both, or those of `sides`) pointed along their shins, `ankle` degrees
 * between the shin and the sole (each foot turned on its ankle: the knees and the ankles stay
 * where they are).
 */
export function pointed(
  pose: Pose,
  ankle = POINTED,
  sides: readonly ('near' | 'far')[] = ['near', 'far'],
): Pose {
  const s = solve(pose, RIFF_BODY);
  const along = (side: 'near' | 'far', foot: Foot): Foot => {
    if (!sides.includes(side)) return foot;
    const { knee, ankle: a } = s[side];
    // The skeleton is solved turned by the spin: the foot's own angle is taken before it.
    const shin = (Math.atan2(a.y - knee.y, a.x - knee.x) * 180) / Math.PI;
    return { ...foot, angle: shin + ankle + (pose.spin ?? 0) };
  };
  return {
    ...pose,
    nearFoot: along('near', pose.nearFoot),
    farFoot: along('far', pose.farFoot),
  };
}

function key(k: Key): Pose {
  const rear = legAt(k.hip, k.torso, 'near', k.rear[0], k.rear[1]);
  const lead = legAt(k.hip, k.torso, 'far', k.lead[0], k.lead[1]);
  const body: Pose = {
    ...FALL,
    hip: k.hip,
    torso: k.torso,
    head: LOOK + k.chin - k.torso,
    shrug: k.shrug,
    twist: k.twist,
    nearFoot: rear,
    farFoot: lead,
    bends: { ...k.knees, nearElbow: 'down', farElbow: 'down' },
  };
  const { leadFist } = k;
  if ('at' in leadFist) {
    return pointed({ ...guarded(body, k.rearFist), farFist: leadFist.at });
  }
  return pointed(guarded(body, k.rearFist, leadFist));
}

/**
 * The knees of the open blades: the lead one faces up, the rear one down, so both legs read long.
 * Hanging under her they face forward, and shutting too, both soft under the hips so the blades
 * read closed; the rear knee bends the way the airborne guard holds it (FALL) only there,
 * where that leg is long and the turn barely shows.
 */
const OPEN_KNEES = { nearKnee: 'down', farKnee: 'up' } as const;

/** The blades' angles from the hip joints: crossed under her, opening, then split open. */
const CROSSED = { rear: -74, lead: -103 } as const;
const OPENING = { rear: -89, lead: -73 } as const;
const SPLIT_OPEN = { rear: -104, lead: -44 } as const;

// 0 · The blades cross (1 tick).
const CROSS = key({
  hip: at(-3, 40),
  torso: 9,
  chin: 4,
  shrug: 2.6,
  twist: 0.45,
  rear: [CROSSED.rear, 27.5],
  lead: [CROSSED.lead, 28],
  rearFist: at(0, -1.5),
  leadFist: at(1, 0.5),
  knees: { nearKnee: 'front', farKnee: 'front' },
});

// 1 · The blades fly open (2 ticks), not even halfway: the in-between stays close to the cross so
// the split snaps.
const OPEN = key({
  hip: at(-1.5, 39),
  torso: 4,
  chin: 6,
  shrug: 2.6,
  twist: 0.58,
  rear: [OPENING.rear, 30.4],
  lead: [OPENING.lead, 30.4],
  rearFist: at(-1.5, -2),
  leadFist: at(1.5, -0.5),
  knees: { nearKnee: 'front', farKnee: 'up' },
});

// 2 · The split (6 ticks, active). The hips dropped through the legs, the front boot on the far
// edge of the hitbox, the rear one driven down on its back edge, both knees soft; the rear fist
// tucked under the chin, the lead arm out low along the front leg (the elbow soft, never locked),
// the chest tipped back.
const SPLIT = key({
  hip: at(-2, 35.8),
  torso: -8,
  chin: 9,
  shrug: 2.8,
  twist: 0.75,
  rear: [SPLIT_OPEN.rear, 29],
  lead: [SPLIT_OPEN.lead, 29],
  rearFist: at(-2.5, -4),
  leadFist: { at: at(16, 42.5) },
  knees: OPEN_KNEES,
});

// 3 · Shutting (2 ticks): the blades swing back in, long, the boots closing on each other under
// her, the knees soft over them.
const SHUT = key({
  hip: at(-3, 38.6),
  torso: 8,
  chin: 3,
  shrug: 2.3,
  twist: 0.52,
  rear: [-101, 30],
  lead: [-80, 30],
  rearFist: at(-0.5, -1),
  leadFist: at(0, 0.5),
  knees: { nearKnee: 'front', farKnee: 'front' },
});

/** A small silver spark just past a boot's toe, on the active frame. */
function spark(toe: Point, ankle: Point): Effect {
  const d = Math.hypot(toe.x - ankle.x, toe.y - ankle.y) || 1;
  const past = 1.5 / d;
  return {
    kind: 'flash',
    center: at(toe.x + (toe.x - ankle.x) * past, toe.y + (toe.y - ankle.y) * past),
    radius: 3,
    tone: 'strike',
  };
}

const SPLIT_SKELETON = solve(SPLIT, RIFF_BODY);

const fx = (pose: Pose, ...effects: Effect[]): Pose => ({ ...pose, effects });

export const POSES: readonly Pose[] = [
  CROSS,
  fx(
    OPEN,
    sweep(OPEN.hip, OPEN.torso, 'far', CROSSED.lead, OPENING.lead, 34, 5),
    sweep(OPEN.hip, OPEN.torso, 'near', CROSSED.rear, OPENING.rear, 32, 5),
  ),
  fx(
    SPLIT,
    sweep(SPLIT.hip, SPLIT.torso, 'far', -80, SPLIT_OPEN.lead - 2, 28, 4),
    sweep(SPLIT.hip, SPLIT.torso, 'near', OPENING.rear, SPLIT_OPEN.rear + 2, 30, 4),
    spark(SPLIT_SKELETON.far.toe, SPLIT_SKELETON.far.ankle),
    spark(SPLIT_SKELETON.near.toe, SPLIT_SKELETON.near.ankle),
  ),
  SHUT,
  FALL,
];
