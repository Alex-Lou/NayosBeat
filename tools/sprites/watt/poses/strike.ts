/**
 * The frames of Watt's moves, written as keys: the hips, the lean, the feet, and the clamps,
 * the striking one placed where it must reach (its hitbox's far edge, tests/tools/watt-
 * sprites.test.ts), the other one held from its shoulder as the guard holds it (`nearOff`,
 * `farOff` move it from there). The bulb stays upright over the collar (or as near as the neck
 * lets it) unless a key tilts it;
 * a planted rear boot rolls onto its ball as far as the knee needs (springAnkle).
 */

import type { Point } from '../../raster.ts';
import type { Bends, Effect, Face, Foot, Hand } from '../../skeleton.ts';
import { at, fistsOnShoulders, GUARD, springAnkle, type Pose } from './common.ts';

export interface Key {
  /** The hips (world px from the feet anchor) and the torso's lean (degrees). */
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** The bulb's tilt on screen from upright (degrees, chin up: negative). */
  readonly tilt?: number;
  readonly shrug?: number;
  readonly twist?: number;
  readonly reach?: { readonly near?: number; readonly far?: number };
  readonly nearFoot?: Foot;
  readonly farFoot?: Foot;
  /** A clamp placed where it strikes (world px); else held from its shoulder, moved by `*Off`. */
  readonly near?: readonly [number, number];
  readonly far?: readonly [number, number];
  readonly nearOff?: readonly [number, number];
  readonly farOff?: readonly [number, number];
  readonly nearHand?: Hand;
  readonly farHand?: Hand;
  readonly bends?: Bends;
  readonly face?: Face;
  readonly effects?: readonly Effect[];
}

const HEAD = GUARD.torso + GUARD.head;
const point = (p: readonly [number, number] | undefined): Point => (p ? at(p[0], p[1]) : at(0, 0));

/** The bulb kept upright, but never tilted on the neck past NECK (anatomy.ts limits it at 50). */
const NECK = 40;
function headOn(k: Key): number {
  const head = HEAD + (k.tilt ?? 0) - k.torso;
  return k.tilt === undefined ? Math.max(-NECK, Math.min(NECK, head)) : head;
}

/** The pose of one key. */
export function keyPose(k: Key): Pose {
  const base: Pose = {
    ...GUARD,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: headOn(k),
    shrug: k.shrug ?? GUARD.shrug ?? 0,
    twist: k.twist ?? GUARD.twist ?? 0,
    nearFoot: k.nearFoot ?? GUARD.nearFoot,
    farFoot: k.farFoot ?? GUARD.farFoot,
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.reach ? { reach: k.reach } : {}),
    ...(k.nearHand ? { nearHand: k.nearHand } : {}),
    ...(k.farHand ? { farHand: k.farHand } : {}),
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  const held = fistsOnShoulders(base, point(k.nearOff), point(k.farOff));
  return springAnkle({
    ...held,
    ...(k.near ? { nearFist: at(k.near[0], k.near[1]) } : {}),
    ...(k.far ? { farFist: at(k.far[0], k.far[1]) } : {}),
  });
}
