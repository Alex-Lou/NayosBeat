import type { Face, Hand } from '../../skeleton.ts';
import { at, GUARD, inReach, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * idle: 8 frames, looping (60 ticks, a bar at 120 BPM, src/art/watt/clips.ts).
 * Heavy industrial grappler breathing: his chest and massive pauldrons heave up and down (+1.5 px
 * to -0.9 px), his staggered gauntlets (`near` low at the ribs, `far` high and open in front)
 * parting to show his octagonal sternal transformer core. On the inhale his lead pincer clamp
 * opens wide while an electric arc jumps across the gauntlets; on the exhale his knees sink and
 * the clamp snaps shut (`fist`) for a beat before opening again.
 */

interface Beat {
  readonly hip: readonly [number, number];
  readonly lean: number;
  readonly shrug: number;
  readonly near: readonly [number, number];
  readonly far: readonly [number, number];
  readonly nearHand?: Hand;
  readonly farHand?: Hand;
  readonly face?: Face;
}

const BEATS: readonly Beat[] = [
  // 1: Inhale begins — chest and pauldrons lifting, both pincer clamps opening.
  {
    hip: [-0.2, 0.7],
    lean: -1.0,
    shrug: 0.5,
    near: [-0.4, 0.6],
    far: [-0.2, 0.8],
    nearHand: 'open',
    farHand: 'open',
  },
  // 2: Deep inhale — shoulders rolled back, current arcing between the two gauntlets.
  {
    hip: [-0.4, 1.3],
    lean: -2.0,
    shrug: 1.0,
    near: [-0.8, 1.2],
    far: [-0.4, 1.4],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
  },
  // 3: Peak of the breath (the « one ») — colossus looming tall, filament burning bright.
  {
    hip: [-0.5, 1.6],
    lean: -2.4,
    shrug: 1.2,
    near: [-1.0, 1.5],
    far: [-0.5, 1.6],
    nearHand: 'open',
    farHand: 'open',
    face: 'effort',
  },
  // 4: Exhale — weight dropping back into the knees.
  {
    hip: [-0.1, 0.5],
    lean: -0.6,
    shrug: 0.4,
    near: [-0.3, 0.6],
    far: [-0.2, 0.6],
    farHand: 'open',
  },
  // 5: Heavy sink — lead pincer snaps shut (`fist`) with a spark as the knees absorb his mass.
  {
    hip: [0.2, -0.6],
    lean: 1.2,
    shrug: -0.3,
    near: [0.3, -0.5],
    far: [0.0, -0.6],
    farHand: 'fist',
  },
  // 6: Bottom of the sink — crouched heavy in his boots.
  {
    hip: [0.3, -0.9],
    lean: 1.6,
    shrug: -0.4,
    near: [0.4, -0.8],
    far: [0.0, -0.9],
    farHand: 'fist',
  },
  // 7: Rebound toward GUARD, the lead clamp opening back up.
  {
    hip: [0.1, -0.3],
    lean: 0.6,
    shrug: -0.1,
    near: [0.1, -0.3],
    far: [0.0, -0.3],
    farHand: 'open',
  },
];

function body(b: Beat, index: number): Pose {
  const near = at(GUARD.nearFist.x + b.near[0], GUARD.nearFist.y + b.near[1]);
  const far = at(GUARD.farFist.x + b.far[0], GUARD.farFist.y + b.far[1]);
  const spark =
    index === 1
      ? [{ kind: 'energy' as const, center: far, radius: 1.8 }]
      : index === 2
        ? [{ kind: 'arc' as const, from: near, to: far, spread: 2.0 }]
        : index === 4
          ? [{ kind: 'energy' as const, center: near, radius: 1.8 }]
          : undefined;
  return inReach({
    ...GUARD,
    hip: at(GUARD.hip.x + b.hip[0], GUARD.hip.y + b.hip[1]),
    torso: GUARD.torso + b.lean,
    shrug: (GUARD.shrug ?? 0) + b.shrug,
    nearFist: near,
    farFist: far,
    nearHand: b.nearHand ?? GUARD.nearHand ?? 'fist',
    farHand: b.farHand ?? GUARD.farHand ?? 'open',
    ...(b.face ? { face: b.face } : {}),
    ...(spark ? { effects: spark } : {}),
  });
}

export const POSES: readonly Pose[] = [GUARD, ...BEATS.map(body)];
