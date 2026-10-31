/** Minimal PNG codec for palette images: no dependency, deflate from the platform. */

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

/** An indexed PNG as read back: one palette index per pixel, and the palette's opacity. */
export interface IndexedImage {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
  /** Alpha of each palette slot (opaque when the file has no transparency). */
  readonly alpha: readonly number[];
  /** Color of each palette slot, 0xRRGGBB. */
  readonly colors: readonly number[];
}

/**
 * Decodes an 8-bit indexed PNG, the kind `encodeIndexedPng` writes (the game's strips): enough
 * for the tools that measure what the strips draw, not a general decoder.
 */
export async function decodeIndexedPng(png: Uint8Array): Promise<IndexedImage> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let width = 0;
  let height = 0;
  let alpha: number[] = [];
  let colors: number[] = [];
  const data: Uint8Array[] = [];
  for (let offset = SIGNATURE.length; offset < png.length;) {
    const length = view.getUint32(offset);
    const type = new TextDecoder().decode(png.subarray(offset + 4, offset + 8));
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      if (body[8] !== 8 || body[9] !== COLOR_TYPE_INDEXED) {
        throw new Error('Only 8-bit indexed PNGs are supported');
      }
    } else if (type === 'PLTE') {
      alpha = Array.from({ length: length / 3 }, () => 255);
      colors = Array.from(
        { length: length / 3 },
        (_, slot) =>
          ((body[slot * 3] ?? 0) << 16) |
          ((body[slot * 3 + 1] ?? 0) << 8) |
          (body[slot * 3 + 2] ?? 0),
      );
    } else if (type === 'tRNS') {
      body.forEach((value, slot) => (alpha[slot] = value));
    } else if (type === 'IDAT') {
      data.push(body);
    }
    offset += 12 + length;
  }
  const raw = await inflate(concat(data));
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width + 1);
    if (raw[row] !== 0) throw new Error('Only unfiltered rows are supported');
    pixels.set(raw.subarray(row + 1, row + 1 + width), y * width);
  }
  return { width, height, pixels, alpha, colors };
}

/** zlib stream (what PNG expects), compressed by the runtime. */
async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function concat(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
