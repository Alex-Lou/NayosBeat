import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { RIFF } from '../../src/art/riff';
import { cellOf, effectsOf, playedSheets, type FighterArt } from '../../src/art/types';
import { loadArt, playedUrls } from '../../src/render/art-textures';

/**
 * `art` as generated once `sheet` is drawn by hand without its front effects: it has none, no
 * image, cell or atlas for them (tools/sprites/drawn.ts, docs/art/aseprite.md).
 */
function withoutEffects(art: FighterArt, sheet: string): FighterArt {
  const omit = <T>(record: Readonly<Record<string, T>> | undefined, key: string) =>
    Object.fromEntries(Object.entries(record ?? {}).filter(([name]) => name !== key));
  return {
    ...art,
    fx: omit(art.fx, sheet),
    cells: omit(art.cells, `fx/${sheet}`),
    atlases: omit(art.atlases, `fx/${sheet}`),
  };
}

/** What `loadArt` asks the scene to load, nothing being in the cache yet: by texture key. */
function loaded(art: FighterArt = NAYO) {
  const atlases = new Map<string, { url: string; atlas: unknown }>();
  const sheets = new Map<string, { url: string; frame: unknown }>();
  const scene = {
    textures: { exists: () => false },
    load: {
      atlas: (key: string, url: string, atlas: unknown) => atlases.set(key, { url, atlas }),
      spritesheet: (key: string, url: string, frame: unknown) => sheets.set(key, { url, frame }),
    },
  } as unknown as Phaser.Scene;
  loadArt(scene, art);
  return { atlases, sheets, keys: [...atlases.keys(), ...sheets.keys()] };
}

describe('loadArt', () => {
  it('loads every strip a clip or a projectile plays, with its effects (a Remix its own)', () => {
    const { keys } = loaded();
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

  it.each([NAYO, RIFF])(
    'loads each image of $key with its atlas, which cuts its frames (Phaser trims them)',
    (art) => {
      const { atlases, sheets } = loaded(art);
      expect(sheets.size).toBe(0);
      expect(atlases.size).toBeGreaterThan(0);
      for (const [key, { url, atlas }] of atlases) {
        const strip = key.slice(art.key.length + 1);
        const [layer, sheet] = strip.startsWith('fx/') ? ['fx', strip.slice(3)] : ['body', strip];
        expect(url).toBe(layer === 'fx' ? art.fx?.[sheet] : art.urls[sheet]);
        expect(atlas).toBe(art.atlases?.[strip]);
        expect(String(atlas)).toMatch(/\.json$/);
      }
    },
  );

  it.each([
    ['as generated', NAYO],
    ['his special drawn by hand without effects', withoutEffects(NAYO, 'special')],
  ] as const)(
    'loads an image without atlas as a row of equal cells, its cropped cells (%s)',
    (_, art) => {
      const { atlases, sheets } = loaded({ ...art, atlases: {} });
      expect(atlases.size).toBe(0);
      const idle = sheets.get('nayo/idle');
      const { width, height } = cellOf(art, 'idle');
      expect(idle).toEqual({
        url: art.urls.idle,
        frame: { frameWidth: width, frameHeight: height },
      });
      // The effects a clip plays, whichever there are: a strip drawn by hand may have none.
      const effects = playedUrls(art, 'fx');
      expect(effects.length).toBeGreaterThan(0);
      for (const [sheet, url] of effects) {
        const cell = cellOf(art, `fx/${sheet}`);
        expect(sheets.get(`nayo/fx/${sheet}`), sheet).toEqual({
          url,
          frame: { frameWidth: cell.width, frameHeight: cell.height },
        });
      }
      const loadedEffects = [...sheets.keys()].filter((key) => key.startsWith('nayo/fx/'));
      expect(loadedEffects).toHaveLength(effects.length);
    },
  );

  it('leaves out the strips drawn ahead of their gameplay, that no clip plays', () => {
    // Nayo plays all his strips now: one drawn ahead stands in, with its effects.
    const ahead: FighterArt = {
      ...NAYO,
      sheets: { ...NAYO.sheets, ahead: { frames: 2 } },
      urls: { ...NAYO.urls, ahead: 'ahead.png' },
      fx: { ...NAYO.fx, ahead: 'fx/ahead.png' },
      atlases: { ...NAYO.atlases, ahead: 'ahead.json', 'fx/ahead': 'fx/ahead.json' },
    };
    const played = playedSheets(NAYO);
    const unplayed = Object.keys(ahead.urls).filter((sheet) => !played.has(sheet));
    expect(unplayed).toContain('ahead');
    const { keys } = loaded(ahead);
    for (const sheet of unplayed) {
      expect(keys).not.toContain(`nayo/${sheet}`);
      expect(keys).not.toContain(`nayo/fx/${sheet}`);
    }
    expect(keys).toHaveLength(new Set(keys).size);
  });
});
