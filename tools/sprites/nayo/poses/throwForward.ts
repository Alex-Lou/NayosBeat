import { solve } from '../../skeleton.ts';
import { at, GUARD, lifted, planted, smear, type Pose } from './common.ts';
import { fromShoulder, HOLD, LEAD_IN, onToes, REAR_TOE } from './hold.ts';

/**
 * throwForward (Renvoi, docs/combat-v2.md §4.3, §11.2): 8 frames, 3, 3, 4, [1], 6, 6, 6, 7
 * ticks (36), the release on frame 3 (tick 10). From hold: a shove and a straight that sends the
 * opponent off (it lands about 72 px away). Back to the guard.
 *
 * The rear hand lets go of the lapel and comes back to the cheek while the lead one keeps the
 * collar; the lead palm shoves him off the chest, the weight rocking back onto the rear foot.
 * Then the load, held: the lead hand hooks the collar and hauls him back in onto the punch, the
 * hips sink back over the rear foot, the shoulders stay closed, the rear glove cocked by the
 * cheek. The straight snaps out of it in one tick, the trail running from the cheek to the fist,
 * the flash where it lands on the chest: the release. He throws it all the way through after
 * the opponent flying off, the chest open, one line from the raised rear heel to the fist, a
 * small flash still on the fist and the blow's shockwave pushed off it (the sent beat reads
 * even without a hitstop); then he eases back along the line, the lead foot steps home, the
 * guard comes up a pixel past its marks and settles.
 */

type Body = Omit<Pose, 'nearFist' | 'farFist'>;

/** The rear glove as drawn: the front of its knuckles, past the wrist. */
function knuckles(pose: Pose): { x: number; y: number } {
  const { wrist, forearm } = solve(pose).far;
  return at(wrist.x + forearm.x * 5.4, wrist.y + forearm.y * 5.4);
}

/**
 * The settle at the end of both throws: the guard a pixel past itself, the hips a pixel lower
 * and back, the lead shoulder rolled up, the gloves a pixel above their marks; the guard comes
 * after it.
 */
export const SETTLE: Pose = {
  ...GUARD,
  hip: at(GUARD.hip.x - 0.8, GUARD.hip.y - 1),
  torso: GUARD.torso + 1,
  head: GUARD.head - 1,
  shrug: (GUARD.shrug ?? 0) + 1,
  nearFist: at(GUARD.nearFist.x, GUARD.nearFist.y + 1),
  farFist: at(GUARD.farFist.x - 0.5, GUARD.farFist.y + 1),
};

// Frame 0 (3 ticks): the rear hand lets go and comes back toward the cheek, the lead fist keeps
// the collar and draws it in; the hips sink.
const LET_GO: Pose = {
  ...HOLD,
  hip: at(-6, 35.1),
  torso: 16,
  head: 1,
  shrug: 1.8,
  reach: { near: 1.5, far: 0 },
  twist: -0.25,
  farFoot: onToes(REAR_TOE, -17),
  nearFist: at(23, 55),
  farFist: at(12.5, 62.5),
};

// Frame 1 (3 ticks): the shove. The lead palm drives him off the chest, the weight rocks back
// onto the rear foot, the shoulders coil, the rear glove cocked at the cheek.
const SHOVE: Pose = {
  ...HOLD,
  hip: at(-7.6, 35),
  torso: 11,
  head: 5,
  shrug: 1.4,
  reach: { near: 2.5, far: -0.5 },
  twist: -0.5,
  farFoot: onToes(REAR_TOE, -11),
  nearFist: at(25, 55.5),
  farFist: at(6.5, 63.5),
  nearHand: 'open',
  face: 'effort',
};

// Frame 2 (4 ticks): the load, held. The lead hand hooks the collar and hauls him back in onto
// the punch, the hips sink back over the rear foot, the shoulders stay closed, the rear glove
// cocked by the cheek, the rear heel starting up.
const LOAD: Pose = {
  ...HOLD,
  hip: at(-8.6, 34),
  torso: 10,
  head: 7,
  shrug: 1.8,
  reach: { near: 1.5, far: -0.8 },
  twist: -0.45,
  farFoot: onToes(REAR_TOE, -18),
  nearFist: at(19, 55),
  farFist: at(5.5, 62.5),
  face: 'effort',
};

// Frame 3 (1 tick, the release): the straight snaps out of the load and lands in the chest, the
// arm three quarters out, the head kept back off his; the trail runs from the cheek to the fist
// so the one tick carries the whole path, the flash where the fist meets the chest.
const CONTACT_BODY: Body = {
  ...HOLD,
  hip: at(-4.2, 34.4),
  torso: 25,
  head: -7,
  shrug: 2.4,
  reach: { near: -1, far: 3.5 },
  twist: 0.75,
  farFoot: onToes(REAR_TOE, -30),
  face: 'effort',
};
const CONTACT_ARM: Pose = {
  ...CONTACT_BODY,
  nearFist: at(15.5, 54.5),
  farFist: fromShoulder(CONTACT_BODY, 'far', 19.5, 6),
};
const HIT = knuckles(CONTACT_ARM);
/** Where the fist meets the opponent's chest (in front of the knuckles drawn over him). */
const IMPACT = at(28, 56);
const CONTACT: Pose = {
  ...CONTACT_ARM,
  effects: [
    smear(4, [6, 62], [12, 59.5], [19, 57], [HIT.x - 3, HIT.y]),
    { kind: 'flash', center: IMPACT, radius: 6, tone: 'strike' },
  ],
};

// Frame 4 (6 ticks): sent. The arm all the way through after him, the chest open, the rear heel
// high; a small flash still on the fist and the blow's shockwave pushed off it, speed lines
// where he flies off: the sent beat reads even without a hitstop.
const SEND_BODY: Body = {
  ...HOLD,
  hip: at(-1.6, 34.2),
  torso: 32,
  head: -13,
  shrug: 2.6,
  reach: { near: -1.6, far: 4.2 },
  twist: 0.95,
  farFoot: onToes(REAR_TOE + 0.6, -34),
  face: 'effort',
};
const SEND_ARM: Pose = {
  ...SEND_BODY,
  nearFist: at(18.5, 53.6),
  farFist: fromShoulder(SEND_BODY, 'far', 24.4, 8),
};
const SENT = knuckles(SEND_ARM);
/** The shockwave of the blow: a ")" pushed off the fist after him, open at the back. */
const WAVE = at(SENT.x + 1.5, SENT.y + 0.5);
const SEND: Pose = {
  ...SEND_ARM,
  effects: [
    { kind: 'flash', center: at(SENT.x, SENT.y), radius: 3.5, tone: 'strike' },
    { kind: 'ring', center: WAVE, radius: 10, progress: 0.15, tone: 'sound', squash: 1.4 },
    { kind: 'speed', center: at(46, 67), length: 14, spread: 8, direction: 30, tone: 'strike' },
  ],
};

// Frame 5 (6 ticks): he eases out of it, back along the line: the arm folding back, the chest
// still open, the lead foot lifting home.
const RETURN_BODY: Body = {
  ...GUARD,
  hip: at(-3.4, 35),
  torso: 25,
  head: -7,
  shrug: 2.2,
  reach: { near: -0.6, far: 2.4 },
  twist: 0.6,
  nearFoot: lifted(planted(LEAD_IN - 1, 3), 0.8),
  farFoot: onToes(REAR_TOE + 0.3, -27),
};
const RETURN: Pose = {
  ...RETURN_BODY,
  nearFist: at(15, 54.5),
  farFist: fromShoulder(RETURN_BODY, 'far', 19, 12),
  effects: [{ kind: 'ring', center: WAVE, radius: 10, progress: 0.6, tone: 'sound', squash: 1.4 }],
};

// Frame 6 (6 ticks): the settle, the guard a pixel past itself. Frame 7 (7 ticks): the guard.
export const POSES: readonly Pose[] = [LET_GO, SHOVE, LOAD, CONTACT, SEND, RETURN, SETTLE, GUARD];
