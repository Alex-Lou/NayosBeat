import { armOut, at, behindBack, GUARD, onBall, planted, raised, type Pose } from './common.ts';
import { CROUCH } from './crouch.ts';

/**
 * Her falls, knock-downs and get-ups. She goes down backward, the arms flung out of her back,
 * and comes back up like a dancer: a kip-up from her shoulders, a somersault in the air; the
 * hands go back behind her once she is up.
 *
 * - trip (4 frames, 2, 2, 2, 7): the feet swept out from under her, she tips back and lands
 *   on her back.
 * - airHit (4 frames, 3, 5, 6, 1): knocked in the air, flung back; its frames 2-3 are also the
 *   end of a throw's fall.
 * - knockdown (6 frames, 3, 3, 4, 6, 6, 8, the 40 ticks from the landing to the get-up): the
 *   bounce, flat on her back, then rolled up on her shoulders, the legs whipping over: the kip.
 * - getup (5 frames of 2): out of the kip's crouch into her guard.
 * - ko (8 frames, 4, 4, 4, 4, 4, 4, 6, 1; koLanding plays 4-7): the long fall back, the bounce,
 *   still.
 * - tech (4 frames, 3, 3, 4, 4): a back somersault in the air, landing on her feet.
 *
 * Lying poses are written standing and turned on the spin (negative: backward), round the hip.
 */

/** Flat on her back, the head behind her, the legs out toward the opponent. */
/** The arms flung out over her head, as she goes down (before the body's spin). */
const flung = (pose: Pose): Pose => armOut(armOut(behindBack(pose), 'near', 85, 18), 'far', 70, 17);

/** The hands round the shins, in a tuck. */
const hug = (pose: Pose): Pose => armOut(armOut(behindBack(pose), 'near', -40, 14), 'far', -60, 14);

function lying(x: number, y = 8.5, spin = -90): Pose {
  return flung({
    ...GUARD,
    hip: at(x, y),
    torso: 0,
    head: 10,
    spin,
    nearFoot: raised(x + 3, y - 31, -30),
    farFoot: raised(x - 2, y - 30, -35),
    bends: { ...GUARD.bends, nearKnee: 'front', farKnee: 'front' },
    face: 'out',
  });
}

/** Tucked, the knees to the chest, turned `spin` degrees. */
function tucked(x: number, y: number, spin: number): Pose {
  return hug({
    ...GUARD,
    hip: at(x, y),
    torso: 0,
    spin,
    nearFoot: raised(x + 8, y - 16, -30),
    farFoot: raised(x + 4, y - 17, -45),
    bends: { ...GUARD.bends, nearKnee: 'up', farKnee: 'up' },
    face: 'hurt',
  });
}

export const TRIP: readonly Pose[] = [
  flung({
    ...GUARD,
    hip: at(-2, 30),
    torso: -20,
    spin: -15,
    nearFoot: raised(18, 14, 20),
    farFoot: raised(10, 8, 10),
    face: 'hurt',
  }),
  { ...lying(-6, 28, -45), face: 'hurt' },
  { ...lying(-8, 15.5, -75), face: 'hurt' },
  lying(-8),
];

export const AIR_HIT: readonly Pose[] = [
  { ...lying(0, 40, -20), face: 'hurt' },
  { ...lying(-2, 38, -45), face: 'hurt' },
  { ...lying(-4, 30, -75), face: 'hurt' },
  { ...lying(-6, 16, -88), face: 'hurt' },
];

export const KNOCKDOWN: readonly Pose[] = [
  lying(-8, 11, -84),
  lying(-8),
  lying(-8),
  tucked(-10, 33.5, -150),
  tucked(-6, 22, -40),
  behindBack({ ...CROUCH, hip: at(-4, 20), face: 'effort' }),
];

/** A hand on the lead knee, pushing up. */
const pushing = (pose: Pose): Pose => armOut(behindBack(pose), 'near', -50, 13);

export const GETUP: readonly Pose[] = [
  pushing({ ...CROUCH, hip: at(-4, 21) }),
  pushing({ ...CROUCH, hip: at(-4, 25), torso: 18 }),
  behindBack({
    ...GUARD,
    hip: at(-3, 29),
    torso: 12,
    nearFoot: onBall(10, -36),
    farFoot: onBall(-12, -40),
  }),
  behindBack({ ...GUARD, hip: at(-3, 32), torso: 6, farFoot: planted(-14, -24) }),
  behindBack({ ...GUARD, hip: at(-3, 33.5), torso: 3 }),
];

export const KO: readonly Pose[] = [
  { ...lying(-2, 35.5, -15), face: 'hurt' },
  { ...lying(-4, 31, -35), face: 'hurt' },
  { ...lying(-6, 22, -60), face: 'hurt' },
  { ...lying(-8, 13, -82), face: 'hurt' },
  lying(-8, 11, -84),
  lying(-8, 8.5, -90),
  lying(-8),
  lying(-8),
];

export const TECH: readonly Pose[] = [
  tucked(-2, 40, -70),
  tucked(-2, 42, -170),
  tucked(-2, 40, -270),
  behindBack({ ...CROUCH, hip: at(-3, 24), torso: 14, face: 'effort' }),
];
