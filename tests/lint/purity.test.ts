import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

/** One read of each impure global the pure layers must not reach (§14.1). */
const IMPURE = [
  'export const a = new Date().getTime();',
  'export const b = performance.now();',
  'export const c = setTimeout(() => 0, 1);',
  'export const d = globalThis.performance.now();',
  'export const e = window.innerWidth;',
  'export const f = navigator.userAgent;',
  'export const g = localStorage.getItem("x");',
  'export const h = crypto.getRandomValues(new Uint8Array(1));',
  'export const i = Math.random();',
];

const eslint = new ESLint({ cwd: new URL('../..', import.meta.url).pathname });

/** How many lines of `IMPURE` ESLint rejects as purity errors when written in `filePath`. */
async function impureReads(filePath: string): Promise<number> {
  const [result] = await eslint.lintText(IMPURE.join('\n'), { filePath });
  const purity = ['no-restricted-globals', 'no-restricted-properties'];
  const lines = result?.messages
    .filter((message) => message.ruleId !== null && purity.includes(message.ruleId))
    .map((message) => message.line);
  return new Set(lines).size;
}

describe('purity lint', () => {
  // Type-aware linting loads the whole TypeScript project once.
  const TIMEOUT_MS = 60_000;

  for (const layer of ['src/core/state.ts', 'src/ai/cpu.ts', 'src/data/stages.ts']) {
    it(
      `keeps the clock, the host and unseeded randomness out of ${layer}`,
      async () => {
        expect(await impureReads(layer)).toBe(IMPURE.length);
      },
      TIMEOUT_MS,
    );
  }

  it(
    'lets the outer layers use them',
    async () => {
      expect(await impureReads('src/render/fight-events.ts')).toBe(0);
    },
    TIMEOUT_MS,
  );
});
