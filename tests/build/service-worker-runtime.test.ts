import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { serviceWorkerSource } from '../../build/service-worker';

const TEMPLATE = readFileSync(new URL('../../build/sw-template.js', import.meta.url), 'utf8');
const SCOPE = 'https://example.github.io/NayosBeat/';
const FILES = [
  './',
  './index.html',
  './assets/index-abc12345.js',
  './boot.js',
  './manifest.webmanifest',
];

/** What the worker reads of a request (a navigation cannot be built with `new Request`). */
interface FakeRequest {
  readonly url: string;
  readonly method: string;
  readonly mode: string;
  readonly destination: string;
  readonly cache?: string;
}

type Network = (request: FakeRequest) => Promise<Response>;
type Listener = (event: unknown) => void;

const absolute = (input: string | FakeRequest): string =>
  new URL(typeof input === 'string' ? input : input.url, SCOPE).href;

/**
 * The generated worker, run in a stand-in of its global scope: its listeners are kept, its
 * caches are maps, its network is `network` (swappable between steps).
 */
function startWorker(firstNetwork: Network) {
  let network = firstNetwork;
  const fetchSpy = vi.fn((request: FakeRequest) => network(request));
  const listeners = new Map<string, Listener>();
  const stored = new Map<string, Map<string, Response>>();
  const caches = {
    open: (name: string) => {
      const cache = stored.get(name) ?? new Map<string, Response>();
      stored.set(name, cache);
      return Promise.resolve({
        addAll: async (requests: FakeRequest[]) => {
          for (const request of requests) cache.set(request.url, await fetchSpy(request));
        },
        put: (request: FakeRequest, response: Response) => {
          cache.set(absolute(request), response);
          return Promise.resolve();
        },
      });
    },
    keys: () => Promise.resolve([...stored.keys()]),
    delete: (name: string) => Promise.resolve(stored.delete(name)),
    match: (input: string | FakeRequest) => {
      for (const cache of stored.values()) {
        const hit = cache.get(absolute(input));
        if (hit) return Promise.resolve(hit.clone());
      }
      return Promise.resolve(undefined);
    },
  };
  /** Relative addresses resolve against the worker's scope, as in a browser. */
  class ScopedRequest extends Request {
    constructor(input: string, init?: RequestInit) {
      super(new URL(input, SCOPE), init);
    }
  }
  const navigationPreload = { enable: vi.fn(() => Promise.resolve()) };
  const self = {
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    location: new URL('sw.js', SCOPE),
    registration: { scope: SCOPE, navigationPreload },
  };
  const source = serviceWorkerSource(TEMPLATE, FILES);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs the generated worker
  const run = new Function('self', 'caches', 'fetch', 'Request', source) as (
    ...scope: unknown[]
  ) => void;
  run(self, caches, fetchSpy, ScopedRequest);

  const lifecycle = async (type: 'install' | 'activate'): Promise<void> => {
    let done: Promise<unknown> = Promise.resolve();
    listeners.get(type)?.({ waitUntil: (promise: Promise<unknown>) => (done = promise) });
    await done;
  };
  const request = (path: string, mode = 'cors', destination = ''): Promise<Response> => {
    let answer: Promise<Response> | undefined;
    listeners.get('fetch')?.({
      request: { url: absolute(path), method: 'GET', mode, destination },
      preloadResponse: undefined,
      respondWith: (promise: Promise<Response>) => (answer = promise),
    });
    if (!answer) throw new Error(`the worker did not answer ${path}`);
    return answer;
  };
  const navigate = (preloadResponse?: Promise<Response>): Promise<Response> => {
    let answer: Promise<Response> | undefined;
    listeners.get('fetch')?.({
      request: { url: SCOPE, method: 'GET', mode: 'navigate', destination: 'document' },
      preloadResponse,
      respondWith: (promise: Promise<Response>) => (answer = promise),
    });
    if (!answer) throw new Error('the worker did not answer the navigation');
    return answer;
  };

  return {
    fetchSpy,
    stored,
    navigationPreload,
    lifecycle,
    request,
    navigate,
    setNetwork: (next: Network) => {
      network = next;
    },
  };
}

const served =
  (body: string, status = 200): Network =>
  () =>
    Promise.resolve(new Response(body, { status }));
/** The deployed files, each answering its own address. */
const deployed: Network = (request) =>
  Promise.resolve(new Response(`cached ${new URL(request.url).pathname}`));
const offline: Network = () => Promise.reject(new TypeError('Failed to fetch'));
const stalled: Network = () => new Promise<Response>(() => undefined);

/** A worker installed with the deployed files, then given `network`. */
async function installed(network: Network) {
  const worker = startWorker(deployed);
  await worker.lifecycle('install');
  worker.setNetwork(network);
  worker.fetchSpy.mockClear();
  return worker;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('service worker at work', () => {
  it('asks the network itself where navigation preload is not supported', async () => {
    const worker = await installed(served('deployed'));
    expect(await (await worker.navigate()).text()).toBe('deployed');
  });

  it('lets the browser follow a redirect', async () => {
    const redirect = { type: 'opaqueredirect', ok: false, status: 0, redirected: false };
    const worker = await installed(() => Promise.resolve(redirect as Response));
    expect(await worker.navigate()).toBe(redirect);
  });

  it('opens the cached game offline', async () => {
    const worker = await installed(offline);
    expect(await (await worker.navigate()).text()).toBe('cached /NayosBeat/index.html');
  });

  it('opens the cached game after 4 s on a network that does not answer', async () => {
    vi.useFakeTimers();
    const worker = await installed(stalled);
    const page = worker.navigate();
    await vi.advanceTimersByTimeAsync(4000);
    expect(await (await page).text()).toBe('cached /NayosBeat/index.html');
  });

  it('reads the deployed manifest, the cached one only offline', async () => {
    const worker = await installed(served('{"name":"deployed"}'));
    const manifest = await worker.request('manifest.webmanifest', 'cors', 'manifest');
    expect(await manifest.text()).toBe('{"name":"deployed"}');
    worker.setNetwork(offline);
    const offlineManifest = await worker.request('manifest.webmanifest', 'cors', 'manifest');
    expect(await offlineManifest.text()).toBe('cached /NayosBeat/manifest.webmanifest');
  });

  it('serves the built files from the cache first', async () => {
    const worker = await installed(served('network'));
    const script = await worker.request('assets/index-abc12345.js', 'cors', 'script');
    expect(await script.text()).toBe('cached /NayosBeat/assets/index-abc12345.js');
    expect(worker.fetchSpy).not.toHaveBeenCalled();
  });
});
