import { BOOST_BAR } from '../../src/core/rules';
import { describeBeamSearch } from './beam-search';

/** No infinite with one bar (docs/combos-v3.md §1.13): the beam search, a slow test. */
describeBeamSearch(BOOST_BAR);
