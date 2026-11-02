import { describe, expect, it } from 'vitest';
import { routeOf } from '../../src/net/route';

/** A stats report whose pair in use joins candidates of these kinds. */
function stats(local: string, remote: string, selected: 'transport' | 'nominated') {
  return [
    ...(selected === 'transport'
      ? [{ id: 'T1', type: 'transport', selectedCandidatePairId: 'P1' }]
      : []),
    {
      id: 'P0',
      type: 'candidate-pair',
      localCandidateId: 'L0',
      remoteCandidateId: 'R0',
      nominated: false,
      state: 'succeeded',
    },
    {
      id: 'P1',
      type: 'candidate-pair',
      localCandidateId: 'L1',
      remoteCandidateId: 'R1',
      nominated: selected === 'nominated',
      state: 'succeeded',
    },
    { id: 'L0', type: 'local-candidate', candidateType: 'relay' },
    { id: 'R0', type: 'remote-candidate', candidateType: 'relay' },
    { id: 'L1', type: 'local-candidate', candidateType: local },
    { id: 'R1', type: 'remote-candidate', candidateType: remote },
  ];
}

describe('the route of the link (docs/multijoueur.md §5)', () => {
  it('reads the pair in use, by the transport or as nominated', () => {
    for (const selected of ['transport', 'nominated'] as const) {
      expect(routeOf(stats('host', 'host', selected))).toBe('local');
      expect(routeOf(stats('srflx', 'host', selected))).toBe('stun');
      expect(routeOf(stats('host', 'prflx', selected))).toBe('stun');
      expect(routeOf(stats('srflx', 'relay', selected))).toBe('relay');
    }
  });

  it('does not guess without a pair in use', () => {
    expect(routeOf([])).toBe('unknown');
    expect(routeOf([null, 3, { type: 'candidate-pair' }])).toBe('unknown');
    expect(routeOf(stats('host', 'host', 'transport').slice(0, 3))).toBe('unknown');
  });
});
