import { readFileSync } from 'node:fs';

/**
 * The tables of a font, read from a WOFF file (version 1, each table zlib-compressed or stored),
 * as the game ships it through @fontsource: enough to answer "does this font draw this letter"
 * (its cmap) and "how much does it cover" (font-outlines.ts).
 */
export async function fontTables(file: URL): Promise<Map<string, DataView>> {
  const woff = readFileSync(file);
  const view = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  const tables = new Map<string, DataView>();
  const count = view.getUint16(12);
  for (let entry = 0; entry < count; entry++) {
    const at = 44 + entry * 20;
    const tag = new TextDecoder().decode(woff.subarray(at, at + 4));
    const offset = view.getUint32(at + 4);
    const stored = woff.subarray(offset, offset + view.getUint32(at + 8));
    const table = stored.length < view.getUint32(at + 12) ? await inflate(stored) : stored;
    tables.set(tag, new DataView(table.buffer, table.byteOffset, table.byteLength));
  }
  return tables;
}

/** The characters a font has, read from its cmap. */
export async function glyphsOf(file: URL): Promise<ReadonlySet<number>> {
  const cmap = (await fontTables(file)).get('cmap');
  if (!cmap) throw new Error(`${file.pathname}: no cmap`);
  return new Set(glyphIndices(cmap).keys());
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)]).stream();
  const inflated = stream.pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(inflated).arrayBuffer());
}

/** The glyph of each code point of the Unicode BMP subtable (format 4) that maps to one. */
export function glyphIndices(cmap: DataView): Map<number, number> {
  const found = new Map<number, number>();
  const subtables = cmap.getUint16(2);
  for (let index = 0; index < subtables; index++) {
    const platform = cmap.getUint16(4 + index * 8);
    const encoding = cmap.getUint16(6 + index * 8);
    const at = cmap.getUint32(8 + index * 8);
    const unicode = platform === 0 || (platform === 3 && encoding === 1);
    if (!unicode || cmap.getUint16(at) !== 4) continue;
    const segments = cmap.getUint16(at + 6) / 2;
    const ends = at + 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const ranges = deltas + segments * 2;
    for (let s = 0; s < segments; s++) {
      const end = cmap.getUint16(ends + s * 2);
      const start = cmap.getUint16(starts + s * 2);
      const delta = cmap.getUint16(deltas + s * 2);
      const range = cmap.getUint16(ranges + s * 2);
      for (let code = start; code <= end && code !== 0xffff; code++) {
        const indexed =
          range === 0 ? code : cmap.getUint16(ranges + s * 2 + range + (code - start) * 2);
        const glyph = range !== 0 && indexed === 0 ? 0 : (indexed + delta) & 0xffff;
        if (glyph !== 0) found.set(code, glyph);
      }
    }
    return found;
  }
  return found;
}
