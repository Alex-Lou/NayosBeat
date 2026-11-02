import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  findOpponent,
  HANDSHAKE_MS,
  ROOM_COUNT,
  roomId,
  type SearchResult,
} from '../../src/net/lobby';
import { encodeMessage, parseMessage } from '../../src/net/protocol';
import { channelPair, FakeServer, settle, type FakeChannel } from './fake-net';

/** A search started on a new device of `server`, and how to cancel it. */
function search(server: FakeServer) {
  const controller = new AbortController();
  const device = server.device();
  let result: SearchResult | undefined;
  const done = findOpponent(device, controller.signal).then((found) => {
    result = found;
    return found;
  });
  return { device, controller, done, result: () => result };
}

/** Holds room `room` on `server` with a host that never answers anyone. */
function silentHost(server: FakeServer, room: number): FakeChannel[] {
  const guests: FakeChannel[] = [];
  const device = server.device();
  void device.claim(roomId(room)).then((claim) => {
    if (claim.kind === 'claimed')
      claim.room.listen({ guest: (c) => guests.push(c as FakeChannel), lost: () => undefined });
  });
  return guests;
}

describe('the automatic search (docs/multijoueur.md §3)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('pairs two devices: the first hosts room 0, the second joins it, both say hello', async () => {
    const server = new FakeServer();
    const first = search(server);
    await settle();
    expect(first.result()).toBeUndefined();
    expect(server.rooms.has(roomId(0))).toBe(true);

    const second = search(server);
    const [host, guest] = await Promise.all([first.done, second.done]);
    expect(host).toMatchObject({ kind: 'paired', role: 'host', room: 0 });
    expect(guest).toMatchObject({ kind: 'paired', role: 'guest', room: 0 });
    if (host.kind !== 'paired' || guest.kind !== 'paired') throw new Error('Not paired');
    // Each holds one end of the same link, which stays open.
    expect((host.channel as FakeChannel).other).toBe(guest.channel);
    expect(server.openChannels()).toBe(2);
    // Off the server: the room is free for the next pair.
    expect(server.rooms.size).toBe(0);
  });

  it('lets a third device host room 0 again once the first pair has left it', async () => {
    const server = new FakeServer();
    const first = search(server);
    await settle();
    const second = search(server);
    await Promise.all([first.done, second.done]);
    const third = search(server);
    await settle();
    expect(third.result()).toBeUndefined();
    expect(server.rooms.has(roomId(0))).toBe(true);
  });

  it('tries the next room when a host answers busy', async () => {
    const server = new FakeServer();
    const guests = silentHost(server, 0);
    await settle();
    const searcher = search(server);
    await settle();
    const [hostEnd] = guests;
    if (!hostEnd) throw new Error('Never joined room 0');
    expect(parseMessage(hostEnd.other.sent[0])).toEqual({ type: 'hello' });
    hostEnd.send(encodeMessage({ type: 'busy' }));
    await settle();
    expect(hostEnd.isClosed).toBe(true);
    expect(server.rooms.get(roomId(1))?.owner).toBe(searcher.device);
  });

  it('tries the next room when a host says nothing in time, or nonsense', async () => {
    vi.useFakeTimers();
    const server = new FakeServer();
    const silent = silentHost(server, 0);
    const babbling = silentHost(server, 1);
    await vi.advanceTimersByTimeAsync(0);
    const searcher = search(server);
    await vi.advanceTimersByTimeAsync(HANDSHAKE_MS - 1);
    expect(silent[0]?.isClosed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(silent[0]?.isClosed).toBe(true);
    babbling[0]?.send('{"v":1,"t":"ping"}');
    await vi.advanceTimersByTimeAsync(0);
    expect(babbling[0]?.isClosed).toBe(true);
    expect(server.rooms.get(roomId(2))?.owner).toBe(searcher.device);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('answers busy to a second guest, and lets go of one that does not say hello', async () => {
    const server = new FakeServer();
    const host = search(server);
    await settle();
    const [early, earlyHost] = channelPair(server);
    const [late, lateHost] = channelPair(server);
    const [mute, muteHost] = channelPair(server);
    const room = server.rooms.get(roomId(0));
    room?.listener?.guest(earlyHost);
    room?.listener?.guest(lateHost);
    room?.listener?.guest(muteHost);
    mute.send('{"v":1,"t":"busy"}');
    early.send(encodeMessage({ type: 'hello' }));
    late.send(encodeMessage({ type: 'hello' }));
    await settle();
    expect(muteHost.isClosed).toBe(true);
    expect(lateHost.sent.map(parseMessage)).toEqual([{ type: 'busy' }]);
    expect(lateHost.isClosed).toBe(true);
    expect(host.result()).toMatchObject({ kind: 'paired', role: 'host' });
    expect(parseMessage(early.sent[0])).toEqual({ type: 'hello' });
    expect(parseMessage(earlyHost.sent[0])).toEqual({ type: 'hello' });
  });

  it('says every room is full when each one has its host busy', async () => {
    vi.useFakeTimers();
    const server = new FakeServer();
    for (let room = 0; room < ROOM_COUNT; room++) silentHost(server, room);
    await vi.advanceTimersByTimeAsync(0);
    const searcher = search(server);
    await vi.advanceTimersByTimeAsync(ROOM_COUNT * HANDSHAKE_MS);
    expect(searcher.result()).toEqual({ kind: 'full' });
    expect(server.openChannels()).toBe(0);
  });

  it('stops on a failure of the server or of the direct link, without looping', async () => {
    const down = new FakeServer();
    down.down = true;
    expect(await search(down).done).toEqual({ kind: 'failed', failure: 'server' });

    const blocked = new FakeServer();
    silentHost(blocked, 0);
    await settle();
    blocked.joins = 'direct';
    const searcher = search(blocked);
    expect(await searcher.done).toEqual({ kind: 'failed', failure: 'direct' });
    expect(blocked.rooms.has(roomId(1))).toBe(false);
  });

  it('skips a room whose host is gone, nobody answering', async () => {
    const server = new FakeServer();
    silentHost(server, 0);
    await settle();
    server.joins = 'unreachable';
    const searcher = search(server);
    await settle();
    expect(server.rooms.get(roomId(1))?.owner).toBe(searcher.device);
  });

  it('closes everything it opened when cancelled, hosting or greeting', async () => {
    vi.useFakeTimers();
    const server = new FakeServer();
    const host = search(server);
    await vi.advanceTimersByTimeAsync(0);
    host.controller.abort();
    expect(await host.done).toEqual({ kind: 'cancelled' });
    expect(server.rooms.size).toBe(0);

    silentHost(server, 0);
    await vi.advanceTimersByTimeAsync(0);
    const guest = search(server);
    await vi.advanceTimersByTimeAsync(0);
    expect(server.openChannels()).toBe(2);
    guest.controller.abort();
    expect(await guest.done).toEqual({ kind: 'cancelled' });
    await vi.advanceTimersByTimeAsync(0);
    expect(server.openChannels()).toBe(0);
    expect(guest.device.disposed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
