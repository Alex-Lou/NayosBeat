import { at, energy, GUARD, lifted, planted, smear, type Effect, type Pose } from './common.ts';

/**
 * intro: 10 frames, 10,8,8,8,10,8,8,10,10,10 ticks (90 ticks).
 * Based on `Pack_Feline_Portails_Coups_Speciaux/01_Portail_Vertical_Creation_Entree` and
 * `Pack_Feline_Poses_Et_Degats/01_intro`:
 * Feline steps out of a tall vertical silver-white dimensional portal (`kind: 'portal'`), crosses
 * her arms in a confident stance (`intro_04_bras_croises`), shatters the portal in an 8-point
 * orbital star burst (`kind: 'star'`), gives a feline salute (`intro_03_salue`) with an orbital
 * crescent blade (`kind: 'blade'`), and sinks into her boxer-kickboxer guard (`poing_01_garde`).
 */

const vPortal = (rx: number, ry: number, beams = false): Effect => ({
  kind: 'portal',
  center: at(-5, 44),
  rx,
  ry,
  beams,
  tone: 'sound',
});

const STAND: Pose = {
  hip: at(-4.0, 40.2),
  torso: 3,
  head: 5,
  shrug: 1.0,
  nearFoot: GUARD.nearFoot,
  farFoot: planted(-10.0),
  nearFist: at(7.5, 53.0),
  farFist: at(9.5, 54.0),
  nearHand: 'fist',
  farHand: 'fist',
  bends: { nearElbow: 'down', farElbow: 'down' },
  face: 'cool',
};

// 0-2: Emerging from the vertical silver-white dimensional portal, arms crossed (`intro_04_bras_croises`).
const PORTAL_1: Pose = {
  ...STAND,
  effects: [vPortal(6, 20), energy(9.0, 53.5, 2.8)],
  glows: [{ center: at(-2, 46), reach: 28, power: 1.0, tone: 'sound' }],
};

const PORTAL_2: Pose = {
  ...STAND,
  hip: at(-4.2, 39.6),
  torso: 5,
  shrug: 1.8,
  nearFist: at(8.5, 54.5),
  farFist: at(10.5, 55.0),
  effects: [vPortal(7, 22, true), energy(9.5, 54.5, 3.6)],
  glows: [{ center: at(2, 50), reach: 30, power: 1.2, tone: 'sound' }],
};

const PORTAL_3: Pose = {
  ...PORTAL_2,
  hip: at(-4.4, 39.0),
  torso: 7,
  shrug: 2.4,
  face: 'smirk',
  effects: [vPortal(8, 23, true), { kind: 'star', center: at(10, 55), radius: 4.5, tone: 'sound' }],
  glows: [{ center: at(6, 52), reach: 32, power: 1.3, tone: 'sound' }],
};

// 3-4: Shattering the portal in an 8-point orbital star burst (`intro_01_pose_assuree`).
const BURST: Pose = {
  ...STAND,
  hip: at(-3.5, 40.8),
  torso: -2,
  head: 6,
  shrug: 2.2,
  twist: 0.45,
  nearFist: at(-7.5, 43.0),
  farFist: at(14.5, 68.0),
  bends: { nearElbow: 'back', farElbow: 'down' },
  face: 'kiai',
  effects: [
    smear(3.5, [8.5, 54.5], [1, 48], [-7.5, 43]),
    smear(3.5, [10.5, 55], [12.5, 62], [14.5, 68]),
    { kind: 'star', center: at(10, 55), radius: 6.0, rings: true, tone: 'sound' },
    { kind: 'shards', center: at(10, 55), radius: 16, progress: 0.25, tone: 'sound' },
  ],
  glows: [{ center: at(10, 55), reach: 34, power: 1.4, tone: 'sound' }],
};

const AFTERGLOW: Pose = {
  ...BURST,
  hip: at(-3.8, 40.5),
  torso: 0,
  head: 5,
  nearFist: at(-8.5, 42.0),
  farFist: at(13.5, 70.0),
  face: 'smirk',
  effects: [
    { kind: 'blade', center: at(6, 54), rx: 14, ry: 6, tilt: -22, twin: true, tone: 'sound' },
    { kind: 'shards', center: at(10, 56), radius: 20, progress: 0.65, tone: 'sound' },
  ],
  glows: [{ center: at(12, 64), reach: 24, power: 0.8, tone: 'sound' }],
};

// 5-6: Confident feline salute (`intro_03_salue`), orbital blade spinning around her hand.
const SALUTE: Pose = {
  ...STAND,
  hip: at(-4.2, 39.8),
  torso: 6,
  head: 4,
  shrug: 1.4,
  twist: 0.25,
  nearFist: at(13.5, 55.0),
  farFist: at(5.5, 61.0),
  nearHand: 'open',
  effects: [
    smear(3, [-4, 43], [6, 49], [13.5, 55]),
    { kind: 'blade', center: at(12, 54), rx: 10, ry: 4.5, tilt: -18, tone: 'sound' },
  ],
};

const POISE: Pose = {
  ...SALUTE,
  hip: at(-4.5, 39.4),
  torso: 8,
  nearFist: at(12.5, 54.0),
  farFist: at(6.0, 60.8),
  effects: [{ kind: 'star', center: at(13.5, 54.5), radius: 3.8, tone: 'sound' }],
};

// 7-9: Stepping back into her springy feline boxer-kickboxer guard (`poing_01_garde.png`).
const STEP_BACK: Pose = {
  ...GUARD,
  hip: at(-5.4, 38.0),
  torso: 10,
  head: 4,
  farFoot: lifted(planted(-16.0, -10), 1.4),
  nearFist: at(10.5, 53.5),
  farFist: at(11.5, 58.5),
  face: 'cool',
};

const SINK: Pose = {
  ...GUARD,
  hip: at(-6.8, 35.8),
  torso: 14,
  head: 2,
  nearFist: at(8.8, 51.8),
  farFist: at(11.8, 58.0),
  effects: [{ kind: 'dust', x: -20, size: 2.5, progress: 0.4 }],
};

export const POSES: readonly Pose[] = [
  PORTAL_1,
  PORTAL_2,
  PORTAL_3,
  BURST,
  AFTERGLOW,
  SALUTE,
  POISE,
  STEP_BACK,
  SINK,
  GUARD,
];
