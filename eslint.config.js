import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/'] },
  js.configs.recommended,
  // Type-aware rules: floating promises, always-true conditions, unsafe `any` flows...
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    rules: {
      // Numbers in template strings are harmless and common in this code base.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // The config file itself is plain JavaScript, outside the TypeScript project.
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // The simulation core and the CPU must stay pure and deterministic (docs/PLAN.md §2.3):
    // no engine, no DOM, no wall clock, no unseeded randomness.
    files: ['src/core/**/*.ts', 'src/ai/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['phaser', 'phaser/*'],
              message: 'core/ and ai/ must not depend on the engine.',
            },
            {
              group: ['**/render/**', '**/loop/**', '**/input/**'],
              message: 'core/ and ai/ must not depend on outer layers.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG from GameState.' },
        { object: 'Date', property: 'now', message: 'core/ and ai/ must not read the wall clock.' },
      ],
      'no-restricted-globals': ['error', 'performance', 'window', 'document'],
    },
  },
);
