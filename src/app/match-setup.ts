import type { CpuBehavior, CpuLevel } from '../ai/cpu';
import type { MatchConfig } from '../core/config';
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
}

export const DEFAULT_SETUP: MatchSetup = {
  mode: 'cpu',
  fighters: ['nayo', 'riff'],
  cpuLevel: 'normal',
  dummy: 'dummyStand',
};

export function matchConfigOf(setup: MatchSetup): MatchConfig {
  return {
    stage: TRAINING_STAGE,
    fighters: [templateOf(setup.fighters[0]), templateOf(setup.fighters[1])],
    training: setup.mode === 'training',
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
