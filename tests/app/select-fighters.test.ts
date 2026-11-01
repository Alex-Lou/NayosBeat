import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  lookOf,
  SELECT_COLUMNS,
  SELECT_SLOTS,
  selectFighters,
} from '../../src/app/select-fighters';
import { artOf } from '../../src/art';
import { ROSTER, type FighterId } from '../../src/data/roster';
import { FighterSelect } from '../../src/ui/fighter-select';
import { installFakePage, type FakeElement } from '../render/fake-dom';
import { cellPixels, savedStrip, type ColorwayName } from '../render/fx-strips';

/** The elements under `node` (itself included) that have the class `name`, in page order. */
function byClass(node: FakeElement, name: string): FakeElement[] {
  const own = node.className.split(' ').includes(name) ? [node] : [];
  return own.concat(...node.children.map((child) => byClass(child, name)));
}

/** The one element under `node` that has the class `name`. */
function only(node: FakeElement, name: string): FakeElement {
  const [found, ...others] = byClass(node, name);
  if (!found || others.length > 0) throw new Error(`Not exactly one .${name}`);
  return found;
}

/**
 * The image pixel an element styled `style` (a frame's cut: `left`, `top`, `width`, `height`
 * and its background, in percentages, as the select screen sets them) shows at the centre of
 * pixel `u`, `v` of its parent, which is `view` wide and high: the browser's arithmetic, in art
 * pixels. Undefined outside the element.
 */
function sampled(
  style: Readonly<Record<string, unknown>>,
  view: { width: number; height: number },
  image: { width: number; height: number },
  u: number,
  v: number,
): { x: number; y: number } | undefined {
  const pair = (key: string) => String(style[key]).split(' ').map(Number.parseFloat);
  const [left = 0, top = 0, width = 0, height = 0] = ['left', 'top', 'width', 'height'].map(
    (key, index) =>
      (Number.parseFloat(String(style[key])) / 100) * (index % 2 ? view.height : view.width),
  );
  const [sizeX = 0, sizeY = 0] = pair('backgroundSize');
  const [atX = 0, atY = 0] = pair('backgroundPosition');
  const [drawnW, drawnH] = [(sizeX / 100) * width, (sizeY / 100) * height];
  const [x, y] = [u + 0.5 - left, v + 0.5 - top];
  if (x < 0 || y < 0 || x >= width || y >= height) return undefined;
  const [offsetX, offsetY] = [(atX / 100) * (width - drawnW), (atY / 100) * (height - drawnH)];
  return {
    x: Math.floor(((x - offsetX) / drawnW) * image.width),
    y: Math.floor(((y - offsetY) / drawnH) * image.height),
  };
}

/** How many pixels of `view` of the cell an element styled `style` shows unlike `cell` does. */
async function wrongPixels(
  fighter: FighterId,
  colorway: ColorwayName,
  style: Readonly<Record<string, unknown>>,
  frame: number,
  view: { x: number; y: number; width: number; height: number },
): Promise<number> {
  const strip = await savedStrip(fighter, colorway, 'idle');
  const cell = cellPixels(strip)[frame] ?? new Uint8ClampedArray();
  const { image } = strip;
  let wrong = 0;
  for (let v = 0; v < view.height; v++) {
    for (let u = 0; u < view.width; u++) {
      const i = ((view.y + v) * strip.cell.width + view.x + u) * 4;
      const expected = cell[i + 3] ? [...cell.subarray(i, i + 4)].join() : 'none';
      const at = sampled(style, view, image, u, v);
      const slot = at && image.pixels[at.y * image.width + at.x];
      const color = slot === undefined ? 0 : (image.colors[slot] ?? 0);
      const alpha = slot === undefined ? 0 : (image.alpha[slot] ?? 0);
      const shown = alpha ? [color >> 16, (color >> 8) & 0xff, color & 0xff, alpha].join() : 'none';
      if (shown !== expected) wrong++;
    }
  }
  return wrong;
}

describe('select screen fighters', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers the roster in its order, each fighter in both its colorways', () => {
    const fighters = selectFighters();
    expect(fighters.map(({ id }) => id)).toEqual(ROSTER.map(({ id }) => id));
    for (const { look, mirrorLook } of fighters) {
      expect(look).toBeDefined();
      expect(mirrorLook).toBeDefined();
      expect(mirrorLook?.strip).not.toBe(look?.strip);
    }
  });

  it('keeps full rows, with room for the whole roster', () => {
    expect(SELECT_SLOTS).toBe(10);
    expect(SELECT_SLOTS % SELECT_COLUMNS).toBe(0);
    expect(ROSTER.length).toBeLessThanOrEqual(SELECT_SLOTS);
  });

  it("plays Nayo's idle as the game does: ten frames of 88×162, 6 ticks each", () => {
    const look = lookOf(artOf('nayo'));
    expect(look).toMatchObject({
      width: 88,
      height: 162,
      portrait: { x: 30, y: 0, size: 56 },
      idle: Array.from({ length: 10 }, (_, frame) => ({ frame, seconds: 0.1 })),
    });
    // Each frame where its atlas cut it, inside its cell.
    expect(look?.cuts).toHaveLength(10);
    for (const cut of look?.cuts ?? []) {
      expect(cut.x + cut.width).toBeLessThanOrEqual(88);
      expect(cut.y + cut.height).toBeLessThanOrEqual(162);
      expect(cut.left + cut.width).toBeLessThanOrEqual(look?.image.width ?? 0);
      expect(cut.top + cut.height).toBeLessThanOrEqual(look?.image.height ?? 0);
    }
  });

  it("plays Riff's idle at its own uneven pace", () => {
    const look = lookOf(artOf('riff'));
    expect(look?.idle.map(({ frame }) => frame)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(look?.idle.map(({ seconds }) => Math.round(seconds * 60))).toEqual([
      7, 4, 5, 5, 7, 3, 9, 8,
    ]);
  });

  it('gives the tile the bust drawn for it, and none while there is none', () => {
    const riff = artOf('riff');
    if (!riff) throw new Error('Riff has no art');
    expect(lookOf({ ...riff, portraitImage: 'riff-portrait.png' })?.portraitImage).toBe(
      'riff-portrait.png',
    );
    const { portraitImage, ...plain } = riff;
    expect(lookOf(riff)?.portraitImage).toBe(portraitImage);
    expect(lookOf(plain)).not.toHaveProperty('portraitImage');
  });

  it('crops the top of the first frame without a bust, and shows no one without art', () => {
    const riff = artOf('riff');
    if (!riff) throw new Error('Riff has no art');
    const { portrait: bust, ...plain } = riff;
    expect(bust).toBeDefined();
    expect(lookOf(plain)?.portrait).toEqual({ x: 0, y: 0, size: 92 });
    expect(lookOf(undefined)).toBeUndefined();
  });

  it('reads an idle without atlas as frames side by side', () => {
    const nayo = artOf('nayo');
    if (!nayo) throw new Error('Nayo has no art');
    const { idleAtlas, ...plain } = nayo;
    expect(idleAtlas).toBeDefined();
    const look = lookOf(plain);
    expect(look?.image).toEqual({ width: 880, height: 162 });
    expect(look?.cuts[3]).toEqual({ x: 0, y: 0, width: 88, height: 162, left: 264, top: 0 });
  });

  it.each(['nayo', 'riff'] as const)(
    "shows %s's bust and each idle frame pixel for pixel as its cells do",
    async (id) => {
      for (const colorway of ['main', 'alt'] as const) {
        const page = installFakePage();
        new FighterSelect(page.body as unknown as HTMLElement, {
          title: 'Joueur 2',
          fighters: selectFighters(),
          slots: SELECT_SLOTS,
          columns: SELECT_COLUMNS,
          initial: id,
          // Player 1 took the same fighter: its other colors show.
          ...(colorway === 'alt' && { taken: id }),
          onPick: () => undefined,
        });
        const look = lookOf(artOf(id, colorway));
        if (!look) throw new Error(`${id} has no look`);
        if (colorway === 'main') {
          // The tiles show each fighter in its first colors.
          const tile = ROSTER.findIndex((fighter) => fighter.id === id);
          const portrait = byClass(page.body, 'select-portrait')[tile];
          if (!portrait) throw new Error(`No bust for ${id}`);
          if (look.portraitImage !== undefined) {
            // A bust drawn for the tile shows whole, in place of the square of the guard.
            expect(portrait.style.backgroundImage).toBe(`url("${look.portraitImage}")`);
            expect(byClass(portrait, 'select-cut')).toHaveLength(0);
          } else {
            const { x, y, size } = look.portrait;
            const square = { x, y, width: size, height: size };
            const bust = only(portrait, 'select-cut').style;
            expect(await wrongPixels(id, colorway, bust, 0, square), 'bust').toBe(0);
          }
        }
        const figure = only(page.body, 'select-figure');
        const keyframes = only(figure, 'select-cut').animations[0]?.keyframes ?? [];
        const cell = { x: 0, y: 0, width: look.width, height: look.height };
        expect(keyframes).toHaveLength(look.idle.length + 1);
        for (const [index, { frame }] of look.idle.entries()) {
          const style = keyframes[index] ?? {};
          expect(await wrongPixels(id, colorway, style, frame, cell), `frame ${frame}`).toBe(0);
        }
        vi.unstubAllGlobals();
      }
    },
  );
});
