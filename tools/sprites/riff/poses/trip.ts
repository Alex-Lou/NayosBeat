import { at, type Pose } from './common.ts';
import { BRACED, dust, figure } from './knockdown.ts';

export const ANIMATED: boolean = true;

/**
 * trip (docs/combat-v2.md §9.4, §11.1): 4 frames, 2, 2, 2 ticks, the last held through the
 * 7-tick flight. Swept off her feet (sweeps, the Windmill, a Glissade: lifted at only 2 px a
 * tick), she falls back seat first; the knockdown follows.
 *
 * - 0, through the hitstop: the legs go. The sweep kicks the lead leg out from under her,
 *   forward and up, nearly straight, the boot flipped toes up; the rear knee buckles forward and
 *   down under her, the rear boot left on its mark, its toe dragging on the floor where the dust
 *   rises; the hips drop back over nothing, the chest tips back, the chin tucked (the head stays
 *   the source drawing, hurt). The arms fly the other way for balance: the lead one forward, the
 *   rear one back and down.
 * - 1: off her feet: the body pivots back around the hips, both boots swinging up after the
 *   hooked ankle, the knees bent, the lead arm flung straight up, the rear one reaching back.
 * - 2: still turning back as she drops: the head lagging back (RotSprite past 20 degrees), the
 *   legs rising on, the rear arm flung back level, the lead one still up.
 * - 3, held: BRACED (knockdown.ts), the last pixels before the seat hits: the chin tucked for
 *   the landing, the rear hand reaching down for the floor, the lead arm thrown forward.
 *
 * One turn, never reversed: the torso tips back 22, 34, 46, then 54 degrees (and 60, 84 in the
 * knockdown), the hips sink 26, 20, 15, 10, and the thighs rise on (35, 50, 56 for the rear one)
 * while the boots hold their height as she drops: they never fall and kick up again. Only the
 * swept lead foot goes out in front, on the frame the sweep takes it; once she falls, the poses
 * stretch back (the head toward negative x) and the legs swing up, never out into the attacker.
 * The lead arm stays clear of the head (never a few pixels of skin by the hair). The height of
 * the flight comes from the engine: the poses stay anchored.
 */

/** 0: the lead leg swept out from under her, the rear knee buckling, the hips dropping back. */
const SWEPT: Pose = figure({
  hip: at(-8.5, 26),
  torso: -22,
  head: 18,
  shrug: 0,
  twist: 0.6,
  nearFoot: { x: -18.5, y: 8, angle: -35 },
  bends: { nearKnee: 'front' },
  nearArm: { upper: 220, lower: 250 },
  farArm: { upper: 22, lower: 45 },
  farLeg: { upper: 12, lower: 4, toes: 60 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [dust(10, 3.5, 0.15), dust(-17, 2.6, 0.15)],
});

/** 1: off her feet, pivoting back around the hips, the boots swinging up, the lead arm flung up. */
const OFF: Pose = figure({
  hip: at(-9.5, 20),
  torso: -34,
  head: 20,
  shrug: 0,
  twist: 0.5,
  nearArm: { upper: 215, lower: 250 },
  farArm: { upper: 88, lower: 108 },
  nearLeg: { upper: 35, lower: 20, toes: 50 },
  farLeg: { upper: 45, lower: 30, toes: 60 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [dust(10, 3.5, 0.55), dust(-17, 2.6, 0.55)],
});

/** 2: falling, still turning back, the legs rising, the rear hand going back for the floor. */
const FALLING: Pose = figure({
  hip: at(-9.5, 15),
  torso: -46,
  head: 14,
  shrug: 0,
  twist: 0.45,
  nearArm: { upper: 195, lower: 212 },
  farArm: { upper: 96, lower: 118 },
  nearLeg: { upper: 50, lower: 22, toes: 40 },
  farLeg: { upper: 54, lower: 25, toes: 45 },
  nearHand: 'open',
  farHand: 'open',
  face: 'hurt',
  effects: [dust(10, 3.5, 0.9), dust(-17, 2.6, 0.9)],
});

export const POSES: readonly Pose[] = [SWEPT, OFF, FALLING, BRACED];
