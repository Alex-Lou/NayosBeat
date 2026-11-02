/**
 * Lockstep with input delay (docs/multijoueur.md §9.1): both devices play the same ticks with the
 * same inputs. Each player's input is played `delay` ticks after it is read, on both devices; a
 * tick is played only once the other player's input for it has arrived. Pure: no clock, no
 * network, no engine; the caller reads the devices, plays the ticks and carries the messages.
 *
 * The inputs travel tick by tick, the oldest the other side has not confirmed first: a lost or
 * late message is made up by the next, and a message out of order only adds what it brings.
 */

import type { InputBits } from '../core/input';
import { MAX_BATCH, type NetMessage } from './protocol';

/** How far ahead of this device the other one's inputs may run: beyond, it is lying. */
export const MAX_AHEAD = 240;

export type InputsMessage = Extract<NetMessage, { type: 'inputs' }>;

export class Lockstep {
  /** The next tick to play. */
  private next = 0;
  /** Each player's input by tick, the first `delay` ticks neutral. */
  private readonly inputs: readonly [InputBits[], InputBits[]];
  /** The other side's inputs received, all of them up to this tick. */
  private received: number;
  /** This side's inputs the other side has received, all of them up to this tick. */
  private confirmed = -1;

  constructor(
    /** The player this device reads: 0, the host; 1, the guest. */
    readonly player: 0 | 1,
    /** Ticks between reading an input and playing it, on both devices (at least 1). */
    readonly delay: number,
  ) {
    if (!Number.isInteger(delay) || delay < 1)
      throw new Error(`Lockstep delay must be ≥ 1: ${delay}`);
    const neutral = () => Array.from({ length: delay }, () => 0);
    this.inputs = [neutral(), neutral()];
    this.received = delay - 1;
  }

  /** The next tick to play: how many have been played. */
  get tick(): number {
    return this.next;
  }

  /** Whether the next tick can be played: the other player's input for it has arrived. */
  ready(): boolean {
    return this.next <= this.received;
  }

  /**
   * Plays the next tick (only when `ready`): `bits`, read now, is this player's input `delay`
   * ticks later. Returns both players' inputs for the tick played.
   */
  advance(bits: InputBits): readonly [InputBits, InputBits] {
    if (!this.ready())
      throw new Error(`Tick ${this.next}: the other player's input has not arrived`);
    const tick = this.next;
    this.inputs[this.player][tick + this.delay] = bits;
    this.next++;
    return [this.inputs[0][tick] ?? 0, this.inputs[1][tick] ?? 0];
  }

  /**
   * Takes the other side's inputs message. False when it cannot be true (an input it already
   * sent, changed; a tick out of reach; a confirmation of what was never sent): the link is cut.
   */
  receive(message: InputsMessage): boolean {
    const other = this.player === 0 ? 1 : 0;
    const theirs = this.inputs[other];
    const { first, bits, ack } = message;
    if (first + bits.length - 1 > this.next + MAX_AHEAD) return false;
    if (ack > this.latest()) return false;
    for (let i = 0; i < bits.length; i++) {
      const tick = first + i;
      const known = theirs[tick];
      // The neutral ticks are known from the start: the other side sends them never.
      if (tick < this.delay) return false;
      if (known !== undefined && known !== bits[i]) return false;
      theirs[tick] = bits[i] ?? 0;
    }
    while (theirs[this.received + 1] !== undefined) this.received++;
    this.confirmed = Math.max(this.confirmed, ack);
    return true;
  }

  /**
   * The message to send now: this side's inputs the other has not confirmed (the oldest first,
   * MAX_BATCH at most), and what this side has received. Null when there is nothing to send
   * and nothing new to confirm since `lastSentAck`.
   */
  outgoing(lastSentAck: number): InputsMessage | null {
    const first = Math.max(this.confirmed + 1, this.delay);
    const last = Math.min(this.latest(), first + MAX_BATCH - 1);
    if (first > last) {
      if (this.received === lastSentAck) return null;
      // Nothing to send but a confirmation: the last input again, which the other ignores.
      const tick = this.latest();
      if (tick < this.delay) return null;
      return { type: 'inputs', first: tick, bits: [this.mine(tick)], ack: this.received };
    }
    const bits: number[] = [];
    for (let tick = first; tick <= last; tick++) bits.push(this.mine(tick));
    return { type: 'inputs', first, bits, ack: this.received };
  }

  /** Both players' inputs, tick by tick, for every tick played: the match as a replay. */
  played(): readonly (readonly [InputBits, InputBits])[] {
    return Array.from(
      { length: this.next },
      (_, tick) => [this.inputs[0][tick] ?? 0, this.inputs[1][tick] ?? 0] as const,
    );
  }

  /** The last tick this side has an input for. */
  private latest(): number {
    return this.next - 1 + this.delay;
  }

  private mine(tick: number): InputBits {
    return this.inputs[this.player][tick] ?? 0;
  }
}
