/**
 * The relays' credentials service (docs/multijoueur.md §5.2): a Cloudflare Worker that asks
 * Cloudflare's TURN for short-lived credentials and hands them to the game. The long-term key stays
 * here, in the Worker's secrets, never in the game nor in this repository. Only the game's own
 * pages are answered (their Origin), with no cache.
 *
 * Deployed by the owner with `npx wrangler deploy` from this folder (wrangler.toml), the key's
 * token set once with `npx wrangler secret put TURN_KEY_API_TOKEN`.
 */

export interface Env {
  /** The TURN key's id (Cloudflare dashboard, Realtime, TURN). Not a secret. */
  readonly TURN_KEY_ID: string;
  /** The TURN key's API token: a secret (`wrangler secret put`). */
  readonly TURN_KEY_API_TOKEN: string;
  /** The origins answered, comma separated: the game's pages. */
  readonly ALLOWED_ORIGINS: string;
}

/** How long the credentials hold: longer than a session of matches, short enough to expire. */
export const CREDENTIALS_TTL_S = 4 * 60 * 60;

const CLOUDFLARE = 'https://rtc.live.cloudflare.com/v1/turn/keys';

export async function handle(request: Request, env: Env, fetcher: typeof fetch): Promise<Response> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((entry) => entry.trim());
  if (!allowed.includes(origin)) return new Response('Forbidden', { status: 403 });
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'GET')
    return new Response('Method not allowed', { status: 405, headers: cors });
  const answer = await fetcher(
    `${CLOUDFLARE}/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl: CREDENTIALS_TTL_S }),
    },
  );
  // Cloudflare's own error stays here: the game only learns there is no relay now.
  if (!answer.ok) return new Response('Bad gateway', { status: 502, headers: cors });
  return new Response(await answer.text(), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env, fetch),
};
