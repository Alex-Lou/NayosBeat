import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: globals.browser },
  },
  {
    // The simulation core must stay pure and deterministic (see docs/PLAN.md §2.3):
    // no engine, no DOM, no wall clock, no unseeded randomness.
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['phaser', 'phaser/*'], message: 'core/ must not depend on the engine.' },
            {
              group: ['**/render/**', '**/loop/**', '**/input/**'],
              message: 'core/ must not depend on outer layers.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG from GameState.' },
        { object: 'Date', property: 'now', message: 'core/ must not read the wall clock.' },
      ],
      'no-restricted-globals': ['error', 'performance', 'window', 'document'],
    },
  },
);
