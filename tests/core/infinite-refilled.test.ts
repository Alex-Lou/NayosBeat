import { describeBeamSearch } from './beam-search';

/**
 * No infinite with a gauge refilled on every tick (docs/combos-v3.md §1.13): the beam search, a
 * slow test.
 */
describeBeamSearch('refilled');
