import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths: the build works from any sub-path (static hosting, Tauri).
  base: './',
  build: {
    // Phaser alone is ~1.4 MB minified (~360 kB gzip): warn only beyond that.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
