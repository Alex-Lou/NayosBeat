import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types';
import { toPx } from '../../src/core/constants';
import { NAYO as NAYO_TEMPLATE } from '../../src/data/fighters/nayo';
import { zip } from '../../tools/aseprite/zip';
import {
  GUIDE_COLORS,
  portraitTemplateOf,
  runsOfCell,
  stageTemplateOf,
  templateOf,
  uiTemplateOf,
  type Template,
} from '../../tools/sprites/aseprite-template';
import { strikeOf } from '../../tools/sprites/clips';
import { rulesOf } from '../../tools/sprites/drawn';
import { NAYO } from '../../tools/sprites/nayo/index';
import { crc32 } from '../../tools/sprites/png';
import { drawStrip } from '../../tools/sprites/sheet';
import { vinylPixels } from '../../tools/sprites/vinyl';

const FRAME_DATA = { template: NAYO_TEMPLATE, clips: NAYO_CLIPS };
const NOTHING_DRAWN = new Map();
const SLOTS = NAYO.paletteOf('main').length;
const GUIDE = (name: keyof typeof GUIDE_COLORS): number =>
  SLOTS + Object.keys(GUIDE_COLORS).indexOf(name);

/** A cell back from its runs, as the extension paints it. */
function cellOf(runs: readonly number[], size: number = CELL_SIZE): Uint8Array {
  const cell = new Uint8Array(size * size);
  let at = 0;
  for (let index = 0; index < runs.length; index += 2) {
    const count = runs[index] ?? 0;
    cell.fill(runs[index + 1] ?? 0, at, at + count);
    at += count;
  }
  expect(at).toBe(cell.length);
  return cell;
}

function layer(template: Template, name: string) {
  const found = template.layers.find((each) => each.name === name);
  if (!found) throw new Error(`no layer ${name}`);
  return found;
}

describe('Aseprite templates', () => {
  const jab = templateOf(NAYO, FRAME_DATA, 'standLight', NOTHING_DRAWN);

  it('runs cover a cell exactly, and come back as they were', () => {
    const cell = new Uint8Array(CELL_SIZE * CELL_SIZE);
    cell.set([3, 3, 0, 7], 1000);
    cell[cell.length - 1] = 9;
    expect([...cellOf(runsOfCell(cell))]).toEqual([...cell]);
  });

  it('hold the strip as the game times it, with the palette of both colorways', () => {
    const { ticks } = NAYO.timing('standLight');
    expect(jab.frames).toBe(NAYO.sheets.standLight?.frames);
    expect(jab.durations).toEqual(ticks.map((tick) => tick / 60));
    expect(jab.folder).toBe('nayo');
    expect(jab.palette.free).toBe(false);
    // The exported layers know where the fighter's colors end and the guides' begin.
    for (const { rules } of jab.layers) if (rules) expect(rules.slots).toBe(SLOTS);
    expect(jab.palette.main).toHaveLength(SLOTS + 4);
    expect(jab.palette.alt).toHaveLength(SLOTS + 4);
    expect(jab.palette.main.slice(SLOTS)).toEqual(Object.values(GUIDE_COLORS));
  });

  it('start from the strip the game has, its body and its front effects', () => {
    expect(jab.layers.map(({ name }) => name)).toEqual(['corps', 'effets', 'guides']);
    const body = layer(jab, 'corps');
    expect(body.file).toBe('standLight.png');
    expect(body.rules).toEqual(rulesOf(NAYO, 'standLight', 'body'));
    expect(layer(jab, 'effets').file).toBe('fx/standLight.png');
    expect(layer(jab, 'guides')).toMatchObject({ locked: true });
    expect(layer(jab, 'guides').file).toBeUndefined();
    const strip = drawStrip(NAYO, 'standLight');
    const first = cellOf(body.frames[0] ?? []);
    for (let y = 0; y < CELL_SIZE; y++) {
      for (let x = 0; x < CELL_SIZE; x++) {
        expect(first[y * CELL_SIZE + x]).toBe(strip.pixels[y * strip.width + x]);
      }
    }
  });

  it('tag and outline the hitbox on the active frames only', () => {
    const strike = strikeOf(NAYO_CLIPS, NAYO_TEMPLATE, 'standLight');
    if (!strike) throw new Error('standLight has a hitbox');
    expect(jab.tags.filter(({ name }) => name === 'actif')).toEqual([
      {
        name: 'actif',
        from: Math.min(...strike.frames),
        to: Math.max(...strike.frames),
        color: '#ff3b3bff',
      },
    ]);
    const corner = {
      x: Math.round(ANCHOR.x + strike.box.x * ART_SCALE),
      y: Math.round(ANCHOR.y - (strike.box.y + strike.box.height) * ART_SCALE),
    };
    const guides = layer(jab, 'guides').frames.map((runs) => cellOf(runs));
    guides.forEach((cell, frame) => {
      const drawsHitbox = cell.includes(GUIDE('hitbox'));
      expect(drawsHitbox, `frame ${frame}`).toBe(strike.frames.includes(frame));
      if (drawsHitbox) expect(cell[corner.y * CELL_SIZE + corner.x]).toBe(GUIDE('hitbox'));
      // The line just under the feet, on every frame.
      expect(cell[(ANCHOR.y + 1) * CELL_SIZE]).toBe(GUIDE('ground'));
    });
  });

  it('outline the crouching hurtbox on the crouch, and loop where its clip loops', () => {
    const crouch = templateOf(NAYO, FRAME_DATA, 'crouch', NOTHING_DRAWN);
    const loopFrom = NAYO_CLIPS.crouch.loopFrom ?? 0;
    const looped = NAYO_CLIPS.crouch.frames.slice(loopFrom);
    expect(crouch.tags).toEqual([
      { name: 'boucle', from: Math.min(...looped), to: Math.max(...looped), color: '#4a8cffff' },
    ]);
    const [box] = NAYO_TEMPLATE.crouchingHurtboxes;
    if (!box) throw new Error('a crouching hurtbox');
    const top = Math.round(ANCHOR.y - toPx(box.y + box.height) * ART_SCALE);
    const left = Math.round(ANCHOR.x + toPx(box.x) * ART_SCALE);
    const cell = cellOf(layer(crouch, 'guides').frames[looped[0] ?? 0] ?? []);
    expect(cell[top * CELL_SIZE + left + 2]).toBe(GUIDE('hurtbox'));
  });

  it('draw a Remix effects over the body of its special, which is not exported', () => {
    const remix = templateOf(NAYO, FRAME_DATA, 'specialBoost', NOTHING_DRAWN);
    expect(remix.strip).toBe('special');
    expect(remix.frames).toBe(NAYO.sheets.special?.frames);
    expect(remix.layers.map(({ name }) => name)).toEqual(['référence', 'effets', 'guides']);
    expect(layer(remix, 'référence')).toMatchObject({ locked: true });
    expect(layer(remix, 'référence').file).toBeUndefined();
    expect(layer(remix, 'effets').file).toBe('fx/specialBoost.png');
  });

  it('give a projectile a single layer, exported as the strip', () => {
    const projectile = templateOf(NAYO, FRAME_DATA, 'projectile', NOTHING_DRAWN);
    expect(projectile.layers.map(({ name, file }) => [name, file])).toEqual([
      ['dessin', 'projectile.png'],
      ['guides', undefined],
    ]);
  });
});

describe('Aseprite templates of the UI images', () => {
  const vinyl = uiTemplateOf('vinyl', undefined);
  const icon = uiTemplateOf('icon', undefined);

  it('keep the title vinyl in the format and pace of its CSS', () => {
    expect(vinyl).toMatchObject({ folder: 'ui', name: 'vinyl', width: 18, height: 18, frames: 8 });
    expect(vinyl.durations).toEqual(Array.from({ length: 8 }, () => 0.225));
    expect(vinyl.tags).toEqual([{ name: 'boucle', from: 0, to: 7, color: '#4a8cffff' }]);
  });

  it('give the icons a master of 64 px, one frame', () => {
    expect(icon).toMatchObject({
      folder: 'ui',
      name: 'icon',
      width: 64,
      height: 64,
      frames: 1,
      tags: [],
    });
  });

  it('have a free palette in one colorway, and one exported layer, without guides', () => {
    for (const template of [vinyl, icon]) {
      expect(template.palette.free).toBe(true);
      expect(template.palette.alt).toBeUndefined();
      expect(template.layers.map(({ name, file }) => [name, file])).toEqual([
        ['dessin', `${template.name}.png`],
      ]);
      expect(template.layers[0]?.rules).toMatchObject({ slots: 256, margin: 0, filled: true });
    }
  });

  it('start from the code drawing', () => {
    const { pixels, palette } = vinylPixels();
    expect(vinyl.palette.main).toHaveLength(palette.length);
    const first = cellOf(vinyl.layers[0]?.frames[0] ?? [], 18);
    for (let y = 0; y < 18; y++) {
      for (let x = 0; x < 18; x++) expect(first[y * 18 + x]).toBe(pixels[y * 18 * 8 + x]);
    }
  });
});

describe('Aseprite templates of the portraits and the stage', () => {
  it("draw a fighter's portrait in its palette slots, both colorways, its guard's head to start", () => {
    const portrait = portraitTemplateOf(NAYO, new Map());
    expect(portrait).toMatchObject({ folder: 'nayo', name: 'portrait', width: 96, height: 96 });
    expect(portrait.frames).toBe(1);
    expect(portrait.palette.free).toBe(false);
    expect(portrait.palette.main).toHaveLength(SLOTS);
    expect(portrait.palette.alt).toHaveLength(SLOTS);
    expect(portrait.layers.map(({ name, file }) => [name, file])).toEqual([
      ['dessin', 'portrait.png'],
    ]);
    // Something of the guard is in it, and it stays in the fighter's slots.
    const start = cellOf(portrait.layers[0]?.frames[0] ?? [], 96);
    expect(start.some((slot) => slot !== 0)).toBe(true);
    expect(Math.max(...start)).toBeLessThan(SLOTS);
    // The tiles' framing, enlarged twice: every pixel of the guard is a 2 × 2 square.
    for (let y = 0; y < 96; y += 2) {
      for (let x = 0; x < 96; x += 2) {
        const pixel = start[y * 96 + x];
        expect([start[y * 96 + x + 1], start[(y + 1) * 96 + x]]).toEqual([pixel, pixel]);
      }
    }
  });

  it("draw the stage layers at their sizes (as fine as the fighters), in free palettes, from the code's street", () => {
    for (const [layer, width, height] of [
      ['far', 1200, 540],
      ['mid', 1440, 540],
      ['floor', 1920, 80],
    ] as const) {
      const template = stageTemplateOf(layer, undefined);
      expect(template, layer).toMatchObject({ folder: 'rue', name: layer, width, height });
      expect(template.palette.free).toBe(true);
      expect(template.layers[0]).toMatchObject({ name: 'dessin', file: `${layer}.png` });
    }
  });

  it('show the ground line behind the floor on the far and middle layers', () => {
    const far = stageTemplateOf('far', undefined);
    expect(far.layers.map(({ name }) => name)).toEqual(['dessin', 'guides']);
    const guide = far.palette.main.length - 1;
    expect(far.palette.main[guide]).toBe(GUIDE_COLORS.ground);
    const runs = far.layers[1]?.frames[0] ?? [];
    const pixels = new Uint8Array(1200 * 540);
    let at = 0;
    for (let index = 0; index < runs.length; index += 2) {
      pixels.fill(runs[index + 1] ?? 0, at, at + (runs[index] ?? 0));
      at += runs[index] ?? 0;
    }
    const rows = new Set(
      [...pixels.keys()].filter((i) => pixels[i] === guide).map((i) => Math.floor(i / 1200)),
    );
    // World row 230, two image rows.
    expect([...rows]).toEqual([460, 461]);
    expect(stageTemplateOf('floor', undefined).layers).toHaveLength(1);
  });
});

describe('Extension archive', () => {
  it('stores each file with its name, size and checksum', () => {
    const files = [
      { name: 'package.json', data: new TextEncoder().encode('{}') },
      { name: 'nayosbeat.lua', data: new TextEncoder().encode('-- é') },
    ];
    const archive = zip(files);
    const view = new DataView(archive.buffer);
    const end = archive.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    let offset = 0;
    for (const { name, data } of files) {
      expect(view.getUint32(offset, true)).toBe(0x04034b50);
      expect(view.getUint32(offset + 14, true)).toBe(crc32(data));
      expect(view.getUint32(offset + 22, true)).toBe(data.length);
      const nameLength = view.getUint16(offset + 26, true);
      expect(
        new TextDecoder().decode(archive.subarray(offset + 30, offset + 30 + nameLength)),
      ).toBe(name);
      const start = offset + 30 + nameLength;
      expect([...archive.subarray(start, start + data.length)]).toEqual([...data]);
      offset = start + data.length;
    }
    // The central directory starts where the files end.
    expect(view.getUint32(end + 16, true)).toBe(offset);
  });
});
