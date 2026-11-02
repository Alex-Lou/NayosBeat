/**
 * The matchmaker of the game: PeerJS (MIT) and its free public server, 0.peerjs.com, which
 * brokers the meeting; the game then goes straight between both devices, over WebRTC
 * (docs/multijoueur.md §2). The only file that imports PeerJS: it is loaded the first time the
 * search starts, never with the game.
 */

import { Peer, type DataConnection, type PeerError } from 'peerjs';
import type {
  Channel,
  ChannelListener,
  ClaimOutcome,
  HostedRoom,
  JoinOutcome,
  Matchmaker,
  NetFailure,
  Route,
} from './lobby';
import { PROTOCOL_VERSION } from './protocol';
import { routeOf } from './route';

/**
 * How both devices find a way to each other: Google's free public STUN server, which tells each
 * one its public address. No relay (TURN) yet: an open question (docs/multijoueur.md §5).
 */
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/** How long a claim or a join may take: the server's answer, then the other device's. */
const ANSWER_MS = 15_000;
/** How long a guest's channel may take to open. */
const LINK_MS = 10_000;

export function peerMatchmaker(): Matchmaker {
  return new PeerMatchmaker();
}

class PeerMatchmaker implements Matchmaker {
  private readonly peers = new Set<Peer>();
  private readonly channels = new Set<PeerChannel>();
  private disposed = false;

  claim(id: string): Promise<ClaimOutcome> {
    const peer = this.newPeer(id);
    if (!peer) return Promise.resolve({ kind: 'failed', failure: 'server' });
    return new Promise((resolve) => {
      const settle = this.settler<ClaimOutcome>(
        peer,
        resolve,
        (outcome) => outcome.kind !== 'claimed',
        () => ({ kind: 'failed', failure: 'server' }),
      );
      peer.on('open', () => {
        settle({ kind: 'claimed', room: new PeerRoom(peer, this.channels) });
      });
      peer.on('error', (error) => {
        settle(
          error.type === 'unavailable-id'
            ? { kind: 'taken' }
            : { kind: 'failed', failure: failureOf(error) },
        );
      });
      peer.on('close', () => {
        settle({ kind: 'failed', failure: 'server' });
      });
    });
  }

  join(id: string): Promise<JoinOutcome> {
    const peer = this.newPeer(guestId());
    if (!peer) return Promise.resolve({ kind: 'failed', failure: 'server' });
    return new Promise((resolve) => {
      // The host answered (its offer's answer came back): a link that fails then is the network's.
      let answered = false;
      const unanswered = (): JoinOutcome =>
        answered ? { kind: 'failed', failure: 'direct' } : { kind: 'unreachable' };
      const settle = this.settler<JoinOutcome>(
        peer,
        resolve,
        (outcome) => outcome.kind !== 'joined',
        unanswered,
      );
      peer.on('open', () => {
        const connection = peer.connect(id, { serialization: 'raw', reliable: true });
        connection.on('iceStateChanged', () => {
          answered = true;
        });
        connection.on('open', () => {
          settle({ kind: 'joined', channel: new PeerChannel(connection, peer, this.channels) });
        });
        connection.on('close', () => {
          settle(unanswered());
        });
      });
      peer.on('error', (error) => {
        settle(
          error.type === 'peer-unavailable'
            ? { kind: 'unreachable' }
            : error.type === 'webrtc'
              ? unanswered()
              : { kind: 'failed', failure: failureOf(error) },
        );
      });
      peer.on('close', () => {
        settle({ kind: 'failed', failure: 'server' });
      });
    });
  }

  dispose(kept?: Channel): void {
    this.disposed = true;
    for (const channel of [...this.channels]) if (channel !== kept) channel.close();
    for (const peer of this.peers) {
      if (kept instanceof PeerChannel && kept.peer === peer) {
        // Off the server (the room is free again), the link to the opponent kept: it is the
        // channel's now, closed with it.
        peer.disconnect();
        kept.ownsPeer = true;
      } else {
        peer.destroy();
      }
    }
    this.peers.clear();
  }

  private newPeer(id: string): Peer | null {
    if (this.disposed) return null;
    const peer = new Peer(id, { config: { iceServers: ICE_SERVERS } });
    this.peers.add(peer);
    return peer;
  }

  /**
   * Settles a claim or a join once: its timer cleared, and its peer destroyed when `drops` says
   * the outcome does not keep it. Past ANSWER_MS, it settles as `late` says.
   */
  private settler<T>(
    peer: Peer,
    resolve: (outcome: T) => void,
    drops: (outcome: T) => boolean,
    late: () => T,
  ): (outcome: T) => void {
    let settled = false;
    const settle = (outcome: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (drops(outcome)) {
        this.peers.delete(peer);
        peer.destroy();
      }
      resolve(outcome);
    };
    const timer = setTimeout(() => {
      settle(late());
    }, ANSWER_MS);
    return settle;
  }
}

/** The room this device holds: its guests, once their channel is open. */
class PeerRoom implements HostedRoom {
  private listener: Parameters<HostedRoom['listen']>[0] | null = null;

  constructor(
    peer: Peer,
    private readonly channels: Set<PeerChannel>,
  ) {
    peer.on('connection', (connection) => {
      this.welcome(connection, peer);
    });
    peer.on('disconnected', () => {
      this.listener?.lost();
    });
  }

  listen(listener: Parameters<HostedRoom['listen']>[0]): void {
    this.listener = listener;
  }

  /**
   * A device connects: only as the game does (raw texts, reliable and ordered), so nothing it
   * sends goes through a PeerJS decoder; it is let go if its channel does not open in time.
   */
  private welcome(connection: DataConnection, peer: Peer): void {
    if (connection.serialization !== 'raw' || !connection.reliable) {
      connection.close();
      return;
    }
    const timer = setTimeout(() => {
      connection.close();
    }, LINK_MS);
    connection.on('close', () => {
      clearTimeout(timer);
    });
    connection.on('open', () => {
      clearTimeout(timer);
      const channel = new PeerChannel(connection, peer, this.channels);
      if (this.listener) this.listener.guest(channel);
      else channel.close();
    });
  }
}

class PeerChannel implements Channel {
  private listener: ChannelListener | null = null;
  private closed = false;
  /** Set once handed over to the opponent's link: closing it destroys the peer too. */
  ownsPeer = false;

  constructor(
    private readonly connection: DataConnection,
    readonly peer: Peer,
    private readonly channels: Set<PeerChannel>,
  ) {
    channels.add(this);
    // Open, the link needs the server no more: the candidates found from now on are not sent
    // through it, as PeerJS itself stops once ICE completes. Sent to a device that has left the
    // server, one would bring back a LEAVE, and PeerJS would close this link on it.
    const link = connection.peerConnection as RTCPeerConnection | null;
    if (link) link.onicecandidate = null;
    connection.on('data', (data) => {
      if (!this.closed) this.listener?.message(data);
    });
    connection.on('close', () => {
      this.finish();
    });
    connection.on('error', () => {
      this.close();
    });
  }

  send(text: string): void {
    if (!this.closed) void this.connection.send(text);
  }

  listen(listener: ChannelListener): void {
    this.listener = listener;
  }

  async route(): Promise<Route> {
    const link = this.connection.peerConnection as RTCPeerConnection | null;
    if (!link) return 'unknown';
    try {
      return routeOf((await link.getStats()).values());
    } catch {
      return 'unknown';
    }
  }

  close(): void {
    if (this.closed) return;
    this.connection.close();
    this.finish();
  }

  private finish(): void {
    if (this.closed) return;
    this.closed = true;
    this.channels.delete(this);
    if (this.ownsPeer) this.peer.destroy();
    this.listener?.closed();
  }
}

function failureOf(error: PeerError<string>): NetFailure {
  if (error.type === 'browser-incompatible') return 'unsupported';
  if (error.type === 'webrtc') return 'direct';
  return 'server';
}

/** A guest's id: never a room's, unguessable, valid for PeerJS (letters, digits, dashes). */
function guestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `nayosbeat-${PROTOCOL_VERSION}-guest-${hex}`;
}
