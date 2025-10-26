import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: [
      'node_modules/',
      'dist/',
      '**/*.d.ts',
      // Exclude integration tests from default test runs (require blockchain/API access)
      // Integration tests should be run separately with explicit file path
      '**/integration-*.test.ts',
      '**/e2e-*.test.ts',
    ],
    // Disable parallel test execution for integration tests
    fileParallelism: false,
    // Test timeout (ms)
    testTimeout: 10000,
    // Hook timeout (ms)
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/tests/**',
        '**/test/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/fixtures/**',
        '**/mocks.ts',
      ],
      // Coverage thresholds (set to current levels)
      thresholds: {
        lines: 30,
        functions: 69,
        branches: 85,
        statements: 30,
        // Per-file thresholds can be set for critical files
        perFile: false,
      },
      // Include all source files in coverage report
      all: true,
      include: ['src/**/*.ts'],
    },
    // Setup files to run before tests
    // setupFiles: ['./src/tests/helpers/setup.ts'],
  },
})
