/**
 * The service worker makes the installed game (PWA) play offline (see build/sw-template.js).
 * A new version is downloaded in the background while the game runs, and waits: a fight never
 * loses its files. It takes over at the next launch, before anything is played: the page asks
 * it to, then reloads once. Without this, an installed game that stays open in the background
 * would keep an old version (with its bugs) for as long as the phone keeps it alive.
 */
export function registerServiceWorker(): void {
  const container = navigator.serviceWorker;
  let asked = false;
  // Only the page that asked reloads: another one (a fight in a browser tab) plays on.
  container.addEventListener('controllerchange', () => {
    if (!asked) return;
    asked = false;
    window.location.reload();
  });
  container
    .register('./sw.js')
    .then((registration) => {
      // An update replaces the version in control; a first install has nothing to replace.
      if (!registration.waiting || !container.controller) return;
      asked = true;
      registration.waiting.postMessage('activate');
    })
    .catch(() => undefined);
}
