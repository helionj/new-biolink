import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

const alias = {
  '@': resolve(__dirname, './'),
};

export default defineConfig({
  // Resolve `@/*` to project root — mirrors tsconfig.json paths so test imports
  // like `@/lib/supabase/types` work without `vite-tsconfig-paths` dep.
  resolve: { alias },
  test: {
    passWithNoTests: true,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['tests/components/**/*.test.{ts,tsx}'],
          setupFiles: ['./tests/setup.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.{ts,tsx}'],
          setupFiles: ['./tests/integration/setup.ts'],
          // RLS tests mutate shared auth.users in biolink-dev (CI-001 alt B).
          // Sequential file execution avoids cross-file race conditions when
          // future stories add more integration suites.
          fileParallelism: false,
        },
      },
    ],
  },
});
