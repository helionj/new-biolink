import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['tests/components/**/*.test.{ts,tsx}'],
          setupFiles: ['./tests/setup.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
