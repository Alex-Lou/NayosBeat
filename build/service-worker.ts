import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

const TEMPLATE = new URL('./sw-template.js', import.meta.url);

/** Files copied from public/ as they are (not part of the bundle), cached with it. */
const PUBLIC_FILES = [
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

/** Everything the installed game needs offline: the page, the built files, the public files. */
export function precacheList(bundleFiles: readonly string[]): string[] {
  const built = bundleFiles.filter(
    (file) => !file.endsWith('.map') && file !== 'sw.js' && file !== 'index.html',
  );
  // The page itself, under both of its addresses (the offline fallback asks for index.html).
  return ['./', './index.html', ...[...built, ...PUBLIC_FILES].map((file) => `./${file}`)];
}

/** The service worker's source: the template with this build's version and file list. */
export function serviceWorkerSource(template: string, files: readonly string[]): string {
  const version = fnv1a(files.join('\n')).toString(16).padStart(8, '0');
  return template
    .replace("'__VERSION__'", `'${version}'`)
    .replace('/* __PRECACHE__ */ []', JSON.stringify(files, null, 2));
}

/** 32-bit FNV-1a: enough to tell builds apart. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Writes sw.js next to index.html in production builds (see build/sw-template.js). */
export function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = precacheList(Object.keys(bundle));
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorkerSource(readFileSync(TEMPLATE, 'utf8'), files),
      });
    },
  };
}
