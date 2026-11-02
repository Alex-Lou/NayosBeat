import { describe, expect, it, vi } from 'vitest';
import { iceServers, parseIceServers, STUN_ONLY } from '../../src/net/ice-servers';

/** Cloudflare's answer, as its documentation shows it (made-up credentials). */
const CLOUDFLARE = {
  iceServers: [
    { urls: ['stun:stun.cloudflare.com:3478'] },
    {
      urls: [
        'turn:turn.cloudflare.com:3478?transport=udp',
        'turn:turn.cloudflare.com:3478?transport=tcp',
        'turns:turn.cloudflare.com:5349?transport=tcp',
        'turn:turn.cloudflare.com:443?transport=udp',
        'turn:turn.cloudflare.com:80?transport=tcp',
        'turns:turn.cloudflare.com:443?transport=tcp',
      ],
      username: 'test-username',
      credential: 'test-credential',
    },
  ],
};

function answering(body: unknown, ok = true): typeof fetch {
  return vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response));
}

describe('the servers both devices meet through (docs/multijoueur.md §5.1)', () => {
  it('takes Cloudflare’s answer as it is', () => {
    expect(parseIceServers(CLOUDFLARE)).toEqual(CLOUDFLARE.iceServers);
  });

  it('refuses anything else: no relay without its credentials, no odd address, no port 53', () => {
    const [stun, turn] = CLOUDFLARE.iceServers;
    const refused: unknown[] = [
      null,
      'servers',
      {},
      { iceServers: [] },
      { iceServers: Array.from({ length: 5 }, () => stun) },
      { iceServers: [{ ...turn, username: undefined }] },
      { iceServers: [{ ...turn, credential: 7 }] },
      { iceServers: [{ ...turn, credential: 'x'.repeat(513) }] },
      { iceServers: [{ urls: [] }] },
      { iceServers: [{ urls: Array.from({ length: 9 }, () => 'stun:a.b') }] },
      { iceServers: [{ urls: ['https://evil.example'] }] },
      { iceServers: [{ urls: ['stun:a.b:53'] }] },
      { iceServers: [{ urls: ['turn:a.b:53?transport=udp'], username: 'u', credential: 'c' }] },
      { iceServers: [{ urls: ['stun:a b'] }] },
    ];
    for (const data of refused) expect(parseIceServers(data), JSON.stringify(data)).toBeNull();
    // The extra fields an answer may carry are left out.
    expect(parseIceServers({ iceServers: [{ urls: 'stun:a.b:3478', extra: 1 }] })).toEqual([
      { urls: ['stun:a.b:3478'] },
    ]);
  });

  it('searches with the STUN server alone without the service, or when it fails', async () => {
    const never = vi.fn();
    expect(await iceServers('', never as unknown as typeof fetch)).toEqual(STUN_ONLY);
    expect(never).not.toHaveBeenCalled();
    const url = 'https://turn.example.workers.dev/';
    expect(await iceServers(url, answering(CLOUDFLARE))).toEqual([
      ...STUN_ONLY,
      ...CLOUDFLARE.iceServers,
    ]);
    expect(await iceServers(url, answering(CLOUDFLARE, false))).toEqual(STUN_ONLY);
    expect(await iceServers(url, answering({ iceServers: 'none' }))).toEqual(STUN_ONLY);
    const offline = vi.fn(() => Promise.reject(new Error('offline')));
    expect(await iceServers(url, offline)).toEqual(STUN_ONLY);
  });

  it('does not wait for a service that takes too long', async () => {
    vi.useFakeTimers();
    const slow = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        }),
    );
    // A quick answer leaves no timer behind.
    await iceServers('https://turn.example.workers.dev/', answering(CLOUDFLARE), 100);
    expect(vi.getTimerCount()).toBe(0);
    const servers = iceServers('https://turn.example.workers.dev/', slow, 100);
    await vi.advanceTimersByTimeAsync(100);
    expect(await servers).toEqual(STUN_ONLY);
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
