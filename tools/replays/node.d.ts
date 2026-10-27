// The few Node.js APIs the replay tool uses (merged with tools/sprites/node.d.ts).
declare module 'node:fs/promises' {
  export function readdir(path: URL): Promise<string[]>;
  export function readFile(path: URL, encoding: 'utf8'): Promise<string>;
  export function writeFile(path: URL, data: string): Promise<void>;
}
