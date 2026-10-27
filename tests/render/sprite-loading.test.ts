import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { loadArt } from '../../src/render/sprite-fighter-view';

/** Texture keys that `loadArt` asks the scene to load, nothing being in the cache yet. */
function loadedKeys(): string[] {
  const keys: string[] = [];
  const scene = {
    textures: { exists: () => false },
    load: {
      spritesheet: (key: string) => {
        keys.push(key);
      },
    },
  } as unknown as Phaser.Scene;
  loadArt(scene, NAYO);
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
    const played = new Set([...Object.values(NAYO.clips).map((clip) => clip.sheet), 'projectile']);
    const unplayed = Object.keys(NAYO.urls).filter((sheet) => !played.has(sheet));
    expect(unplayed).toContain('dashForward');
    const keys = loadedKeys();
    for (const sheet of unplayed) {
      expect(keys).not.toContain(`nayo/${sheet}`);
      expect(keys).not.toContain(`nayo/fx/${sheet}`);
    }
    expect(keys).toHaveLength(new Set(keys).size);
  });
});
