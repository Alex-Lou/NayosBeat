// Lets Node run the game's own TypeScript modules from tools/: their relative imports omit the
// `.ts` extension (the bundler resolves them), which Node's resolution requires.
import { register } from 'node:module';

const hooks = `
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
    return next(specifier + '.ts', context);
  }
}`;

register(`data:text/javascript,${encodeURIComponent(hooks)}`);
