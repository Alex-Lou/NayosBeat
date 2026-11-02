import { armOut, at, behindBack, GUARD, onBall, planted, type Pose } from './common.ts';
import { CROUCH_HELD } from './crouch.ts';

/**
 * Her reactions to a blow (hitHigh, hitMid, hitLow: 5 frames, 3, 3, 4, 4, 2 ticks; their quick
 * versions play frames 0, 1 and 4; hitCrouch: 3 frames, 3, 4, 1). The blow knocks her hands out
 * of her back for a beat (they flinch round the hurt), and they go back behind her as she
 * recovers; the blow shows in the spine and the legs. The mask does not wince, it only tips.
 *
 * - hitHigh: the mask snaps back, the torso arches, the hips give back, the lead foot lifts.
 * - hitMid: she folds over the blow, the hips pushed back, the mask down.
 * - hitLow: the lead knee buckles, the hips drop over it, the torso pitches forward.
 * - hitCrouch: the crouch knocked back, the torso rocked up.
 *
 * Frame 0 is the impact (held through the hitstop), 1 the furthest, 2-3 the recovery, 4 a hair
 * from the guard: every reaction flows back into it.
 */

/** A reaction, `t` from 0 (the guard) to 1 (the furthest), toward `peak`. */
function toward(peak: Pose, t: number): Pose {
  const mix = (a: number, b: number) => a + (b - a) * t;
  const foot = (a: Pose['nearFoot'], b: Pose['nearFoot']) => ({
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    angle: mix(a.angle ?? 0, b.angle ?? 0),
  });
  return behindBack({
    ...peak,
    hip: at(mix(GUARD.hip.x, peak.hip.x), mix(GUARD.hip.y, peak.hip.y)),
    torso: mix(GUARD.torso, peak.torso),
    head: mix(GUARD.head, peak.head),
    nearFoot: foot(GUARD.nearFoot, peak.nearFoot),
    farFoot: foot(GUARD.farFoot, peak.farFoot),
  });
}

/**
 * The five frames of a standing reaction: impact, peak, recovery, recovery, nearly home. The
 * arms of `flinch` on the first three, the hands back behind her on the last two.
 */
function reaction(peak: Pose, flinch: (pose: Pose) => Pose): readonly Pose[] {
  return [0.8, 1, 0.6, 0.3, 0.08].map((t, frame) => {
    const pose = toward(peak, t);
    return frame < 3 ? flinch(pose) : pose;
  });
}

/** The arms of a reaction: the near fist and the far one toward `near`, `far` degrees. */
function arms(near: number, far: number, reach = 14): (pose: Pose) => Pose {
  return (pose) => armOut(armOut(pose, 'near', near, reach), 'far', far, reach);
}

export const HIT_HIGH: readonly Pose[] = reaction(
  {
    ...GUARD,
    hip: at(-8, 33),
    torso: -16,
    head: -22,
    nearFoot: onBall(9.5, -40),
    farFoot: planted(-15, -8),
    face: 'hurt',
  },
  arms(-20, 10),
);

export const HIT_MID: readonly Pose[] = reaction(
  {
    ...GUARD,
    hip: at(-9, 31.5),
    torso: 24,
    head: 16,
    nearFoot: onBall(9.5, -40),
    farFoot: planted(-16, -12),
    face: 'hurt',
  },
  arms(-55, -40, 11),
);

export const HIT_LOW: readonly Pose[] = reaction(
  {
    ...GUARD,
    hip: at(-4, 28),
    torso: 14,
    head: 6,
    nearFoot: onBall(9, -48),
    farFoot: planted(-14, -32),
    face: 'hurt',
  },
  (pose) => armOut(pose, 'near', -140, 19.5),
);

/** Hit while crouching: her held crouch, the lead heel lifted off the floor by the blow. */
const CROUCHED: Pose = { ...CROUCH_HELD, nearFoot: onBall(9.5, -40), face: 'hurt' };

export const HIT_CROUCH: readonly Pose[] = [
  arms(-30, -20, 11)(behindBack({ ...CROUCHED, hip: at(-9.5, 19), torso: 10, head: -8 })),
  arms(-30, -20, 11)(behindBack({ ...CROUCHED, hip: at(-8.5, 19.5), torso: 14, head: -10 })),
  behindBack({ ...CROUCHED, hip: at(-7.5, 19.5), torso: 22 }),
];
