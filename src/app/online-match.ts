/**
 * An online match (docs/multijoueur.md §9.6), between the salon and the menu: the link to the
 * other device, the plan both agreed on, and the fight's lockstep. It is the fight's source of
 * inputs (`source`), and tells the app what both devices go through together: the shared pause,
 * the rematch, the end (the other left, the link broke, a desync).
 */

import type { InputBits } from '../core/input';
import type { GameState } from '../core/state';
import type { HeldStruggle } from '../input/held-struggle';
import { DesyncCheck } from '../net/desync';
import { Lockstep } from '../net/lockstep';
import { FLAG_PAUSE, type NetMessage } from '../net/protocol';
import type { PingSummary, Session, SessionEnd } from '../net/session';
import { stateHash } from '../net/state-hash';
import { resultsDue } from '../render/finisher-scene';
import type { TickSource } from '../render/tick-source';
import type { MatchPlan } from './salon';

/** How often the inputs not yet confirmed go again when no tick is played (a stall, a pause). */
export const RESEND_MS = 100;

/** Why the match ended without the menu chosen: the link's end, or a desync at that tick. */
export type OnlineEnd =
  { readonly kind: SessionEnd } | { readonly kind: 'desync'; readonly tick: number };

export interface OnlineMatchListener {
  /** A round trip was measured. */
  ping(summary: PingSummary): void;
  /** Both devices paused after the same tick, `by` this player's request. */
  paused(by: 0 | 1): void;
  /** The other player left the pause: the fight goes on. */
  resumed(): void;
  /** Both want the rematch: the fight starts over, from its first tick. */
  rematch(): void;
  ended(end: OnlineEnd): void;
}

/** What one fight of the match holds: its lockstep and its desync check, anew for a rematch. */
interface Fight {
  readonly lockstep: Lockstep;
  readonly check: DesyncCheck;
  lastAck: number;
  lastSentTick: number;
  lastSentAt: number;
  /** This player asked for the pause: the flag goes with its next input. */
  pauseAsked: boolean;
  /** Paused after a tick, by this player; told once, at the frame's end. */
  pausedBy: 0 | 1 | null;
  pauseTold: boolean;
  /** The match is decided: no tick is played any more. */
  over: boolean;
  /** This player wants a rematch: none of this fight's inputs leaves any more. */
  rematchAsked: boolean;
  theyAskedRematch: boolean;
}

export class OnlineMatch {
  /** The fighter this device plays: the host is player 1, the guest player 2. */
  readonly player: 0 | 1;
  private fight: Fight;
  private listener: OnlineMatchListener | null = null;
  private ended = false;
  /** Reused every tick to avoid allocating. */
  private readonly inputs: [InputBits, InputBits] = [0, 0];

  constructor(
    private readonly session: Session,
    readonly plan: MatchPlan,
    /** The players' names, player 1's (the host's) first. */
    readonly names: readonly [string, string],
    role: 'host' | 'guest',
    /** The input delay in ticks, the host's choice, the same on both devices. */
    readonly delay: number,
    /** A monotonic clock in milliseconds. */
    private readonly now: () => number,
  ) {
    this.player = role === 'host' ? 0 : 1;
    this.fight = this.newFight();
    session.listen({
      update: (summary) => this.listener?.ping(summary),
      received: (message) => {
        this.receive(message);
      },
      ended: (reason) => {
        this.end({ kind: reason });
      },
    });
  }

  /** Who is told what happens (the app, while the fight is on). */
  listen(listener: OnlineMatchListener): void {
    this.listener = listener;
  }

  /** The fight's source of inputs, with this device's held struggle (tick-source.ts). */
  source(struggle: HeldStruggle): TickSource {
    return {
      playable: (count) => (this.stopped() ? 0 : Math.min(count, this.fight.lockstep.available())),
      next: (read, state) => this.next(struggle, read[0], state),
      flush: () => {
        this.flush();
      },
    };
  }

  /** This player asks for the pause: both devices take it a few ticks later, on the same tick. */
  requestPause(): void {
    if (this.fight.pausedBy === null) this.fight.pauseAsked = true;
  }

  /** This player leaves the pause: both fight on. */
  resume(): void {
    if (this.fight.pausedBy === null) return;
    this.fight.pausedBy = null;
    this.fight.pauseTold = false;
    this.session.send({ type: 'resume' });
  }

  /** This player wants the rematch; it starts once both do (`rematch` is told then). */
  wantRematch(): void {
    if (this.fight.rematchAsked) return;
    this.fight.rematchAsked = true;
    this.session.send({ type: 'rematch' });
    if (this.fight.theyAskedRematch) this.startOver();
  }

  /** Leaves the match: the link closes, the other one is told it left. */
  close(): void {
    this.ended = true;
    this.session.dispose();
  }

  private next(
    struggle: HeldStruggle,
    read: InputBits,
    state: GameState,
  ): readonly [InputBits, InputBits] | null {
    const { fight } = this;
    if (this.stopped()) return null;
    const { lockstep, check } = fight;
    // The state after the ticks played so far: hashed on the ticks to compare.
    const hash = check.played(lockstep.tick, () => stateHash(state));
    if (hash) this.session.send(hash);
    if (resultsDue(state)) {
      fight.over = true;
      return null;
    }
    const pause = fight.pauseAsked ? FLAG_PAUSE : 0;
    fight.pauseAsked = false;
    const [first, second] = lockstep.advance(struggle.apply(this.player, read, state) | pause);
    if ((first | second) & FLAG_PAUSE) fight.pausedBy = first & FLAG_PAUSE ? 0 : 1;
    this.inputs[0] = first & ~FLAG_PAUSE;
    this.inputs[1] = second & ~FLAG_PAUSE;
    return this.inputs;
  }

  /** The frame's end: the inputs to send go (on a new tick, or again after RESEND_MS), and what both went through is told. */
  private flush(): void {
    const { fight } = this;
    if (this.ended) return;
    const desync = fight.check.desyncAt;
    if (desync !== null) {
      this.end({ kind: 'desync', tick: desync });
      return;
    }
    if (!fight.rematchAsked) {
      const now = this.now();
      const fresh = fight.lockstep.tick !== fight.lastSentTick;
      const outgoing =
        fresh || now - fight.lastSentAt >= RESEND_MS
          ? fight.lockstep.outgoing(fight.lastAck)
          : null;
      if (outgoing) {
        fight.lastAck = outgoing.ack;
        fight.lastSentTick = fight.lockstep.tick;
        fight.lastSentAt = now;
        this.session.send(outgoing);
      }
    }
    if (fight.pausedBy !== null && !fight.pauseTold) {
      fight.pauseTold = true;
      this.listener?.paused(fight.pausedBy);
    }
  }

  private receive(message: NetMessage): void {
    const { fight } = this;
    switch (message.type) {
      case 'inputs':
        if (!fight.lockstep.receive(message)) this.session.reject();
        return;
      case 'hash':
        if (!fight.check.receive(message, fight.lockstep.tick)) this.session.reject();
        return;
      case 'resume':
        // Both may leave the pause at once: the second word changes nothing.
        if (fight.pausedBy === null) return;
        fight.pausedBy = null;
        fight.pauseTold = false;
        this.listener?.resumed();
        return;
      case 'rematch':
        if (fight.theyAskedRematch) break;
        fight.theyAskedRematch = true;
        if (fight.rematchAsked) this.startOver();
        return;
      default:
        break;
    }
    this.session.reject();
  }

  /** Both want it: a new fight, from its first tick, told to the app. */
  private startOver(): void {
    this.fight = this.newFight();
    this.listener?.rematch();
  }

  private stopped(): boolean {
    const { fight } = this;
    return this.ended || fight.over || fight.pausedBy !== null || fight.rematchAsked;
  }

  private end(end: OnlineEnd): void {
    if (this.ended) return;
    this.ended = true;
    this.session.dispose();
    this.listener?.ended(end);
  }

  private newFight(): Fight {
    return {
      lockstep: new Lockstep(this.player, this.delay),
      check: new DesyncCheck(),
      lastAck: -1,
      lastSentTick: -1,
      lastSentAt: Number.NEGATIVE_INFINITY,
      pauseAsked: false,
      pausedBy: null,
      pauseTold: false,
      over: false,
      rematchAsked: false,
      theyAskedRematch: false,
    };
  }
}

/**
 * The input delay for a round trip of `median` ms (docs/multijoueur.md §9.1): half of it (one way)
 * in ticks, rounded up, plus one; 2 to `max` ticks. Unmeasured, 3.
 */
export function delayFor(median: number | null, max: number): number {
  if (median === null) return 3;
  const oneWay = Math.ceil(median / 2 / (1000 / 60));
  return Math.min(max, Math.max(2, oneWay + 1));
}
