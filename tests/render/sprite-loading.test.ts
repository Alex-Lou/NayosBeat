import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { effectsOf, playedSheets, type FighterArt } from '../../src/art/types';
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
  it('loads every strip a clip or a projectile plays, with its effects (a Remix its own)', () => {
    const keys = loadedKeys();
    const sheets = [
      ...Object.values(NAYO.clips).map((clip) => clip.sheet),
      'projectile',
      'projectileBoost',
    ];
    for (const sheet of sheets) expect(keys).toContain(`nayo/${sheet}`);
    for (const clip of Object.values(NAYO.clips)) {
      const effects = effectsOf(clip);
      if (NAYO.fx?.[effects] !== undefined) expect(keys).toContain(`nayo/fx/${effects}`);
    }
    // The Vinyle platine plays the Vinyle's strip, with its effects redrawn in platine.
    expect(keys).toContain('nayo/fx/specialBoost');
  });

  it('leaves out the strips drawn ahead of their gameplay, that no clip plays', () => {
    // Nayo plays all his strips now: one drawn ahead stands in, with its effects.
    const ahead: FighterArt = {
      ...NAYO,
      sheets: { ...NAYO.sheets, ahead: { frames: 2 } },
      urls: { ...NAYO.urls, ahead: 'ahead.png' },
      fx: { ...NAYO.fx, ahead: 'fx/ahead.png' },
    };
    const played = playedSheets(NAYO);
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
