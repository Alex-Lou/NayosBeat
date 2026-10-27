/**
 * The service worker makes the installed game (PWA) play offline (see build/sw-template.js).
 * A new version downloads in the background and waits: a fight never loses its files. It takes
 * over when nothing is being played (`canReload`: the title screen or the main menu), at launch
 * or when the game comes back to the foreground: the page asks it to, then reloads once.
 * Without this, an installed game kept alive in the background would keep an old version (with
 * its bugs) for as long as the phone keeps it.
 */
export function registerServiceWorker(canReload: () => boolean): void {
  const container = navigator.serviceWorker;
  /** The version this page asked to take over: only its arrival reloads this page. */
  let asked: ServiceWorker | null = null;
  container.addEventListener('controllerchange', () => {
    if (!asked || container.controller !== asked) return;
    asked = null;
    window.location.reload();
  });

  const takeOver = (registration: ServiceWorkerRegistration): void => {
    const waiting = registration.waiting;
    // A first install has nothing to replace; a fight is never interrupted.
    if (!waiting || !container.controller || waiting === asked || !canReload()) return;
    asked = waiting;
    waiting.postMessage('activate');
  };

  container
    .register('./sw.js')
    .then((registration) => {
      takeOver(registration);
      // A version that finishes downloading while the player is on the menus.
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed') takeOver(registration);
        });
      });
      // Tapping the icon of an installed game kept in the background resumes it without
      // reloading: look for a new version then.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        takeOver(registration);
        registration.update().catch(() => undefined);
      });
    })
    .catch(() => undefined);
}
