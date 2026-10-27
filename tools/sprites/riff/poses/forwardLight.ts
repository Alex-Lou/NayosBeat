import type { Point } from '../../raster.ts';
import { solve, type Bends, type Effect, type Face, type Foot, type Hand } from '../../skeleton.ts';
import { RIFF_BODY } from '../body.ts';
import { at, GUARD, lifted, onBall, planted, smear, toeOf, type Pose } from './common.ts';

export const ANIMATED: boolean = true;

/**
 * forwardLight (Toprock): 6 frames, 2, 3, 3, 2, 5, 5 ticks (20), the jab on frame 3 (ticks 8-9),
 * hitbox 8..32 / 44..58; the game carries her 20 px over ticks 0-7. A b-girl's toprock to come
 * in, cocky and provocative, then a jab out of nowhere: a cross-step with the forearms crossed
 * at the jaw, a kick-out with the arms flung wide and the chin up (« come on »), and the lead
 * fist snapping out low and long as both feet stamp down.
 *
 * - 0: the dip: the hips sink and go, the rear heel pops, the lead foot skims.
 * - 1: the cross-step (the Indian step): up off the rear ball, the lead knee pops up; both
 *   forearms crossed in front of the chest at the jaw, the fists by the chin, the elbows out
 *   wide (the lead one past the chest, the rear one down at the ribs). Nothing behind her back.
 * - 2: the kick-out: the lead foot flicks out, toes up, the rear foot still in the air; the rear
 *   arm swept back and up, open, the lead palm out at chest height: come on. The chin up, the
 *   look from under the lids.
 * - 3: the stamp and the jab: both feet land as the carry ends (dust), the hips drop and the
 *   lean drives in low, the lead fist snaps out at the face, the rear hand left open and low from
 *   the flourish (the mockery: not the Jab's tucked fist); a short straight streak, a tick of a
 *   flash.
 * - 4: the fist snaps back, the weight sinks past the guard: the hips 1.6 px below it, the lean
 *   2.5 degrees short of it, the cocked fist a touch high.
 * - 5: the guard, settled.
 *
 * The feet ride the carry: the rear foot pushes off on frame 0 (its ball drifting back in the
 * cell by the carry, so it stays put on the stage) and both feet stay in the air through the
 * kick-out, landing on the stamp, after the 20 px. The head stays the source drawing and the
 * fringe and the belt's chain bounce on the steps by themselves.
 */

const TOE = toeOf(GUARD.nearFoot);

/** Where the cocked rear fist sits from the rear shoulder in the guard. */
const COCKED = (() => {
  const shoulder = solve(GUARD, RIFF_BODY).near.shoulder;
  return at(GUARD.nearFist.x - shoulder.x, GUARD.nearFist.y - shoulder.y);
})();

interface Key {
  readonly hip: readonly [number, number];
  readonly torso: number;
  /** The head's on-screen tilt (torso + head), degrees. */
  readonly look: number;
  readonly shrug: number;
  readonly reach?: { readonly near?: number; readonly far?: number };
  readonly twist: number;
  readonly near: Foot;
  readonly far: Foot;
  /** The rear fist: a point, or offsets from its cocked place on the rear shoulder. */
  readonly rear: Point | { readonly cocked: readonly [number, number] };
  readonly lead: readonly [number, number];
  readonly hands?: { readonly near?: Hand; readonly far?: Hand };
  readonly bends?: Bends;
  readonly face?: Face;
  readonly effects?: readonly Effect[];
}

function key(k: Key): Pose {
  const pose: Pose = {
    ...GUARD,
    hip: at(k.hip[0], k.hip[1]),
    torso: k.torso,
    head: k.look - k.torso,
    shrug: k.shrug,
    reach: k.reach ?? {},
    twist: k.twist,
    nearFoot: k.near,
    farFoot: k.far,
    farFist: at(k.lead[0], k.lead[1]),
    bends: { ...GUARD.bends, ...k.bends },
    ...(k.hands?.near ? { nearHand: k.hands.near } : {}),
    ...(k.hands?.far ? { farHand: k.hands.far } : {}),
    ...(k.face ? { face: k.face } : {}),
    ...(k.effects ? { effects: k.effects } : {}),
  };
  if ('cocked' in k.rear) {
    const shoulder = solve(pose, RIFF_BODY).near.shoulder;
    const [dx, dy] = k.rear.cocked;
    return { ...pose, nearFist: at(shoulder.x + COCKED.x + dx, shoulder.y + COCKED.y + dy) };
  }
  return { ...pose, nearFist: k.rear };
}

const KEYS: readonly Key[] = [
  // 0: the dip: the hips sink and go, the rear heel pops, the fists draw in.
  {
    hip: [-6.2, 30.6],
    torso: 20,
    look: 10,
    shrug: 2.6,
    twist: 0.4,
    near: onBall(TOE - 2.5, -24),
    far: lifted(planted(GUARD.farFoot.x - 1, -4), 1),
    rear: at(-10.5, 56),
    lead: [8, 46],
  },
  // 1: the cross-step: up off the rear ball, the lead knee pops up, the forearms crossed in
  // front of the chest, the fists by the jaw, the elbows out.
  {
    hip: [-4, 34.5],
    torso: 10,
    look: 4,
    shrug: 2.4,
    twist: 0.7,
    near: lifted(onBall(-15, -40), 1.5),
    far: { x: 5, y: 15, angle: -20 },
    rear: at(4, 56),
    lead: [9, 57],
    bends: { nearElbow: 'down', farElbow: 'front' },
  },
  // 2: the kick-out: the lead foot flicks out, the rear arm swept back and up, the lead palm up
  // at chest height: come on.
  {
    hip: [-4.5, 33.5],
    torso: -2,
    look: -8,
    shrug: 0.4,
    twist: 0.95,
    near: { x: -13, y: 9, angle: -30 },
    far: { x: 16, y: 9, angle: 34 },
    rear: at(-25, 65),
    lead: [14, 52],
    hands: { near: 'open', far: 'open' },
    face: 'cool',
  },
  // 3: the stamp and the jab.
  {
    hip: [-3, 29],
    torso: 30,
    look: 13,
    shrug: 2.2,
    reach: { far: 3 },
    twist: 0.35,
    near: onBall(TOE, -24),
    far: planted(GUARD.farFoot.x),
    rear: at(-9, 38),
    lead: [28.5, 50],
    hands: { near: 'open' },
    effects: [
      smear(3, [12, 45], [20, 48], [28.5, 50]),
      { kind: 'flash', center: at(32, 50), radius: 3, tone: 'strike' },
      { kind: 'dust', x: 10, size: 2.5, progress: 0.15 },
    ],
  },
  // 4: the fist snaps back, the weight sinks past the guard.
  {
    hip: [-7, 30.4],
    torso: 16.5,
    look: 8,
    shrug: 2.4,
    twist: 0.5,
    near: onBall(TOE, -16),
    far: planted(GUARD.farFoot.x),
    rear: { cocked: [0.3, 1.6] },
    lead: [8.6, 45.4],
    effects: [{ kind: 'dust', x: 10, size: 2.5, progress: 0.55 }],
  },
  // 5: the guard.
  {
    hip: [-6.8, 32],
    torso: 19,
    look: 9,
    shrug: 2.2,
    twist: 0.45,
    near: onBall(TOE, -12),
    far: planted(GUARD.farFoot.x),
    rear: { cocked: [0, 0] },
    lead: [9.5, 46],
  },
];

export const POSES: readonly Pose[] = KEYS.map(key);
