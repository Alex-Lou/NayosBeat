/**
 * The desync check (docs/multijoueur.md §9.3): every HASH_EVERY ticks, each device hashes its state
 * (state-hash.ts) and sends it; the first tick whose hashes differ is the desync. Pure: the caller
 * hashes, sends and receives.
 */

import { MAX_AHEAD } from './lockstep';
import type { NetMessage } from './protocol';

/** A hash a second: cheap (a few kilobytes of text), and a desync is told within the second. */
export const HASH_EVERY = 60;

export type HashMessage = Extract<NetMessage, { type: 'hash' }>;

export class DesyncCheck {
  private readonly mine = new Map<number, string>();
  private readonly theirs = new Map<number, string>();
  private desync: number | null = null;

  /** The first tick both devices hashed differently, if any. */
  get desyncAt(): number | null {
    return this.desync;
  }

  /**
   * This side has played `tick`: on a tick to check, its hash (`hash`, called then only) is kept
   * and returned as the message to send.
   */
  played(tick: number, hash: () => string): HashMessage | null {
    if (tick % HASH_EVERY !== 0) return null;
    const value = hash();
    this.mine.set(tick, value);
    this.compare(tick);
    return { type: 'hash', tick, hash: value };
  }

  /**
   * Takes the other side's hash. False when it cannot be true (not a tick to check, too far ahead
   * of `tick`, the tick this side is at, or sent twice): the link is cut.
   */
  receive(message: HashMessage, tick: number): boolean {
    if (message.tick % HASH_EVERY !== 0 || message.tick > tick + MAX_AHEAD) return false;
    if (this.theirs.has(message.tick)) return false;
    this.theirs.set(message.tick, message.hash);
    this.compare(message.tick);
    return true;
  }

  /** Both hashes of `tick` known: compared, then forgotten (the maps stay a few entries long). */
  private compare(tick: number): void {
    const mine = this.mine.get(tick);
    const theirs = this.theirs.get(tick);
    if (mine === undefined || theirs === undefined) return;
    this.mine.delete(tick);
    this.theirs.delete(tick);
    if (mine !== theirs && this.desync === null) this.desync = tick;
  }
}
