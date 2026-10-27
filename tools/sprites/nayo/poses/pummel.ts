import { solve } from '../../skeleton.ts';
import { at, smear, type Effect, type Foot, type Pose } from './common.ts';
import { HOLD, onToes, toeOf } from './hold.ts';

/**
 * pummel (Coup de genou, docs/combat-v2.md §4.3, §11.2): 4 frames, 3, 3, [1], 9 ticks (16), the
 * impact on frame 2 (tick 6), held through its 6-tick hitstop. A knee to the belly of the
 * opponent he holds, from hold and back to it.
 *
 * The long knee of the clinch: the fists keep the collar and haul it down, the hips rock back
 * over the rear foot and the lead heel peels up; then the lead knee drives up and in. On the
 * impact the body bows (a reverse C): the hips thrust in over the knee, the shoulders pull back
 * and the arms, long, haul the collar down onto it, the rear leg long behind on its ball, the
 * heel high; the knee buried in the belly of the opponent bent over it. The lead foot comes down
 * on its ball, the hips still in, and the hold loop settles the rest (the grip the hold's).
 */

const REAR_TOE_HOLD = toeOf(HOLD.farFoot);

/**
 * The lead foot hanging off a knee `angle` degrees above horizontal from the lead hip of
 * `body`, the shin `shin` degrees off straight down (positive: the foot back under the knee),
 * the toes pointed `toes` degrees.
 */
function kneeUp(body: Omit<Pose, 'nearFoot'>, angle: number, shin: number, toes: number): Foot {
  const { near } = solve({ ...body, nearFoot: HOLD.nearFoot });
  const a = (angle * Math.PI) / 180;
  const knee = at(near.hip.x + Math.cos(a) * 19.4, near.hip.y + Math.sin(a) * 19.4);
  const s = ((-90 - shin) * Math.PI) / 180;
  return { x: knee.x + Math.cos(s) * 17.4, y: knee.y + Math.sin(s) * 17.4, angle: toes };
}

/** The front of the lead knee as drawn (its middle plus the pants' thickness). */
function kneeFront(pose: Pose): { x: number; y: number } {
  const { knee } = solve(pose).near;
  return at(knee.x + 4.2, knee.y);
}

// Frame 0 (3 ticks): the yank. The fists haul the collar down, the hips rock back over the rear
// foot, the lead heel peels up off the floor.
const YANK: Pose = {
  ...HOLD,
  hip: at(-6.8, 35.6),
  torso: 22,
  head: -4,
  shrug: 2.2,
  twist: 0.1,
  nearFoot: onToes(toeOf(HOLD.nearFoot), -24),
  farFoot: onToes(REAR_TOE_HOLD, -16),
  nearFist: at(22.5, 52.5),
  farFist: at(19.5, 46),
  face: 'effort',
};

// Frame 1 (3 ticks): the drive. The lead knee comes up fast, the hips start in behind it, the
// rear heel rises.
const DRIVE_BODY = {
  ...HOLD,
  hip: at(-4.8, 36.4),
  torso: 13,
  head: 4,
  shrug: 2.2,
  twist: 0.1,
  farFoot: onToes(REAR_TOE_HOLD, -26),
  nearFist: at(22.5, 51.5),
  farFist: at(19.5, 45.5),
  face: 'effort',
} as const;
const DRIVE_POSE: Pose = { ...DRIVE_BODY, nearFoot: kneeUp(DRIVE_BODY, -25, 25, -40) };
const DRIVE: Pose = {
  ...DRIVE_POSE,
  effects: [
    smear(3.5, [2, 14], [6.5, 21], [kneeFront(DRIVE_POSE).x - 3, solve(DRIVE_POSE).near.knee.y]),
  ],
};

// Frame 2 (1 tick, the impact, held through the hitstop): the thigh near level, the knee in the
// belly. A reverse C: the hips thrust in over the knee, the shoulders pull back, the chin tucked
// on the knee; the arms long, hauling the collar down onto it; the rear leg long behind on its
// ball, the heel high.
const IMPACT_BODY = {
  ...HOLD,
  hip: at(-1.6, 37.8),
  torso: -2,
  head: 15,
  shrug: 2.6,
  twist: 0.15,
  farFoot: onToes(REAR_TOE_HOLD, -42),
  nearFist: at(22, 50),
  farFist: at(18.5, 45),
  face: 'effort',
} as const;
const IMPACT_POSE: Pose = { ...IMPACT_BODY, nearFoot: kneeUp(IMPACT_BODY, 12, 12, -55) };
const KNEE = kneeFront(IMPACT_POSE);
const impactEffects: Effect[] = [
  smear(5, [4, 20], [9, 30], [13, 37], [KNEE.x - 3, KNEE.y]),
  { kind: 'flash', center: at(KNEE.x + 1.5, KNEE.y + 0.5), radius: 5, tone: 'strike' },
];
const IMPACT: Pose = { ...IMPACT_POSE, effects: impactEffects };

// Frame 3 (9 ticks): the lead foot comes down on its ball on its mark, the heel still up, the
// hips still a pixel in; the fists back on the hold's grip, so his face shows. The hold loop
// drops the heel and the hips: the last settle.
const BACK: Pose = {
  ...HOLD,
  hip: at(HOLD.hip.x + 1, HOLD.hip.y + 0.5),
  nearFoot: onToes(toeOf(HOLD.nearFoot), -10),
};

export const POSES: readonly Pose[] = [YANK, DRIVE, IMPACT, BACK];
