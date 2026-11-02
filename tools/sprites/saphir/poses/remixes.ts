import type { Effect, Glow, Pose } from '../../skeleton.ts';
import { at } from './common.ts';
import { POSES as SYNCOPE } from './special.ts';
import { POSES as CONTRE_UT } from './specialAntiAir.ts';
import { POSES as RUBATO } from './specialForward.ts';

/**
 * Saphir's Remixes, their own strips (docs/art/passation-personnages.md §2.3, point 6; as Nayo's,
 * docs/art/nayo-essence.md §5): the Syncope, the Rubato and the Contre-ut at their special's
 * timing (the frame data is the same, D18), drawn in the Boost's light: every effect in
 * platine, every light white, and more of them, the heel loaded white before the blow, the
 * Boost bursting where it lands.
 */

/** What a Remix adds to a frame of its special, drawn in platine with the rest. */
interface RemixFrame {
  readonly effects?: readonly Effect[];
  readonly glows?: readonly Glow[];
}

/** An effect in the Boost's platine; the floor's dust and the guard's arc stay as they are. */
function platine(effect: Effect): Effect {
  return effect.kind === 'dust' || effect.kind === 'shield'
    ? effect
    : { ...effect, tone: 'platine' };
}

/** The poses of a special as its Remix plays them, with what each frame adds. */
function remixOf(poses: readonly Pose[], extra: Readonly<Record<number, RemixFrame>>): Pose[] {
  return poses.map((pose, frame) => {
    const more = extra[frame];
    const effects = [...(pose.effects ?? []), ...(more?.effects ?? [])].map(platine);
    const glows = [...(pose.glows ?? []), ...(more?.glows ?? [])].map((glow): Glow => ({
      ...glow,
      tone: 'platine',
    }));
    return {
      ...pose,
      ...(effects.length > 0 ? { effects } : {}),
      ...(glows.length > 0 ? { glows } : {}),
    };
  });
}

const energy = (x: number, y: number, radius: number): Effect => ({
  kind: 'energy',
  center: at(x, y),
  radius,
});
const flash = (x: number, y: number, radius: number): Effect => ({
  kind: 'flash',
  center: at(x, y),
  radius,
  tone: 'platine',
});

export const REMIXES = {
  // Syncope forte: the heel loaded white as it rises, the crescent lit over her head and turning
  // in the grooves of a record, a white flash and cut shards where it lands.
  specialRemix: remixOf(SYNCOPE, {
    2: { effects: [energy(16, 30, 3.4)] },
    3: {
      effects: [
        { kind: 'grooves', center: at(12, 37.5), radius: 22, from: 20, to: 110, progress: 0.2 },
      ],
      glows: [{ center: at(22, 66), reach: 30, power: 1.3, tone: 'platine' }],
    },
    4: {
      effects: [
        flash(54, 42, 4.5),
        { kind: 'shards', center: at(50, 42), radius: 9, progress: 0.2, tone: 'platine' },
      ],
    },
  }),
  // Rubato forte: the lunge charged white, a light under the gliding foot, a flash and a ring
  // where the kick lands.
  specialForwardRemix: remixOf(RUBATO, {
    2: { effects: [energy(0, 31, 3)] },
    3: { glows: [{ center: at(20, 20), reach: 24, power: 1.1, tone: 'platine' }] },
    4: {
      effects: [
        flash(52, 47, 4.5),
        { kind: 'ring', center: at(46, 46), radius: 8, progress: 0.2, tone: 'platine' },
      ],
    },
  }),
  // Contre-ut forte: the foot gathered white in the dip, the leg lit up its whole length, a
  // flash at the top and two notes flying off it.
  specialAntiAirRemix: remixOf(CONTRE_UT, {
    0: { effects: [energy(10, 8, 3.4)] },
    1: { glows: [{ center: at(17, 66), reach: 30, power: 1.1, tone: 'platine' }] },
    2: {
      effects: [flash(18, 100, 4), { kind: 'notes', center: at(12, 94), count: 2, progress: 0.2 }],
    },
  }),
} as const;
