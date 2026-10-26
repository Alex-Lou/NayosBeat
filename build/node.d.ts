// The one Node.js API the build plugins use, so the project does not need @types/node.
declare module 'node:fs' {
  export function readFileSync(path: URL, encoding: 'utf8'): string;
}
