/**
 * Nayo's Remixes (docs/art/nayo-essence.md §5): the Vinyle, the Pied fendu and the Uppercut in the
 * Boost's light, each frame of its special in platine, with what the Remix adds: the gauge spent
 * shows as more charge before the blow, and a white flash where it lands.
 */

import { at, energy } from './common.ts';
import { remixOf } from './remix.ts';
import { POSES as VINYLE } from './special.ts';
import { DIP_FIST, POSES as UPPERCUT } from './specialAntiAir.ts';
import { CHAMBER_HEEL, POSES as PIED_FENDU } from './specialForward.ts';

/** Where a pose's first effect of `kind` is, to charge it further. */
function centerOf(frame: number, kind: 'disc'): { x: number; y: number } {
  const effect = VINYLE[frame]?.effects?.find((each) => each.kind === kind);
  if (effect?.kind !== kind) throw new Error(`Vinyle frame ${frame}: no ${kind}`);
  return effect.center;
}

const RECORD = [1, 2, 3].map((frame) => centerOf(frame, 'disc'));

export const REMIXES = {
  // The record charged white from the moment it comes out, a white flash where it leaves the hand.
  specialRemix: remixOf(VINYLE, {
    1: { effects: [energy(RECORD[0]?.x ?? 0, RECORD[0]?.y ?? 0, 3.4)] },
    2: { effects: [energy(RECORD[1]?.x ?? 0, RECORD[1]?.y ?? 0, 4.2)] },
    3: { glows: [{ center: RECORD[2] ?? at(0, 0), reach: 34, power: 1.4, tone: 'platine' }] },
    4: { effects: [{ kind: 'flash', center: at(22, 43), radius: 4.5, tone: 'platine' }] },
  }),
  // The heel loaded white in the chamber, a ring of the Boost where it lands.
  specialForwardRemix: remixOf(PIED_FENDU, {
    2: { effects: [energy(CHAMBER_HEEL.x, CHAMBER_HEEL.y, 3.4)] },
    3: { glows: [{ center: at(29, 42), reach: 24, power: 1.1, tone: 'platine' }] },
    4: {
      effects: [{ kind: 'ring', center: at(42, 37), radius: 8, progress: 0.2, tone: 'platine' }],
    },
  }),
  // The drop gathered white in the sunk fist, a second flash up the column.
  specialAntiAirRemix: remixOf(UPPERCUT, {
    0: { effects: [energy(DIP_FIST.x + 1, DIP_FIST.y - 1, 4)] },
    2: { glows: [{ center: at(18, 70), reach: 30, power: 1, tone: 'platine' }] },
  }),
} as const;
