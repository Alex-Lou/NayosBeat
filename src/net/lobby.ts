/**
 * The automatic search (docs/multijoueur.md §3): numbered rooms with well-known ids on the
 * matchmaking server. The first device to search claims room 0 and waits; the next one finds it
 * taken and connects to it. A host that already has an opponent answers `busy`, and the guest
 * tries the next room. The server only brokers the meeting: once both devices are linked, they
 * leave it, and the room is free again.
 */

import { encodeMessage, parseMessage, PROTOCOL_VERSION } from './protocol';

/** How many rooms a search tries: enough for a few pairs searching at the same time. */
export const ROOM_COUNT = 4;

/** How long a guest waits for the host's answer once the channel is open. */
export const HANDSHAKE_MS = 10_000;

/** The id of room `room` on the server: the protocol's version in it, so versions never meet. */
export function roomId(room: number): string {
  return `nayosbeat-${PROTOCOL_VERSION}-lobby-${room}`;
}

/** How the two devices are linked (docs/multijoueur.md §5): read from the connection's stats. */
export type Route = 'local' | 'stun' | 'relay' | 'unknown';

/** What a channel tells whoever listens to it. */
export interface ChannelListener {
  /** A text arrived, as received: parse it before trusting it. */
  message(data: unknown): void;
  /** The channel closed: the other side left, the link broke, or `close` was called. Told once. */
  closed(): void;
}

/** A two-way link to the other device: texts, in order, without loss. */
export interface Channel {
  send(text: string): void;
  /** Sets who is told what happens on the channel (the last one set only). */
  listen(listener: ChannelListener): void;
  /** How the link goes, read from its stats. */
  route(): Promise<Route>;
  /** Closes the link and frees everything it holds. Safe to call twice. */
  close(): void;
}

/** Why a search failed: the server, the direct link between both devices, or the browser. */
export type NetFailure = 'server' | 'direct' | 'unsupported';

/** A room this device holds on the server, waiting for a guest. */
export interface HostedRoom {
  listen(listener: {
    /** A device connected, its channel open. */
    guest(channel: Channel): void;
    /** The server is lost: no guest can come any more. */
    lost(): void;
  }): void;
}

export type ClaimOutcome =
  | { readonly kind: 'claimed'; readonly room: HostedRoom }
  | { readonly kind: 'taken' }
  | { readonly kind: 'failed'; readonly failure: NetFailure };

export type JoinOutcome =
  | { readonly kind: 'joined'; readonly channel: Channel }
  /** Nobody answered (a host gone without the server knowing yet): the next room. */
  | { readonly kind: 'unreachable' }
  | { readonly kind: 'failed'; readonly failure: NetFailure };

/**
 * The matchmaking server, as the search sees it: PeerJS in the game (peer-matchmaker.ts), an
 * in-memory one in the tests.
 */
export interface Matchmaker {
  /** Registers `id` on the server, as a room this device hosts. */
  claim(id: string): Promise<ClaimOutcome>;
  /** Opens a channel to the device that holds `id`. */
  join(id: string): Promise<JoinOutcome>;
  /**
   * Leaves the server and closes everything opened, but `kept`: the opponent's channel, which
   * from then on frees what it holds itself as it closes.
   */
  dispose(kept?: Channel): void;
}

export type SearchResult =
  | {
      readonly kind: 'paired';
      readonly channel: Channel;
      readonly role: 'host' | 'guest';
      readonly room: number;
    }
  /** Every room has its pair already. */
  | { readonly kind: 'full' }
  | { readonly kind: 'failed'; readonly failure: NetFailure }
  | { readonly kind: 'cancelled' };

const CANCELLED = { kind: 'cancelled' } as const;

/**
 * Searches the rooms in order until paired, then hands over the opponent's channel; whatever the
 * outcome, everything else the search opened is closed. `signal` cancels it.
 */
export async function findOpponent(
  matchmaker: Matchmaker,
  signal: AbortSignal,
): Promise<SearchResult> {
  let result: SearchResult = CANCELLED;
  try {
    result = await searchRooms(matchmaker, signal);
    return result;
  } finally {
    matchmaker.dispose(result.kind === 'paired' ? result.channel : undefined);
  }
}

async function searchRooms(matchmaker: Matchmaker, signal: AbortSignal): Promise<SearchResult> {
  for (let room = 0; room < ROOM_COUNT; room++) {
    const claim = await unlessAborted(matchmaker.claim(roomId(room)), signal);
    switch (claim.kind) {
      case 'cancelled':
      case 'failed':
        return claim;
      case 'claimed':
        return host(claim.room, room, signal);
      case 'taken': {
        const joined = await unlessAborted(matchmaker.join(roomId(room)), signal);
        if (joined.kind === 'unreachable') continue;
        if (joined.kind !== 'joined') return joined;
        const answer = await unlessAborted(greet(joined.channel), signal);
        if (answer === 'accepted')
          return { kind: 'paired', channel: joined.channel, role: 'guest', room };
        joined.channel.close();
        if (answer !== 'refused') return CANCELLED;
      }
    }
  }
  return { kind: 'full' };
}

/**
 * Waits in the room for the first guest that says hello, and pairs with it; any other one is
 * answered `busy`, and one that says anything else is let go.
 */
function host(hosted: HostedRoom, room: number, signal: AbortSignal): Promise<SearchResult> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (result: SearchResult) => {
      if (done) return;
      done = true;
      signal.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const onAbort = () => {
      finish(CANCELLED);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
    hosted.listen({
      guest: (channel) => {
        channel.listen({
          message: (data) => {
            if (parseMessage(data)?.type !== 'hello') {
              channel.close();
              return;
            }
            if (done) {
              channel.send(encodeMessage({ type: 'busy' }));
              channel.close();
              return;
            }
            channel.send(encodeMessage({ type: 'hello' }));
            finish({ kind: 'paired', channel, role: 'host', room });
          },
          closed: () => undefined,
        });
      },
      lost: () => {
        finish({ kind: 'failed', failure: 'server' });
      },
    });
  });
}

/**
 * Says hello to the host just joined: `accepted` if it says hello back, `refused` if it is busy,
 * gone, answers anything else, or nothing in HANDSHAKE_MS (the next room is tried then).
 */
function greet(channel: Channel): Promise<'accepted' | 'refused'> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      finish('refused');
    }, HANDSHAKE_MS);
    let done = false;
    const finish = (answer: 'accepted' | 'refused') => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(answer);
    };
    channel.listen({
      message: (data) => {
        finish(parseMessage(data)?.type === 'hello' ? 'accepted' : 'refused');
      },
      closed: () => {
        finish('refused');
      },
    });
    channel.send(encodeMessage({ type: 'hello' }));
  });
}

/** `promise`, or `cancelled` as soon as `signal` aborts (its listener removed either way). */
function unlessAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T | typeof CANCELLED> {
  if (signal.aborted) return Promise.resolve(CANCELLED);
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      resolve(CANCELLED);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
