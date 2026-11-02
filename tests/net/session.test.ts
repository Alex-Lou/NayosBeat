import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeMessage, parseMessage } from '../../src/net/protocol';
import {
  MAX_MESSAGES_PER_SECOND,
  PING_INTERVAL_MS,
  PING_SAMPLES,
  Session,
  SILENCE_MS,
  summarize,
  type PingSummary,
  type SessionEnd,
} from '../../src/net/session';
import { channelPair, FakeServer } from './fake-net';

/** A session on one end of a fake link, the clock the fake timers' own. */
function setup() {
  vi.useFakeTimers();
  const server = new FakeServer();
  const [mine, theirs] = channelPair(server);
  const updates: PingSummary[] = [];
  const ends: SessionEnd[] = [];
  const session = new Session(mine, () => Date.now(), {
    update: (summary) => updates.push(summary),
    ended: (reason) => ends.push(reason),
  });
  const received: unknown[] = [];
  theirs.listen({ message: (data) => received.push(parseMessage(data)), closed: () => undefined });
  return { server, mine, theirs, session, updates, ends, received };
}

describe('the link once paired (docs/multijoueur.md §4.3)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('pings every second and measures the round trip of each pong', async () => {
    const { theirs, updates, received } = setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(received).toEqual([{ type: 'ping', seq: 0 }]);
    await vi.advanceTimersByTimeAsync(12);
    theirs.send(encodeMessage({ type: 'pong', seq: 0 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(updates.at(-1)).toEqual({ last: 12, min: 12, median: 12, max: 12, count: 1, lost: 0 });
    await vi.advanceTimersByTimeAsync(PING_INTERVAL_MS - 12);
    expect(received.at(-1)).toEqual({ type: 'ping', seq: 1 });
  });

  it('answers a ping at once, and ignores a pong that is not for its last ping', async () => {
    const { theirs, updates, received } = setup();
    theirs.send(encodeMessage({ type: 'ping', seq: 41 }));
    theirs.send(encodeMessage({ type: 'pong', seq: 5 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(received).toContainEqual({ type: 'pong', seq: 41 });
    expect(updates).toHaveLength(0);
  });

  it('counts a ping lost when the next one leaves unanswered', async () => {
    const { theirs, updates } = setup();
    await vi.advanceTimersByTimeAsync(PING_INTERVAL_MS + 3);
    theirs.send(encodeMessage({ type: 'pong', seq: 1 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(updates.at(-1)).toMatchObject({ last: 3, lost: 1 });
  });

  it('ends a link silent for too long, and closes it', async () => {
    const { mine, ends } = setup();
    await vi.advanceTimersByTimeAsync(SILENCE_MS);
    expect(ends).toEqual([]);
    await vi.advanceTimersByTimeAsync(PING_INTERVAL_MS);
    expect(ends).toEqual(['silent']);
    expect(mine.isClosed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ends a link that speaks nonsense, and one the other side closed', async () => {
    const nonsense = setup();
    nonsense.theirs.send('{"v":1,"t":"ping","n":-1}');
    await vi.advanceTimersByTimeAsync(0);
    expect(nonsense.ends).toEqual(['protocol']);
    expect(nonsense.mine.isClosed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    const left = setup();
    left.theirs.close();
    await vi.advanceTimersByTimeAsync(0);
    expect(left.ends).toEqual(['left']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cuts a link that floods it, even with valid messages, but not one that keeps the pace', async () => {
    const steady = setup();
    for (let second = 0; second < 3; second++) {
      for (let seq = 0; seq < MAX_MESSAGES_PER_SECOND; seq++) {
        steady.theirs.send(encodeMessage({ type: 'ping', seq }));
      }
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(steady.ends).toEqual([]);
    steady.session.dispose();

    const flood = setup();
    for (let seq = 0; seq <= MAX_MESSAGES_PER_SECOND; seq++) {
      flood.theirs.send(encodeMessage({ type: 'ping', seq }));
    }
    await vi.advanceTimersByTimeAsync(0);
    expect(flood.ends).toEqual(['protocol']);
    expect(flood.mine.isClosed).toBe(true);
    // Answered up to the limit, never past it.
    const pongs = flood.mine.sent.filter((text) => parseMessage(text)?.type === 'pong');
    expect(pongs).toHaveLength(MAX_MESSAGES_PER_SECOND);
  });

  it('closes the link and its timer on dispose, telling no one', async () => {
    const { session, server, ends } = setup();
    session.dispose();
    await vi.advanceTimersByTimeAsync(SILENCE_MS * 2);
    expect(server.openChannels()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(ends).toEqual([]);
  });
});

describe('the ping summary', () => {
  it('gives the last, lowest, median and highest round trips, rounded', () => {
    expect(summarize([10.4, 30, 20.6], 3, 0)).toEqual({
      last: 21,
      min: 10,
      median: 21,
      max: 30,
      count: 3,
      lost: 0,
    });
    expect(summarize([10, 40, 20, 30], 9, 2)).toMatchObject({ median: 25, count: 9, lost: 2 });
    expect(summarize([], 0, 1)).toEqual({
      last: null,
      min: null,
      median: null,
      max: null,
      count: 0,
      lost: 1,
    });
  });

  it('keeps only the last round trips', async () => {
    const { theirs, updates } = setup();
    for (let seq = 0; seq <= PING_SAMPLES; seq++) {
      await vi.advanceTimersByTimeAsync(seq === 0 ? 500 : 0);
      theirs.send(encodeMessage({ type: 'pong', seq }));
      await vi.advanceTimersByTimeAsync(PING_INTERVAL_MS - (seq === 0 ? 500 : 0));
    }
    // The first, slow one is forgotten.
    expect(updates.at(-1)).toMatchObject({ max: 0, count: PING_SAMPLES + 1 });
    vi.useRealTimers();
  });
});
