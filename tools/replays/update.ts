/**
 * Re-records the hash of every golden replay (tests/core/replays/*.json) from the current
 * code. Run with `npm run replays:update`, on purpose only: when gameplay is meant to change.
 * The inputs are left as they are; only the expected hashes move.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { replayHash, type Replay } from './replay.ts';

const REPLAYS = new URL('../../tests/core/replays/', import.meta.url);

for (const name of (await readdir(REPLAYS)).filter((file) => file.endsWith('.json')).sort()) {
  const file = new URL(name, REPLAYS);
  const text = await readFile(file, 'utf8');
  const replay = JSON.parse(text) as Replay;
  const hash = replayHash(replay);
  if (hash === replay.hash) {
    console.log(`${name}: unchanged`);
    continue;
  }
  // Only the hash is rewritten, so the file keeps its formatting.
  await writeFile(file, text.replace(`"hash": "${replay.hash}"`, `"hash": "${hash}"`));
  console.log(`${name}: ${replay.hash} -> ${hash}`);
}
