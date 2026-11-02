import type {
  Channel,
  ChannelListener,
  ClaimOutcome,
  HostedRoom,
  JoinOutcome,
  Matchmaker,
  NetFailure,
  Route,
} from '../../src/net/lobby';

/**
 * A matchmaking server in memory, and the devices that use it: rooms claimed by id, channels
 * between two devices, every delivery a microtask later (as a network event comes later than the
 * call). It counts what is left open, so a test can check that nothing leaks.
 */
export class FakeServer {
  readonly rooms = new Map<string, FakeRoom>();
  readonly channels = new Set<FakeChannel>();
  /** The server does not answer: every claim fails. */
  down = false;
  /** How a join ends whatever the room: the direct link fails, or nobody answers. */
  joins: 'normal' | NetFailure | 'unreachable' = 'normal';

  device(): FakeMatchmaker {
    return new FakeMatchmaker(this);
  }

  /** Channels still open, room ids still held. */
  openChannels(): number {
    return [...this.channels].filter((channel) => !channel.isClosed).length;
  }
}

export class FakeRoom implements HostedRoom {
  listener: Parameters<HostedRoom['listen']>[0] | null = null;
  constructor(readonly owner: FakeMatchmaker) {}
  listen(listener: Parameters<HostedRoom['listen']>[0]): void {
    this.listener = listener;
  }
}

export class FakeChannel implements Channel {
  other!: FakeChannel;
  listener: ChannelListener | null = null;
  isClosed = false;
  readonly sent: string[] = [];
  constructor(private readonly server: FakeServer) {
    server.channels.add(this);
  }
  send(text: string): void {
    if (this.isClosed) return;
    this.sent.push(text);
    const other = this.other;
    queueMicrotask(() => {
      if (!other.isClosed) other.listener?.message(text);
    });
  }
  /** Delivers `data` as if the other side had sent it. */
  receive(data: unknown): void {
    queueMicrotask(() => {
      if (!this.isClosed) this.listener?.message(data);
    });
  }
  listen(listener: ChannelListener): void {
    this.listener = listener;
  }
  route(): Promise<Route> {
    return Promise.resolve('local');
  }
  close(): void {
    for (const end of [this, this.other]) {
      if (end.isClosed) continue;
      end.isClosed = true;
      queueMicrotask(() => end.listener?.closed());
    }
  }
}

export function channelPair(server: FakeServer): [FakeChannel, FakeChannel] {
  const a = new FakeChannel(server);
  const b = new FakeChannel(server);
  a.other = b;
  b.other = a;
  return [a, b];
}

export class FakeMatchmaker implements Matchmaker {
  private readonly claimed = new Set<string>();
  private readonly opened = new Set<FakeChannel>();
  disposed = false;

  constructor(private readonly server: FakeServer) {}

  claim(id: string): Promise<ClaimOutcome> {
    return later((): ClaimOutcome => {
      if (this.disposed || this.server.down) return { kind: 'failed', failure: 'server' };
      if (this.server.rooms.has(id)) return { kind: 'taken' };
      const room = new FakeRoom(this);
      this.server.rooms.set(id, room);
      this.claimed.add(id);
      return { kind: 'claimed', room };
    });
  }

  join(id: string): Promise<JoinOutcome> {
    return later((): JoinOutcome => {
      if (this.disposed) return { kind: 'failed', failure: 'server' };
      const { joins } = this.server;
      if (joins === 'unreachable') return { kind: 'unreachable' };
      if (joins !== 'normal') return { kind: 'failed', failure: joins };
      const room = this.server.rooms.get(id);
      if (!room) return { kind: 'unreachable' };
      const [mine, theirs] = channelPair(this.server);
      this.opened.add(mine);
      room.owner.opened.add(theirs);
      if (room.listener) room.listener.guest(theirs);
      else theirs.close();
      return { kind: 'joined', channel: mine };
    });
  }

  dispose(kept?: Channel): void {
    this.disposed = true;
    for (const id of this.claimed) this.server.rooms.delete(id);
    this.claimed.clear();
    for (const channel of this.opened) if (channel !== kept) channel.close();
    this.opened.clear();
  }
}

function later<T>(answer: () => T): Promise<T> {
  return new Promise((resolve) => {
    queueMicrotask(() => {
      resolve(answer());
    });
  });
}

/** Lets every pending microtask (and those they queue) run. */
export async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}
