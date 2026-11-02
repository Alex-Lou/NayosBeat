/**
 * The link to the opponent once paired (docs/multijoueur.md §4.3): a ping every second, answered
 * at once, measures the round trip; a link silent for SILENCE_MS is taken for lost; a message
 * that is not the protocol's ends it. Gate 0 exchanges nothing else.
 */

import type { Channel } from './lobby';
import { encodeMessage, parseMessage, SEQ_LIMIT } from './protocol';

export const PING_INTERVAL_MS = 1000;
/** Nothing heard for this long: the link is lost (a pong comes back every second otherwise). */
export const SILENCE_MS = 5000;
/** The round trips the summary is computed over: the last ones. */
export const PING_SAMPLES = 30;

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

/** Why the link ended: the other side closed it, it went silent, or it spoke nonsense. */
export type SessionEnd = 'left' | 'silent' | 'protocol';

export interface SessionListener {
  /** A round trip was measured. */
  update(summary: PingSummary): void;
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
  private readonly timer: ReturnType<typeof setInterval>;
  private over = false;

  constructor(
    private readonly channel: Channel,
    /** A monotonic clock in milliseconds (`performance.now`). */
    private readonly now: () => number,
    private readonly listener: SessionListener,
  ) {
    this.lastHeard = now();
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
    const message = parseMessage(data);
    if (!message) {
      this.end('protocol');
      return;
    }
    this.lastHeard = this.now();
    if (message.type === 'ping') {
      this.channel.send(encodeMessage({ type: 'pong', seq: message.seq }));
    } else if (message.type === 'pong' && message.seq === this.pending?.seq) {
      this.record(this.lastHeard - this.pending.sentAt);
      this.pending = null;
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
