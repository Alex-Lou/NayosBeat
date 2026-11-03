import { describe, expect, it, vi } from 'vitest';
import { CREDENTIALS_TTL_S, handle, type Env } from '../../tools/turn-worker/worker';

const ENV: Env = {
  TURN_KEY_ID: 'key-1',
  TURN_KEY_API_TOKEN: 'secret-token',
  ALLOWED_ORIGINS: 'https://alex-lou.github.io, http://localhost:5173',
};
const GAME = 'https://alex-lou.github.io';

function request(origin: string | null, method = 'GET'): Request {
  return new Request('https://nayosbeat-turn.example.workers.dev/', {
    method,
    headers: origin ? { Origin: origin } : {},
  });
}

describe('the relays’ credentials service (docs/multijoueur.md §5.2)', () => {
  it('asks Cloudflare for short-lived credentials, its key kept secret, for the game alone', async () => {
    const answer = JSON.stringify({ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }] });
    const cloudflare = vi.fn(() => Promise.resolve(new Response(answer, { status: 201 })));
    const response = await handle(request(GAME), ENV, cloudflare);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(answer);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(GAME);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const [url, init] = (cloudflare.mock.calls[0] ?? []) as unknown as [string, RequestInit];
    expect(url).toBe(
      'https://rtc.live.cloudflare.com/v1/turn/keys/key-1/credentials/generate-ice-servers',
    );
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer secret-token' });
    expect(init.body).toBe(JSON.stringify({ ttl: CREDENTIALS_TTL_S }));
    // The secret never leaves in the answer.
    expect(JSON.stringify([...response.headers])).not.toContain('secret-token');
  });

  it('answers no other page, method, nor Cloudflare’s own errors', async () => {
    const cloudflare = vi.fn(() =>
      Promise.resolve(new Response('{"error":"secret-token bad"}', { status: 401 })),
    );
    expect((await handle(request('https://evil.example'), ENV, cloudflare)).status).toBe(403);
    expect((await handle(request(null), ENV, cloudflare)).status).toBe(403);
    expect((await handle(request(GAME, 'POST'), ENV, cloudflare)).status).toBe(405);
    expect((await handle(request(GAME, 'OPTIONS'), ENV, cloudflare)).status).toBe(204);
    expect(cloudflare).not.toHaveBeenCalled();
    const failed = await handle(request(GAME), ENV, cloudflare);
    expect(failed.status).toBe(502);
    expect(await failed.text()).not.toContain('secret-token');
  });
});
