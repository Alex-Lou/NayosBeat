// The two Node.js file APIs the sprite generator uses, so the project does not need @types/node.
declare module 'node:fs/promises' {
  export function writeFile(path: URL, data: Uint8Array): Promise<void>;
  export function mkdir(path: URL, options: { recursive: true }): Promise<string | undefined>;
}
