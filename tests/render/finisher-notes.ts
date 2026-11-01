import type { FinisherNote } from '../../src/render/training-combo';

/** Every note the training's combo line can write of its super (docs/finisher.md §1.12). */
export const NOTES: readonly FinisherNote[] = [
  { kind: 'finisher' },
  { kind: 'start' },
  { kind: 'room' },
  { kind: 'air' },
  { kind: 'trade' },
  { kind: 'blocked' },
  { kind: 'reach' },
  { kind: 'bars', bars: 0 },
  { kind: 'bars', bars: 1 },
  { kind: 'bars', bars: 2 },
];
