import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enforce no unused vars - should be an error
      '@typescript-eslint/no-unused-vars': 'error',
      // Explicit any is an error in production code
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Disable type-aware linting for test files since they're excluded from tsconfig.json
    files: ['**/*.test.ts', '**/test/**/*.ts', '**/tests/**/*.ts', '**/fixtures/**/*.ts', '**/helpers/**/*.ts'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      // Allow 'any' in test files for mocking purposes
      '@typescript-eslint/no-explicit-any': 'warn',
      // Still enforce no unused vars in tests
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.js', '**/*.mjs', '**/*.cjs'],
  }
);
