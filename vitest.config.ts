import { defineConfig } from 'vitest/config';
import { doctest } from 'vite-plugin-doctest';

export default defineConfig({
  plugins: [doctest()],
  test: {
    globals: true,
    include: ['test/**/*.spec.ts'],
    includeSource: ['lib/**/*.ts'],
  },
});
