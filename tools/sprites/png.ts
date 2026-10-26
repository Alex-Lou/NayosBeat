/** Minimal PNG encoder for palette images: no dependency, deflate from the platform. */

export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const COLOR_TYPE_INDEXED = 3;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Encodes `pixels` (one palette index per pixel, row by row) as an indexed PNG, each pixel
 * enlarged `scale` times (1 for game assets, more for previews).
 */
export async function encodeIndexedPng(
  width: number,
  height: number,
  pixels: Uint8Array,
  palette: readonly Rgba[],
  scale = 1,
): Promise<Uint8Array> {
  if (pixels.length !== width * height) throw new RangeError('pixels must be width * height');
  if (palette.length > 256) throw new RangeError('a PNG palette holds 256 colors at most');

  const outWidth = width * scale;
  const outHeight = height * scale;
  const raw = new Uint8Array((outWidth + 1) * outHeight);
  for (let y = 0; y < outHeight; y++) {
    const row = y * (outWidth + 1);
    raw[row] = 0; // filter: none
    const sourceRow = Math.floor(y / scale) * width;
    for (let x = 0; x < outWidth; x++) {
      raw[row + 1 + x] = pixels[sourceRow + Math.floor(x / scale)] ?? 0;
    }
  }

  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, outWidth);
  view.setUint32(4, outHeight);
  header.set([8, COLOR_TYPE_INDEXED, 0, 0, 0], 8);

  return concat([
    new Uint8Array(SIGNATURE),
    chunk('IHDR', header),
    chunk('PLTE', new Uint8Array(palette.flatMap(({ r, g, b }) => [r, g, b]))),
    chunk('tRNS', new Uint8Array(palette.map(({ a }) => a))),
    chunk('IDAT', await deflate(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeAndData = concat([new TextEncoder().encode(type), data]);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typeAndData, 4);
  view.setUint32(8 + data.length, crc32(typeAndData));
  return out;
}

/** zlib stream (what PNG expects), compressed by the runtime. */
async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
