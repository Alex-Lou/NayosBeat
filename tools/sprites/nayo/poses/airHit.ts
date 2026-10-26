import type { Point } from '../../raster.ts';
import { BODY, solve, type Bend } from '../../skeleton.ts';
import { at, type Pose } from './common.ts';

/**
 * airHit: 4 frames, 3,5,6 ticks then held until he lands (the knockdown takes over, flat on his
 * back). A launch from the ground lasts about 10 ticks, so he lands during frame 2: from frame
 * 1 on, the body sinks toward the feet anchor as it turns over, and frame 3 lies a few pixels
 * above the knockdown's floor impact (on a jump-in it is held for the whole fall), so the slam
 * reads as an impact, never as a teleport.
 *
 * The blow whips the head back and throws the arms apart; the body tips over backward, the
 * limbs dragging behind the rotation: the lead arm flung loose up and forward, the rear arm
 * trailing over the head, the lead knee tucked, the rear leg trailing, then swinging up. The
 * legs swing up, not out, so they never kick into the attacker.
 */

/** A limb posed by its two segments' directions, in world degrees (0 = forward, 90 = up). */
interface Chain {
  readonly upper: number;
  readonly lower: number;
}

/** A leg chain and the direction of its toes, in world degrees. */
interface LegChain extends Chain {
  readonly toes: number;
}

/**
 * A tumbling pose authored in world space after the spin: each limb is drawn by the direction
 * of its segments (forward kinematics), so the silhouette is exactly what is written. Converted
 * here to the skeleton's targets (before the spin) and the bends that rebuild the same joints.
 */
interface Tumble extends Omit<Pose, 'nearFist' | 'farFist' | 'nearFoot' | 'farFoot' | 'bends'> {
  readonly nearArm: Chain;
  readonly farArm: Chain;
  readonly nearLeg: LegChain;
  readonly farLeg: LegChain;
}

const add = (p: Point, q: Point): Point => at(p.x + q.x, p.y + q.y);
const sub = (p: Point, q: Point): Point => at(p.x - q.x, p.y - q.y);
const scale = (p: Point, k: number): Point => at(p.x * k, p.y * k);
const unit = (p: Point): Point => scale(p, 1 / (Math.hypot(p.x, p.y) || 1));
const direction = (degrees: number): Point => {
  const a = (degrees * Math.PI) / 180;
  return at(Math.cos(a), Math.sin(a));
};

function tumble(pose: Tumble): Pose {
  const { nearArm, farArm, nearLeg, farLeg, ...rest } = pose;
  const spin = pose.spin ?? 0;
  const a = (spin * Math.PI) / 180;
  const turn = (p: Point, sign: 1 | -1): Point => {
    const dx = p.x - pose.hip.x;
    const dy = p.y - pose.hip.y;
    const c = Math.cos(sign * a);
    const s = Math.sin(sign * a);
    return at(pose.hip.x + dx * c - dy * s, pose.hip.y + dx * s + dy * c);
  };
  /** World to skeleton space (undoes the spin), and back. */
  const unspin = (p: Point): Point => turn(p, 1);
  const respin = (p: Point): Point => turn(p, -1);

  // Shoulders and hip joints, before the spin (they don't depend on the hands and feet).
  const flat = solve({
    ...rest,
    spin: 0,
    nearFist: pose.hip,
    farFist: pose.hip,
    nearFoot: pose.hip,
    farFoot: pose.hip,
  });

  /** Target and bend that make the skeleton's IK rebuild this chain. */
  const place = (root: Point, chain: Chain, first: number, second: number) => {
    const jointWorld = add(respin(root), scale(direction(chain.upper), first));
    const joint = unspin(jointWorld);
    const end = unspin(add(jointWorld, scale(direction(chain.lower), second)));
    // The IK's other solution: the joint mirrored across the root-to-end line.
    const axis = unit(sub(end, root));
    const offset = sub(joint, root);
    const foot = add(root, scale(axis, offset.x * axis.x + offset.y * axis.y));
    const mirror = sub(scale(foot, 2), joint);
    const bend: Bend = joint.x >= mirror.x ? 'front' : 'back';
    return { end, bend };
  };

  const na = place(flat.near.shoulder, nearArm, BODY.upperArm, BODY.forearm);
  const fa = place(flat.far.shoulder, farArm, BODY.upperArm, BODY.forearm);
  const nl = place(flat.near.hip, nearLeg, BODY.thigh, BODY.shin);
  const fl = place(flat.far.hip, farLeg, BODY.thigh, BODY.shin);
  return {
    ...rest,
    nearFist: na.end,
    farFist: fa.end,
    nearFoot: { ...nl.end, angle: nearLeg.toes + spin },
    farFoot: { ...fl.end, angle: farLeg.toes + spin },
    bends: { nearElbow: na.bend, farElbow: fa.bend, nearKnee: nl.bend, farKnee: fl.bend },
  };
}

export const POSES: readonly Pose[] = [
  // 0 · Jolt (held through the hitstop): the head whips back, the arms fly apart, hands open,
  // the feet just leaving the floor.
  {
    hip: at(-5, 37),
    torso: -20,
    head: -20,
    shrug: 0,
    twist: 0.4,
    nearFoot: { x: 7, y: 5.8, angle: 10 },
    farFoot: { x: -10.5, y: 6.4, angle: -22 },
    nearFist: at(9.6, 44.6),
    farFist: at(-24.4, 63.6),
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  },
  // 1 · Launched: tipping over backward, the lead arm flung up, the rear arm dragging behind
  // the head, the lead knee tucking, the rear leg trailing below.
  tumble({
    hip: at(-6.5, 29),
    torso: -10,
    head: -14,
    spin: -36,
    shrug: 0,
    twist: 0.7,
    nearArm: { upper: 35, lower: 62 },
    farArm: { upper: 165, lower: 100 },
    nearLeg: { upper: 55, lower: -70, toes: -30 },
    farLeg: { upper: -5, lower: -105, toes: -50 },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  }),
  // 2 · Turning over, low: the rear leg swings up, the lead knee stays tucked, the rear arm is
  // thrown back over the head, the lead arm flung up.
  tumble({
    hip: at(-8, 9),
    torso: -8,
    head: -12,
    spin: -64,
    shrug: 0,
    twist: 0.2,
    nearArm: { upper: 72, lower: 45 },
    farArm: { upper: 168, lower: 150 },
    nearLeg: { upper: 88, lower: -5, toes: 10 },
    farLeg: { upper: 60, lower: -60, toes: -25 },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  }),
  // 3 · Falling flat on his back, legs up, the rear arm reaching for the floor behind the head
  // (held until the landing).
  tumble({
    hip: at(-8.5, 6.8),
    torso: -4,
    head: -8,
    spin: -78,
    shrug: 0,
    twist: -0.3,
    nearArm: { upper: 82, lower: 102 },
    farArm: { upper: 162, lower: 198 },
    nearLeg: { upper: 105, lower: 15, toes: 20 },
    farLeg: { upper: 68, lower: 50, toes: 50 },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  }),
];
