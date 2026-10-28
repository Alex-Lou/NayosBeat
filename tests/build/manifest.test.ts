import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Manifest {
  readonly id?: string;
  readonly start_url: string;
  readonly scope: string;
  readonly display: string;
  readonly display_override?: readonly string[];
  readonly orientation?: string;
}

const MANIFEST = JSON.parse(
  readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8'),
) as Manifest;

/** Where GitHub Pages serves it: the game lives in a folder of an origin shared with other sites. */
const DEPLOYED = 'https://example.github.io/NayosBeat/manifest.webmanifest';

describe('manifest', () => {
  it('names the game by its own folder, not by the whole origin', () => {
    const start = new URL(MANIFEST.start_url, DEPLOYED);
    // The spec resolves `id` against the origin, not the manifest: "./" would name the origin's
    // root, shared with every other site of that origin. Without `id`, the start URL names it.
    const id = MANIFEST.id === undefined ? start : new URL(MANIFEST.id, start.origin);
    expect(id.href).toBe('https://example.github.io/NayosBeat/');
  });

  it('opens on the game, inside its scope', () => {
    const start = new URL(MANIFEST.start_url, DEPLOYED).href;
    const scope = new URL(MANIFEST.scope, DEPLOYED).href;
    expect(start).toBe('https://example.github.io/NayosBeat/');
    expect(start.startsWith(scope)).toBe(true);
  });

  it('opens as a plain app window, in the orientation the phone is held', () => {
    // The installed app must open from a portrait home screen without a rotation or a fullscreen
    // switch at launch; the game itself goes fullscreen and landscape on the first touch.
    expect(MANIFEST.display).toBe('standalone');
    expect(MANIFEST.display_override).toBeUndefined();
    expect(MANIFEST.orientation).toBeUndefined();
  });
});
