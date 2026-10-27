// The Node.js APIs the tests use besides the build's (merged with build/node.d.ts).
declare module 'node:fs' {
  export function readFileSync(path: URL): Uint8Array;
}
