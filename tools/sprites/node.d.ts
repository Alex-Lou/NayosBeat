// The few Node.js APIs the sprite tools use, so the project does not need @types/node.
declare module 'node:fs/promises' {
  export function readFile(path: URL): Promise<Uint8Array>;
  export function writeFile(path: URL, data: Uint8Array): Promise<void>;
  export function mkdir(path: URL, options: { recursive: true }): Promise<string | undefined>;
  export function rm(path: URL, options: { recursive: true; force: true }): Promise<void>;
}

declare const process: { readonly argv: readonly string[] };
