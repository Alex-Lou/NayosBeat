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
/** On a network this slow, the installed game opens from its cache rather than wait. */
const SLOW_NETWORK_MS = 4000;

self.addEventListener('install', (event) => {
  // Past the HTTP cache: a page cached a few minutes ago would point to the previous build.
  const requests = PRECACHE.map((url) => new Request(url, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(requests)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('nayosbeat-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
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
    event.respondWith(page(request));
    return;
  }
  // Chrome reads the manifest to install the game and to update the installed app: always the
  // deployed one (a cached one would install the previous version's settings).
  if (request.destination === 'manifest') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((hit) => hit ?? Response.error())),
    );
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
 * Network first, so a new deployment shows up at once; offline or on a very slow network, the
 * cached page (if there is none yet, the network is waited for).
 */
function page(request) {
  const network = fetch(request).then(followed);
  const cached = () => caches.match('./index.html');
  const slow = new Promise((resolve) => {
    setTimeout(resolve, SLOW_NETWORK_MS);
  }).then(() => cached().then((hit) => hit ?? network));
  return Promise.race([network, slow]).catch(() => cached().then((hit) => hit ?? Response.error()));
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
