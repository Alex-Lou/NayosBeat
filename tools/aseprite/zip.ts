/**
 * A zip archive of files stored as they are (no compression): what an Aseprite extension is. The
 * dates are fixed (1980-01-01), so the same files always make the same bytes.
 */

import { crc32 } from '../sprites/png.ts';

export interface ZipEntry {
  readonly name: string;
  readonly data: Uint8Array;
}

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;
const VERSION = 20;
/** The names are UTF-8. */
const FLAGS = 0x0800;
/** 1980-01-01, 00:00 in MS-DOS format. */
const DOS_DATE = (1 << 5) | 1;

export function zip(entries: readonly ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const encoded = new TextEncoder().encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + encoded.length + data.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, LOCAL_HEADER, true);
    view.setUint16(4, VERSION, true);
    view.setUint16(6, FLAGS, true);
    view.setUint16(8, 0, true); // stored
    view.setUint16(10, 0, true); // time
    view.setUint16(12, DOS_DATE, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, encoded.length, true);
    view.setUint16(28, 0, true);
    local.set(encoded, 30);
    local.set(data, 30 + encoded.length);
    locals.push(local);

    const central = new Uint8Array(46 + encoded.length);
    const entry = new DataView(central.buffer);
    entry.setUint32(0, CENTRAL_HEADER, true);
    entry.setUint16(4, VERSION, true);
    entry.setUint16(6, VERSION, true);
    entry.setUint16(8, FLAGS, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, 0, true);
    entry.setUint16(14, DOS_DATE, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, encoded.length, true);
    // Extra field, comment, disk, internal and external attributes: none.
    entry.setUint32(42, offset, true);
    central.set(encoded, 46);
    centrals.push(central);
    offset += local.length;
  }
  const directory = centrals.reduce((size, central) => size + central.length, 0);
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, END_OF_CENTRAL, true);
  view.setUint16(8, entries.length, true);
  view.setUint16(10, entries.length, true);
  view.setUint32(12, directory, true);
  view.setUint32(16, offset, true);
  const parts = [...locals, ...centrals, end];
  const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
