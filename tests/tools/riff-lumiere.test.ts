import { describe, expect, it } from 'vitest';
import { RIFF, RIFF_ALT } from '../../src/art/riff';
import { NAYO_LIGHTING } from '../../tools/sprites/nayo/index';
import {
  MATERIAL as NAYO_MATERIAL,
  paletteOf as nayoPalette,
} from '../../tools/sprites/nayo/palette';
import type { Rgba } from '../../tools/sprites/png';
import type { Material } from '../../tools/sprites/raster';
import { RIFF as RIFF_TOOL, RIFF_LIGHTING } from '../../tools/sprites/riff/index';
import { MATERIAL, paletteOf, type Colorway } from '../../tools/sprites/riff/palette';
import { drawStrip } from '../../tools/sprites/sheet';
import { solve } from '../../tools/sprites/skeleton';
import { FLOOR_OCCLUSION, STREET_SIGN } from '../../tools/sprites/street-light';

/**
 * Riff lit by the street, like Nayo (docs/art/riff-lumiere.md): ramps of real tones in both
 * colorways, cool shadows and warm lights; the club's violet sign behind her, on the top and the
 * back of her silhouette only, never by her legs; the floor taking the shine off her boots; no
 * light contour drawn around her by the fight. All of it inside her silhouette.
 */

const COLORWAYS: readonly Colorway[] = ['main', 'alt'];
const MATERIALS = Object.entries<Material>(MATERIAL);
/** The back light's slots: the rim tone of every material, which only the back light paints. */
const RIM_SLOTS = new Set(MATERIALS.flatMap(([, material]) => material.rim ?? []));
/** Her black cloth and leather: their dark tones lean blue violet. */
const BLACKS = ['hair', 'jacket', 'top', 'jeans', 'leather', 'boot', 'sole'] as const;
/** The strips of the boards: the guard, a heavy blow, the special, a jump, the KO. */
const STRIPS = ['idle', 'standHeavy', 'special', 'jump', 'ko'] as const;

/** Her guard, solved: heights in art pixels above the feet (2 per world pixel). */
const GUARD = (() => {
  const pose = RIFF_TOOL.poses('idle')?.[0];
  if (!pose) throw new Error('no guard');
  const skeleton = solve(pose, RIFF_TOOL.body);
  return { hips: skeleton.hip.y * 2, neck: skeleton.neck.y * 2 };
})();

const luminance = ({ r, g, b }: Rgba): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
/** How far a color's hue is from the blue violet the shadows sink toward (degrees, 0 to 180). */
function fromViolet({ r, g, b }: Rgba): number {
  const max = Math.max(r, g, b);
  const chroma = max - Math.min(r, g, b);
  if (chroma === 0) return 180;
  const sector =
    max === r
      ? ((g - b) / chroma + 6) % 6
      : max === g
        ? (b - r) / chroma + 2
        : (r - g) / chroma + 4;
  const distance = Math.abs(sector * 60 - 255);
  return Math.min(distance, 360 - distance);
}

function colorOf(palette: readonly Rgba[], slot: number): Rgba {
  const color = palette[slot];
  if (!color) throw new Error(`no color in slot ${slot}`);
  return color;
}

describe("Riff's ramps", () => {
  it.each(COLORWAYS)('%s: five tones from the outline to the light, darkest to lightest', (way) => {
    const palette = paletteOf(way);
    for (const [name, material] of MATERIALS) {
      const ramp = [
        material.outline,
        material.deep,
        material.shadow,
        material.base,
        material.light,
      ];
      const tones = ramp.map((slot) => luminance(colorOf(palette, slot)));
      for (let i = 1; i < tones.length; i++) {
        expect(tones[i], `${name}: tone ${i}`).toBeGreaterThan(tones[i - 1] ?? Infinity);
      }
    }
  });

  it.each(COLORWAYS)('%s: no pure black, every shadow cooler than its shine', (way) => {
    const palette = paletteOf(way);
    for (const [name, material] of MATERIALS) {
      for (const slot of [material.outline, material.deep, material.shadow]) {
        const color = colorOf(palette, slot);
        expect(color.r + color.g + color.b, `${name}: slot ${slot}`).toBeGreaterThan(12);
      }
      // The shadows' hue turns toward blue violet, the shine's toward the lamps' orange.
      const deep = fromViolet(colorOf(palette, material.deep));
      const shine = fromViolet(colorOf(palette, material.gloss ?? material.light));
      expect(deep, `${name}: deep against shine`).toBeLessThan(shine);
    }
  });

  it('main: the dark tones of her black cloth and leather lean blue violet', () => {
    const palette = paletteOf('main');
    for (const name of BLACKS) {
      const material = MATERIAL[name];
      for (const slot of [material.outline, material.deep, material.shadow]) {
        const color = colorOf(palette, slot);
        expect(color.b, `${name}: slot ${slot}`).toBeGreaterThan(color.r);
      }
    }
  });

  it.each(COLORWAYS)('%s: the back light is the sign’s violet, the one on Nayo', (way) => {
    const palette = paletteOf(way);
    for (const slot of RIM_SLOTS) {
      const color = colorOf(palette, slot);
      expect(color.r, `slot ${slot}`).toBeGreaterThan(color.g);
      expect(color.b, `slot ${slot}`).toBeGreaterThan(color.g);
    }
    // The same street: on black leather, her rim is his rim.
    const hers = colorOf(palette, MATERIAL.leather.rim ?? -1);
    const his = colorOf(nayoPalette(way), NAYO_MATERIAL.leather.rim ?? -1);
    expect(hers).toEqual(his);
  });
});

describe("Riff's lighting", () => {
  /** Riff as drawn without it: the default back light only. */
  const { lighting: drawnWith, ...unlit } = RIFF_TOOL;

  it('is the street’s: the sign of Nayo’s, the floor of his, none of her effects’ light', () => {
    expect(drawnWith).toBe(RIFF_LIGHTING);
    expect(RIFF_LIGHTING.rim.direction).toEqual(NAYO_LIGHTING.rim.direction);
    expect(RIFF_LIGHTING.rim.direction).toEqual(STREET_SIGN.direction);
    expect(RIFF_LIGHTING.rim.facing).toEqual(STREET_SIGN.facing);
    expect(RIFF_LIGHTING.occlusion.depth).toBe(FLOOR_OCCLUSION);
    expect(RIFF_LIGHTING.fx).toBeUndefined();
  });

  it('fades the sign out by her hips, full from her chest: her body’s heights', () => {
    expect(RIFF_LIGHTING.rim.fade.none).toBeGreaterThan(GUARD.hips);
    expect(RIFF_LIGHTING.rim.fade.full).toBeLessThan(GUARD.neck);
    expect(RIFF_LIGHTING.occlusion.height).toBeLessThan(GUARD.hips);
  });

  it.each(STRIPS)('%s: lights inside the silhouette, never past it', (sheet) => {
    const lit = drawStrip(RIFF_TOOL, sheet).pixels;
    const plain = drawStrip(unlit, sheet).pixels;
    let changed = 0;
    const moved: number[] = [];
    lit.forEach((slot, index) => {
      if (slot !== plain[index]) changed++;
      if ((slot === 0) !== (plain[index] === 0)) moved.push(index);
    });
    expect(moved, 'pixels opaque in one and not the other').toEqual([]);
    expect(changed).toBeGreaterThan(0);
  });

  it.each(STRIPS)(
    '%s: under the hips, the sign adds nothing, not even its softer tone',
    (sheet) => {
      // The same street with the sign turned off: below her hips, every pixel is the same.
      const unsigned = {
        ...RIFF_LIGHTING,
        rim: { ...RIFF_LIGHTING.rim, facing: { rim: 2, light: 2 } },
      };
      const { pixels: lit, width } = drawStrip(RIFF_TOOL, sheet);
      const dark = drawStrip({ ...RIFF_TOOL, lighting: unsigned }, sheet).pixels;
      const touched: string[] = [];
      lit.forEach((slot, index) => {
        const y = Math.floor(index / width);
        if (RIFF_LIGHTING.ground - y < GUARD.hips && slot !== dark[index]) {
          touched.push(`${index % width}, ${y}`);
        }
      });
      expect(touched).toEqual([]);
    },
  );

  it.each(STRIPS)('%s: the sign on the top and the back only, nothing under the hips', (sheet) => {
    const strip = drawStrip(RIFF_TOOL, sheet);
    const { width, pixels } = strip;
    const empty = (x: number, y: number): boolean => (pixels[y * width + x] ?? 0) === 0;
    const toward = STREET_SIGN.direction;
    const low: string[] = [];
    const wrongSide: string[] = [];
    let rims = 0;
    let inner = 0;
    pixels.forEach((slot, index) => {
      if (!RIM_SLOTS.has(slot)) return;
      rims++;
      const x = index % width;
      const y = Math.floor(index / width);
      if (RIFF_LIGHTING.ground - y < GUARD.hips) low.push(`${x}, ${y}`);
      // Which way the background lies around it, past the outline (3 pixels): toward the sign,
      // up and behind her (she faces right), never down nor toward the opponent.
      let ox = 0;
      let oy = 0;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if ((dx === 0 && dy === 0) || !empty(x + dx, y + dy)) continue;
          ox += dx / (dx * dx + dy * dy);
          oy += dy / (dx * dx + dy * dy);
        }
      }
      // A slit inside the silhouette (between a glove and the fingers, the face) faces the sign
      // too, but the outline fills it: the background is out of reach, or only past it.
      if (ox === 0 && oy === 0) inner++;
      else if (ox * toward.x + oy * toward.y <= 0) wrongSide.push(`${x}, ${y}`);
    });
    expect(rims, 'the sign touches her somewhere').toBeGreaterThan(0);
    expect(low, 'back light under the hips').toEqual([]);
    expect(inner, 'back light on slits inside the silhouette').toBeLessThan(rims * 0.1);
    expect(wrongSide.length, `turned down or forward: ${wrongSide.join(' / ')}`).toBeLessThan(
      rims * 0.05,
    );
  });

  it('touches her hair and her jacket in the guard', () => {
    const idle = drawStrip(RIFF_TOOL, 'idle').pixels;
    expect(idle.includes(MATERIAL.hair.rim ?? -1)).toBe(true);
    expect(idle.includes(MATERIAL.jacket.rim ?? -1)).toBe(true);
  });

  it('takes the shine off her boots by the floor, and draws no line of light on her soles', () => {
    const shine = MATERIAL.boot.gloss ?? -1;
    const sole = MATERIAL.sole.light;
    /** The boot shine's pixels near the floor, under the occlusion's height. */
    const lowShine = (pixels: Uint8Array, width: number): number =>
      pixels.filter((slot, index) => {
        const height = RIFF_LIGHTING.ground - Math.floor(index / width);
        return slot === shine && height < RIFF_LIGHTING.occlusion.height;
      }).length;
    const plain = drawStrip(unlit, 'idle');
    expect(lowShine(plain.pixels, plain.width), 'unlit, her toe caps shine').toBeGreaterThan(0);
    for (const sheet of STRIPS) {
      const { pixels, width } = drawStrip(RIFF_TOOL, sheet);
      expect(lowShine(pixels, width), `${sheet}: boot shine`).toBe(0);
      expect(pixels.includes(sole), `${sheet}: sole light`).toBe(false);
    }
  });
});

describe('the light contour of the fight (option A)', () => {
  it('is not drawn around Riff: her sprites carry their own light', () => {
    for (const art of [RIFF, RIFF_ALT]) expect(art.ownLight, art.key).toBe(true);
  });
});
