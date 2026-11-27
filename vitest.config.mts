import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/**/*.test.ts'],
        // Dummy value so the tests still pass once the key is read from the environment.
        env: { TMDB_API_KEY: 'test-key' },
        // Only print handler logs for tests that fail.
        silent: 'passed-only',
        restoreMocks: true,
        unstubEnvs: true,
    },
});
