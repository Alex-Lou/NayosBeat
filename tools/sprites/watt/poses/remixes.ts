import type { Effect, Glow, Pose } from '../../skeleton.ts';
import { at } from './common.ts';
import { POSES as COUP_DE_JUS } from './special.ts';
import { POSES as PLAFONNIER } from './specialAntiAir.ts';
import { POSES as SURCHARGE } from './specialForward.ts';

/**
 * Watt's Remixes « survoltés », their own strips (as Nayo's and Saphir's): the Coup de jus, the
 * Surcharge and the Plafonnier at their special's timing (D18), drawn in the Boost's light: every
 * effect in platine, every light white, and more of them, the clamps and shoulder plate loaded
 * white before the blow, the Boost bursting where it lands.
 */

interface RemixFrame {
  readonly effects?: readonly Effect[];
  readonly glows?: readonly Glow[];
}

function platine(effect: Effect): Effect {
  return effect.kind === 'dust' || effect.kind === 'shield'
    ? effect
    : { ...effect, tone: 'platine' };
}

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
  // Coup de jus survolté: both clamps charged white as he steps in, a white flash and shards at
  // the discharge.
  specialRemix: remixOf(COUP_DE_JUS, {
    2: {
      effects: [energy(14, 48, 3.2)],
      glows: [{ center: at(14, 48), reach: 26, power: 1.1, tone: 'platine' }],
    },
    3: {
      effects: [energy(24, 46, 3.8)],
      glows: [{ center: at(24, 46), reach: 30, power: 1.3, tone: 'platine' }],
    },
    4: {
      effects: [
        flash(39, 46, 5),
        { kind: 'shards', center: at(37, 46), radius: 9, progress: 0.25, tone: 'platine' },
      ],
      glows: [{ center: at(36, 46), reach: 36, power: 1.4, tone: 'platine' }],
    },
  }),
  // Surcharge survoltée: the shoulder plate lit white through the whole rush, a ring and flash on
  // impact.
  specialForwardRemix: remixOf(SURCHARGE, {
    2: {
      effects: [energy(10, 54, 3.2)],
      glows: [{ center: at(10, 54), reach: 26, power: 1.1, tone: 'platine' }],
    },
    3: {
      effects: [energy(12, 58, 3.6)],
      glows: [{ center: at(12, 58), reach: 30, power: 1.3, tone: 'platine' }],
    },
    4: {
      effects: [
        flash(18, 58, 5),
        { kind: 'ring', center: at(18, 58), radius: 9, progress: 0.2, tone: 'platine' },
      ],
      glows: [{ center: at(16, 58), reach: 36, power: 1.4, tone: 'platine' }],
    },
  }),
  // Plafonnier survolté: the clamps gathered white in the crouch, lit up the rise, a flash and
  // ring above the bulb.
  specialAntiAirRemix: remixOf(PLAFONNIER, {
    0: {
      effects: [energy(6, 46, 3.4)],
      glows: [{ center: at(6, 46), reach: 24, power: 1.1, tone: 'platine' }],
    },
    1: {
      glows: [{ center: at(9, 68), reach: 30, power: 1.2, tone: 'platine' }],
    },
    2: {
      effects: [
        flash(13, 80, 4.5),
        {
          kind: 'ring',
          center: at(12, 78),
          radius: 8,
          progress: 0.2,
          squash: 0.5,
          tone: 'platine',
        },
      ],
      glows: [{ center: at(13, 80), reach: 34, power: 1.4, tone: 'platine' }],
    },
  }),
} as const;
