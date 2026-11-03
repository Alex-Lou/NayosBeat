/**
 * The servers that help both devices reach each other (docs/multijoueur.md §5, §5.1): Google's free
 * public STUN server, always; and, once its service is deployed, Cloudflare's relays (TURN), whose
 * short-lived credentials the game asks a small service of its own (tools/turn-worker) as a search
 * starts. Without the service, or when it fails, the game searches with the STUN server alone: on
 * the same Wi-Fi nothing changes, the link is direct.
 */

/** Always there: the STUN server alone (the relays of PeerJS, stopped in December 2023, are gone). */
export const STUN_ONLY: readonly RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * The relays' credentials service (tools/turn-worker, docs/multijoueur.md §5.2), as its
 * owner deployed it; '' until then. The CSP opens to its origin, and to nothing else.
 */
export const TURN_ENDPOINT: string = '';

/** How long the service may take: past it, the search starts with the STUN server alone. */
export const TURN_TIMEOUT_MS = 3000;

/** A STUN or TURN address: a host, maybe a port (never 53, which browsers block), maybe a transport. */
const ICE_URL = /^(stun|turns?):[a-z0-9.-]{1,253}(:(?!53(\?|$))\d{1,5})?(\?transport=(udp|tcp))?$/i;

/**
 * The servers the service answered (`{ iceServers: [...] }`), or null when it is anything else:
 * 1 to 4 entries, each with 1 to 8 addresses, and a relay always with both its username and
 * credential (short strings). Nothing else is kept.
 */
export function parseIceServers(data: unknown): RTCIceServer[] | null {
  if (typeof data !== 'object' || data === null) return null;
  const servers = (data as { iceServers?: unknown }).iceServers;
  if (!Array.isArray(servers) || servers.length < 1 || servers.length > 4) return null;
  const parsed: RTCIceServer[] = [];
  for (const server of servers) {
    const entry = parseServer(server);
    if (!entry) return null;
    parsed.push(entry);
  }
  return parsed;
}

function parseServer(server: unknown): RTCIceServer | null {
  if (typeof server !== 'object' || server === null) return null;
  const { urls, username, credential } = server as Record<string, unknown>;
  const list = typeof urls === 'string' ? [urls] : urls;
  if (!Array.isArray(list) || list.length < 1 || list.length > 8) return null;
  if (!list.every((url) => typeof url === 'string' && ICE_URL.test(url))) return null;
  const addresses = list as string[];
  const relay = addresses.some((url) => /^turns?:/i.test(url));
  if (!relay) return { urls: addresses };
  if (!isSecret(username) || !isSecret(credential)) return null;
  return { urls: addresses, username, credential };
}

function isSecret(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 512;
}

/**
 * The servers to search with: the STUN server, and the relays `endpoint` gives (none when it is
 * '', fails, takes longer than `timeoutMs` or answers anything but servers).
 */
export async function iceServers(
  endpoint: string,
  fetcher: typeof fetch,
  timeoutMs = TURN_TIMEOUT_MS,
): Promise<RTCIceServer[]> {
  if (endpoint === '') return [...STUN_ONLY];
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetcher(endpoint, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) return [...STUN_ONLY];
    const relays = parseIceServers(await response.json());
    return relays ? [...STUN_ONLY, ...relays] : [...STUN_ONLY];
  } catch {
    return [...STUN_ONLY];
  } finally {
    clearTimeout(timer);
  }
}
