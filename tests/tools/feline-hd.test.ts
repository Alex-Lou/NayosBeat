import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { FELINE, FELINE_ALT } from '../../src/art/feline';
import { HD_SCALE, type Atlas } from '../../src/art/types';
import { decodeIndexedPng } from '../../tools/sprites/png';

const art = (path: string) => new URL(`../../src/art/feline/${path}`, import.meta.url);
const atlasOf = async (path: string): Promise<Atlas> =>
  JSON.parse(new TextDecoder().decode(await readFile(art(path)))) as Atlas;

describe('Feline in HD (tools/sprites/generate.ts keepHd)', () => {
  it('shows her guard, walks, crouch, jumps, block and dash from their HD images, in both colorways', () => {
    expect(Object.keys(FELINE.hd ?? {})).toEqual([
      'idle',
      'walkForward',
      'walkBack',
      'crouch',
      'jump',
      'jumpForward',
      'block',
      'dashForward',
    ]);
    expect(Object.keys(FELINE_ALT.hd ?? {})).toEqual([
      'idle',
      'walkForward',
      'walkBack',
      'crouch',
      'jump',
      'jumpForward',
      'block',
      'dashForward',
    ]);
  });

  for (const colorway of ['main', 'alt'] as const) {
    it(`${colorway}: cuts the HD image HD_SCALE times as finely as the game's strip`, async () => {
      const game = await atlasOf(`${colorway}/idle.json`);
      const hd = await atlasOf(`${colorway}/hd/idle.json`);
      expect(hd.meta.size).toEqual({
        w: game.meta.size.w * HD_SCALE,
        h: game.meta.size.h * HD_SCALE,
      });
      for (const [name, frame] of Object.entries(game.frames)) {
        const fine = hd.frames[name];
        for (const key of ['frame', 'spriteSourceSize'] as const) {
          expect(fine?.[key], `${name} ${key}`).toEqual({
            x: frame[key].x * HD_SCALE,
            y: frame[key].y * HD_SCALE,
            w: frame[key].w * HD_SCALE,
            h: frame[key].h * HD_SCALE,
          });
        }
      }
    });
  }

  it('draws her in the same place: the HD image, halved, covers the game strip', async () => {
    const game = await decodeIndexedPng(await readFile(art('main/idle.png')));
    const hd = await decodeIndexedPng(await readFile(art('main/hd/idle.png')));
    expect([hd.width, hd.height]).toEqual([game.width * HD_SCALE, game.height * HD_SCALE]);
    let both = 0;
    let either = 0;
    for (let y = 0; y < game.height; y++) {
      for (let x = 0; x < game.width; x++) {
        const drawn = (game.pixels[y * game.width + x] ?? 0) > 0;
        let fine = false;
        for (let dy = 0; dy < HD_SCALE; dy++) {
          for (let dx = 0; dx < HD_SCALE; dx++) {
            const at = (y * HD_SCALE + dy) * hd.width + x * HD_SCALE + dx;
            fine ||= (hd.pixels[at] ?? 0) > 0;
          }
        }
        if (drawn && fine) both++;
        if (drawn || fine) either++;
      }
    }
    expect(both / either).toBeGreaterThan(0.85);
  });
});
