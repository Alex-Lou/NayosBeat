/**
 * Service worker of the installed game (PWA), filled in at build time by
 * build/service-worker.ts: VERSION changes with every build, PRECACHE lists every file of it.
 * The whole game is cached on install, so it plays offline. A new version waits until the old
 * one is no longer used (all game windows closed): a running fight never loses its files.
 */

const VERSION = '__VERSION__';
const PRECACHE = /* __PRECACHE__ */ [];
const CACHE = `nayosbeat-${VERSION}`;

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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // Network first, so a new deployment shows up at once; offline, the cached page.
    event.respondWith(
      fetch(request)
        .then(followed)
        .catch(() => caches.match('./index.html').then((page) => page ?? Response.error())),
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
