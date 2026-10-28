/**
 * Startup guard, run before the game's code: if the game cannot start (a file missing from an
 * old install, an error, a stall), the boot screen says so instead of staying blank, and
 * offers to repair the install (forget the cached files, then reload). main.ts removes the
 * boot screen once the game has started.
 */
(function () {
  /** Once every file has arrived, starting takes well under this. */
  var STALL_MS = 12000;
  /** A file still missing after this long is not coming (a slow network is waited for). */
  var GIVE_UP_MS = 60000;
  /** Before forgetting the install, the server must answer within this. */
  var PROBE_MS = 5000;

  function booting() {
    return document.getElementById('boot') !== null;
  }

  /** A failure is already on screen (here or from main.ts): the first cause says the most. */
  function reported() {
    var repair = document.getElementById('boot-repair');
    return repair !== null && !repair.hidden;
  }

  function fail(text) {
    if (!booting() || reported()) return;
    var status = document.getElementById('boot-status');
    var repair = document.getElementById('boot-repair');
    if (status) status.textContent = text;
    if (repair) repair.hidden = false;
  }

  /**
   * The game's server answers (a connected but dead network, or a captive portal, does not).
   * sw.js is never cached, so asking for it reaches the network.
   */
  function reachable() {
    if (navigator.onLine === false) return Promise.resolve(false);
    var probe = fetch('./sw.js', { cache: 'no-store' }).then(
      function (response) {
        return response.ok;
      },
      function () {
        return false;
      },
    );
    var timeout = new Promise(function (resolve) {
      setTimeout(function () {
        resolve(false);
      }, PROBE_MS);
    });
    return Promise.race([probe, timeout]);
  }

  /**
   * Without the server, the install is the only copy of the game: forgetting it would leave
   * nothing to start.
   */
  function repair() {
    var button = document.getElementById('boot-repair');
    if (button) button.disabled = true;
    reachable().then(function (online) {
      if (online) {
        forget();
        return;
      }
      var status = document.getElementById('boot-status');
      if (status) status.textContent = 'Connecte-toi à Internet, puis réessaie la réparation.';
      if (button) button.disabled = false;
    });
  }

  /** Forgets this game's install only: the origin may host other sites with their own. */
  function forget() {
    var scope = new URL('./', location.href).href;
    var steps = [];
    if ('serviceWorker' in navigator) {
      steps.push(
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
          return Promise.all(
            registrations
              .filter(function (registration) {
                return registration.scope === scope;
              })
              .map(function (registration) {
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
            keys
              .filter(function (key) {
                return key.indexOf('nayosbeat-') === 0;
              })
              .map(function (key) {
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
  var startedAt = Date.now();
  function watch() {
    if (!booting() || reported()) return;
    if (document.readyState !== 'complete' && Date.now() - startedAt < GIVE_UP_MS) {
      setTimeout(watch, 2000);
      return;
    }
    fail('Le jeu met trop de temps à démarrer.');
  }
  setTimeout(watch, STALL_MS);
  document.addEventListener('click', function (event) {
    if (event.target instanceof Element && event.target.id === 'boot-repair') repair();
  });
})();
