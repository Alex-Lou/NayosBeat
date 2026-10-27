import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Folders of the presentation and the application, which the pure layers never import. */
const OUTER_LAYERS = ['render', 'loop', 'input', 'app', 'ui', 'art', 'audio'];

/** Globals that tell the time or run code later: a replay would not play the same twice. */
const CLOCK_GLOBALS = ['Date', 'performance', 'setTimeout', 'setInterval', 'requestAnimationFrame'];

/** Globals of the page and the device: state the simulation cannot see in a replay. */
const HOST_GLOBALS = [
  'window',
  'document',
  'globalThis',
  'self',
  'navigator',
  'localStorage',
  'sessionStorage',
  'crypto',
  'fetch',
];

/** `no-restricted-globals` entries for `names`, each with the same `message`. */
function restricted(names, message) {
  return names.map((name) => ({ name, message }));
}

/** Forbids `files` (the `name` layer) to import the engine, the outer layers and `inner`. */
function layer(files, name, inner) {
  return {
    files: [files],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['phaser', 'phaser/*'], message: `${name} must not depend on the engine.` },
            {
              group: [...OUTER_LAYERS, ...inner].map((folder) => `**/${folder}/**`),
              message: `${name} must not depend on this layer: layers point inward.`,
            },
          ],
        },
      ],
    },
  };
}

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
    // Plain JavaScript files, outside the TypeScript project: this config and a Node import hook.
    files: ['eslint.config.js', 'tools/sprites/ts-imports.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // The startup guard (plain JavaScript, loaded before the game's code).
    files: ['public/boot.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // The service worker template (plain JavaScript, filled in at build time).
    files: ['build/sw-template.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: globals.serviceworker,
    },
  },
  {
    // The simulation core, the CPU and the game data must stay pure and deterministic
    // (docs/PLAN.md §2.3, docs/combat-v2.md §14.1): no engine, no DOM, no wall clock, no
    // unseeded randomness. The browser globals stay declared here too (flat config merges
    // `globals`, and typescript-eslint turns `no-undef` off), hence the impure ones are named.
    files: ['src/core/**/*.ts', 'src/ai/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG from GameState.' },
      ],
      'no-restricted-globals': [
        'error',
        ...restricted(
          CLOCK_GLOBALS,
          'core/, ai/ and data/ must not read the clock or schedule work.',
        ),
        ...restricted(HOST_GLOBALS, 'core/, ai/ and data/ must not touch the DOM or the host.'),
      ],
    },
  },
  // Layers point inward: core depends on nothing, data on the core alone, the CPU on both.
  layer('src/core/**/*.ts', 'core/', ['data', 'ai']),
  layer('src/data/**/*.ts', 'data/', ['ai']),
  layer('src/ai/**/*.ts', 'ai/', []),
);
