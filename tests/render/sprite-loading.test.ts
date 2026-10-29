import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import type { FighterArt } from '../../src/art/types';
import { loadArt } from '../../src/render/art-textures';

/** Texture keys that `loadArt` asks the scene to load, nothing being in the cache yet. */
function loadedKeys(art: FighterArt = NAYO): string[] {
  const keys: string[] = [];
  const scene = {
    textures: { exists: () => false },
    load: {
      spritesheet: (key: string) => {
        keys.push(key);
      },
    },
  } as unknown as Phaser.Scene;
  loadArt(scene, art);
  return keys;
}

describe('loadArt', () => {
  it('loads every strip a clip plays, with its effects', () => {
    const keys = loadedKeys();
    const sheets = [...Object.values(NAYO.clips).map((clip) => clip.sheet), 'projectile'];
    for (const sheet of sheets) {
      expect(keys).toContain(`nayo/${sheet}`);
      if (NAYO.fx?.[sheet] !== undefined) expect(keys).toContain(`nayo/fx/${sheet}`);
    }
  });

  it('leaves out the strips drawn ahead of their gameplay, that no clip plays', () => {
    // Whatever Nayo has drawn ahead now (the Mégabasse, until its clip comes with the super), one
    // more stands in, with its effects.
    const ahead: FighterArt = {
      ...NAYO,
      sheets: { ...NAYO.sheets, ahead: { frames: 2 } },
      urls: { ...NAYO.urls, ahead: 'ahead.png' },
      fx: { ...NAYO.fx, ahead: 'fx/ahead.png' },
    };
    const played = new Set([...Object.values(NAYO.clips).map((clip) => clip.sheet), 'projectile']);
    const unplayed = Object.keys(ahead.urls).filter((sheet) => !played.has(sheet));
    expect(unplayed).toContain('ahead');
    const keys = loadedKeys(ahead);
    for (const sheet of unplayed) {
      expect(keys).not.toContain(`nayo/${sheet}`);
      expect(keys).not.toContain(`nayo/fx/${sheet}`);
    }
    expect(keys).toHaveLength(new Set(keys).size);
  });
});
