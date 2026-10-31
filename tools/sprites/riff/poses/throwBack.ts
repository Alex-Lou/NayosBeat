import { at, GUARD, onBall, planted, smear, toeOf, type Pose } from './common.ts';
import { HOLD, LEAD_IN, REAR_TOE } from './hold.ts';
import { dust, SETTLE, shown } from './throwForward.ts';

export const ANIMATED: boolean = true;

/**
 * throwBack (Roulade, docs/combat-v2.md §4.3, §11.3): 8 frames, 3, 3, 4, 4, [1], 8, 8, 9 ticks
 * (40); the sides switch on tick 6, the release is frame 4 (tick 14). From hold: a monkey flip,
 * the judoka's tomoe nage done the b-girl's way: she sits back, plants a boot in his belly,
 * kicks him up over her head while she drops under him, and rolls back; he lands about 66 px
 * behind her. Back to the guard through a kip-up.
 *
 * Nayo's thrownBack plays its frames 0-3 with hers (ticks 0-2, 3-5, 6-9, 10-13): yanked down in
 * front of her (+27), heaved face down above her, upside down above her (behind her, -27.5,
 * from tick 6), then dumped down behind her. His collar sits at about (23, 51.5), (6, 64),
 * (-5, 65) and (-25.5, 25) here; his hanging head at about (-14, 60) on frame 2 and (-18, 23) on
 * frame 3. That arc was drawn for a standing thrower, so her poses are staged around it: she
 * stays under him and her face stays clear of his head on every frame.
 *
 * The line of action is one curve: the hips sit back and down (0), then slide forward and down
 * under him (1, 2, 3: the tomoe nage drop, her hips end where his feet were) while the spine
 * tips back from upright (0) to -30 (1), -42 (2) and onto her back (3), the head going back and
 * down ahead of the hips; the kick-up and the kip bring her back over her feet. The rear leg is
 * drawn under the torso (look.ts): with the spine tipped back and the hips slid in under it, the
 * rear knee stays clear of the chest (about 10 px in front of the spine, the hip bent under 135
 * degrees), so the thigh shows from the hip to the knee and the boot never seems to grow out of
 * her chest.
 *
 * - 0: the sit. She hauls the collar down and sits back off the lead foot, the rear boot rising
 *   sole first for his belly, the knee lifted in front of the hip.
 * - 1: the load. Squatting under him, the torso tipped well back, both fists up at his collar,
 *   the rear boot planted in his belly, the knee bent under it in front of her belly: he comes
 *   over face down.
 * - 2: the kick (the sides switch). The torso tips back further and the rear leg drives up
 *   straight into him and throws him over the top (a magenta trail on the boot's arc); the lead
 *   fist keeps the collar, the rear hand lets go and swings back for the floor (the near arm is
 *   drawn over the head: up at the collar it would cover her face).
 * - 3: the roll. Dropped onto her back under him in a tight back-rock: knees to the chest, chin
 *   tucked, her head down on the floor below his hanging head, the lead fist still on his
 *   collar, the rear hand flat on the floor; dust where her back lands.
 * - 4 (1 tick, the release): rocked over onto the shoulders, the hips up, the legs up over her,
 *   the hands flying open behind her head; speed lines where he leaves, up and back.
 * - 5: the kip's thrust (a no-hands kip). The head and the top of the back on the floor, the
 *   hips arched up off it, the legs snapping forward and down (a magenta trail along the boots),
 *   the arms whipped down along her body to the hips after them, the hands open.
 * - 6: the landing. Popped onto her feet in a deep plié, the chest still coming up from the kip,
 *   the fists thrown forward; a trail up from the floor, dust under the boots.
 * - 7: the guard, a hair low (throwForward's settle).
 *
 * The bodies on the floor are authored as they show (`shown`): the head turns past 20 degrees
 * only while she is on her back.
 */

// Frame 0 (3 ticks): the sit. The fists haul the collar down, the hips sit back and down off the
// lead foot, the torso tips back upright; the rear boot rises sole first for his belly, the knee
// lifted in front of the hip, the thigh about 60 degrees up (over an upright chest, a knee any
// higher would fold the thigh into the belly), the shin slanting down to the boot.
const SIT: Pose = {
  ...HOLD,
  hip: at(-2.5, 24),
  torso: 1,
  head: 0,
  shrug: 3,
  twist: 0.5,
  reach: { near: 3, far: 1 },
  nearFoot: { x: 16.5, y: 28.5, angle: 62 },
  farFoot: planted(LEAD_IN),
  nearFist: at(18.5, 50),
  farFist: at(20.5, 46.5),
  bends: { nearKnee: 'up', farKnee: 'front' },
  face: 'effort',
};

// Frame 1 (3 ticks): the load. Squatting deep under him, the torso tipped back 30 degrees and the
// hips slid in under it, both fists up at his collar; the rear knee up in front of her belly,
// clear of the chest (the thigh shows), the shin rising from it to the boot planted sole up in
// his belly (the knee bends the right way, the ankle square). The head stays the source drawing
// (-18 on screen).
const LOAD: Pose = {
  ...HOLD,
  hip: at(3, 26),
  torso: -30,
  head: 12,
  shrug: 3,
  twist: 0.6,
  reach: { near: 3, far: 1.5 },
  nearFoot: { x: 19, y: 50, angle: 130 },
  farFoot: planted(LEAD_IN),
  nearFist: at(4.5, 61.5),
  farFist: at(6, 62.5),
  bends: { nearKnee: 'up', farKnee: 'front' },
  face: 'effort',
};

// Frame 2 (4 ticks, the sides switch on tick 6): the kick. The hips drive in under him, the
// torso tips back to 42 degrees, the rear leg drives up into him nearly straight from a knee
// well clear of the chest, the sole flat under his belly (a trail on the boot's arc); the lead
// heel comes up, the knee over the toes; the lead fist keeps the collar overhead, the elbow
// soft; the rear hand lets go and reaches down and back for the floor, the arm long (behind her
// hip, never up behind her back). The head stays the source drawing (-18 on screen).
const KICK: Pose = {
  ...HOLD,
  hip: at(10, 23),
  torso: -42,
  head: 24,
  shrug: 3,
  twist: 0.5,
  reach: { near: 3, far: 1.5 },
  nearFoot: { x: 19.6, y: 51.5, angle: 158 },
  farFoot: onBall(toeOf(planted(LEAD_IN)), -50),
  nearFist: at(-6, 17.8),
  farFist: at(-3, 58),
  nearHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'front', nearElbow: 'back', farElbow: 'front' },
  face: 'effort',
  effects: [smear(5, [17, 40], [21, 47], [21, 56])],
};

// Frame 3 (4 ticks): the roll. On her back in a tight back-rock, the knees to the chest, the
// chin tucked, the head on the floor below his; the lead fist on his collar, the rear arm along
// her side, the elbow on the floor and the hand flat by her hip. Dust where her back lands.
const ROLL: Pose = shown({
  ...GUARD,
  hip: at(19, 11),
  turn: -95,
  torso: 0,
  head: 15,
  shrug: 2,
  twist: 0.3,
  nearFoot: { x: 15, y: 32, angle: 120 },
  farFoot: { x: 20, y: 30, angle: 110 },
  nearFist: at(18.5, 4.5),
  farFist: at(-21, 19),
  nearHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'up', nearElbow: 'up' },
  face: 'effort',
  effects: [dust(6, 4, 0.15)],
});

// Frame 4 (1 tick, the release): rocked over onto the shoulders, the hips and legs up, the hands
// flung open after him, up and back past her head, the arms long; speed lines where he leaves.
const RELEASE: Pose = shown({
  ...GUARD,
  hip: at(14, 29),
  turn: -128,
  torso: 0,
  head: 22,
  shrug: 2,
  twist: 0.3,
  nearFoot: { x: 3, y: 47, angle: 150 },
  farFoot: { x: 8, y: 49, angle: 140 },
  nearFist: at(-17.5, 25),
  farFist: at(-21.5, 32.5),
  nearHand: 'open',
  farHand: 'open',
  bends: { nearKnee: 'up', farKnee: 'up', nearElbow: 'down', farElbow: 'down' },
  effects: [
    { kind: 'speed', center: at(-42, 30), length: 12, spread: 8, direction: 160, tone: 'strike' },
  ],
});

// Frame 5 (8 ticks): the kip's thrust. A b-girl's no-hands kip-up: on her back the arms cannot
// reach the floor beyond the head without going through it, so the head and the top of the back
// take the floor (the head just on it, the chin tucked) while the hips arch up off it and the
// legs snap forward and down, the boots flexed for the landing; the arms, flung back past her
// head on the release, whip down along her body after the legs, nearly straight, the open hands
// at her hips (they throw the kip; the next frame carries them on forward, fists up).
const KIP: Pose = shown({
  ...GUARD,
  hip: at(12.5, 25),
  turn: -120,
  torso: 0,
  head: 40,
  shrug: 2.4,
  twist: 0.4,
  nearFoot: { x: 30, y: 16, angle: -13 },
  farFoot: { x: 34, y: 21, angle: 15 },
  nearFist: at(14, 19),
  farFist: at(15, 22.5),
  nearHand: 'open',
  farHand: 'open',
  bends: { nearKnee: 'front', farKnee: 'front', nearElbow: 'up', farElbow: 'up' },
  face: 'effort',
  effects: [smear(5, [6, 40], [22, 34], [30, 18])],
});

// Frame 6 (8 ticks): the landing. On her feet in a deep plié, the rear heel high and the rear
// knee driven forward over its toes as in her crouch, the chest still coming up from the kip,
// the fists thrown forward; a trail up from the floor, dust under the boots.
const LAND: Pose = shown({
  ...GUARD,
  hip: at(0, 21),
  turn: -18,
  torso: 0,
  head: 10,
  shrug: 2.6,
  twist: 0.4,
  nearFoot: onBall(REAR_TOE + 10, -75),
  farFoot: planted(11),
  nearFist: at(6, 30),
  farFist: at(13, 31),
  bends: { nearKnee: 'front', farKnee: 'front' },
  face: 'effort',
  effects: [smear(5, [-14, 8], [-12, 20], [-6, 30]), dust(11, 4, 0.2), dust(-7, 3, 0.2)],
});

// Frame 7 (9 ticks): the guard, a hair low.
export const POSES: readonly Pose[] = [SIT, LOAD, KICK, ROLL, RELEASE, KIP, LAND, SETTLE];
