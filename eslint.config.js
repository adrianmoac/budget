import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import tanstackQuery from '@tanstack/eslint-plugin-query';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      '.claude/**',
      'supabase/**',
      'public/**',
      'docs/**',
      'tests/e2e/**',
      '**/*.config.{js,ts}',
      'src/types/database.types.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      '@tanstack/query': tanstackQuery,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...tanstackQuery.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
      'no-floating-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      'import/order': [
        'warn',
        { 'newlines-between': 'never', alphabetize: { order: 'asc' } },
      ],
      // Ban direct supabase-js import outside the api/ layer (spec §10.4).
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Import Supabase only inside src/api/.',
            },
          ],
        },
      ],
    },
  },
  {
    // The api/ layer is the sole place allowed to import supabase-js.
    files: ['src/api/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      // Test matchers (expect.objectContaining, mockResolvedValue, …) return `any`.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
);
