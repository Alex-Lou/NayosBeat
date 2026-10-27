import { readFileSync } from 'node:fs';

/**
 * The characters a font has, read from its cmap: from a WOFF file (version 1, each table
 * zlib-compressed or stored), as the game ships it through @fontsource. Enough to answer "does
 * this font draw this letter", nothing more.
 */
export async function glyphsOf(file: URL): Promise<ReadonlySet<number>> {
  const woff = readFileSync(file);
  const view = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  const tables = view.getUint16(12);
  for (let entry = 0; entry < tables; entry++) {
    const at = 44 + entry * 20;
    if (new TextDecoder().decode(woff.subarray(at, at + 4)) !== 'cmap') continue;
    const offset = view.getUint32(at + 4);
    const stored = woff.subarray(offset, offset + view.getUint32(at + 8));
    const cmap = stored.length < view.getUint32(at + 12) ? await inflate(stored) : stored;
    return codePoints(new DataView(cmap.buffer, cmap.byteOffset, cmap.byteLength));
  }
  throw new Error(`${file.pathname}: no cmap`);
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)]).stream();
  const inflated = stream.pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(inflated).arrayBuffer());
}

/** The code points of the Unicode BMP subtable (format 4) that map to a glyph. */
function codePoints(cmap: DataView): Set<number> {
  const found = new Set<number>();
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
        const glyph =
          range === 0
            ? (code + delta) & 0xffff
            : cmap.getUint16(ranges + s * 2 + range + (code - start) * 2);
        if (glyph !== 0) found.add(code);
      }
    }
    return found;
  }
  return found;
}
