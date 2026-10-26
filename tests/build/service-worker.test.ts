import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { precacheList, serviceWorkerSource } from '../../build/service-worker';

const TEMPLATE = readFileSync(new URL('../../build/sw-template.js', import.meta.url), 'utf8');

describe('service worker', () => {
  it('caches the page, every built file and the public files, not source maps', () => {
    const files = precacheList(['index.html', 'assets/index-abc.js', 'assets/index-abc.js.map']);
    expect(files).toContain('./');
    expect(files).toContain('./index.html');
    expect(files).toContain('./assets/index-abc.js');
    expect(files).toContain('./manifest.webmanifest');
    expect(files).toContain('./icons/icon-512.png');
    expect(files.some((file) => file.endsWith('.map'))).toBe(false);
  });

  it('fills the template, with a version that changes with the files', () => {
    const a = serviceWorkerSource(TEMPLATE, ['./', './assets/a-1.js']);
    const b = serviceWorkerSource(TEMPLATE, ['./', './assets/a-2.js']);
    expect(a).not.toContain('__VERSION__');
    expect(a).not.toContain('__PRECACHE__');
    expect(a).toContain('"./assets/a-1.js"');
    const version = (source: string) => /const VERSION = '([0-9a-f]+)'/.exec(source)?.[1];
    expect(version(a)).toMatch(/^[0-9a-f]{8}$/);
    expect(version(a)).not.toBe(version(b));
  });
});
