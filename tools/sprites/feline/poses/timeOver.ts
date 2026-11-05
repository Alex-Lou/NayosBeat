import type { Point } from '../../raster.ts';
import { add, BODY, scale, solve, sub, type Bend } from '../../skeleton.ts';
import { at, GUARD, planted, type Foot, type Pose } from './common.ts';

/**
 * timeOver: 4 frames of 10 ticks, looping.
 * Based on `Pack_Feline_Poses_Et_Degats/03_defaite/defaite_01_accroupie.png`:
 * Feline crouches low on one knee (`hip: at(-6.5, 22.5)`), head bowed, one hand resting on her
 * front knee while her tail and ears droop in a slow breath.
 */

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

function arm(
  body: Body,
  which: 'near' | 'far',
  shoulder: number,
  elbow: number,
): { fist: Point; bend: Bend } {
  const s = solve({ ...body, nearFist: GUARD.nearFist, farFist: GUARD.farFist });
  const root = s[which].shoulder;
  const turn = (v: Point, degrees: number): Point => {
    const a = (degrees * Math.PI) / 180;
    return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
  };
  const upper = turn({ x: -s.up.x, y: -s.up.y }, shoulder);
  const joint = add(root, scale(upper, BODY.upperArm));
  const fist = add(joint, scale(turn(upper, elbow), BODY.forearm));
  const line = sub(fist, root);
  const axis = scale(line, 1 / (Math.hypot(line.x, line.y) || 1));
  const offset = sub(joint, root);
  const along = offset.x * axis.x + offset.y * axis.y;
  const mirror = add(root, sub(scale(axis, 2 * along), offset));
  const dx = joint.x - mirror.x;
  const dy = joint.y - mirror.y;
  const bend: Bend =
    Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'down' : 'up') : dx > 0 ? 'front' : 'back';
  return { fist: at(fist.x, fist.y), bend };
}

function posed(body: Body, near: readonly [number, number], far: readonly [number, number]): Pose {
  const lead = arm(body, 'near', near[0], near[1]);
  const rear = arm(body, 'far', far[0], far[1]);
  return {
    ...body,
    nearFist: lead.fist,
    farFist: rear.fist,
    bends: { ...body.bends, nearElbow: lead.bend, farElbow: rear.bend },
  };
}

const REAR_TOE = solve(GUARD).far.toe.x;

function onToes(toe: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  return planted(
    toe - (BODY.ankle - BODY.footRadius) * Math.sin(a) - BODY.foot * Math.cos(a),
    angle,
  );
}

const KNEEL_BASE: Body = {
  hip: at(-6.5, 22.5),
  torso: 12,
  head: 14,
  shrug: 0.4,
  twist: 0.3,
  nearFoot: planted(GUARD.nearFoot.x),
  farFoot: onToes(REAR_TOE, -68),
  nearHand: 'open',
  farHand: 'open',
  face: 'tired',
};

const HEAVE = [0, 1.0, 1.5, 0.5] as const;
const SHRUG = [0.2, 1.0, 1.4, 0.6] as const;

function kneelFrame(frame: 0 | 1 | 2 | 3): Pose {
  const lift = HEAVE[frame];
  const body: Body = {
    ...KNEEL_BASE,
    hip: at(KNEEL_BASE.hip.x, KNEEL_BASE.hip.y + lift),
    shrug: SHRUG[frame],
  };
  return posed(body, [28, 42], [34, 98]);
}

export const POSES: readonly Pose[] = [kneelFrame(0), kneelFrame(1), kneelFrame(2), kneelFrame(3)];
