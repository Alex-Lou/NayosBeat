/**
 * The online mode's wire format (docs/multijoueur.md §4): small JSON texts, each carrying the
 * protocol's version. Everything received is parsed here, once, at the boundary: a text that is
 * not exactly one of these messages is refused (`null`), and its sender is let go.
 */

/** The wire format's version. It is also part of the rooms' ids: two versions never meet. */
export const PROTOCOL_VERSION = 1;

/** The longest text accepted, checked before parsing it. */
export const MAX_MESSAGE_LENGTH = 128;

/** Sequence numbers stay below this (2^31): integers JSON carries exactly, on any engine. */
export const SEQ_LIMIT = 0x80000000;

export type NetMessage =
  /** Sent by both sides once the channel is open: « I speak this protocol, I am free ». */
  | { readonly type: 'hello' }
  /** The host already has an opponent: the guest searches on, in the next room. */
  | { readonly type: 'busy' }
  /** Measures the round trip: answered at once by a `pong` with the same `seq`. */
  | { readonly type: 'ping'; readonly seq: number }
  | { readonly type: 'pong'; readonly seq: number };

export function encodeMessage(message: NetMessage): string {
  switch (message.type) {
    case 'hello':
    case 'busy':
      return JSON.stringify({ v: PROTOCOL_VERSION, t: message.type });
    case 'ping':
    case 'pong':
      return JSON.stringify({ v: PROTOCOL_VERSION, t: message.type, n: message.seq });
  }
}

/** The message `raw` is, or null when it is anything else (too long, malformed, another version). */
export function parseMessage(raw: unknown): NetMessage | null {
  if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_LENGTH) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const fields = data as Record<string, unknown>;
  if (fields.v !== PROTOCOL_VERSION) return null;
  const keys = Object.keys(fields).length;
  switch (fields.t) {
    case 'hello':
    case 'busy':
      return keys === 2 ? { type: fields.t } : null;
    case 'ping':
    case 'pong': {
      const seq = fields.n;
      if (keys !== 3 || !isSeq(seq)) return null;
      return { type: fields.t, seq };
    }
    default:
      return null;
  }
}

function isSeq(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < SEQ_LIMIT;
}
