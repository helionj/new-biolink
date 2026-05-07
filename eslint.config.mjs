import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

const eslintConfig = defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    'next-env.d.ts',
    // AIOX framework / agent harness — not part of the BioLink app source
    '.aiox/**',
    '.aiox-core/**',
    '.antigravity/**',
    '.claude/**',
    '.codex/**',
    '.cursor/**',
    '.gemini/**',
    '.github/**',
    'docs/**',
    'squads/**',
    'outputs/**',
    'coverage/**',
    'pnpm-lock.yaml',
    '*.aiox-bak',
  ]),
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
    },
  },
  prettier,
]);

export default eslintConfig;
