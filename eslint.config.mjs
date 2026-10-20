import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'reports/', 'perf/k6/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'warn',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
    rules: { 'no-console': 'off' }, // CLI script: console output is its purpose
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Assertions are often wrapped in page-object methods named expect*.
      'playwright/expect-expect': ['error', { assertFunctionPatterns: ['^expect'] }],
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
      'playwright/valid-title': 'off',
      // Tags come from the typed TAG constants (src/constants/tags.ts), which this rule cannot resolve statically.
      'playwright/valid-test-tags': 'off',
    },
  },
);
