import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
    // Several tests compile and check the whole sign library. That took about a
    // second at a hundred signs and takes five or six on a slow machine at 301,
    // which is right on vitest's 5s default and fails for no reason but speed.
    testTimeout: 30_000,
  },
});
