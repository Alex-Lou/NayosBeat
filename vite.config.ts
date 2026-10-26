import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Content-Security-Policy of the published game. Everything is served from the game's own
 * origin; Phaser needs `data:`/`blob:` images for its built-in textures. GitHub Pages cannot
 * send headers, hence a meta tag. Production only: the dev server injects scripts and styles.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
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
  plugins: [contentSecurityPolicy()],
  build: {
    // Phaser alone is ~1.4 MB minified (~360 kB gzip): warn only beyond that.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
