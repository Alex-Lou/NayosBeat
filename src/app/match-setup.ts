import type { CpuBehavior, CpuLevel } from '../ai/cpu';
import type {
  MatchConfig,
  TrainingDummyHealth,
  TrainingFinisher,
  TrainingGauge,
  TrainingStart,
} from '../core/config';
import { templateOf, type FighterId } from '../data/roster';
import { TRAINING_STAGE } from '../data/stages';

export type GameMode = 'cpu' | 'versus' | 'training';
export type DummyBehavior = 'dummyStand' | 'dummyBlock' | CpuLevel;

/** Everything chosen in the menus before a fight. */
export interface MatchSetup {
  readonly mode: GameMode;
  readonly fighters: readonly [FighterId, FighterId];
  readonly cpuLevel: CpuLevel;
  readonly dummy: DummyBehavior;
  /** Training only: the Boost gauge (docs/combos-v3.md §6.5). */
  readonly gauge: TrainingGauge;
  /** Training only: the Finisher (docs/finisher.md §1.12). */
  readonly finisher: TrainingFinisher;
  /** Training only: the health the dummy refills to, in percent (docs/finisher.md §1.12). */
  readonly dummyHealth: TrainingDummyHealth;
  /** Training only: where it starts, and starts over (docs/combat-v2.md D32). */
  readonly position: TrainingStart;
}

export const DEFAULT_SETUP: MatchSetup = {
  mode: 'cpu',
  fighters: ['nayo', 'riff'],
  cpuLevel: 'normal',
  dummy: 'dummyStand',
  // Full by default: the Boost moves can be tried at once.
  gauge: 'full',
  finisher: 'match',
  dummyHealth: 100,
  position: 'center',
};

/**
 * The Finisher in training (docs/finisher.md §1.12), in the order the option cycles: as in a
 * match (the match point played as reached), always ready, or off (back + BOOST, the plain super).
 */
export const TRAINING_FINISHERS: readonly {
  readonly finisher: TrainingFinisher;
  readonly label: string;
}[] = [
  { finisher: 'match', label: 'comme en match' },
  { finisher: 'always', label: 'toujours prêt' },
  { finisher: 'off', label: 'désactivé' },
];

/** The health the dummy refills to (docs/finisher.md §1.12), in the order the option cycles. */
export const DUMMY_HEALTHS: readonly TrainingDummyHealth[] = [100, 50, 30, 10];

export function matchConfigOf(setup: MatchSetup): MatchConfig {
  const training = setup.mode === 'training';
  return {
    stage: TRAINING_STAGE,
    fighters: [templateOf(setup.fighters[0]), templateOf(setup.fighters[1])],
    training,
    ...(training && {
      trainingGauge: setup.gauge,
      trainingFinisher: setup.finisher,
      trainingDummyHealth: setup.dummyHealth,
      trainingStart: setup.position,
    }),
  };
}

/** Who controls player 2: a human, or the CPU with some behavior. */
export function player2Behavior(setup: MatchSetup): CpuBehavior | 'human' {
  switch (setup.mode) {
    case 'versus':
      return 'human';
    case 'cpu':
      return setup.cpuLevel;
    case 'training':
      return setup.dummy;
  }
}
