/**
 * Startup guard, run before the game's code: if the game cannot start (a file missing from an
 * old install, an error, a stall), the boot screen says so instead of staying blank, and
 * offers to repair the install (forget the cached files, then reload). main.ts removes the
 * boot screen once the game has started.
 */
(function () {
  var STALL_MS = 12000;

  function booting() {
    return document.getElementById('boot') !== null;
  }

  function fail(text) {
    if (!booting()) return;
    var status = document.getElementById('boot-status');
    var repair = document.getElementById('boot-repair');
    if (status) status.textContent = text;
    if (repair) repair.hidden = false;
  }

  function repair() {
    var steps = [];
    if ('serviceWorker' in navigator) {
      steps.push(
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
          return Promise.all(
            registrations.map(function (registration) {
              return registration.unregister();
            }),
          );
        }),
      );
    }
    if ('caches' in window) {
      steps.push(
        caches.keys().then(function (keys) {
          return Promise.all(
            keys.map(function (key) {
              return caches.delete(key);
            }),
          );
        }),
      );
    }
    Promise.all(steps)
      .catch(function () {
        return undefined;
      })
      .then(function () {
        location.reload();
      });
  }

  // Capture: a script or style that fails to load does not bubble.
  window.addEventListener(
    'error',
    function (event) {
      fail('Le jeu n’a pas pu démarrer : ' + (event.message || 'un fichier est introuvable') + '.');
    },
    true,
  );
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    fail(
      'Le jeu n’a pas pu démarrer : ' + (reason && reason.message ? reason.message : reason) + '.',
    );
  });
  setTimeout(function () {
    fail('Le jeu met trop de temps à démarrer.');
  }, STALL_MS);
  document.addEventListener('click', function (event) {
    if (event.target instanceof Element && event.target.id === 'boot-repair') repair();
  });
})();
