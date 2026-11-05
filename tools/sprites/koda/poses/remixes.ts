/**
 * Koda's Remixes: the Diapason, the Fente d'acier and the Cymbale in the Boost's platine light,
 * each frame of its special charged with white resonance energy and a white impact flash.
 */

import { at, energy } from './common.ts';
import { remixOf } from './remix.ts';
import { BRACER_CLASH, POSES as DIAPASON } from './special.ts';
import { DIP_FIST, POSES as CYMBALE } from './specialAntiAir.ts';
import { CHAMBER_BRACER, POSES as FENTE_ACIER } from './specialForward.ts';

export const REMIXES = {
  // Diapason platine: the silver bracers glow white from the coil, bursting on the clash.
  specialRemix: remixOf(DIAPASON, {
    1: { effects: [energy(10, 48, 3.4)] },
    2: {
      effects: [energy(BRACER_CLASH.x, BRACER_CLASH.y, 4.4)],
      glows: [{ center: BRACER_CLASH, reach: 34, power: 1.4, tone: 'platine' }],
    },
    3: { effects: [{ kind: 'flash', center: at(40, 44.5), radius: 5.5, tone: 'platine' }] },
  }),
  // Fente platine: the chambered silver bracer charged white, a Boost ring where the palm pierces.
  specialForwardRemix: remixOf(FENTE_ACIER, {
    1: { effects: [energy(CHAMBER_BRACER.x, CHAMBER_BRACER.y, 3.6)] },
    3: { glows: [{ center: at(30, 42), reach: 26, power: 1.1, tone: 'platine' }] },
    4: {
      effects: [{ kind: 'ring', center: at(41, 41.5), radius: 9, progress: 0.2, tone: 'platine' }],
    },
  }),
  // Cymbale platine: white resonance gathered in the crouched bracers, rising up the skyward slash.
  specialAntiAirRemix: remixOf(CYMBALE, {
    0: { effects: [energy(DIP_FIST.x + 1, DIP_FIST.y - 1, 4)] },
    2: { glows: [{ center: at(18, 70), reach: 30, power: 1, tone: 'platine' }] },
  }),
} as const;
