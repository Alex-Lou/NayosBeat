import { fontTables, glyphIndices } from './font-glyphs';

/**
 * The outlines of a TrueType font (its glyf table, simple and composite glyphs, their quadratic
 * curves flattened), laid out the way a canvas writes a line (advance widths, no kerning), and
 * filled at a few samples per pixel: what the tests measure the game's lettering with, without a
 * browser (docs/flashs.md §4.1).
 */

type Point = readonly [number, number];
/** A closed contour, its last point joined back to its first. */
export type Contour = readonly Point[];

/** A font's glyphs, in its units (y up). */
export interface Outlines {
  readonly unitsPerEm: number;
  /** The contours of the glyph of `char` and how far it moves the pen; undefined if it has none. */
  glyph(
    char: string,
  ): { readonly contours: readonly Contour[]; readonly advance: number } | undefined;
}

/** Each quadratic curve becomes this many segments. */
const CURVE_STEPS = 8;

export async function outlinesOf(file: URL): Promise<Outlines> {
  const tables = await fontTables(file);
  const table = (tag: string): DataView => {
    const found = tables.get(tag);
    if (!found) throw new Error(`${file.pathname}: no ${tag}`);
    return found;
  };
  const head = table('head');
  const glyf = table('glyf');
  const loca = table('loca');
  const hmtx = table('hmtx');
  const metrics = table('hhea').getUint16(34);
  const long = head.getInt16(50) === 1;
  const indices = glyphIndices(table('cmap'));
  const offsetOf = (glyph: number): number =>
    long ? loca.getUint32(glyph * 4) : loca.getUint16(glyph * 2) * 2;

  const contoursOf = (glyph: number): Contour[] => {
    const start = offsetOf(glyph);
    if (offsetOf(glyph + 1) === start) return [];
    const count = glyf.getInt16(start);
    return count >= 0 ? simple(glyf, start, count) : composite(glyf, start, contoursOf);
  };
  return {
    unitsPerEm: head.getUint16(18),
    glyph: (char) => {
      const glyph = indices.get(char.codePointAt(0) ?? 0);
      if (glyph === undefined) return undefined;
      const advance = hmtx.getUint16(Math.min(glyph, metrics - 1) * 4);
      return { contours: contoursOf(glyph), advance };
    },
  };
}

/** A glyph of `count` contours: its flagged points, the implied ones between two off the curve. */
function simple(glyf: DataView, start: number, count: number): Contour[] {
  const ends: number[] = [];
  for (let i = 0; i < count; i++) ends.push(glyf.getUint16(start + 10 + i * 2));
  const points = (ends.at(-1) ?? -1) + 1;
  let at = start + 10 + count * 2;
  at += 2 + glyf.getUint16(at);
  const flags: number[] = [];
  while (flags.length < points) {
    const flag = glyf.getUint8(at++);
    flags.push(flag);
    if (flag & 8) for (let repeat = glyf.getUint8(at++); repeat > 0; repeat--) flags.push(flag);
  }
  const coordinates = (short: number, same: number): number[] => {
    let value = 0;
    return flags.map((flag) => {
      if (flag & short) {
        const delta = glyf.getUint8(at++);
        value += flag & same ? delta : -delta;
      } else if (!(flag & same)) {
        value += glyf.getInt16(at);
        at += 2;
      }
      return value;
    });
  };
  const xs = coordinates(2, 16);
  const ys = coordinates(4, 32);
  const contours: Contour[] = [];
  let first = 0;
  for (const end of ends) {
    const ring = Array.from({ length: end - first + 1 }, (_, i) => ({
      x: xs[first + i] ?? 0,
      y: ys[first + i] ?? 0,
      on: ((flags[first + i] ?? 0) & 1) === 1,
    }));
    contours.push(flatten(ring));
    first = end + 1;
  }
  return contours;
}

/** A glyph made of others, each moved (and scaled) into place. */
function composite(
  glyf: DataView,
  start: number,
  contoursOf: (glyph: number) => Contour[],
): Contour[] {
  const contours: Contour[] = [];
  let at = start + 10;
  for (let more = true; more;) {
    const flags = glyf.getUint16(at);
    const glyph = glyf.getUint16(at + 2);
    at += 4;
    const words = (flags & 1) !== 0;
    const dx = words ? glyf.getInt16(at) : glyf.getInt8(at);
    const dy = words ? glyf.getInt16(at + 2) : glyf.getInt8(at + 1);
    at += words ? 4 : 2;
    let [a, b, c, d] = [1, 0, 0, 1];
    const f2dot14 = (offset: number): number => glyf.getInt16(offset) / 16384;
    if (flags & 8) {
      a = d = f2dot14(at);
      at += 2;
    } else if (flags & 0x40) {
      [a, d] = [f2dot14(at), f2dot14(at + 2)];
      at += 4;
    } else if (flags & 0x80) {
      [a, b, c, d] = [f2dot14(at), f2dot14(at + 2), f2dot14(at + 4), f2dot14(at + 6)];
      at += 8;
    }
    // Offsets that name points instead (flag 2 clear) are not used by the game's fonts.
    const [ox, oy] = flags & 2 ? [dx, dy] : [0, 0];
    for (const contour of contoursOf(glyph)) {
      contours.push(contour.map(([x, y]) => [a * x + c * y + ox, b * x + d * y + oy] as const));
    }
    more = (flags & 0x20) !== 0;
  }
  return contours;
}

/** A contour of points on and off the curve, its quadratic curves as segments. */
function flatten(ring: readonly { x: number; y: number; on: boolean }[]): Contour {
  const count = ring.length;
  if (count === 0) return [];
  const at = (i: number) => ring[((i % count) + count) % count] ?? { x: 0, y: 0, on: true };
  const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({
    x: (p.x + q.x) / 2,
    y: (p.y + q.y) / 2,
    on: true,
  });
  // Start on the curve: a point on it, or the middle of two off it.
  const firstOn = ring.findIndex((point) => point.on);
  const origin = firstOn >= 0 ? at(firstOn) : mid(at(0), at(1));
  const from = firstOn >= 0 ? firstOn : 0;
  const out: Point[] = [[origin.x, origin.y]];
  let last = origin;
  for (let i = 1; i <= count; i++) {
    const point = at(from + i);
    if (point.on) {
      out.push([point.x, point.y]);
      last = point;
      continue;
    }
    const next = at(from + i + 1);
    const end = next.on ? next : mid(point, next);
    for (let step = 1; step <= CURVE_STEPS; step++) {
      const t = step / CURVE_STEPS;
      const u = 1 - t;
      out.push([
        u * u * last.x + 2 * u * t * point.x + t * t * end.x,
        u * u * last.y + 2 * u * t * point.y + t * t * end.y,
      ]);
    }
    last = end;
    if (next.on) i++;
  }
  return out;
}

/** A line of text in pixels (y down), its baseline at `baseline`, from x = `left`. */
export function layout(
  font: Outlines,
  text: string,
  size: number,
  left: number,
  baseline: number,
): { readonly contours: Contour[]; readonly width: number } {
  const scale = size / font.unitsPerEm;
  const contours: Contour[] = [];
  let pen = 0;
  for (const char of text) {
    const glyph = font.glyph(char);
    if (!glyph) throw new Error(`No glyph for ${char}`);
    for (const contour of glyph.contours) {
      contours.push(
        contour.map(([x, y]) => [left + (pen + x) * scale, baseline - y * scale] as const),
      );
    }
    pen += glyph.advance;
  }
  return { contours, width: pen * scale };
}

/** A grid of samples, `samples` a pixel each way, `width` × `height` of them. */
export interface Coverage {
  readonly width: number;
  readonly height: number;
  readonly samples: number;
  readonly inside: Uint8Array;
}

/** The samples inside `contours` (non-zero winding, as a canvas fills), at their centers. */
export function filled(
  contours: readonly Contour[],
  width: number,
  height: number,
  samples: number,
): Coverage {
  const inside = new Uint8Array(width * height);
  const crossings: { x: number; winding: number }[] = [];
  for (let row = 0; row < height; row++) {
    const y = (row + 0.5) / samples;
    crossings.length = 0;
    for (const contour of contours) {
      for (let i = 0; i < contour.length; i++) {
        const [x0, y0] = contour[i] ?? [0, 0];
        const [x1, y1] = contour[(i + 1) % contour.length] ?? [0, 0];
        if (y0 <= y === y1 <= y) continue;
        crossings.push({ x: x0 + ((y - y0) / (y1 - y0)) * (x1 - x0), winding: y1 > y0 ? 1 : -1 });
      }
    }
    crossings.sort((p, q) => p.x - q.x);
    let winding = 0;
    for (let i = 0; i < crossings.length; i++) {
      const crossing = crossings[i];
      if (!crossing) continue;
      winding += crossing.winding;
      const next = crossings[i + 1];
      if (winding === 0 || !next) continue;
      const from = Math.max(0, Math.ceil(crossing.x * samples - 0.5));
      const to = Math.min(width - 1, Math.floor(next.x * samples - 0.5));
      for (let column = from; column <= to; column++) inside[row * width + column] = 1;
    }
  }
  return { width, height, samples, inside };
}

/** The samples within `radius` pixels of the contours: their stroke, round joins and caps. */
export function stroked(
  contours: readonly Contour[],
  grid: Omit<Coverage, 'inside'>,
  radius: number,
): Coverage {
  const { width, height, samples } = grid;
  const inside = new Uint8Array(width * height);
  const reach = radius * radius;
  for (const contour of contours) {
    for (let i = 0; i < contour.length; i++) {
      const [x0, y0] = contour[i] ?? [0, 0];
      const [x1, y1] = contour[(i + 1) % contour.length] ?? [0, 0];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const length = dx * dx + dy * dy;
      const left = Math.max(0, Math.floor((Math.min(x0, x1) - radius) * samples));
      const right = Math.min(width - 1, Math.ceil((Math.max(x0, x1) + radius) * samples));
      const top = Math.max(0, Math.floor((Math.min(y0, y1) - radius) * samples));
      const bottom = Math.min(height - 1, Math.ceil((Math.max(y0, y1) + radius) * samples));
      for (let row = top; row <= bottom; row++) {
        const y = (row + 0.5) / samples;
        for (let column = left; column <= right; column++) {
          const x = (column + 0.5) / samples;
          const t =
            length === 0 ? 0 : Math.min(1, Math.max(0, ((x - x0) * dx + (y - y0) * dy) / length));
          const ex = x - (x0 + t * dx);
          const ey = y - (y0 + t * dy);
          if (ex * ex + ey * ey <= reach) inside[row * width + column] = 1;
        }
      }
    }
  }
  return { width, height, samples, inside };
}
