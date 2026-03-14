import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const commonIgnores = ['dist/**', 'coverage/**', 'node_modules/**', '.expo/**'];

function createRestrictedImportPatterns(entries) {
  return entries.map(([group, message]) => ({
    group,
    message,
  }));
}

export function createWorkspaceConfig({
  globalsMap = {},
  restrictedImports = [],
} = {}) {
  return tseslint.config(
    {
      ignores: commonIgnores,
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.{ts,tsx,mts,cts}'],
      languageOptions: {
        globals: {
          ...globalsMap,
        },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            prefer: 'type-imports',
          },
        ],
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
        'no-restricted-imports': restrictedImports.length
          ? [
              'error',
              {
                patterns: createRestrictedImportPatterns(restrictedImports),
              },
            ]
          : 'off',
      },
    },
    {
      files: ['**/*.{js,cjs,mjs}'],
      languageOptions: {
        globals: {
          ...globals.node,
        },
      },
    },
    {
      files: ['**/*.test.{ts,tsx}'],
      languageOptions: {
        globals: {
          ...globalsMap,
          ...globals.vitest,
          ...globals.jest,
        },
      },
    },
  );
}

export { globals };
