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
  // The init is kept for the assertions (the fake network answers by address only).
  const fetchSpy = vi.fn((...[request]: [FakeRequest, RequestInit?]) => network(request));
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
  /** The worker's answer, or undefined when it leaves the request to the browser. */
  const dispatch = (
    request: FakeRequest,
    preloadResponse?: Promise<Response>,
  ): Promise<Response> | undefined => {
    let answer: Promise<Response> | undefined;
    listeners.get('fetch')?.({
      request,
      preloadResponse,
      respondWith: (promise: Promise<Response>) => (answer = promise),
    });
    return answer;
  };
  const request = (path: string, mode = 'cors', destination = '', cache = 'default') =>
    dispatch({ url: absolute(path), method: 'GET', mode, destination, cache });
  const answer = (path: string, mode = 'cors', destination = ''): Promise<Response> => {
    const answered = request(path, mode, destination);
    if (!answered) throw new Error(`the worker did not answer ${path}`);
    return answered;
  };
  const navigate = (preloadResponse?: Promise<Response>, path = ''): Promise<Response> => {
    const answered = dispatch(
      { url: absolute(path), method: 'GET', mode: 'navigate', destination: 'document' },
      preloadResponse,
    );
    if (!answered) throw new Error('the worker did not answer the navigation');
    return answered;
  };

  return {
    fetchSpy,
    stored,
    navigationPreload,
    lifecycle,
    request,
    answer,
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
  it('reuses the built files the page downloaded, and checks the others with the server', async () => {
    const worker = startWorker(deployed);
    await worker.lifecycle('install');
    const modes = Object.fromEntries(
      worker.fetchSpy.mock.calls.map(([request]) => [new URL(request.url).pathname, request.cache]),
    );
    expect(modes).toEqual({
      '/NayosBeat/': 'no-cache',
      '/NayosBeat/index.html': 'no-cache',
      '/NayosBeat/assets/index-abc12345.js': 'default',
      '/NayosBeat/boot.js': 'no-cache',
      '/NayosBeat/manifest.webmanifest': 'no-cache',
    });
  });

  it('turns navigation preload on, and deletes only the previous versions of the game', async () => {
    const worker = await installed(deployed);
    worker.stored.set('nayosbeat-0ld0ld00', new Map());
    worker.stored.set('another-site', new Map());
    await worker.lifecycle('activate');
    expect(worker.navigationPreload.enable).toHaveBeenCalledOnce();
    expect([...worker.stored.keys()]).toEqual([
      expect.stringMatching(/^nayosbeat-[0-9a-f]{8}$/),
      'another-site',
    ]);
  });

  it('opens the game with the page requested while it woke up, without asking twice', async () => {
    const worker = await installed(served('deployed'));
    const page = await worker.navigate(Promise.resolve(new Response('preloaded')));
    expect(await page.text()).toBe('preloaded');
    expect(worker.fetchSpy).not.toHaveBeenCalled();
  });

  it('asks the network itself where navigation preload is not supported', async () => {
    const worker = await installed(served('deployed'));
    expect(await (await worker.navigate()).text()).toBe('deployed');
  });

  it('opens the cached game when the server answers an error', async () => {
    const worker = await installed(served('Not Found', 404));
    const page = await worker.navigate(Promise.resolve(new Response('Not Found', { status: 503 })));
    expect(await page.text()).toBe('cached /NayosBeat/index.html');
  });

  it('leaves an address deeper than the game to the server: the cached page would not find its files there', async () => {
    const worker = await installed(served('Not Found', 404));
    const page = await worker.navigate(
      Promise.resolve(new Response('Not Found', { status: 404 })),
      'assets/index-0ld0ld00.js',
    );
    expect(page.status).toBe(404);
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

  it('gives up on a network that never answers when no game is cached, instead of a blank window', async () => {
    vi.useFakeTimers();
    const worker = startWorker(stalled);
    let settled = false;
    const page = worker.navigate().then((response) => {
      settled = true;
      return response;
    });
    await vi.advanceTimersByTimeAsync(23_000);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1_000);
    expect((await page).type).toBe('error');
  });

  it('reads the deployed manifest, checked with the server past the HTTP cache', async () => {
    const worker = await installed(served('{"name":"deployed"}'));
    const manifest = await worker.answer('manifest.webmanifest', 'cors', 'manifest');
    expect(await manifest.text()).toBe('{"name":"deployed"}');
    expect(worker.fetchSpy.mock.calls[0]?.[1]).toEqual({ cache: 'no-cache' });
  });

  it('reads the cached manifest offline, on a server error, or after 4 s of a stalled network', async () => {
    const cachedManifest = 'cached /NayosBeat/manifest.webmanifest';
    const worker = await installed(offline);
    const read = async () =>
      (await worker.answer('manifest.webmanifest', 'cors', 'manifest')).text();
    expect(await read()).toBe(cachedManifest);
    worker.setNetwork(served('Service Unavailable', 503));
    expect(await read()).toBe(cachedManifest);
    vi.useFakeTimers();
    worker.setNetwork(stalled);
    const stalledRead = read();
    await vi.advanceTimersByTimeAsync(4000);
    expect(await stalledRead).toBe(cachedManifest);
  });

  it('leaves a request made for the network only to the browser (the repair checks the server)', async () => {
    const worker = await installed(served('network'));
    expect(worker.request('sw.js', 'cors', '', 'no-store')).toBeUndefined();
  });

  it('serves the built files from the cache first', async () => {
    const worker = await installed(served('network'));
    const script = await worker.answer('assets/index-abc12345.js', 'cors', 'script');
    expect(await script.text()).toBe('cached /NayosBeat/assets/index-abc12345.js');
    expect(worker.fetchSpy).not.toHaveBeenCalled();
  });
});
