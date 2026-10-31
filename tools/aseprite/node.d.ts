// The Node.js APIs the extension's check uses besides the sprite tools' (merged with
// tools/sprites/node.d.ts).
declare module 'node:child_process' {
  export function spawnSync(
    command: string,
    args: readonly string[],
    options: { readonly stdio: 'inherit' | 'ignore' },
  ): { readonly status: number | null };
}

declare module 'node:url' {
  export function fileURLToPath(url: URL): string;
}
