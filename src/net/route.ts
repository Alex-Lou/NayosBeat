import type { Route } from './lobby';

/**
 * How the link goes, read from a WebRTC stats report (`RTCPeerConnection.getStats`): the pair of
 * candidates in use, and their kinds. Both on the local network (`host`): local; through an
 * address a STUN server revealed (`srflx`, `prflx`): stun; through a relay: relay. The pair in
 * use is the transport's selected one, else (browsers without it) the nominated pair that
 * succeeded.
 */
export function routeOf(reports: Iterable<unknown>): Route {
  const byId = new Map<string, Record<string, unknown>>();
  for (const report of reports) {
    if (typeof report !== 'object' || report === null) continue;
    const fields = report as Record<string, unknown>;
    if (typeof fields.id === 'string') byId.set(fields.id, fields);
  }
  const pair = selectedPair(byId);
  if (!pair) return 'unknown';
  const kinds = [pair.localCandidateId, pair.remoteCandidateId].map((id) =>
    typeof id === 'string' ? byId.get(id)?.candidateType : undefined,
  );
  if (kinds.some((kind) => typeof kind !== 'string')) return 'unknown';
  if (kinds.includes('relay')) return 'relay';
  if (kinds.includes('srflx') || kinds.includes('prflx')) return 'stun';
  return 'local';
}

function selectedPair(
  byId: ReadonlyMap<string, Record<string, unknown>>,
): Record<string, unknown> | undefined {
  for (const report of byId.values()) {
    if (report.type !== 'transport' || typeof report.selectedCandidatePairId !== 'string') continue;
    const pair = byId.get(report.selectedCandidatePairId);
    if (pair) return pair;
  }
  for (const report of byId.values()) {
    if (
      report.type === 'candidate-pair' &&
      report.nominated === true &&
      report.state === 'succeeded'
    )
      return report;
  }
  return undefined;
}
