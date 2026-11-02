import type { RecordedReplay } from '../net/replay-record';

const KEY = 'nayosbeat.desync';

/**
 * Keeps the replay of the last online desync (docs/multijoueur.md §9.3): on the device, and in the
 * console, for whoever debugs it; the « Multi » menu then offers to copy it. Returns its text.
 */
export function keepDesync(replay: RecordedReplay): string {
  const text = JSON.stringify(replay, null, 2);
  console.error(`Online match desynchronized: ${replay.description}\n${text}`);
  try {
    localStorage.setItem(KEY, text);
  } catch {
    // Not kept on the device: the console and the copy have it.
  }
  return text;
}
