/**
 * Service worker of the installed game (PWA), filled in at build time by
 * build/service-worker.ts: VERSION changes with every build, PRECACHE lists every file of it.
 * The whole game is cached on install, so it plays offline. A new version waits: a running
 * fight never loses its files. The page asks it to take over at the next launch (see
 * src/app/service-worker.ts).
 */

const VERSION = '__VERSION__';
const PRECACHE = /* __PRECACHE__ */ [];
const CACHE = `nayosbeat-${VERSION}`;
/** On a network this slow, the installed game opens from its cache rather than wait. */
const SLOW_NETWORK_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
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
  if (event.data === 'activate') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(request));
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
