/**
 * The link to the opponent once paired (docs/multijoueur.md §4.3): a ping every second, answered
 * at once, measures the round trip; a link silent for SILENCE_MS is taken for lost; a message
 * that is not the protocol's ends it. Every other message goes to whoever listens (the salon).
 */

import type { Channel } from './lobby';
import { encodeMessage, parseMessage, SEQ_LIMIT, type NetMessage } from './protocol';

export const PING_INTERVAL_MS = 1000;
/** Nothing heard for this long: the link is lost (a pong comes back every second otherwise). */
export const SILENCE_MS = 5000;
/** The round trips the summary is computed over: the last ones. */
export const PING_SAMPLES = 30;
/**
 * The most messages a second the other side may send: in a fight, its inputs once a tick (60),
 * a hash, a ping and a pong. Past it, the link is cut, as for a message that is not the
 * protocol's: every ping it sends would be answered.
 */
export const MAX_MESSAGES_PER_SECOND = 120;

/** The round trips measured, in milliseconds (null before the first). */
export interface PingSummary {
  readonly last: number | null;
  readonly min: number | null;
  readonly median: number | null;
  readonly max: number | null;
  /** Round trips measured since the link opened. */
  readonly count: number;
  /** Pings never answered before the next one left. */
  readonly lost: number;
}

/** Why the link ended: the other side closed it, it went silent, or it spoke nonsense or too much. */
export type SessionEnd = 'left' | 'silent' | 'protocol';

export interface SessionListener {
  /** A round trip was measured. */
  update(summary: PingSummary): void;
  /** A message of the protocol other than a ping or a pong, already parsed. */
  received(message: NetMessage): void;
  /** The link ended (the channel is closed already). Told once, never after `dispose`. */
  ended(reason: SessionEnd): void;
}

export class Session {
  private readonly samples: number[] = [];
  private count = 0;
  private lost = 0;
  private seq = 0;
  /** The ping waiting for its pong, and when it left. */
  private pending: { seq: number; sentAt: number } | null = null;
  private lastHeard: number;
  /** The messages received since `windowStart`, against MAX_MESSAGES_PER_SECOND. */
  private windowStart: number;
  private windowCount = 0;
  private readonly timer: ReturnType<typeof setInterval>;
  private over = false;

  constructor(
    private readonly channel: Channel,
    /** A monotonic clock in milliseconds (`performance.now`). */
    private readonly now: () => number,
    private listener: SessionListener,
  ) {
    this.lastHeard = now();
    this.windowStart = this.lastHeard;
    channel.listen({
      message: (data) => {
        this.receive(data);
      },
      closed: () => {
        this.end('left');
      },
    });
    this.timer = setInterval(() => {
      this.beat();
    }, PING_INTERVAL_MS);
    this.ping();
  }

  /** Who is told from now on (the salon, then the fight): the same link, another listener. */
  listen(listener: SessionListener): void {
    this.listener = listener;
  }

  send(message: NetMessage): void {
    if (!this.over) this.channel.send(encodeMessage(message));
  }

  /** The other side said something out of turn (`received`): the link is cut as for nonsense. */
  reject(): void {
    this.end('protocol');
  }

  /** Closes the link, telling no one. */
  dispose(): void {
    if (this.over) return;
    this.over = true;
    clearInterval(this.timer);
    this.channel.close();
  }

  private beat(): void {
    if (this.now() - this.lastHeard > SILENCE_MS) {
      this.end('silent');
      return;
    }
    if (this.pending) this.lost++;
    this.ping();
  }

  private ping(): void {
    this.pending = { seq: this.seq, sentAt: this.now() };
    this.channel.send(encodeMessage({ type: 'ping', seq: this.seq }));
    this.seq = (this.seq + 1) % SEQ_LIMIT;
  }

  private receive(data: unknown): void {
    if (this.over) return;
    const now = this.now();
    if (now - this.windowStart >= 1000) {
      this.windowStart = now;
      this.windowCount = 0;
    }
    const message = ++this.windowCount <= MAX_MESSAGES_PER_SECOND ? parseMessage(data) : null;
    if (!message) {
      this.end('protocol');
      return;
    }
    this.lastHeard = now;
    if (message.type === 'ping') {
      this.channel.send(encodeMessage({ type: 'pong', seq: message.seq }));
    } else if (message.type === 'pong') {
      if (message.seq !== this.pending?.seq) return;
      this.record(this.lastHeard - this.pending.sentAt);
      this.pending = null;
    } else {
      this.listener.received(message);
    }
  }

  private record(roundTrip: number): void {
    this.samples.push(roundTrip);
    if (this.samples.length > PING_SAMPLES) this.samples.shift();
    this.count++;
    this.listener.update(summarize(this.samples, this.count, this.lost));
  }

  private end(reason: SessionEnd): void {
    if (this.over) return;
    this.dispose();
    this.listener.ended(reason);
  }
}

/** The summary of `samples` (the last round trips, oldest first), rounded to the millisecond. */
export function summarize(samples: readonly number[], count: number, lost: number): PingSummary {
  if (samples.length === 0) return { last: null, min: null, median: null, max: null, count, lost };
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  const median =
    sorted.length % 2 === 1
      ? (sorted[middle] ?? 0)
      : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  return {
    last: Math.round(samples[samples.length - 1] ?? 0),
    min: Math.round(sorted[0] ?? 0),
    median: Math.round(median),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
    count,
    lost,
  };
}
