import { BOOST_BAR } from '../../src/core/rules';
import { describeBeamSearch } from './beam-search';

/** No infinite with three bars (docs/combos-v3.md §1.13): the beam search, a slow test. */
describeBeamSearch(3 * BOOST_BAR);
