// The Node.js APIs the tests use besides the build's (merged with build/node.d.ts).
declare module 'node:fs' {
  export function readFileSync(path: URL): Uint8Array;
}

declare module 'node:process' {
  /** The CPU time this process used, in microseconds (since `previous`, if given). */
  export function cpuUsage(previous?: { user: number; system: number }): {
    user: number;
    system: number;
  };
}
