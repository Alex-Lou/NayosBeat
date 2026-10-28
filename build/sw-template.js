/**
 * Service worker of the installed game (PWA), filled in at build time by
 * build/service-worker.ts: VERSION changes with every build, PRECACHE lists every file of it.
 * The whole game is cached on install, so it plays offline. A new version waits: a running
 * fight never loses its files. The page asks it to take over when nothing is being played (see
 * src/app/service-worker.ts), and only when no other window of the game still runs the old one.
 */

const VERSION = '__VERSION__';
const PRECACHE = /* __PRECACHE__ */ [];
const CACHE = `nayosbeat-${VERSION}`;
/** The built files: their names change with their content (Vite's hashes). */
const BUILT = './assets/';
/** On a network this slow, the installed game opens from its cache rather than wait. */
const SLOW_NETWORK_MS = 4000;
/**
 * With no cached page to fall back on, the network is waited for this much longer: then Chrome's
 * error page, rather than a blank window for as long as Chrome would wait.
 */
const GIVE_UP_MS = 20000;

self.addEventListener('install', (event) => {
  // A built file the page has just downloaded is the right one: no second download. The others
  // are checked with the server: a page cached a few minutes ago would point to the previous build.
  const requests = PRECACHE.map(
    (url) => new Request(url, { cache: url.startsWith(BUILT) ? 'default' : 'no-cache' }),
  );
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(requests)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // The page is requested while the worker wakes up: a launch from the icon finds it asleep.
      // This also keeps Chrome's own way of doing it (AutoPreload) away from the game: a bug
      // there (Chrome 143) left installed apps launched from the home screen on a blank page.
      self.registration.navigationPreload?.enable(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith('nayosbeat-') && key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
    ]),
  );
});

self.addEventListener('message', (event) => {
  if (event.data !== 'activate') return;
  // Taking over deletes the old cache: never under another window still playing the old build.
  // The origin may host other sites: only this game's windows count.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const ours = windows.filter((client) => client.url.startsWith(self.registration.scope));
      return ours.length <= 1 ? self.skipWaiting() : undefined;
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(event));
    return;
  }
  // Asked of the network only (the repair checks that the server answers): never the cache.
  if (request.cache === 'no-store') return;
  // Chrome reads the manifest to install the game and to update the installed app: the deployed
  // one (a cached one would install the previous version's settings).
  if (request.destination === 'manifest') {
    event.respondWith(manifest(request));
    return;
  }
  // Built files never change under the same name: the cache answers first.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});

/**
 * Network first, so a new deployment shows up at once; offline, on a very slow network or when
 * the server answers an error, the cached page (if there is none, the network is waited for).
 */
function page(event) {
  const asked = Promise.resolve(event.preloadResponse).then(
    (preloaded) => preloaded ?? fetch(event.request),
  );
  // The cached page loads its files by relative path: it works at the game's address only. A
  // deeper one (a typo, an old link) gets the server's answer.
  if (new URL('./', event.request.url).href !== self.registration.scope) return asked;
  const cached = () => caches.match('./index.html');
  const network = asked.then(followed).then((response) =>
    // A redirect (the address without its final slash) is followed by the browser.
    response.ok || response.type === 'opaqueredirect'
      ? response
      : cached().then((hit) => hit ?? response),
  );
  const slow = wait(SLOW_NETWORK_MS).then(() =>
    cached().then(
      (hit) => hit ?? Promise.race([network, wait(GIVE_UP_MS).then(() => Response.error())]),
    ),
  );
  return Promise.race([network, slow]).catch(() => cached().then((hit) => hit ?? Response.error()));
}

/**
 * The deployed manifest, checked with the server past the HTTP cache; offline, on a very slow
 * network or when the server answers an error, the cached one.
 */
function manifest(request) {
  const cached = () => caches.match(request);
  const network = fetch(request, { cache: 'no-cache' }).then((response) =>
    response.ok ? response : cached().then((hit) => hit ?? response),
  );
  const slow = wait(SLOW_NETWORK_MS).then(() => cached().then((hit) => hit ?? network));
  return Promise.race([network, slow]).catch(() => cached().then((hit) => hit ?? Response.error()));
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * A page reached through a redirect (the address without its final slash, say) cannot answer
 * a navigation as is: browsers refuse it and the installed game would not open. A copy can.
 */
function followed(response) {
  if (!response.redirected) return response;
  return response.blob().then(
    (body) =>
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }),
  );
}
