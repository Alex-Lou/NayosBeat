import { at, type Effect, type Pose } from './common.ts';

/**
 * trip (docs/combat-v2.md §9.4, §11.1): 4 frames, 2, 2, 2 ticks, the last one held through the
 * 7-tick flight. Swept off his legs (sweeps, Riff's Glissade: lifted at only 2 px/tick), he
 * falls onto his back; the knockdown follows.
 *
 * Frame 0, held through the hitstop, is the moment the legs go, built around the swept legs:
 * the sweep kicks the lead leg out from under him, forward and up, nearly straight, the rear
 * foot dragged off its mark low and forward; the hips drop back over nothing, the chest tips
 * back, the chin tucked, and the arms fly apart, the lead one up and forward, the rear one back
 * and down, already reaching for the floor (a shoulder swings no further behind). Then the fall, fast: the body pivots back around the hips, the feet leading the
 * swing up with the knees open (1); he is nearly flat, the legs folding, the arms swinging
 * down for the floor (2), then just above it, the palms out to slap it, the chin tucked like a
 * trained fighter's, the legs riding up (3, held until he lands): the knockdown's impact takes
 * over. The engine gives the flight its little height; the poses stay anchored to his feet.
 * Only the swept lead foot goes out in front, on the frame the sweep takes it; once he falls,
 * the poses stretch backward (the head toward negative x) and the legs swing up, never out
 * into the attacker. The head turns past 20 degrees once he is falling (RotSprite): the face
 * is hurt.
 */

/** A puff of dust where a foot leaves the floor. */
function dust(x: number, size: number, progress: number): Effect {
  return { kind: 'dust', x, size, progress };
}

export const POSES: readonly Pose[] = [
  // 0 · Swept: the lead leg kicked out from under him, forward and up, nearly straight; the
  // rear foot dragged off its mark, low and forward; the hips dropping back over nothing, the
  // chest tipping back, the chin tucked; the lead arm flung up and forward, the rear one thrown
  // back and down for the floor, hands open.
  {
    hip: at(-9, 28),
    torso: -36,
    head: 17,
    shrug: 0,
    twist: 0.3,
    nearFoot: { x: 25, y: 14.5, angle: 45 },
    // Dragged on its heel, the toes up only as far as the ankle flexes.
    farFoot: { x: -3, y: 5.2, angle: 6 },
    nearFist: at(-5, 65.1),
    farFist: at(-25.8, 20.2),
    bends: { nearElbow: 'down', farElbow: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
    effects: [dust(-17, 2.6, 0.15)],
  },
  // 1 · Off his feet: the body pivots back around the hips, the feet leading the swing up
  // after the hooked ankle, the knees open; the lead arm still up, the rear one reaching back
  // for the floor, the chin tucked.
  {
    hip: at(-10, 23),
    torso: -46,
    head: 26,
    shrug: 0,
    twist: 0.2,
    nearFoot: { x: 18, y: 30, angle: 50 },
    farFoot: { x: 14, y: 26, angle: 40 },
    nearFist: at(-11.7, 59.5),
    farFist: at(-24.3, 12.5),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
    effects: [dust(-17, 2.6, 0.55)],
  },
  // 2 · Nearly flat, falling, the legs up, the arms swinging down for the floor.
  {
    hip: at(-9.6, 15.5),
    torso: -64,
    head: 26,
    shrug: 0,
    nearFoot: { x: 8, y: 30, angle: 51 },
    farFoot: { x: 13, y: 24, angle: 48 },
    nearFist: at(-4.4, 28.7),
    farFist: at(-12.2, 6.4),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
    effects: [dust(-17, 2.6, 0.9)],
  },
  // 3 · Just above the floor (held through the flight): the palms out to slap it, the chin
  // tucked, the legs riding up; the knockdown's impact slams him down from here.
  {
    hip: at(-10, 10),
    torso: -76,
    head: 28,
    shrug: 0,
    nearFoot: { x: 5, y: 28, angle: 63 },
    farFoot: { x: 12.5, y: 23, angle: 61 },
    nearFist: at(-9.7, 4),
    farFist: at(-7.5, 9.2),
    bends: { nearElbow: 'down', farElbow: 'down', nearKnee: 'up', farKnee: 'up' },
    nearHand: 'open',
    farHand: 'open',
    face: 'hurt',
  },
];
