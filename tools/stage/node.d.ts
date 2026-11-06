// The Node.js APIs the stage tools read a drawn layer with, synchronously (a stage's drawing is
// synchronous: tools/stage/kit/stage.ts `CodeMap.draw`), so the project does not need @types/node.
declare module 'node:fs' {
  export function readFileSync(path: URL): Uint8Array;
}
declare module 'node:zlib' {
  export function inflateSync(data: Uint8Array): Uint8Array;
}
