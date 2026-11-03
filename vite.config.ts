import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { serviceWorker } from './build/service-worker';
import { TURN_ENDPOINT } from './src/net/ice-servers';

/**
 * Content-Security-Policy of the published game. Everything is served from the game's own
 * origin; Phaser needs `data:`/`blob:` images for its built-in textures. GitHub Pages cannot
 * send headers, hence a meta tag. Production only: the dev server injects scripts and styles.
 * The online mode's matchmaking server, PeerJS's, is reached over its WebSocket alone (the game
 * names its peers, so PeerJS never asks it an id over HTTPS); WebRTC itself, STUN included, is
 * outside `connect-src` (docs/multijoueur.md §6).
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // The relays' credentials service, once deployed (src/net/ice-servers.ts): its origin alone.
  `connect-src 'self' wss://0.peerjs.com${TURN_ENDPOINT ? ` ${new URL(TURN_ENDPOINT).origin}` : ''}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  // Relative asset paths: the build works from any sub-path (static hosting, Tauri).
  base: './',
  // Shown on the title screen: tells which version a player (or an installed game) runs.
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
  // The dev server opened from the phone by the PC's Tailscale name (docs/reprise.md): Vite
  // refuses unknown host names, and only the tailnet's are added. Dev only: no effect on the build.
  server: { allowedHosts: ['.ts.net'] },
  // The installed game (PWA) plays offline: see build/service-worker.ts.
  plugins: [contentSecurityPolicy(), serviceWorker()],
  build: {
    // Phaser alone is ~1.4 MB minified (~360 kB gzip): warn only beyond that.
    chunkSizeWarningLimit: 1500,
    // Phaser in a chunk of its own: an update of the game leaves it untouched, so browsers and
    // the offline cache keep it, and the game's own code stays small.
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }] } },
    },
    // Sprite strips stay separate files: a fight loads only its fighters' strips (and the second
    // colorway only in a mirror match), and the browser caches them, instead of base64 in the JS.
    assetsInlineLimit: 0,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // The art tests draw whole stages and the fighters' strips: under the full suite's parallel
    // load, a few of them pass 5 s. Their work is bounded, not hanging.
    testTimeout: 20_000,
    hookTimeout: 60_000,
    // A phone or a small machine runs the whole suite at once: cap the workers so the heavy
    // simulation tests are not starved of their share of the CPU.
    maxWorkers: 4,
    // A cached transform of src/art/nayo/index.ts keeps the strips its import.meta.glob found
    // back then: the strips `npm run sprites` adds would be missing from the tests.
    fsModuleCache: false,
    // `npm run bench` measures code run through Vite's module runner, which reads every
    // imported name through a getter; the bundled game does not, so the reading is an upper
    // bound, and counting those reads to warn about it would only add to the overhead.
    benchmark: { suppressExportGetterWarnings: true },
  },
});
