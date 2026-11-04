/**
 * The online mode's wire format (docs/multijoueur.md §4): small JSON texts, each carrying the
 * protocol's version. Everything received is parsed here, once, at the boundary: a text that is
 * not exactly one of these messages is refused (`null`), and its sender is let go. What a field
 * means (a place, a fighter) is checked by whoever reads it, against the game's own data.
 */

/**
 * The wire format's version. It is also part of the rooms' ids: two versions never meet. It goes
 * up whenever the game's data change too, since two builds that play differently would desync,
 * and whenever the state or its hash changes (5: the tension, docs/watt-arsenal.md §3.2).
 */
export const PROTOCOL_VERSION = 7;

/** The longest text accepted, checked before parsing it. */
export const MAX_MESSAGE_LENGTH = 128;

/** Sequence numbers stay below this (2^31): integers JSON carries exactly, on any engine. */
export const SEQ_LIMIT = 0x80000000;

/**
 * A player's name (docs/multijoueur.md §10): 2 to 12 letters without accents, digits, spaces and
 * dashes, a letter or digit at each end. Always legible in the pixel font, never interpreted.
 */
const PSEUDO = /^[A-Za-z0-9][A-Za-z0-9 -]{0,10}[A-Za-z0-9]$/;

/**
 * A tick's input on the wire: the core's buttons (src/core/input.ts, 11 bits), and FLAG_PAUSE:
 * its player asked for the pause, which both devices take after this tick (docs/multijoueur.md
 * §9.6). The flag never reaches the core.
 */
export const FLAG_PAUSE = 1 << 11;
export const INPUT_LIMIT = 1 << 12;

/** The longest input delay the host may choose, in ticks: within a batch, with room. */
export const MAX_DELAY = 10;

/** The most ticks one `inputs` message carries (the oldest the other has not confirmed first). */
export const MAX_BATCH = 12;

/** The id of a place, an atmosphere or a fighter: short, lowercase, dashes. */
const TOKEN = /^[a-z0-9-]{1,24}$/;

export function isPseudo(value: unknown): value is string {
  return typeof value === 'string' && PSEUDO.test(value);
}

export type NetMessage =
  /** Sent by both sides once the channel is open: « I speak this protocol, I am free ». */
  | { readonly type: 'hello' }
  /** The host already has an opponent: the guest searches on, in the next room. */
  | { readonly type: 'busy' }
  /** Measures the round trip: answered at once by a `pong` with the same `seq`. */
  | { readonly type: 'ping'; readonly seq: number }
  | { readonly type: 'pong'; readonly seq: number }
  /** The sender's name, sent once by each side as the salon opens. */
  | { readonly type: 'name'; readonly name: string }
  /** The sender wants to fight the other one, or does not (the search starts over). */
  | { readonly type: 'accept' }
  | { readonly type: 'refuse' }
  /** The host's place, already drawn when it chose « Aléatoire »: `map` and `atmosphere`. */
  | { readonly type: 'stage'; readonly map: string; readonly atmosphere: string }
  /** The sender's fighter. */
  | { readonly type: 'fighter'; readonly fighter: string }
  /**
   * The sender's inputs from tick `first` on, one per tick, and the last tick of the other's it
   * has received with all those before it (`ack`, -1 for none): docs/multijoueur.md §9.1.
   */
  | {
      readonly type: 'inputs';
      readonly first: number;
      readonly bits: readonly number[];
      readonly ack: number;
    }
  /** The hash of the sender's state after tick `tick` (state-hash.ts): docs/multijoueur.md §9.3. */
  | { readonly type: 'hash'; readonly tick: number; readonly hash: string }
  /** The host starts the fight, with this input delay in ticks (1 to MAX_DELAY). */
  | { readonly type: 'start'; readonly delay: number }
  /** The sender leaves the shared pause: both fight on. */
  | { readonly type: 'resume' }
  /** The sender wants a rematch: it starts once both do. */
  | { readonly type: 'rematch' };

type Type = NetMessage['type'];

/** Each message's fields on the wire (short keys), with what each must be. */
const FIELDS: Readonly<Record<Type, Readonly<Record<string, (value: unknown) => boolean>>>> = {
  hello: {},
  busy: {},
  accept: {},
  refuse: {},
  ping: { n: isSeq },
  pong: { n: isSeq },
  name: { s: isPseudo },
  stage: { m: isToken, a: isToken },
  fighter: { f: isToken },
  inputs: { k: isSeq, b: isBatch, a: isAck },
  hash: { k: isSeq, h: isHash },
  start: { d: isDelay },
  resume: {},
  rematch: {},
};

export function encodeMessage(message: NetMessage): string {
  const head = { v: PROTOCOL_VERSION, t: message.type };
  switch (message.type) {
    case 'hello':
    case 'busy':
    case 'accept':
    case 'refuse':
    case 'resume':
    case 'rematch':
      return JSON.stringify(head);
    case 'ping':
    case 'pong':
      return JSON.stringify({ ...head, n: message.seq });
    case 'name':
      return JSON.stringify({ ...head, s: message.name });
    case 'stage':
      return JSON.stringify({ ...head, m: message.map, a: message.atmosphere });
    case 'fighter':
      return JSON.stringify({ ...head, f: message.fighter });
    case 'inputs':
      return JSON.stringify({ ...head, k: message.first, b: message.bits, a: message.ack });
    case 'hash':
      return JSON.stringify({ ...head, k: message.tick, h: message.hash });
    case 'start':
      return JSON.stringify({ ...head, d: message.delay });
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
  if (fields.v !== PROTOCOL_VERSION || !isType(fields.t)) return null;
  const expected = FIELDS[fields.t];
  const keys = Object.keys(fields);
  if (keys.length !== Object.keys(expected).length + 2) return null;
  for (const [key, valid] of Object.entries(expected)) if (!valid(fields[key])) return null;
  return messageOf(fields.t, fields);
}

/** The message of type `type`, its fields already checked. */
function messageOf(type: Type, fields: Record<string, unknown>): NetMessage {
  switch (type) {
    case 'hello':
    case 'busy':
    case 'accept':
    case 'refuse':
    case 'resume':
    case 'rematch':
      return { type };
    case 'ping':
    case 'pong':
      return { type, seq: fields.n as number };
    case 'name':
      return { type, name: fields.s as string };
    case 'stage':
      return { type, map: fields.m as string, atmosphere: fields.a as string };
    case 'fighter':
      return { type, fighter: fields.f as string };
    case 'inputs':
      return {
        type,
        first: fields.k as number,
        bits: fields.b as readonly number[],
        ack: fields.a as number,
      };
    case 'hash':
      return { type, tick: fields.k as number, hash: fields.h as string };
    case 'start':
      return { type, delay: fields.d as number };
  }
}

function isType(value: unknown): value is Type {
  return typeof value === 'string' && Object.hasOwn(FIELDS, value);
}

function isSeq(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < SEQ_LIMIT;
}

function isToken(value: unknown): boolean {
  return typeof value === 'string' && TOKEN.test(value);
}

function isBatch(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= MAX_BATCH &&
    value.every(
      (bits) => Number.isInteger(bits) && (bits as number) >= 0 && (bits as number) < INPUT_LIMIT,
    )
  );
}

function isAck(value: unknown): boolean {
  return value === -1 || isSeq(value);
}

function isHash(value: unknown): boolean {
  return typeof value === 'string' && /^[0-9a-f]{8}$/.test(value);
}

function isDelay(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_DELAY;
}
